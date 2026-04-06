# Frontend Component Breakdown — Invitrack

This document defines the component tree, props contracts, and responsibilities
for every component in the frontend. It is written before any implementation
and serves as the reference during coding. All page-level behaviour is defined
in `frontend-routes.md`; this document focuses on component structure only.

---

## Directory Map

```
src/
  api/
    axios.ts
    auth.ts
    users.ts
    inventory.ts
    bookings.ts
    audit.ts
    analytics.ts
  components/
    ui/                         # shadcn/ui generated — do not edit manually
    layout/
      AppShell.tsx
      Sidebar.tsx
      Navbar.tsx
    shared/
      ProtectedRoute.tsx
      LoadingSpinner.tsx
      ErrorBoundary.tsx
      PageError.tsx
      ForbiddenPage.tsx
      NotFoundPage.tsx
  context/
    AuthContext.tsx
  hooks/
    useAuth.ts
    useInventory.ts
    useBookings.ts
    useUsers.ts
    useAudit.ts
    useAnalytics.ts
  pages/
    auth/
      LoginPage.tsx
      RegisterPage.tsx
      VerifyEmailPage.tsx
      ForgotPasswordPage.tsx
      ResetPasswordPage.tsx
    dashboard/
      DashboardPage.tsx
    inventory/
      InventoryListPage.tsx
      InventoryItemPage.tsx
      components/
        ItemCard.tsx
        ItemFilters.tsx
        CreateItemModal.tsx
        EditItemForm.tsx
        StockLevelTable.tsx
    bookings/
      BookingsListPage.tsx
      BookingDetailPage.tsx
      components/
        ReservationCard.tsx
        ReservationFilters.tsx
        CreateReservationModal.tsx
        AvailabilityBadge.tsx
        ReviewActions.tsx
    users/
      UsersListPage.tsx
      UserDetailPage.tsx
      components/
        UserCard.tsx
        UserFilters.tsx
        RoleAssignmentForm.tsx
    audit/
      AuditPage.tsx
      components/
        AuditEventRow.tsx
        AuditFilters.tsx
    analytics/
      AnalyticsPage.tsx
      components/
        InventorySnapshotChart.tsx
        BookingMetricsChart.tsx
        DateRangeFilter.tsx
  types/
    auth.ts
    users.ts
    inventory.ts
    bookings.ts
    audit.ts
    analytics.ts
  lib/
    utils.ts
  test/
    setup.ts
  main.tsx
  router.tsx
  App.tsx
```

---

## Entry Points

### `main.tsx`
Mounts the React app. Wraps the tree with `QueryClientProvider` and
`AuthProvider`. No logic lives here beyond wiring providers.

```tsx
<QueryClientProvider client={queryClient}>
  <AuthProvider>
    <RouterProvider router={router} />
  </AuthProvider>
</QueryClientProvider>
```

### `router.tsx`
Defines all routes using React Router v6 `createBrowserRouter`. Applies
`ProtectedRoute` wrappers. The root `/` route renders a redirect element —
no page component.

### `App.tsx`
Not used as the root render target. If present, it wraps `<Outlet />` inside
`AppShell` for authenticated routes. Public routes render without `AppShell`.

---

## Context

### `AuthContext.tsx`

The single source of truth for authentication state. Exported as
`AuthProvider` (component) and `useAuth` (hook).

**State shape:**
```ts
type AuthState = {
  accessToken: string | null
  user: UserProfile | null
  roles: Role[]
  permissions: string[]
  isAuthenticated: boolean
  isLoading: boolean
}
```

**Responsibilities:**
- On mount: call `POST /auth/refresh`. If successful, call `GET /users/me`,
  then for each role call `GET /users/roles/:role_id/permissions`, flatten
  into `permissions` string array. Set `isLoading = false` when done.
- Expose `login(token, user, permissions)` — called by `LoginPage` after
  successful login + hydration
- Expose `logout()` — calls `POST /auth/logout`, clears state, redirects
  to `/login`
- Expose `setAccessToken(token)` — called by the Axios response interceptor
  after a silent refresh

**Note:** `AuthContext` does not make the login API call itself. `LoginPage`
calls the API, receives the token, calls `GET /users/me` and permission
endpoints, then passes the fully resolved state to `login()`. This keeps
the context free of page-specific login logic.

---

## API Layer (`src/api/`)

### `axios.ts`
Creates and exports a single Axios instance. Configures `baseURL: '/api/v1'`
and `withCredentials: true`. Attaches request interceptor (add Bearer token
from AuthContext) and response interceptor (handle 401, refresh, retry).

The interceptor holds a reference to `AuthContext` setters via a setter
injection pattern — `setAxiosAuthContext(handlers)` is called once from
`AuthProvider` on mount.

### `auth.ts`
```ts
login(email, password) → Promise<LoginResponse>
register(email, password, full_name) → Promise<RegisterResponse>
logout() → Promise<void>
refreshToken() → Promise<RefreshResponse>
forgotPassword(email) → Promise<void>
resetPassword(token, password) → Promise<void>
verifyEmail(token) → Promise<void>
getSessions() → Promise<Session[]>
deleteSession(id) → Promise<void>
```

### `users.ts`
```ts
getMe() → Promise<UserProfile>
updateMe(data) → Promise<UserProfile>
getUsers(params) → Promise<PaginatedResponse<UserProfile>>
getUserById(id) → Promise<UserProfile>
updateUser(id, data) → Promise<UserProfile>
getRoles() → Promise<Role[]>
assignRole(userId, roleId) → Promise<void>
removeRole(userId, roleId) → Promise<void>
getPermissions() → Promise<Permission[]>
getRolePermissions(roleId) → Promise<Permission[]>
```

### `inventory.ts`
```ts
getItems(params) → Promise<PaginatedResponse<InventoryItem>>
getItemById(id) → Promise<InventoryItemDetail>
createItem(data) → Promise<InventoryItem>
updateItem(id, data) → Promise<InventoryItem>
deleteItem(id) → Promise<void>
getCategories() → Promise<Category[]>
createCategory(data) → Promise<Category>
getLocations() → Promise<Location[]>
getItemStock(id) → Promise<StockLevel[]>
createTransaction(data) → Promise<Transaction>
getTransactions(params) → Promise<PaginatedResponse<Transaction>>
```

### `bookings.ts`
```ts
getResources(params) → Promise<PaginatedResponse<Resource>>
createResource(data) → Promise<Resource>
updateResource(id, data) → Promise<Resource>
getAvailability(resourceId, startTime, endTime) → Promise<Availability>
getReservations(params) → Promise<PaginatedResponse<Reservation>>
getReservationById(id) → Promise<Reservation>
createReservation(data) → Promise<Reservation>
updateReservation(id, data) → Promise<Reservation>
reviewReservation(id, action, notes?) → Promise<Reservation>
```

### `audit.ts`
```ts
getEvents(params) → Promise<PaginatedResponse<AuditEvent>>
getEventById(id) → Promise<AuditEvent>
```

### `analytics.ts`
```ts
getInventorySnapshots(params) → Promise<InventorySnapshot[]>
getBookingMetrics(params) → Promise<BookingMetric[]>
```

---

## Types (`src/types/`)

All types mirror backend snake_case DTOs exactly. No mapping performed.

### `auth.ts`
```ts
type LoginResponse = { access_token: string; token_type: string; expires_in: number }
type RegisterResponse = { id: string; email: string; is_verified: boolean; created_at: string }
type Session = { id: string; user_agent: string | null; ip_address: string | null; expires_at: string; created_at: string }
```

### `users.ts`
```ts
type Role = { id: number; name: string; priority: number; description: string | null }
type Permission = { id: number; code: string; description: string | null }
type UserProfile = {
  id: string; email: string; is_verified: boolean; is_active: boolean
  full_name: string; display_name: string | null; avatar_url: string | null
  department: string | null; roles: Role[]; created_at: string; updated_at: string
}
type PaginatedResponse<T> = { data: T[]; meta: { page: number; per_page: number; total: number } }
```

### `inventory.ts`
```ts
type InventoryItem = {
  id: string; sku: string; name: string; description: string | null
  category_id: string | null; unit: string; reorder_threshold: number
  is_bookable: boolean; is_active: boolean; version: number
  image_url: string | null; created_by: string; created_at: string; updated_at: string
}
type InventoryItemDetail = InventoryItem & { stock_levels: StockLevel[] }
type StockLevel = { location_id: string; location_name: string; quantity: number }
type Category = { id: string; name: string; parent_id: string | null; created_at: string }
type Location = { id: string; name: string; description: string | null; parent_id: string | null }
type Transaction = {
  id: string; item_id: string; location_id: string; type: string
  quantity_delta: number; reference_id: string | null; reference_type: string | null
  notes: string | null; performed_by: string; performed_at: string
}
```

### `bookings.ts`
```ts
type Resource = { id: string; item_id: string; name: string; quantity: number; is_active: boolean; created_at: string }
type Availability = { resource_id: string; total_quantity: number; reserved_quantity: number; available_quantity: number; start_time: string; end_time: string }
type Reservation = {
  id: string; resource_id: string; requested_by: string; quantity: number
  start_time: string; end_time: string; status: string; priority: number
  notes: string | null; reviewed_by: string | null; reviewed_at: string | null
  created_at: string; updated_at: string
}
```

### `audit.ts`
```ts
type AuditEvent = {
  id: string; actor_id: string | null; actor_email: string | null; action: string
  module: string; target_type: string | null; target_id: string | null
  payload: { before: unknown; after: unknown } | null
  ip_address: string | null; user_agent: string | null; created_at: string
}
```

### `analytics.ts`
```ts
type InventorySnapshot = { snapshot_date: string; item_id: string; location_id: string; quantity: number; created_at: string }
type BookingMetric = { metric_date: string; resource_id: string; total_requests: number; approved_count: number; rejected_count: number; utilization_minutes: number; created_at: string }
```

---

## Layout Components

### `AppShell.tsx`
Wraps all authenticated pages. Renders `Sidebar` and a main content area
with `<Outlet />`. Not rendered on public routes.

**Props:** none — reads from `AuthContext` directly.

### `Sidebar.tsx`
Persistent left sidebar. Renders nav links conditionally based on roles
and permissions from `useAuth()`.

**Nav items and visibility:**
| Item       | Visible when                        |
|------------|-------------------------------------|
| Dashboard  | Always (authenticated)              |
| Inventory  | Always (authenticated)              |
| Bookings   | Always (authenticated)              |
| Users      | `isAdmin \|\| isManager`            |
| Audit      | `isAdmin`                           |
| Analytics  | `isAdmin \|\| isManager`            |

Active route is highlighted using React Router's `NavLink`.

**Props:** none — reads `useAuth()` and `useLocation()` internally.

### `Navbar.tsx`
Top bar. Displays the app name, current user's `display_name` or `full_name`,
and a logout button. Optionally shows an avatar if `avatar_url` is set.

**Props:** none — reads `useAuth()` internally.

---

## Shared Components

### `ProtectedRoute.tsx`

```ts
type Props = {
  requiredRole?: 'admin' | 'manager' | 'admin_or_manager'
}
```

**Behaviour:**
- `isLoading === true` → render `<LoadingSpinner fullPage />`
- `isAuthenticated === false` → `<Navigate to="/login" replace />`
- `requiredRole` set and user lacks it → render `<ForbiddenPage />`
- Otherwise → `<Outlet />`

### `LoadingSpinner.tsx`

```ts
type Props = {
  fullPage?: boolean   // centers spinner in the viewport when true
}
```

Renders a spinner. Used during rehydration and data fetching states.

### `ErrorBoundary.tsx`
Class component wrapping page subtrees. On uncaught render error, renders
`<PageError />` with a retry option.

### `PageError.tsx`

```ts
type Props = {
  message?: string
  onRetry?: () => void
}
```

Generic error state used by `ErrorBoundary` and query error states.

### `ForbiddenPage.tsx`
Rendered by `ProtectedRoute` when the user lacks the required role. Displays
a `403` message with a link back to `/dashboard`.

**Props:** none.

### `NotFoundPage.tsx`
Rendered for unmatched routes (`*`). Displays a `404` message with a link
back to `/dashboard`.

**Props:** none.

---

## Hooks (`src/hooks/`)

One file per module. Each file exports named hooks for queries and mutations.

### `useAuth.ts`
Re-exports `useAuth` from `AuthContext`. Convenience re-export so import
paths are consistent (`@/hooks/useAuth` everywhere).

Also exports mutation wrappers if needed (e.g. `useLogout` as a TanStack
mutation that calls `AuthContext.logout()`).

### `useInventory.ts`
```ts
useItems(params)           // useQuery — GET /inventory/items
useItem(id)                // useQuery — GET /inventory/items/:id
useCreateItem()            // useMutation — POST /inventory/items
useUpdateItem()            // useMutation — PATCH /inventory/items/:id
useDeleteItem()            // useMutation — DELETE /inventory/items/:id
useCategories()            // useQuery — GET /inventory/categories
useLocations()             // useQuery — GET /inventory/locations
useItemStock(id)           // useQuery — GET /inventory/items/:id/stock
useCreateTransaction()     // useMutation — POST /inventory/transactions
```

### `useBookings.ts`
```ts
useResources(params)           // useQuery — GET /bookings/resources
useAvailability(id, start, end) // useQuery — GET /bookings/resources/:id/availability
useReservations(params)        // useQuery — GET /bookings/reservations
useReservation(id)             // useQuery — GET /bookings/reservations/:id
useCreateReservation()         // useMutation — POST /bookings/reservations
useUpdateReservation()         // useMutation — PATCH /bookings/reservations/:id
useReviewReservation()         // useMutation — POST /bookings/reservations/:id/review
```

### `useUsers.ts`
```ts
useMe()                        // useQuery — GET /users/me
useUsers(params)               // useQuery — GET /users
useUser(id)                    // useQuery — GET /users/:id
useUpdateUser()                // useMutation — PATCH /users/:id
useRoles()                     // useQuery — GET /users/roles
useRolePermissions(roleId)     // useQuery — GET /users/roles/:role_id/permissions
useAssignRole()                // useMutation — POST /users/:id/roles
useRemoveRole()                // useMutation — DELETE /users/:id/roles/:role_id
```

### `useAudit.ts`
```ts
useAuditEvents(params)         // useQuery — GET /audit/events
useAuditEvent(id)              // useQuery — GET /audit/events/:id
```

### `useAnalytics.ts`
```ts
useInventorySnapshots(params)  // useQuery — GET /analytics/inventory/snapshots
useBookingMetrics(params)      // useQuery — GET /analytics/bookings/metrics
```

---

## Pages

### Auth Pages

All auth pages share a consistent layout: centered card, app name at top,
form below, link to related page at bottom (e.g. "Already have an account?
Login"). No `AppShell` — public routes render without sidebar/navbar.

#### `LoginPage.tsx`
- Zod schema: `{ email: string, password: string }`
- On submit: call `auth.login()`, then `users.getMe()`, then per-role
  `users.getRolePermissions()`, then call `AuthContext.login()` with resolved
  state, then redirect to `/dashboard`
- Reads `?registered=true` from URL to display success banner
- Distinguishes `403` error codes: inactive vs unverified
- OAuth buttons: "Continue with Google" and "Continue with GitHub" — these
  are plain anchor tags pointing to `/api/v1/auth/oauth/google` and
  `/api/v1/auth/oauth/github` (not Axios calls — full page navigations)

#### `RegisterPage.tsx`
- Zod schema: `{ full_name: string, email: string, password: string, confirm_password: string }`
- `confirm_password` validated client-side via `.refine()` — not sent to API
- On success: redirect to `/login?registered=true`

#### `VerifyEmailPage.tsx`
- No form. On mount reads `?token` from URL and calls `auth.verifyEmail(token)`
- Displays loading state while call is in flight
- Renders success or error message based on result

#### `ForgotPasswordPage.tsx`
- Zod schema: `{ email: string }`
- Always shows success message after submit regardless of response

#### `ResetPasswordPage.tsx`
- Zod schema: `{ password: string, confirm_password: string }`
- Reads `?token` from URL on mount, passes it with form data on submit

---

### `DashboardPage.tsx`
No API calls. Reads entirely from `AuthContext`. Displays welcome message,
roles, and role-filtered quick links to other sections. This is the first
page that validates the conditional rendering pattern end-to-end.

---

### Inventory Pages

#### `InventoryListPage.tsx`
Owns the list + create modal. Local state: `isCreateModalOpen: boolean`.

**Child components:**
- `ItemFilters` — search input, category dropdown, bookable toggle, low
  stock toggle. Lifts filter state up to `InventoryListPage` via props.
- `ItemCard` (or table row) — renders one item. Receives item data as prop.
  Delete button gated on `isAdmin`.
- `CreateItemModal` — controlled by `isCreateModalOpen`. On success calls
  `queryClient.invalidateQueries(['inventory', 'items'])` and closes.

#### `InventoryItemPage.tsx`
Reads item id from `useParams()`. Fetches via `useItem(id)`.

**Child components:**
- `StockLevelTable` — renders stock levels array. Props: `stockLevels: StockLevel[]`
- `EditItemForm` — inline form, shown when edit mode is active. Receives
  current item (including `version`) as prop. On success invalidates
  `['inventory', 'items', id]`.

---

### Booking Pages

#### `BookingsListPage.tsx`
Owns the list + create modal. Local state: `isCreateModalOpen: boolean`.

**Child components:**
- `ReservationFilters` — status filter, date range. Admin/manager also gets
  a user filter. Lifts state up via props.
- `ReservationCard` — one reservation row. Props: `reservation: Reservation`.
  Shows `ReviewActions` if user has `bookings:approve`.
- `CreateReservationModal` — resource dropdown, quantity, datetime pickers.
  Triggers `useAvailability` query when resource + times are set. Displays
  `AvailabilityBadge` inline before submit.
- `AvailabilityBadge` — props: `availability: Availability | undefined, isLoading: boolean`.
  Shows available quantity or loading state.
- `ReviewActions` — props: `reservationId: string, onSuccess: () => void`.
  Renders Approve / Reject buttons. Calls `useReviewReservation()`.

#### `BookingDetailPage.tsx`
Reads id from `useParams()`. Fetches via `useReservation(id)`.
Cancel button visible if `status === 'pending'` and `reservation.requested_by === user.id`.
`ReviewActions` visible if `canApproveBookings`.

---

### Users Pages

#### `UsersListPage.tsx`
**Child components:**
- `UserFilters` — department, role, active status filters.
- `UserCard` — one user row. "Assign Role" and "Deactivate" gated on `isAdmin`.

#### `UserDetailPage.tsx`
Reads id from `useParams()`.

**Child components:**
- `RoleAssignmentForm` — dropdown of available roles from `useRoles()`.
  Assign and remove buttons. Gated on `isAdmin`.

---

### `AuditPage.tsx`

**Child components:**
- `AuditFilters` — module, action, actor ID, date range filters.
- `AuditEventRow` — one event row. Props: `event: AuditEvent`. Displays
  `payload` as a collapsed JSON block, expandable on click.

---

### `AnalyticsPage.tsx`

**Child components:**
- `DateRangeFilter` — shared date range picker. Props:
  `from: string, to: string, onChange: (from, to) => void`
- `InventorySnapshotChart` — line chart of stock over time. Props:
  `snapshots: InventorySnapshot[], isLoading: boolean`
- `BookingMetricsChart` — bar/line chart of booking stats over time. Props:
  `metrics: BookingMetric[], isLoading: boolean`

Charts use a lightweight charting library. Since no charting library was
explicitly specified, **Recharts** is recommended — it is React-native,
well-maintained, and has no additional install friction.

---

## Conditional Rendering Reference

Established in `AuthContext`, used consistently across all components:

```ts
const { roles, permissions } = useAuth()

const isAdmin = roles.some(r => r.name === 'admin')
const isManager = roles.some(r => r.name === 'manager')
const isAdminOrManager = isAdmin || isManager
const canWriteInventory = permissions.includes('inventory:write')
const canApproveBookings = permissions.includes('bookings:approve')
```

| Gate                  | Used on                                              |
|-----------------------|------------------------------------------------------|
| `isAdmin`             | Delete item, deactivate user, assign/remove roles, audit nav |
| `isAdminOrManager`    | Users nav, analytics nav, see all reservations       |
| `canWriteInventory`   | Add item button, edit item button                    |
| `canApproveBookings`  | Approve/Reject buttons on reservations               |

---

## Implementation Order

Follow this sequence to avoid building components that depend on unbuilt ones:

1. `src/types/` — all DTO types
2. `src/api/axios.ts` — Axios instance (interceptors wired after context)
3. `src/api/*.ts` — all API functions
4. `AuthContext.tsx` + `useAuth.ts`
5. `src/hooks/*.ts` — all TanStack Query hooks
6. Shared components: `LoadingSpinner`, `PageError`, `ForbiddenPage`,
   `NotFoundPage`, `ProtectedRoute`
7. Layout: `AppShell`, `Sidebar`, `Navbar`
8. `router.tsx` + `main.tsx`
9. Auth pages (establishes the full auth flow end-to-end)
10. `DashboardPage`
11. Inventory pages
12. Booking pages
13. Users pages
14. Audit page
15. Analytics page