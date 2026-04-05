# Frontend Architecture — Invitrack

## 1. Overview

The frontend is a React + TypeScript single-page application built with Vite.
It consumes the Invitrack REST API exclusively via Axios. All backend
communication is scoped to `/api/v1`.

The frontend lives in the `frontend/` directory at the monorepo root,
alongside `backend/` and `docs/`.

---

## 2. Technology Stack

| Concern              | Library / Tool                              |
|----------------------|---------------------------------------------|
| Build tool           | Vite                                        |
| Language             | TypeScript (strict mode)                    |
| UI framework         | React 18                                    |
| Routing              | React Router v6                             |
| Server state         | TanStack Query v5                           |
| HTTP client          | Axios                                       |
| Component library    | shadcn/ui (code-owned, not a black box)     |
| Styling              | Tailwind CSS                                |
| Form management      | React Hook Form + Zod + @hookform/resolvers |
| Icons                | lucide-react                                |
| Testing              | Vitest + React Testing Library              |

---

## 3. Directory Structure

```
frontend/
  src/
    api/            # Axios instance + one file per backend module
    components/
      ui/           # shadcn/ui generated components (do not edit manually)
      layout/       # AppShell, Navbar, Sidebar
      shared/       # ProtectedRoute, LoadingSpinner, ErrorBoundary
    context/
      AuthContext.tsx
    hooks/          # TanStack Query hooks, one file per module
    pages/          # One folder per route group
      auth/
      dashboard/
      inventory/
      bookings/
      users/
      audit/
      analytics/
    types/          # Snake_case DTOs mirroring backend responses exactly
    lib/
      utils.ts      # cn() helper and other small utilities
  index.html
  vite.config.ts
  tsconfig.json
  tailwind.config.ts
  postcss.config.js
```

---

## 4. Authentication Strategy

### Token storage

- **Access token:** stored in memory only (React context). Never written to
  localStorage or sessionStorage. Lost on page refresh — the refresh flow
  handles rehydration.
- **Refresh token:** stored in an HttpOnly cookie by the backend. The frontend
  never reads or writes it directly. Axios sends it automatically on requests
  to `/auth/refresh` via `withCredentials: true`.

### Rehydration on page refresh

On mount, `AuthContext` calls `POST /auth/refresh` automatically. If the
HttpOnly cookie is still valid, a new access token is returned and the session
is restored silently. If it fails, the user is treated as unauthenticated and
redirected to `/login`.

### Auth flow after login

1. `POST /auth/login` → receive `access_token`
2. Store `access_token` in `AuthContext`
3. Call `GET /users/me` → receive full profile including roles
4. Extract role names and permission codes, store in `AuthContext`
5. Redirect to `/dashboard`

### Auth context shape

```ts
type Role = {
  id: number
  name: string
  priority: number
}

type UserProfile = {
  id: string
  email: string
  is_verified: boolean
  is_active: boolean
  full_name: string
  display_name: string | null
  avatar_url: string | null
  department: string | null
  roles: Role[]
  created_at: string
  updated_at: string
}

type AuthState = {
  accessToken: string | null
  user: UserProfile | null
  roles: Role[]
  permissions: string[]       // permission codes e.g. 'inventory:write'
  isAuthenticated: boolean
  isLoading: boolean          // true during initial refresh rehydration
}
```

### Conditional rendering pattern

Established once in `AuthContext`, used everywhere:

```tsx
const { roles, permissions } = useAuth()

const isAdmin = roles.some(r => r.name === 'admin')
const isAdminOrManager = roles.some(r =>
  r.name === 'admin' || r.name === 'manager'
)
const canWriteInventory = permissions.includes('inventory:write')
const canApproveBookings = permissions.includes('bookings:approve')
```

UI elements (nav items, action buttons, entire pages) gate on these values.
No role or permission data is trusted from the client — the backend enforces
access control independently. Frontend gating is UX only.

---

## 5. Axios Setup

A single Axios instance is created in `src/api/axios.ts` and imported
everywhere. It is never replaced or duplicated.

### Instance configuration

```ts
baseURL: '/api/v1'
withCredentials: true       // sends HttpOnly refresh token cookie on all requests
```

### Request interceptor

Attaches the access token from `AuthContext` to every outbound request:

```
Authorization: Bearer <accessToken>
```

### Response interceptor

On `401` response:
1. Call `POST /auth/refresh` once
2. If refresh succeeds: update `accessToken` in context, retry original request
3. If refresh fails: clear `AuthContext`, redirect to `/login`

The interceptor queues concurrent requests that arrive during a refresh in
progress, replaying them all once the new token is available. This prevents
multiple simultaneous refresh calls.

---

## 6. TanStack Query Setup

A single `QueryClient` is created at the app root and provided via
`QueryClientProvider`. Default configuration:

```ts
staleTime: 1000 * 60 * 2     // data considered fresh for 2 minutes
retry: 1                      // retry failed requests once before erroring
```

### Hook naming convention

One file per module in `src/hooks/`, named after the module:

```
useAuth.ts          # login, register, logout mutations
useInventory.ts     # item queries and mutations
useBookings.ts      # reservation queries and mutations
useUsers.ts         # profile and role queries
useAudit.ts         # event queries
useAnalytics.ts     # snapshot and metrics queries
```

Query keys follow a consistent pattern:

```ts
['inventory', 'items']                    // list
['inventory', 'items', id]               // single item
['bookings', 'reservations']             // list
['bookings', 'reservations', id]         // single reservation
```

Cache invalidation after mutations targets the relevant query key.

---

## 7. Routing

React Router v6 with a `<ProtectedRoute>` wrapper component.

### ProtectedRoute behaviour

- If `isLoading` is true (rehydration in progress): render a full-page spinner
- If `isAuthenticated` is false: redirect to `/login`
- Otherwise: render the child route

### Route protection levels

| Level           | Mechanism                                          |
|-----------------|----------------------------------------------------|
| Public          | No wrapper — accessible without authentication     |
| Authenticated   | Wrapped in `<ProtectedRoute>`                      |
| Role-gated      | Wrapped in `<ProtectedRoute requiredRole="admin">` |

Role-gated routes render a `403` page if the authenticated user lacks the
required role.

---

## 8. Forms

All forms use React Hook Form with Zod schema validation via
`@hookform/resolvers/zod`.

Pattern:
1. Define a Zod schema for the form inputs
2. Pass it to `useForm` via `zodResolver`
3. Display field-level errors from `formState.errors`
4. On submit, call the relevant TanStack Query mutation

Zod schemas for forms live alongside their page component, not in `src/types/`.
`src/types/` is reserved for backend response DTOs only.

---

## 9. Types Convention

All types in `src/types/` mirror backend response DTOs exactly in snake_case.
No camelCase mapping is performed — the backend returns snake_case and the
frontend consumes it directly. This eliminates an entire class of mapping bugs.

```ts
// src/types/inventory.ts
export type InventoryItem = {
  id: string
  sku: string
  name: string
  description: string | null
  category_id: string | null
  unit: string
  reorder_threshold: number
  is_bookable: boolean
  is_active: boolean
  version: number
  image_url: string | null
  created_by: string
  created_at: string
  updated_at: string
}
```

---

## 10. Testing Strategy

Vitest + React Testing Library. Tests live alongside their source files or
in a `__tests__/` subfolder within the relevant directory.

### What gets tested

| Layer            | What                                                        |
|------------------|-------------------------------------------------------------|
| `AuthContext`    | Token storage, role/permission hydration, rehydration on refresh |
| `ProtectedRoute` | Redirects unauthenticated users, renders children when authenticated |
| Auth pages       | Form validation errors, successful submission calls correct API |
| Shared components| Render correctly given props                                |

Full page-level coverage is not the goal. The pattern is established on Auth
and carried forward selectively.

### Test commands

```
npm run test          # Vitest watch mode
npm run test:run      # Single run (CI)
npm run typecheck     # tsc --noEmit
```

---

## 11. Vite Proxy

In development, Vite proxies `/api` requests to the backend to avoid CORS
issues. Configured in `vite.config.ts`:

```ts
server: {
  proxy: {
    '/api': 'http://localhost:3000'
  }
}
```

In production, Nginx handles this routing — the frontend is served as static
files and `/api` requests are proxied to the Node.js process.

---

## 12. Environment Variables

Vite exposes env variables prefixed with `VITE_` to the client bundle.

```
# frontend/.env.example
VITE_APP_NAME=Invitrack
```

The API base URL is not an env variable — it is always `/api/v1`, resolved
via the Vite proxy in dev and Nginx in production.

---

## 13. Build & Scripts

```
npm run dev           # Vite dev server on localhost:5173
npm run build         # Production build → frontend/dist/
npm run preview       # Preview production build locally
npm run typecheck     # tsc --noEmit
npm run test          # Vitest watch mode
npm run test:run      # Vitest single run
```