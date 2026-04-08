# Bookings Module UI Implementation Plan

## 1. Overview

Implement a complete bookings/reservations UI module for the Invitrack frontend following the established patterns from the inventory module. The bookings system allows users to create reservations for shared resources with temporal scheduling, availability checking, and approval workflows.

---

## 2. Feature Scope

### 2.1 Reservation Management (Core)
- **List page** (`/bookings`) — paginated list of reservations
  - Employees see only their own reservations
  - Admins/managers see all with optional user filter
  - Filter by: status, date range, resource (admin/manager only)
  - Status badge showing pending/approved/rejected/cancelled state
  - Inline approve/reject actions (if user has `bookings:approve` permission)
  - Create reservation button → inline modal

- **Detail page** (`/bookings/:id`) — single reservation view
  - Full reservation info: resource name, quantity, time window, status
  - Cancel button (if reservation is pending and user owns it)
  - Approve/Reject actions (if user has `bookings:approve` permission)
  - Display reviewer info if already approved/rejected

- **Create reservation modal**
  - Resource selection dropdown
  - Quantity input (must be > 0, ≤ available)
  - Start/end time datetime pickers
  - Notes field (optional)
  - Real-time availability display below time pickers
    - Shows total/available/reserved quantities for selected time window
    - Updates when any of [resource, start_time, end_time] changes
  - Submit validation: end_time > start_time, quantity ≤ available
  - Error handling: 409 conflict if no availability, 404 if resource not found
  - Success: close modal, refresh reservation list

- **Update/Cancel reservation**
  - User can update notes and cancel own pending reservations
  - Admin/manager can edit quantity, times, or cancel any pending reservation
  - Triggered from detail page or inline action

- **Review actions** (approve/reject)
  - 2-button pattern: Approve | Reject
  - Optional notes field for reviewer comment
  - Updates status and sets reviewed_by/reviewed_at
  - Available to users with `bookings:approve` permission

### 2.2 Resource Management (Admin/Manager Only)
- **Resource creation** (triggered from InventoryListPage for is_bookable items)
  - Simple modal: select item + enter display name + set quantity
  - Validates item has is_bookable=true
  - Success: item is now available for bookings

- **Resource listing** (optional dashboard or separate page)
  - Admin/manager can view all resources
  - Edit/deactivate actions

### 2.3 Not Implemented (Documented for Future)
- Analytics dashboard for booking metrics
- Bulk operations (cancel multiple reservations)
- Resource availability calendar view
- Email notifications on approval/rejection
- Recurring reservations
- Waitlist/backlog for overbooked requests

---

## 3. Architecture & File Structure

```
frontend/
  src/
    api/
      bookings.ts              # API layer functions + type defs
    components/                # Shared UI components
      ui/                      # shadcn/ui (generated)
      shared/                  # Existing: ProtectedRoute, ErrorBoundary, etc.
    hooks/
      useBookings.ts           # TanStack Query hooks + key factory
    pages/
      bookings/
        BookingsListPage.tsx   # List + create modal
        BookingDetailPage.tsx  # Single reservation detail
        components/
          ReservationCard.tsx          # Card/row for one reservation
          ReservationFilters.tsx       # Status, date, user filters
          CreateReservationModal.tsx   # Create/edit form in modal
          AvailabilityBadge.tsx        # Real-time availability indicator
          ReviewActions.tsx            # Approve/Reject buttons + notes
    types/
      bookings.ts              # Resource, Reservation, Availability DTOs
    lib/
      utils.ts                 # Add datetime formatting helpers
```

---

## 4. Data Types & Contracts

### 4.1 DTOs (src/types/bookings.ts) — Mirror backend exactly
```ts
// Resources
type Resource = {
  id: string
  item_id: string
  name: string
  quantity: number
  is_active: boolean
  created_at: string
}

// Reservations
type Reservation = {
  id: string
  resource_id: string
  requested_by: string
  quantity: number
  start_time: string          // ISO8601
  end_time: string            // ISO8601
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  priority: number
  notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

// Availability check result
type Availability = {
  resource_id: string
  total_quantity: number
  reserved_quantity: number
  available_quantity: number
  start_time: string
  end_time: string
}
```

### 4.2 Form Schemas (component-local with Zod)
```ts
// CreateReservationForm
{
  resource_id: string (required, non-empty UUID)
  quantity: number (required, int > 0)
  start_time: string (required, valid ISO8601)
  end_time: string (required, valid ISO8601, > start_time)
  notes: string (optional, max 500 chars)
}

// ReviewReservationForm
{
  action: 'approve' | 'reject' (required)
  notes: string (optional, max 500 chars)
}

// UpdateReservationForm (subset for non-admin users)
{
  notes: string (optional)
  status: 'cancelled' (only option for regular user)
}
```

---

## 5. API Layer (src/api/bookings.ts)

Functions organized by resource type with inline type definitions:

```ts
// Resources
export type GetResourcesParams = { page?: number; per_page?: number; is_active?: boolean }
export type CreateResourceBody = { item_id: string; name: string; quantity: number }
export type UpdateResourceBody = { name?: string; quantity?: number; is_active?: boolean }

getResources(params) → Promise<PaginatedResponse<Resource>>
getResource(id) → Promise<Resource>
createResource(body) → Promise<Resource>
updateResource(id, body) → Promise<Resource>

// Availability
getAvailability(resourceId, startTime, endTime) → Promise<Availability>

// Reservations
export type GetReservationsParams = {
  page?: number
  per_page?: number
  resource_id?: string
  status?: string
  requested_by?: string  // admin/manager only
  from?: string          // ISO8601
  to?: string            // ISO8601
}
export type CreateReservationBody = {
  resource_id: string
  quantity: number
  start_time: string
  end_time: string
  notes?: string
}
export type UpdateReservationBody = {
  notes?: string
  status?: string
  quantity?: number
  start_time?: string
  end_time?: string
}
export type ReviewReservationBody = { action: 'approve' | 'reject'; notes?: string }

getReservations(params) → Promise<PaginatedResponse<Reservation>>
getReservation(id) → Promise<Reservation>
createReservation(body) → Promise<Reservation>
updateReservation(id, body) → Promise<Reservation>
reviewReservation(id, body) → Promise<Reservation>
```

---

## 6. Hooks Layer (src/hooks/useBookings.ts)

Query key factory pattern + TanStack Query hooks:

```ts
// Query key factory
export const bookingKeys = {
  all: ['bookings'] as const,
  resources: () => [...bookingKeys.all, 'resources'] as const,
  resources_list: (params) => [...bookingKeys.resources(), params] as const,
  resource: (id) => [...bookingKeys.all, 'resources', id] as const,
  reservations: () => [...bookingKeys.all, 'reservations'] as const,
  reservations_list: (params) => [...bookingKeys.reservations(), params] as const,
  reservation: (id) => [...bookingKeys.all, 'reservations', id] as const,
  availability: (resourceId, startTime, endTime) =>
    [...bookingKeys.all, 'availability', resourceId, startTime, endTime] as const,
}

// Queries
useResources(params?, options?) → UseQueryResult<PaginatedResponse<Resource>>
useResource(id, options?) → UseQueryResult<Resource>
useReservations(params?, options?) → UseQueryResult<PaginatedResponse<Reservation>>
useReservation(id, options?) → UseQueryResult<Reservation>
useAvailability(resourceId, startTime?, endTime?, options?) → UseQueryResult<Availability | undefined>
  Note: returns undefined if resourceId/startTime/endTime not all provided

// Mutations
useCreateResource() → UseMutationResult
  onSuccess: invalidate resources() cache
useUpdateResource() → UseMutationResult
  onSuccess: invalidate resources() cache and specific resource cache
useCreateReservation() → UseMutationResult
  onSuccess: invalidate reservations() cache
useUpdateReservation(id) → UseMutationResult
  onSuccess: invalidate reservations() cache and specific id cache
useReviewReservation(id) → UseMutationResult
  onSuccess: invalidate reservations() cache and specific id cache
```

---

## 7. Pages & Components

### 7.1 BookingsListPage (src/pages/bookings/BookingsListPage.tsx)

**Container component** managing list + create modal state.

**Local state:**
- `isCreateModalOpen: boolean`
- `filters: { status?, from?, to?, requested_by? }`

**API calls:**
- `useReservations(params)` — list with filters
- `useResources()` — for create modal resource dropdown

**Child components:**
- `ReservationFilters` — lifts filter state up
- `ReservationCard` (or table rows) — renders each reservation
- `CreateReservationModal` — controlled by isCreateModalOpen

**Behaviour:**
- All authenticated users can access this page
- Employees see only own reservations (backend enforces)
- Admins/managers see all with optional user filter
- Status filter: dropdown [pending, approved, rejected, cancelled]
- Date range filter: from/to date pickers
- "New Reservation" button opens create modal
- On create success: close modal, invalidate list cache
- Approve/Reject actions visible only to users with `bookings:approve`

---

### 7.2 BookingDetailPage (src/pages/bookings/BookingDetailPage.tsx)

**Container component** for single reservation view.

**API calls:**
- `useReservation(id)` — get single reservation
- `useAuth()` — check permissions and user id

**Child components:**
- `ReviewActions` (if applicable) — approve/reject buttons
- Inline display of reservation data

**Behaviour:**
- Employees can view only their own (`requested_by === currentUserId`)
- Backend enforces 403 if accessing others' reservations
- Cancel button visible if `status === 'pending'` and `requested_by === userId`
- Review actions visible if `permissions.includes('bookings:approve')`
- On cancel/review success: invalidate reservation cache, navigate back or refresh

---

### 7.3 ReservationCard (components/bookings/ReservationCard.tsx)

**Props:**
```ts
{
  reservation: Reservation
  onCancel?: () => void
  onApprove?: () => void
  onReject?: () => void
  showActions?: boolean  // default: true
  compact?: boolean      // default: false (table row vs card view)
}
```

**Renders:**
- Resource name linked to `/bookings/:id` (if compact mode, just text)
- Quantity
- Time window (start_time - end_time)
- Status badge (color-coded: pending=yellow, approved=green, rejected=red, cancelled=gray)
- Notes preview (truncated)
- Inline actions: Cancel (if applicable), Approve, Reject, Review (if user is reviewer)

---

### 7.4 ReservationFilters (components/bookings/ReservationFilters.tsx)

**Props:**
```ts
{
  filters: { status?: string; from?: string; to?: string; requested_by?: string }
  onFilterChange: (newFilters) => void
  showUserFilter?: boolean  // true for admin/manager only
}
```

**Renders:**
- Status filter (dropdown): All, Pending, Approved, Rejected, Cancelled
- Date range: from (date picker) - to (date picker)
- User filter (admin/manager only): dropdown or search
- Clear filters button

---

### 7.5 CreateReservationModal (components/bookings/CreateReservationModal.tsx)

**Props:**
```ts
{
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}
```

**Form fields:**
1. **Resource dropdown** — `useResources()` fetches list
2. **Quantity input** — number > 0
3. **Start time datetime picker** — ISO8601
4. **End time datetime picker** — ISO8601
5. **Notes textarea** — optional
6. **Availability display** — triggers `useAvailability()` when resource + times all set
   - Shows: total / available / requested quantities
   - Updates in real-time as times change
   - Disables submit if quantity > available
7. **Submit validation:**
   - All required fields filled
   - end_time > start_time
   - quantity ≤ available_quantity
   - quantity > 0
8. **Error handling:**
   - 409 conflict: display "Requested quantity not available for this time window"
   - 404 not found: "Resource no longer available"
   - Other errors: generic "Failed to create reservation"
9. **Success:** close modal, trigger `onSuccess()` callback (parent refreshes list)

**Implementation notes:**
- Form schema uses Zod for validation
- useCreateReservation() mutation handles API call
- useAvailability() query is triggered dynamically (enabled when conditions met)
- Datetime pickers: use shadcn/ui native datetime components or a lightweight library

---

### 7.6 AvailabilityBadge (components/bookings/AvailabilityBadge.tsx)

**Props:**
```ts
{
  availability?: Availability
  isLoading?: boolean
  requestedQuantity?: number
}
```

**Renders:**
- If loading: spinner + "Checking availability..."
- If no availability data: "Select a resource and time window"
- If availability data:
  - If available_quantity ≥ requestedQuantity: green badge "X available"
  - If available_quantity < requestedQuantity: red badge "Only X available (need Y)"
  - Display: "Total: Z | Reserved: W | Available: X"

---

### 7.7 ReviewActions (components/bookings/ReviewActions.tsx)

**Props:**
```ts
{
  reservationId: string
  onSuccess?: () => void
  compact?: boolean  // default: false (inline buttons vs modal form)
}
```

**Renders (if compact=false):**
- Modal with two equal-width buttons: Approve | Reject
- Optional notes field (textarea, max 500 chars)
- Submit button

**Renders (if compact=true):**
- Two icon buttons side-by-side

**Behaviour:**
- useReviewReservation(reservationId) mutation
- On success: close modal, trigger onSuccess() (parent refreshes)
- On error (409 status): "This reservation is no longer pending. It may have been approved/rejected by another user."

---

## 8. Implementation Dependencies & Order

Follow this sequence to avoid circular dependencies:

1. **Types** (`src/types/bookings.ts`) — DTOs only
2. **API** (`src/api/bookings.ts`) — functions + inline type defs
3. **Hooks** (`src/hooks/useBookings.ts`) — TanStack Query hooks
4. **Components** (bottom-up):
   - `AvailabilityBadge` — presentational, no hooks needed beyond props
   - `ReservationCard` — presentational
   - `ReviewActions` — uses useReviewReservation() mutation
   - `ReservationFilters` — presentational
   - `CreateReservationModal` — uses useCreateReservation(), useAvailability(), useResources()
5. **Pages**:
   - `BookingDetailPage` — uses useReservation(), child: ReviewActions
   - `BookingsListPage` — uses useReservations(), useResources(); children: all components above
6. **Router update** — add routes for `/bookings` and `/bookings/:id`

---

## 9. Testing Strategy

- **Types**: Full DTO coverage (ensure accuracy vs backend)
- **Hooks**: Mock API layer, test query key factories, cache invalidation
- **Components**:
  - `ReservationCard`: render with various statuses, permission gating
  - `CreateReservationModal`: form validation, availability badge interaction, error states
  - `ReviewActions`: approve/reject flows, notes submission
  - `BookingsListPage`: filter interaction, success/error states
- **Pages**: Full user flow (login → create → view → review)

---

## 10. Known Issues & Edge Cases (Documented for Future)

### 10.1 Not Handling Yet
- [ ] Timezone conversion — API uses UTC, frontend uses local. No strategy yet (use library?)
- [ ] Pagination for availability (likely not needed — single resource + time window)
- [ ] Resource created_at filter in API — unusual parameter, likely not used in UI
- [ ] Time picker UX for mobile
- [ ] Bulk operations (cancel many at once)

### 10.2 Backend Inconsistencies (Flagged, Not Fixing)
- [ ] `GET /bookings/resources` has a `created_at` query param that doesn't make sense (default Now()? unclear)
- [ ] Resource update doesn't include item_id in response (minor)

---

## 11. Acceptance Criteria

### Before Code Starts
- [ ] Plan reviewed and approved by user
- [ ] Type definitions match backend API reference exactly
- [ ] API functions match backend endpoint contracts

### During Implementation
- [ ] All CRUD operations tested manually
- [ ] Error states handled (409 conflict, 404 not found, 422 validation)
- [ ] Permission checks working (employees see own only, admins see all)
- [ ] Availability badge updates in real-time
- [ ] Datetime pickers work (valid ISO8601 format)
- [ ] Mutations invalidate correct cache keys

### After Implementation
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] Unit tests pass (`npm run test:run`)
- [ ] Integration test for full booking flow
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Accessibility: keyboard nav, screen reader labels

---

## 12. Notes for Developer

- Do NOT touch backend — document issues and revisit later
- Follow inventory module patterns exactly
- Keep datetime handling simple (no client-side timezone conversion at this stage)
- Use `getErrorMessage()` utility for error display consistency
- Always invalidate parent query keys, not just specific items
- Test availability badge in isolation first (complex interaction)
- Time pickers: prefer native HTML5 `<input type="datetime-local">` if possible, fallback to shadcn component

---

**Plan Status:** Ready for implementation review.
