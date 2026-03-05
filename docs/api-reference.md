# API Reference — Invitrack

All endpoints are prefixed with `/api/v1`. Requests and responses use `application/json`. All timestamps are returned as ISO 8601 strings in UTC (e.g. `2024-03-06T10:00:00Z`), reflecting the `TIMESTAMPTZ` storage convention used throughout the database.

Authentication uses short-lived JWT access tokens passed as a `Bearer` token in the `Authorization` header, plus a longer-lived refresh token stored in an `HttpOnly` cookie.

---

## Auth

### `POST /auth/register`

Creates a new account in `auth.accounts` and a matching profile row in `users.profiles`. The email is lowercased before insert (database constraint). A verification email is dispatched after successful creation. Don't forget about default role assignment and seeded admin role.

**Request body**

| Field        | Type   | Required | Notes                        |
|--------------|--------|----------|------------------------------|
| `email`      | string | Yes      | Must be unique               |
| `password`   | string | Yes      | Min 8 characters             |
| `full_name`  | string | Yes      | Stored in `users.profiles`   |

**Response `201`**

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "is_verified": false,
  "created_at": "2024-03-06T10:00:00Z"
}
```

**Errors**

| Status | Reason                        |
|--------|-------------------------------|
| `409`  | Email already registered      |
| `422`  | Validation failure            |

---

### `POST /auth/login`

Authenticates credentials against `auth.accounts`. On success, creates a row in `auth.sessions` (storing a hashed refresh token, `user_agent`, and `ip_address`) and returns a JWT access token.

**Request body**

| Field      | Type   | Required |
|------------|--------|----------|
| `email`    | string | Yes      |
| `password` | string | Yes      |

**Response `200`**

```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 900
}
```

The refresh token is set as an `HttpOnly` cookie (`refresh_token`).

**Errors**

| Status | Reason                              |
|--------|-------------------------------------|
| `401`  | Invalid credentials                 |
| `403`  | Account inactive (`is_active=false`)|
| `403`  | Email not verified                  |

---

### `POST /auth/refresh`

Rotates the session. Validates the refresh token cookie against `auth.sessions` (comparing the hashed value), issues a new access token, and updates the session record with a new hashed refresh token. All auth endpoints are protected via rate limiting and abuse detection mechanisms (e.g., captcha, throttling).

**Request** — no body; reads the `refresh_token` cookie.

**Response `200`**

```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 900
}
```

**Errors**

| Status | Reason                                          |
|--------|-------------------------------------------------|
| `401`  | Refresh token missing, expired, or not found in `auth.sessions` |

---

### `POST /auth/logout`

Deletes the matching row from `auth.sessions`, invalidating the refresh token. The `HttpOnly` cookie is cleared.

**Request** — no body; reads the `refresh_token` cookie.

**Response `204`** — no content.

---

### `POST /auth/forgot-password`

Creates a row in `auth.password_reset_tokens` with a hashed token and an expiry. Sends a reset email. Always returns `202` to avoid email enumeration.

**Request body**

| Field   | Type   | Required |
|---------|--------|----------|
| `email` | string | Yes      |

**Response `202`** — no content.

---

### `POST /auth/reset-password`

Validates the token against `auth.password_reset_tokens` (must not be expired, must have `used_at = NULL`). On success, updates `auth.accounts.password_hash` and sets `used_at` on the token row.

**Request body**

| Field        | Type   | Required |
|--------------|--------|----------|
| `token`      | string | Yes      | Raw token (server hashes to compare) |
| `password`   | string | Yes      | New password, min 8 characters       |

**Response `200`**

```json
{ "message": "Password updated successfully." }
```

**Errors**

| Status | Reason                             |
|--------|------------------------------------|
| `400`  | Token invalid, expired, or already used |

---

### `GET /auth/verify-email`

Verifies the email address by setting `auth.accounts.is_verified = true`.

**Query parameters**

| Param   | Type   | Required |
|---------|--------|----------|
| `token` | string | Yes      |

**Response `200`**

```json
{ "message": "Email verified successfully." }
```

**Errors**

| Status | Reason               |
|--------|----------------------|
| `400`  | Token invalid or expired |

---

### `GET /auth/oauth/:provider`

Initiates an OAuth flow. Redirects the user to the provider's authorization page. Supported values for `:provider`: `google`, `github`.

---

### `GET /auth/oauth/:provider/callback`

OAuth callback. Looks up or creates an account via `auth.oauth_providers` (unique on `(provider, provider_uid)`). Creates a session and sets the refresh token cookie. Redirects to the frontend on success. Smart! But be aware that many users try to log in with Google after signing up with a password, and get confused if it doesn’t “just work.” Consider a UX-friendly fallback, like sending a “link accounts” email, or suggesting they log in with email/password.

**Errors**

| Status | Reason                        |
|--------|-------------------------------|
| `400`  | State mismatch / CSRF failure |
| `409`  | Email already registered via password |

---

### `GET /auth/sessions`

🔒 _Requires authentication._

Returns all active sessions for the authenticated account from `auth.sessions`.

**Response `200`**

```json
[
  {
    "id": "uuid",
    "user_agent": "Mozilla/5.0 ...",
    "ip_address": "192.168.1.1",
    "expires_at": "2024-03-13T10:00:00Z",
    "created_at": "2024-03-06T10:00:00Z"
  }
]
```

---

### `DELETE /auth/sessions/:id`

🔒 _Requires authentication._

Deletes a specific session row from `auth.sessions`. An account may only delete its own sessions.

**Response `204`** — no content.

**Errors**

| Status | Reason                          |
|--------|---------------------------------|
| `404`  | Session not found               |
| `403`  | Session belongs to another account |

---

## Users

### `GET /users/me`

🔒 _Requires authentication._

Returns the authenticated account's profile from `users.profiles`, joined with role data from `users.account_roles` → `users.roles`. Consider lazy-calculating these on the fly based on roles (join through role_permissions), or caching it per session (optimization).

**Response `200`**

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "is_verified": true,
  "is_active": true,
  "full_name": "Jane Doe",
  "display_name": "Jane",
  "avatar_url": "https://s3.example.com/avatars/uuid.jpg",
  "department": "Engineering",
  "roles": [
    { "id": 2, "name": "manager", "priority": 50 }
  ],
  "created_at": "2024-03-06T10:00:00Z",
  "updated_at": "2024-03-06T10:00:00Z"
}
```

---

### `PATCH /users/me`

🔒 _Requires authentication._

Updates the authenticated user's profile in `users.profiles`. Only the fields listed below are accepted; `id`, `created_at`, and account-level fields are not modifiable here.

**Request body** (all fields optional)

| Field          | Type   | Constraints                  |
|----------------|--------|------------------------------|
| `full_name`    | string | Max 255 chars                |
| `display_name` | string | Max 100 chars                |
| `department`   | string | Max 100 chars                |

**Response `200`** — updated profile object (same shape as `GET /users/me`).

---

### `POST /users/me/avatar`

🔒 _Requires authentication._

Uploads a new avatar. Stores the file in S3 and updates `users.profiles.avatar_url`.

**Request** — `multipart/form-data`

| Field    | Type | Notes                              |
|----------|------|------------------------------------|
| `avatar` | file | JPEG or PNG, max 2 MB              |

**Response `200`**

```json
{ "avatar_url": "https://s3.example.com/avatars/uuid.jpg" }
```

---

### `GET /users`

🔒 _Requires `admin` or `manager` role._

Returns a paginated list of all user profiles. Joins `users.profiles`, `auth.accounts`, and `users.account_roles`. Future option: Add a search query param (e.g., fuzzy search on email, name).

**Query parameters**

| Param        | Type    | Default | Notes                          |
|--------------|---------|---------|--------------------------------|
| `page`       | integer | `1`     |                                |
| `per_page`   | integer | `20`    | Max `100`                      |
| `department` | string  | —       | Filter by department           |
| `role`       | string  | —       | Filter by role name            |
| `is_active`  | boolean | —       | Filter by account active state |

**Response `200`**

```json
{
  "data": [ /* array of profile objects */ ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 150
  }
}
```

---

### `GET /users/:id`

🔒 _Requires `admin` or `manager` role._

Returns a single user profile by their `auth.accounts.id` (UUID).

**Response `200`** — same shape as `GET /users/me`.

**Errors**

| Status | Reason        |
|--------|---------------|
| `404`  | User not found |

---

### `PATCH /users/:id`

🔒 _Requires `admin` role._

Updates a user's profile or account-level fields.

**Request body** (all fields optional)

| Field        | Type    | Notes                                  |
|--------------|---------|----------------------------------------|
| `full_name`  | string  |                                        |
| `display_name` | string |                                       |
| `department` | string  |                                        |
| `is_active`  | boolean | Soft-disables the account in `auth.accounts` |

**Response `200`** — updated profile object.

---

### `GET /users/roles`

🔒 _Requires authentication._

Returns all rows from `users.roles` including `id`, `name`, `description`, and `priority`.

**Response `200`**

```json
[
  { "id": 1, "name": "admin",    "description": "...", "priority": 100 },
  { "id": 2, "name": "manager",  "description": "...", "priority": 50  },
  { "id": 3, "name": "employee", "description": "...", "priority": 10  }
]
```

---

### `POST /users/:id/roles`

🔒 _Requires `admin` role._

Assigns a role to a user. Inserts into `users.account_roles` with `granted_by` set to the authenticated account's ID.

**Request body**

| Field     | Type    | Required |
|-----------|---------|----------|
| `role_id` | integer | Yes      |

**Response `201`**

```json
{
  "account_id": "uuid",
  "role_id": 2,
  "granted_by": "uuid",
  "granted_at": "2024-03-06T10:00:00Z"
}
```

**Errors**

| Status | Reason                        |
|--------|-------------------------------|
| `404`  | User or role not found        |
| `409`  | Role already assigned         |

---

### `DELETE /users/:id/roles/:role_id`

🔒 _Requires `admin` role._

Removes a role assignment from `users.account_roles`.

**Response `204`** — no content.

**Errors**

| Status | Reason               |
|--------|----------------------|
| `404`  | Assignment not found |

---

### `GET /users/permissions`

🔒 _Requires `admin` role._

Returns all rows from `users.permissions`.

**Response `200`**

```json
[
  { "id": 1, "code": "inventory:write", "description": "..." },
  { "id": 2, "code": "bookings:approve", "description": "..." }
]
```

---

### `GET /users/roles/:role_id/permissions`

🔒 _Requires `admin` role._

Returns all permissions assigned to a role via `users.role_permissions`.

**Response `200`** — array of permission objects.

---

### `POST /users/roles/:role_id/permissions`

🔒 _Requires `admin` role._

Assigns a permission to a role. Inserts into `users.role_permissions`.

**Request body**

| Field           | Type    | Required |
|-----------------|---------|----------|
| `permission_id` | integer | Yes      |

**Response `201`**

```json
{ "role_id": 2, "permission_id": 1 }
```

**Errors**

| Status | Reason                          |
|--------|---------------------------------|
| `409`  | Permission already assigned to role |

---

### `DELETE /users/roles/:role_id/permissions/:permission_id`

🔒 _Requires `admin` role._

Removes a permission from a role in `users.role_permissions`.

**Response `204`** — no content.

---

## Inventory

### `GET /inventory/items`

🔒 _Requires authentication._

Returns a paginated list of items from `inventory.items`, optionally filtered.

**Query parameters**

| Param          | Type    | Default | Notes                                       |
|----------------|---------|---------|---------------------------------------------|
| `page`         | integer | `1`     |                                             |
| `per_page`     | integer | `20`    | Max `100`                                   |
| `category_id`  | UUID    | —       | Filter by category                          |
| `is_bookable`  | boolean | —       | Filter to bookable items only               |
| `low_stock`    | boolean | —       | Return items where any location's `quantity` ≤ `reorder_threshold` |
| `search`       | string  | —       | Partial match on `name` or `sku`            |

**Response `200`**

```json
{
  "data": [
    {
      "id": "uuid",
      "sku": "ITEM-001",
      "name": "Projector",
      "description": "4K conference room projector",
      "category_id": "uuid",
      "unit": "pcs",
      "reorder_threshold": 2,
      "is_bookable": true,
      "image_url": "https://s3.example.com/items/uuid.jpg",
      "created_by": "uuid",
      "created_at": "2024-03-06T10:00:00Z",
      "updated_at": "2024-03-06T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "per_page": 20, "total": 42 }
}
```

---

### `POST /inventory/items`

🔒 _Requires `inventory:write` permission._

Creates a new item in `inventory.items`. `created_by` is set to the authenticated account's ID.

**Request body**

| Field               | Type    | Required | Notes                                   |
|---------------------|---------|----------|-----------------------------------------|
| `sku`               | string  | Yes      | Must be unique; max 100 chars           |
| `name`              | string  | Yes      | Max 255 chars                           |
| `description`       | string  | No       |                                         |
| `category_id`       | UUID    | No       | Must exist in `inventory.categories`    |
| `unit`              | string  | Yes      | e.g. `"pcs"`, `"kg"`, `"litres"`       |
| `reorder_threshold` | integer | No       | Default `0`                             |
| `is_bookable`       | boolean | No       | Default `false`                         |

**Response `201`** — created item object.

**Errors**

| Status | Reason                       |
|--------|------------------------------|
| `409`  | SKU already exists           |
| `422`  | Validation failure           |

---

### `GET /inventory/items/:id`

🔒 _Requires authentication._

Returns a single item by UUID, including its current stock levels across all locations (joined from `inventory.stock_levels` and `inventory.locations`).

**Response `200`**

```json
{
  "id": "uuid",
  "sku": "ITEM-001",
  "name": "Projector",
  "unit": "pcs",
  "reorder_threshold": 2,
  "is_bookable": true,
  "stock_levels": [
    { "location_id": "uuid", "location_name": "Warehouse A", "quantity": 5 },
    { "location_id": "uuid", "location_name": "Office Shelf 3", "quantity": 1 }
  ],
  "created_at": "2024-03-06T10:00:00Z",
  "updated_at": "2024-03-06T10:00:00Z"
}
```

**Errors**

| Status | Reason         |
|--------|----------------|
| `404`  | Item not found |

---

### `PATCH /inventory/items/:id`

🔒 _Requires `inventory:write` permission._

Updates an existing item. Only the fields provided are changed; `sku`, `created_by`, and `created_at` are immutable.

**Request body** (all fields optional)

| Field               | Type    |
|---------------------|---------|
| `name`              | string  |
| `description`       | string  |
| `category_id`       | UUID    |
| `unit`              | string  |
| `reorder_threshold` | integer |
| `is_bookable`       | boolean |

**Response `200`** — updated item object.

---

### `DELETE /inventory/items/:id`

🔒 _Requires `admin` role._

Soft-deletes an item by setting `is_active = false` (if such a column is added) or performs a hard delete only when no stock transactions reference the item. The preferred approach per schema conventions is soft deletion.

**Response `204`** — no content.

**Errors**

| Status | Reason                                       |
|--------|----------------------------------------------|
| `409`  | Item has existing transactions; cannot delete |

---

### `GET /inventory/categories`

🔒 _Requires authentication._

Returns all categories from `inventory.categories` as a flat list. Categories form a hierarchy via `parent_id`; `null` means top-level.

**Response `200`**

```json
[
  { "id": "uuid", "name": "Electronics", "parent_id": null, "created_at": "..." },
  { "id": "uuid", "name": "AV Equipment", "parent_id": "uuid", "created_at": "..." }
]
```

---

### `POST /inventory/categories`

🔒 _Requires `inventory:write` permission._

Creates a new category. `parent_id` must reference an existing category if provided.

**Request body**

| Field       | Type   | Required |
|-------------|--------|----------|
| `name`      | string | Yes      |
| `parent_id` | UUID   | No       |

**Response `201`** — created category object.

---

### `GET /inventory/locations`

🔒 _Requires authentication._

Returns all rows from `inventory.locations`. Locations support a hierarchy via `parent_id`.

**Response `200`**

```json
[
  { "id": "uuid", "name": "Warehouse A", "description": "Main store", "parent_id": null },
  { "id": "uuid", "name": "Shelf 3", "description": null, "parent_id": "uuid" }
]
```

---

### `POST /inventory/locations`

🔒 _Requires `admin` or `manager` role._

Creates a new location row.

**Request body**

| Field         | Type   | Required |
|---------------|--------|----------|
| `name`        | string | Yes      |
| `description` | string | No       |
| `parent_id`   | UUID   | No       |

**Response `201`** — created location object.

---

### `GET /inventory/items/:id/stock`

🔒 _Requires authentication._

Returns all `inventory.stock_levels` rows for a given item.

**Response `200`**

```json
[
  {
    "id": "uuid",
    "item_id": "uuid",
    "location_id": "uuid",
    "location_name": "Warehouse A",
    "quantity": 10,
    "updated_at": "2024-03-06T10:00:00Z"
  }
]
```

---

### `POST /inventory/transactions`

🔒 _Requires `inventory:write` permission._

Records a stock movement. Inserts an immutable row into `inventory.transactions` and updates the corresponding `inventory.stock_levels` row atomically within a transaction. `performed_by` is set to the authenticated account's ID.

`quantity_delta` must be positive for `in` type and negative for `out` type. The `CHECK (quantity >= 0)` constraint on `inventory.stock_levels` is enforced at the database level.

**Request body**

| Field            | Type    | Required | Notes                                                       |
|------------------|---------|----------|-------------------------------------------------------------|
| `item_id`        | UUID    | Yes      |                                                             |
| `location_id`    | UUID    | Yes      |                                                             |
| `type`           | string  | Yes      | `"in"`, `"out"`, `"adjustment"`, `"transfer"`               |
| `quantity_delta` | integer | Yes      | Positive = stock in, negative = stock out                   |
| `reference_id`   | UUID    | No       | Optional soft reference to a booking or purchase order      |
| `reference_type` | string  | No       | e.g. `"booking"`, `"purchase_order"`                        |
| `notes`          | string  | No       |                                                             |

**Response `201`**

```json
{
  "id": "uuid",
  "item_id": "uuid",
  "location_id": "uuid",
  "type": "out",
  "quantity_delta": -3,
  "reference_id": "uuid",
  "reference_type": "booking",
  "notes": "Issued for booking #xyz",
  "performed_by": "uuid",
  "performed_at": "2024-03-06T10:00:00Z"
}
```

**Errors**

| Status | Reason                                                   |
|--------|----------------------------------------------------------|
| `400`  | `quantity_delta` would result in negative stock          |
| `404`  | Item or location not found                               |
| `422`  | `type` and sign of `quantity_delta` are inconsistent     |

---

### `GET /inventory/transactions`

🔒 _Requires authentication._

Returns a paginated, filtered list of transaction records from `inventory.transactions`. Transactions are immutable — no update or delete is permitted.

**Query parameters**

| Param          | Type    | Default | Notes                                  |
|----------------|---------|---------|----------------------------------------|
| `item_id`      | UUID    | —       |                                        |
| `location_id`  | UUID    | —       |                                        |
| `type`         | string  | —       | `"in"`, `"out"`, `"adjustment"`, `"transfer"` |
| `performed_by` | UUID    | —       |                                        |
| `from`         | ISO8601 | —       | Filter by `performed_at >=`            |
| `to`           | ISO8601 | —       | Filter by `performed_at <=`            |
| `page`         | integer | `1`     |                                        |
| `per_page`     | integer | `20`    | Max `100`                              |

**Response `200`**

```json
{
  "data": [ /* array of transaction objects */ ],
  "meta": { "page": 1, "per_page": 20, "total": 310 }
}
```

---

## Bookings

### `GET /bookings/resources`

🔒 _Requires authentication._

Returns all active bookable resources from `bookings.resources`, joined with the backing `inventory.items` row. Only resources where `is_active = true` are returned by default.

**Query parameters**

| Param       | Type    | Default | Notes                       |
|-------------|---------|---------|-----------------------------|
| `is_active` | boolean | `true`  |                             |
| `page`      | integer | `1`     |                             |
| `per_page`  | integer | `20`    | Max `100`                   |

**Response `200`**

```json
{
  "data": [
    {
      "id": "uuid",
      "item_id": "uuid",
      "name": "Conference Projector A",
      "quantity": 2,
      "is_active": true
    }
  ],
  "meta": { "page": 1, "per_page": 20, "total": 8 }
}
```

---

### `POST /bookings/resources`

🔒 _Requires `admin` or `manager` role._

Creates a bookable resource backed by an inventory item. The referenced `inventory.items` row must have `is_bookable = true`.

**Request body**

| Field      | Type    | Required | Notes                                          |
|------------|---------|----------|------------------------------------------------|
| `item_id`  | UUID    | Yes      | Must reference an item with `is_bookable = true` |
| `name`     | string  | Yes      | Display name shown in booking UI               |
| `quantity` | integer | Yes      | Total bookable units; must be > 0              |

**Response `201`** — created resource object.

**Errors**

| Status | Reason                                        |
|--------|-----------------------------------------------|
| `400`  | Referenced item does not have `is_bookable = true` |
| `404`  | Item not found                                |

---

### `PATCH /bookings/resources/:id`

🔒 _Requires `admin` or `manager` role._

Updates a resource's display name, quantity, or active state.

**Request body** (all fields optional)

| Field       | Type    |
|-------------|---------|
| `name`      | string  |
| `quantity`  | integer |
| `is_active` | boolean |

**Response `200`** — updated resource object.

---

### `GET /bookings/resources/:id/availability`

🔒 _Requires authentication._

Returns the available quantity for a resource over a requested time window. Considers all overlapping reservations with `status IN ('pending', 'approved')`.

**Query parameters**

| Param        | Type    | Required | Notes              |
|--------------|---------|----------|--------------------|
| `start_time` | ISO8601 | Yes      |                    |
| `end_time`   | ISO8601 | Yes      | Must be > `start_time` |

**Response `200`**

```json
{
  "resource_id": "uuid",
  "total_quantity": 2,
  "reserved_quantity": 1,
  "available_quantity": 1,
  "start_time": "2024-03-07T09:00:00Z",
  "end_time": "2024-03-07T11:00:00Z"
}
```

---

### `GET /bookings/reservations`

🔒 _Requires authentication._

Returns reservations from `bookings.reservations`. Non-admin/manager accounts receive only their own reservations (`requested_by = current user`). Admins and managers see all.

**Query parameters**

| Param         | Type    | Default | Notes                                                         |
|---------------|---------|---------|---------------------------------------------------------------|
| `resource_id` | UUID    | —       |                                                               |
| `status`      | string  | —       | `"pending"`, `"approved"`, `"rejected"`, `"cancelled"`        |
| `requested_by`| UUID    | —       | Admin/manager only                                            |
| `from`        | ISO8601 | —       | Filter by `start_time >=`                                     |
| `to`          | ISO8601 | —       | Filter by `end_time <=`                                       |
| `page`        | integer | `1`     |                                                               |
| `per_page`    | integer | `20`    | Max `100`                                                     |

**Response `200`**

```json
{
  "data": [
    {
      "id": "uuid",
      "resource_id": "uuid",
      "requested_by": "uuid",
      "quantity": 1,
      "start_time": "2024-03-07T09:00:00Z",
      "end_time": "2024-03-07T11:00:00Z",
      "status": "pending",
      "priority": 50,
      "notes": "Needed for client demo",
      "reviewed_by": null,
      "reviewed_at": null,
      "created_at": "2024-03-06T10:00:00Z",
      "updated_at": "2024-03-06T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "per_page": 20, "total": 3 }
}
```

---

### `POST /bookings/reservations`

🔒 _Requires authentication._

Creates a new reservation in `bookings.reservations`. `requested_by` is set to the authenticated account. `priority` is copied from the user's highest-priority role at the time of booking (sourced from `users.roles.priority` via `users.account_roles`). Initial `status` is `"pending"`.

Overlap prevention is enforced via application-level advisory locks (Redis). The partial index on `(resource_id, start_time, end_time)` assists conflict detection for `status IN ('pending', 'approved')`.

**Request body**

| Field         | Type    | Required | Notes                              |
|---------------|---------|----------|------------------------------------|
| `resource_id` | UUID    | Yes      |                                    |
| `quantity`    | integer | Yes      | Must be > 0                        |
| `start_time`  | ISO8601 | Yes      |                                    |
| `end_time`    | ISO8601 | Yes      | Must be > `start_time`             |
| `notes`       | string  | No       |                                    |

**Response `201`** — created reservation object.

**Errors**

| Status | Reason                                                |
|--------|-------------------------------------------------------|
| `400`  | `end_time` ≤ `start_time`                             |
| `409`  | Requested quantity unavailable in the given time window |
| `404`  | Resource not found or inactive                        |

---

### `GET /bookings/reservations/:id`

🔒 _Requires authentication._

Returns a single reservation. Non-admin/manager accounts may only retrieve their own.

**Response `200`** — reservation object (same shape as list item above).

**Errors**

| Status | Reason          |
|--------|-----------------|
| `403`  | Not your reservation |
| `404`  | Not found       |

---

### `PATCH /bookings/reservations/:id`

🔒 _Requires authentication._

Allows the requesting user to update `notes` or cancel (`status = "cancelled"`) their own pending reservation. Admins and managers may additionally update `quantity`, `start_time`, and `end_time` on pending reservations.

**Request body** (all fields optional)

| Field        | Type    | Notes                                      |
|--------------|---------|--------------------------------------------|
| `notes`      | string  |                                            |
| `status`     | string  | User: `"cancelled"` only; Admin/manager: any |
| `quantity`   | integer | Admin/manager only                         |
| `start_time` | ISO8601 | Admin/manager only                         |
| `end_time`   | ISO8601 | Admin/manager only                         |

**Response `200`** — updated reservation object.

**Errors**

| Status | Reason                                    |
|--------|-------------------------------------------|
| `403`  | Insufficient permissions for the update   |
| `409`  | Status transition is not allowed          |

---

### `POST /bookings/reservations/:id/review`

🔒 _Requires `bookings:approve` permission._

Approves or rejects a reservation. Sets `status`, `reviewed_by` (authenticated account), and `reviewed_at` on the `bookings.reservations` row.

**Request body**

| Field    | Type   | Required | Notes                         |
|----------|--------|----------|-------------------------------|
| `action` | string | Yes      | `"approve"` or `"reject"`     |
| `notes`  | string | No       | Optional reviewer comment     |

**Response `200`** — updated reservation object.

**Errors**

| Status | Reason                                           |
|--------|--------------------------------------------------|
| `409`  | Reservation is not in `"pending"` status         |
| `409`  | Approving but quantity no longer available (re-checked at review time) |

---