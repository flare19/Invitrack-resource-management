# Frontend Routes — Invitrack

All routes are defined in `src/main.tsx` or a dedicated `src/router.tsx`.
Public routes are accessible without authentication. Protected routes redirect
to `/login` if the user is not authenticated. Role-gated routes render a `403`
page if the authenticated user lacks the required role.

---

## Route Table

| Path                        | Page Component         | Protection       | Notes                                 |
|-----------------------------|------------------------|------------------|---------------------------------------|
| `/`                         | —                      | —                | Redirects to `/dashboard` or `/login` |
| `/login`                    | `LoginPage`            | Public           |                                       |
| `/register`                 | `RegisterPage`         | Public           |                                       |
| `/verify-email`             | `VerifyEmailPage`      | Public           | Reads `?token` from URL               |
| `/forgot-password`          | `ForgotPasswordPage`   | Public           |                                       |
| `/reset-password`           | `ResetPasswordPage`    | Public           | Reads `?token` from URL               |
| `/dashboard`                | `DashboardPage`        | Authenticated    |                                       |
| `/inventory`                | `InventoryListPage`    | Authenticated    |                                       |
| `/inventory/:id`            | `InventoryItemPage`    | Authenticated    |                                       |
| `/bookings`                 | `BookingsListPage`     | Authenticated    |                                       |
| `/bookings/:id`             | `BookingDetailPage`    | Authenticated    |                                       |
| `/users`                    | `UsersListPage`        | admin / manager  |                                       |
| `/users/:id`                | `UserDetailPage`       | admin / manager  |                                       |
| `/audit`                    | `AuditPage`            | admin            |                                       |
| `/analytics`                | `AnalyticsPage`        | admin / manager  |                                       |
| `*`                         | `NotFoundPage`         | —                | 404 fallback                          |

---

## Public Routes

### `/login` — `LoginPage`

**Purpose:** Authenticate an existing account.

**API calls:**
- `POST /auth/login` — submit credentials
- `GET /users/me` — hydrate auth context after successful login

**Behaviour:**
- On success: store access token in `AuthContext`, hydrate roles and
  permissions from `GET /users/me`, redirect to `/dashboard`
- On `401`: display "Invalid email or password"
- On `403` (inactive account): display "Your account has been deactivated"
- On `403` (unverified email): display "Please verify your email before logging in"
- If already authenticated: redirect to `/dashboard`

**Form fields:**
- `email` — required, valid email format
- `password` — required

---

### `/register` — `RegisterPage`

**Purpose:** Create a new account.

**API calls:**
- `POST /auth/register`

**Behaviour:**
- On success (`201`): redirect to `/login` with a query param
  `?registered=true` so `LoginPage` can display "Check your email to verify
  your account"
- On `409`: display "An account with this email already exists"
- On `422`: display field-level validation errors
- If already authenticated: redirect to `/dashboard`

**Form fields:**
- `full_name` — required
- `email` — required, valid email format
- `password` — required, minimum 8 characters
- `confirm_password` — required, must match `password` (client-side only)

---

### `/verify-email` — `VerifyEmailPage`

**Purpose:** Confirm email ownership via a token sent in the verification email.

**API calls:**
- `GET /auth/verify-email?token=<token>`

**Behaviour:**
- On mount: read `token` from URL query params, call the API immediately
- On success: display "Email verified successfully" with a link to `/login`
- On `400` (invalid or expired token): display "This verification link is
  invalid or has expired" with an option to request a new one (deferred —
  no resend endpoint exists yet)
- No form fields — this page is purely a token consumer

---

### `/forgot-password` — `ForgotPasswordPage`

**Purpose:** Request a password reset email.

**API calls:**
- `POST /auth/forgot-password`

**Behaviour:**
- Always display "If that email is registered, you will receive a reset link
  shortly" after submission — never reveal whether the email exists (`202`
  is always returned by the backend regardless)
- No error states to surface beyond network failure

**Form fields:**
- `email` — required, valid email format

---

### `/reset-password` — `ResetPasswordPage`

**Purpose:** Set a new password using a token from the reset email.

**API calls:**
- `POST /auth/reset-password`

**Behaviour:**
- On mount: read `token` from URL query params
- On success: display "Password updated successfully" with a link to `/login`
- On `400` (invalid, expired, or already used token): display "This reset
  link is invalid or has expired"

**Form fields:**
- `password` — required, minimum 8 characters
- `confirm_password` — required, must match `password` (client-side only)

---

## Authenticated Routes

All routes below redirect to `/login` if the user is not authenticated.
Rehydration (page refresh) shows a full-page spinner until `AuthContext`
resolves — no redirect fires during rehydration.

---

### `/dashboard` — `DashboardPage`

**Purpose:** Authenticated landing page. Shows user identity and a summary
of what the user has access to.

**API calls:** None on mount — all data comes from `AuthContext`.

**Behaviour:**
- Display `user.full_name` and `user.email`
- Display the user's current roles
- Show navigation links filtered by role and permissions:
  - Inventory — visible to all authenticated users
  - Bookings — visible to all authenticated users
  - Users — visible to admin and manager only
  - Audit — visible to admin only
  - Analytics — visible to admin and manager only
- This is where the conditional rendering pattern is first established
  and validated

---

### `/inventory` — `InventoryListPage`

**Purpose:** Paginated, searchable list of inventory items. Also owns the
create item flow via an inline modal — no separate `/inventory/new` route.

**API calls:**
- `GET /inventory/items` — with `page`, `per_page`, `search`, `category_id`,
  `is_bookable`, `low_stock` query params
- `POST /inventory/items` — submitted from the create modal

**Behaviour:**
- All authenticated users can view the list
- "Add Item" button visible only to users with `inventory:write` permission;
  clicking it opens a modal form over the list page
- On successful create: close modal, invalidate `['inventory', 'items']`
  query cache, list refreshes automatically
- "Delete" action visible only to admin role
- Supports search by name or SKU
- Supports filter by category and bookable status

**Create modal fields:**
- `sku` — required
- `name` — required
- `unit` — required
- `description` — optional
- `category_id` — optional, dropdown from `GET /inventory/categories`
- `reorder_threshold` — optional, defaults to `0`
- `is_bookable` — optional, defaults to `false`

---

### `/inventory/:id` — `InventoryItemPage`

**Purpose:** Detail view for a single inventory item, including stock levels.

**API calls:**
- `GET /inventory/items/:id` — item detail with stock levels

**Behaviour:**
- All authenticated users can view
- "Edit" action visible only to users with `inventory:write` permission
- "Delete" action visible only to admin role
- Displays stock levels across all locations
- Edit triggers an inline form with optimistic lock version pre-filled

---

### `/bookings` — `BookingsListPage`

**Purpose:** List of reservations scoped by role per backend behaviour. Also
owns the create reservation flow via an inline modal — no separate
`/bookings/new` route.

**API calls:**
- `GET /bookings/reservations` — backend automatically scopes by role
- `GET /bookings/resources` — populates resource dropdown in create modal
- `GET /bookings/resources/:id/availability` — checked when user selects a
  resource and time window in the create modal
- `POST /bookings/reservations` — submitted from the create modal

**Behaviour:**
- Employees see only their own reservations
- Admins and managers see all reservations with optional filter by user
- "New Reservation" button visible to all authenticated users; clicking it
  opens a modal form over the list page
- On successful create: close modal, invalidate `['bookings', 'reservations']`
  query cache, list refreshes automatically
- "Approve / Reject" actions visible only to users with `bookings:approve`
  permission

**Create modal fields:**
- `resource_id` — required, dropdown from `GET /bookings/resources`
- `quantity` — required, must be > 0
- `start_time` — required, datetime picker
- `end_time` — required, datetime picker, must be after `start_time`
- `notes` — optional
- Availability check fires when `resource_id`, `start_time`, and `end_time`
  are all set — displays available quantity before the user submits

---

### `/bookings/:id` — `BookingDetailPage`

**Purpose:** Detail view for a single reservation.

**API calls:**
- `GET /bookings/reservations/:id`

**Behaviour:**
- Employees can view their own reservations only (backend enforces `403`)
- Cancel button visible if reservation is `pending` and belongs to the user
- Approve / Reject visible to users with `bookings:approve` permission

---

## Role-Gated Routes

Routes below render a `403` page if the user lacks the required role.
The `<ProtectedRoute>` wrapper handles this check before rendering the page.

---

### `/users` — `UsersListPage`

**Required role:** `admin` or `manager`

**API calls:**
- `GET /users` — paginated list with optional filters

**Behaviour:**
- Displays all user profiles
- Filter by department, role, active status
- "Assign Role" and "Deactivate" actions visible to admin only

---

### `/users/:id` — `UserDetailPage`

**Required role:** `admin` or `manager`

**API calls:**
- `GET /users/:id`
- `GET /users/roles` — for role assignment dropdown

**Behaviour:**
- Full profile view
- Role assignment and removal — admin only
- Account deactivation — admin only

---

### `/audit` — `AuditPage`

**Required role:** `admin`

**API calls:**
- `GET /audit/events` — paginated with filters

**Behaviour:**
- Read-only log of all system events
- Filter by module, action, actor, date range
- No mutations — append-only, display only

---

### `/analytics` — `AnalyticsPage`

**Required role:** `admin` or `manager`

**API calls:**
- `GET /analytics/inventory/snapshots`
- `GET /analytics/bookings/metrics`

**Behaviour:**
- Stock trend chart per item over time (from snapshots)
- Booking metrics chart per resource over time
- Date range filter on both

---

## 404 Fallback

### `*` — `NotFoundPage`

Rendered for any path that does not match a defined route. Displays a simple
"Page not found" message with a link back to `/dashboard`.

---

## Navigation Structure

The app shell (`AppShell`) renders a persistent sidebar or top nav. Navigation
items are conditionally rendered based on `AuthContext`:

```
Dashboard         → always visible when authenticated
Inventory         → always visible when authenticated
Bookings          → always visible when authenticated
Users             → visible to admin and manager only
Audit             → visible to admin only
Analytics         → visible to admin and manager only
```

Active route is highlighted. Unauthenticated users see no navigation —
public pages render without the app shell.

---

## Redirect Logic Summary

| Condition                              | Redirect to   |
|----------------------------------------|---------------|
| Unauthenticated, hits protected route  | `/login`      |
| Authenticated, hits `/login`           | `/dashboard`  |
| Authenticated, hits `/register`        | `/dashboard`  |
| Authenticated, hits `/`               | `/dashboard`  |
| Unauthenticated, hits `/`             | `/login`      |
| Insufficient role, hits role-gated route | `403` page  |
| Unknown path                           | `404` page    |