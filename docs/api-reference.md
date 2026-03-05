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

