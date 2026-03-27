# Database Schema — Invitrack

PostgreSQL is used as the primary database. The schema follows a **modular monolith** design where each application module gets its own PostgreSQL schema namespace. This enforces module boundaries at the database level without requiring separate databases, and makes future extraction into microservices straightforward.

---

## Schema Namespaces

| Module      | PostgreSQL Schema | Responsibility                              |
|-------------|-------------------|---------------------------------------------|
| Auth        | `auth`            | Identity, credentials, sessions, OAuth      |
| Users       | `users`           | User profiles, roles, permissions           |
| Inventory   | `inventory`       | Items, stock levels, locations, movements   |
| Bookings    | `bookings`        | Resource reservations, scheduling           |
| Audit       | `audit`           | Immutable event log across all modules      |
| Analytics   | `analytics`       | Aggregated metrics, snapshots, reports      |

Cross-module foreign keys use fully qualified references (e.g., `users.accounts(id)`).

---

## Module: `auth`

### `auth.accounts`
Core identity table. Owns credentials and OAuth links.

| Column            | Type                       | Constraints                        | Notes                              |
|-------------------|----------------------------|------------------------------------|------------------------------------|
| `id`              | `UUID`                     | PK, DEFAULT gen_random_uuid()      |                                    |
| `email`           | `VARCHAR(255)`             | NOT NULL, UNIQUE                   | Lowercased before insert           |
| `password_hash`   | `TEXT`                     | NULLABLE                           | NULL if OAuth-only account         |
| `is_verified`     | `BOOLEAN`                  | NOT NULL, DEFAULT FALSE            |                                    |
| `is_active`       | `BOOLEAN`                  | NOT NULL, DEFAULT TRUE             | Soft-disable without deleting      |
| `created_at`      | `TIMESTAMPTZ`              | NOT NULL, DEFAULT NOW()            |                                    |
| `updated_at`      | `TIMESTAMPTZ`              | NOT NULL, DEFAULT NOW()            |                                    |

### `auth.oauth_providers`
Links an account to one or more external OAuth providers.

| Column            | Type           | Constraints                              | Notes                        |
|-------------------|----------------|------------------------------------------|------------------------------|
| `id`              | `UUID`         | PK, DEFAULT gen_random_uuid()            |                              |
| `account_id`      | `UUID`         | NOT NULL, FK → auth.accounts(id)         | ON DELETE CASCADE            |
| `provider`        | `VARCHAR(50)`  | NOT NULL                                 | e.g. `'google'`, `'github'`  |
| `provider_uid`    | `VARCHAR(255)` | NOT NULL                                 | Provider's user identifier   |
| `created_at`      | `TIMESTAMPTZ`  | NOT NULL, DEFAULT NOW()                  |                              |

**Unique constraint:** `(provider, provider_uid)` — one account per provider identity.

### `auth.sessions`
Tracks active JWT refresh token sessions.

| Column            | Type           | Constraints                              | Notes                          |
|-------------------|----------------|------------------------------------------|--------------------------------|
| `id`              | `UUID`         | PK, DEFAULT gen_random_uuid()            |                                |
| `account_id`      | `UUID`         | NOT NULL, FK → auth.accounts(id)         | ON DELETE CASCADE              |
| `refresh_token`   | `TEXT`         | NOT NULL, UNIQUE                         | Hashed before storage          |
| `user_agent`      | `TEXT`         | NULLABLE                                 |                                |
| `ip_address`      | `INET`         | NULLABLE                                 |                                |
| `expires_at`      | `TIMESTAMPTZ`  | NOT NULL                                 |                                |
| `created_at`      | `TIMESTAMPTZ`  | NOT NULL, DEFAULT NOW()                  |                                |

### `auth.password_reset_tokens`

| Column            | Type           | Constraints                              | Notes                          |
|-------------------|----------------|------------------------------------------|--------------------------------|
| `id`              | `UUID`         | PK, DEFAULT gen_random_uuid()            |                                |
| `account_id`      | `UUID`         | NOT NULL, FK → auth.accounts(id)         | ON DELETE CASCADE              |
| `token_hash`      | `TEXT`         | NOT NULL, UNIQUE                         |                                |
| `expires_at`      | `TIMESTAMPTZ`  | NOT NULL                                 |                                |
| `used_at`         | `TIMESTAMPTZ`  | NULLABLE                                 | Set when token is consumed     |
| `created_at`      | `TIMESTAMPTZ`  | NOT NULL, DEFAULT NOW()                  |                                |

---

### `auth.email_verification_tokens`

| Column         | Type          | Constraints                           | Notes                      |
|----------------|---------------|---------------------------------------|----------------------------|
| `id`           | `UUID`        | PK, DEFAULT gen_random_uuid()         |                            |
| `account_id`   | `UUID`        | NOT NULL, FK → auth.accounts(id)      | ON DELETE CASCADE          |
| `token_hash`   | `TEXT`        | NOT NULL, UNIQUE                      |                            |
| `expires_at`   | `TIMESTAMPTZ` | NOT NULL                              |                            |
| `used_at`      | `TIMESTAMPTZ` | NULLABLE                              | Set when token is consumed |
| `created_at`   | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW()               |                            |

## Module: `users`

### `users.profiles`
Extended user information, linked 1:1 to `auth.accounts`.

| Column            | Type           | Constraints                              | Notes                          |
|-------------------|----------------|------------------------------------------|--------------------------------|
| `id`              | `UUID`         | PK, FK → auth.accounts(id)              | Same UUID, not auto-generated  |
| `full_name`       | `VARCHAR(255)` | NOT NULL                                 |                                |
| `display_name`    | `VARCHAR(100)` | NULLABLE                                 |                                |
| `avatar_url`      | `TEXT`         | NULLABLE                                 | S3 URL                         |
| `department`      | `VARCHAR(100)` | NULLABLE                                 |                                |
| `created_at`      | `TIMESTAMPTZ`  | NOT NULL, DEFAULT NOW()                  |                                |
| `updated_at`      | `TIMESTAMPTZ`  | NOT NULL, DEFAULT NOW()                  |                                |

### `users.roles`
Lookup table for all named roles in the system.

| Column            | Type           | Constraints                              | Notes                          |
|-------------------|----------------|------------------------------------------|--------------------------------|
| `id`              | `SMALLINT`     | PK, GENERATED ALWAYS AS IDENTITY         |                                |
| `name`            | `VARCHAR(50)`  | NOT NULL, UNIQUE                         | e.g. `'admin'`, `'manager'`, `'employee'` |
| `description`     | `TEXT`         | NULLABLE                                 |                                |
| `priority`        | `SMALLINT`     | NOT NULL, DEFAULT 0                      | Higher = more priority in scheduling |

**Seed data:** `admin` (priority 100), `manager` (priority 50), `employee` (priority 10).

### `users.account_roles`
Many-to-many join between accounts and roles.

| Column            | Type           | Constraints                              | Notes                          |
|-------------------|----------------|------------------------------------------|--------------------------------|
| `account_id`      | `UUID`         | NOT NULL, FK → auth.accounts(id)         | ON DELETE CASCADE              |
| `role_id`         | `SMALLINT`     | NOT NULL, FK → users.roles(id)           | ON DELETE RESTRICT             |
| `granted_by`      | `UUID`         | NULLABLE, FK → auth.accounts(id)         | Who assigned this role         |
| `granted_at`      | `TIMESTAMPTZ`  | NOT NULL, DEFAULT NOW()                  |                                |

**Primary key:** `(account_id, role_id)`

### `users.permissions`
Fine-grained permission registry.

| Column            | Type           | Constraints                              | Notes                                      |
|-------------------|----------------|------------------------------------------|--------------------------------------------|
| `id`              | `SMALLINT`     | PK, GENERATED ALWAYS AS IDENTITY         |                                            |
| `code`            | `VARCHAR(100)` | NOT NULL, UNIQUE                         | e.g. `'inventory:write'`, `'bookings:approve'` |
| `description`     | `TEXT`         | NULLABLE                                 |                                            |

### `users.role_permissions`
Assigns permissions to roles.

| Column            | Type           | Constraints                              |
|-------------------|----------------|------------------------------------------|
| `role_id`         | `SMALLINT`     | NOT NULL, FK → users.roles(id)           |
| `permission_id`   | `SMALLINT`     | NOT NULL, FK → users.permissions(id)     |

**Primary key:** `(role_id, permission_id)`

---

## Module: `inventory`

### `inventory.categories`
Hierarchical item categories (supports subcategories via self-reference).

| Column            | Type           | Constraints                              | Notes                          |
|-------------------|----------------|------------------------------------------|--------------------------------|
| `id`              | `UUID`         | PK, DEFAULT gen_random_uuid()            |                                |
| `name`            | `VARCHAR(100)` | NOT NULL                                 |                                |
| `parent_id`       | `UUID`         | NULLABLE, FK → inventory.categories(id)  | NULL = top-level category      |
| `created_at`      | `TIMESTAMPTZ`  | NOT NULL, DEFAULT NOW()                  |                                |

### `inventory.items`
Master catalog of all inventory items.

| Column              | Type             | Constraints                             | Notes                                        |
|---------------------|------------------|-----------------------------------------|----------------------------------------------|
| `id`                | `UUID`           | PK, DEFAULT gen_random_uuid()           |                                              |
| `sku`               | `VARCHAR(100)`   | NOT NULL, UNIQUE                        | Stock-keeping unit                           |
| `name`              | `VARCHAR(255)`   | NOT NULL                                |                                              |
| `description`       | `TEXT`           | NULLABLE                                |                                              |
| `category_id`       | `UUID`           | NULLABLE, FK → inventory.categories(id) | ON DELETE SET NULL                           |
| `unit`              | `VARCHAR(50)`    | NOT NULL                                | e.g. `'pcs'`, `'kg'`, `'litres'`            |
| `reorder_threshold` | `INT`            | NOT NULL, DEFAULT 0                     | Triggers low-stock alert                     |
| `is_bookable`       | `BOOLEAN`        | NOT NULL, DEFAULT FALSE                 | Whether item can be reserved                 |
| `is_active`         | `BOOLEAN`        | NOT NULL, DEFAULT TRUE                  | Soft-delete flag; inactive items are hidden  |
| `version`           | `INT`            | NOT NULL, DEFAULT 0                     | Incremented on every update; used for optimistic locking on PATCH |
| `image_url`         | `TEXT`           | NULLABLE                                | S3 URL                                       |
| `created_by`        | `UUID`           | NOT NULL, FK → auth.accounts(id)        |                                              |
| `created_at`        | `TIMESTAMPTZ`    | NOT NULL, DEFAULT NOW()                 |                                              |
| `updated_at`        | `TIMESTAMPTZ`    | NOT NULL, DEFAULT NOW()                 |                                              |

### `inventory.stock_levels`
Current quantity per item per location. One row per (item, location) pair.

| Column            | Type           | Constraints                              | Notes                              |
|-------------------|----------------|------------------------------------------|------------------------------------|
| `id`              | `UUID`         | PK, DEFAULT gen_random_uuid()            |                                    |
| `item_id`         | `UUID`         | NOT NULL, FK → inventory.items(id)       | ON DELETE CASCADE                  |
| `location_id`     | `UUID`         | NOT NULL, FK → inventory.locations(id)   | ON DELETE RESTRICT                 |
| `quantity`        | `INT`          | NOT NULL, DEFAULT 0, CHECK (≥ 0)         | Enforced non-negative at DB level  |
| `updated_at`      | `TIMESTAMPTZ`  | NOT NULL, DEFAULT NOW()                  |                                    |

**Unique constraint:** `(item_id, location_id)`

### `inventory.locations`
Physical or logical storage locations (warehouse, shelf, room, etc.).

| Column            | Type           | Constraints                              |
|-------------------|----------------|------------------------------------------|
| `id`              | `UUID`         | PK, DEFAULT gen_random_uuid()            |
| `name`            | `VARCHAR(100)` | NOT NULL                                 |
| `description`     | `TEXT`         | NULLABLE                                 |
| `parent_id`       | `UUID`         | NULLABLE, FK → inventory.locations(id)   |

### `inventory.transactions`
Immutable ledger of every stock movement. Never updated or deleted.

| Column            | Type           | Constraints                              | Notes                                                  |
|-------------------|----------------|------------------------------------------|--------------------------------------------------------|
| `id`              | `UUID`         | PK, DEFAULT gen_random_uuid()            |                                                        |
| `item_id`         | `UUID`         | NOT NULL, FK → inventory.items(id)       |                                                        |
| `location_id`     | `UUID`         | NOT NULL, FK → inventory.locations(id)   |                                                        |
| `type`            | `VARCHAR(50)`  | NOT NULL                                 | `'in'`, `'out'`, `'adjustment'`, `'transfer'`          |
| `quantity_delta`  | `INT`          | NOT NULL                                 | Positive = stock in, negative = stock out              |
| `reference_id`    | `UUID`         | NULLABLE                                 | FK to booking or external order — polymorphic, no hard FK |
| `reference_type`  | `VARCHAR(50)`  | NULLABLE                                 | e.g. `'booking'`, `'purchase_order'`                   |
| `notes`           | `TEXT`         | NULLABLE                                 |                                                        |
| `performed_by`    | `UUID`         | NOT NULL, FK → auth.accounts(id)         |                                                        |
| `performed_at`    | `TIMESTAMPTZ`  | NOT NULL, DEFAULT NOW()                  |                                                        |

---

## Module: `bookings`

### `bookings.resources`
Items or assets that can be reserved. Backed by an inventory item.

| Column            | Type           | Constraints                              | Notes                              |
|-------------------|----------------|------------------------------------------|------------------------------------|
| `id`              | `UUID`         | PK, DEFAULT gen_random_uuid()            |                                    |
| `item_id`         | `UUID`         | NOT NULL, FK → inventory.items(id)       | Must have `is_bookable = TRUE`     |
| `name`            | `VARCHAR(255)` | NOT NULL                                 | Display name for booking UI        |
| `quantity`        | `INT`          | NOT NULL, DEFAULT 1, CHECK (> 0)         | Total bookable units of this item  |
| `is_active`       | `BOOLEAN`      | NOT NULL, DEFAULT TRUE                   |                                    |

### `bookings.reservations`
A single booking request for a resource over a time window.

| Column            | Type           | Constraints                              | Notes                                                |
|-------------------|----------------|------------------------------------------|------------------------------------------------------|
| `id`              | `UUID`         | PK, DEFAULT gen_random_uuid()            |                                                      |
| `resource_id`     | `UUID`         | NOT NULL, FK → bookings.resources(id)    |                                                      |
| `requested_by`    | `UUID`         | NOT NULL, FK → auth.accounts(id)         |                                                      |
| `quantity`        | `INT`          | NOT NULL, DEFAULT 1, CHECK (> 0)         |                                                      |
| `start_time`      | `TIMESTAMPTZ`  | NOT NULL                                 |                                                      |
| `end_time`        | `TIMESTAMPTZ`  | NOT NULL                                 |                                                      |
| `status`          | `VARCHAR(50)`  | NOT NULL, DEFAULT `'pending'`            | `'pending'`, `'approved'`, `'rejected'`, `'cancelled'` |
| `priority`        | `SMALLINT`     | NOT NULL, DEFAULT 0                      | Copied from user's role priority at booking time     |
| `notes`           | `TEXT`         | NULLABLE                                 |                                                      |
| `reviewed_by`     | `UUID`         | NULLABLE, FK → auth.accounts(id)         | Manager/admin who approved or rejected               |
| `reviewed_at`     | `TIMESTAMPTZ`  | NULLABLE                                 |                                                      |
| `created_at`      | `TIMESTAMPTZ`  | NOT NULL, DEFAULT NOW()                  |                                                      |
| `updated_at`      | `TIMESTAMPTZ`  | NOT NULL, DEFAULT NOW()                  |                                                      |

**Constraint:** `CHECK (end_time > start_time)`

**Overlap prevention:** Enforced via application logic + advisory locks (Redis) at booking creation time. A partial index can assist:
```sql
CREATE INDEX idx_reservations_overlap
ON bookings.reservations (resource_id, start_time, end_time)
WHERE status IN ('pending', 'approved');
```

---

## Module: `audit`

### `audit.events`
Append-only log of all meaningful actions across the system. No foreign keys to keep it decoupled from other schemas. If a user is deleted, their audit trail remains intact.

| Column            | Type           | Constraints                              | Notes                                          |
|-------------------|----------------|------------------------------------------|------------------------------------------------|
| `id`              | `UUID`         | PK, DEFAULT gen_random_uuid()            |                                                |
| `actor_id`        | `UUID`         | NULLABLE                                 | Account that performed the action; NULL = system |
| `actor_email`     | `VARCHAR(255)` | NULLABLE                                 | Denormalized snapshot — survives user deletion |
| `action`          | `VARCHAR(100)` | NOT NULL                                 | e.g. `'inventory.item.created'`                |
| `module`          | `VARCHAR(50)`  | NOT NULL                                 | e.g. `'inventory'`, `'bookings'`               |
| `target_type`     | `VARCHAR(50)`  | NULLABLE                                 | e.g. `'item'`, `'reservation'`                 |
| `target_id`       | `UUID`         | NULLABLE                                 | ID of the affected record                      |
| `payload`         | `JSONB`        | NULLABLE                                 | Before/after state or context data             |
| `ip_address`      | `INET`         | NULLABLE                                 |                                                |
| `user_agent`      | `TEXT`         | NULLABLE                                 |                                                |
| `created_at`      | `TIMESTAMPTZ`  | NOT NULL, DEFAULT NOW()                  |                                                |

**No UPDATE or DELETE ever issued on this table.**

---

## Module: `analytics`

Analytics tables store **pre-aggregated snapshots** to avoid expensive live queries. Raw data always lives in `inventory.transactions` and `bookings.reservations`.

### `analytics.daily_inventory_snapshots`
End-of-day stock levels per item per location.

| Column            | Type           | Constraints                              |
|-------------------|----------------|------------------------------------------|
| `id`              | `UUID`         | PK, DEFAULT gen_random_uuid()            |
| `snapshot_date`   | `DATE`         | NOT NULL                                 |
| `item_id`         | `UUID`         | NOT NULL                                 |
| `location_id`     | `UUID`         | NOT NULL                                 |
| `quantity`        | `INT`          | NOT NULL                                 |
| `created_at`      | `TIMESTAMPTZ`  | NOT NULL, DEFAULT NOW()                  |

**Unique constraint:** `(snapshot_date, item_id, location_id)`

### `analytics.booking_metrics`
Aggregated booking stats per resource per day.

| Column                | Type           | Constraints                              |
|-----------------------|----------------|------------------------------------------|
| `id`                  | `UUID`         | PK, DEFAULT gen_random_uuid()            |
| `metric_date`         | `DATE`         | NOT NULL                                 |
| `resource_id`         | `UUID`         | NOT NULL                                 |
| `total_requests`      | `INT`          | NOT NULL, DEFAULT 0                      |
| `approved_count`      | `INT`          | NOT NULL, DEFAULT 0                      |
| `rejected_count`      | `INT`          | NOT NULL, DEFAULT 0                      |
| `utilization_minutes` | `INT`          | NOT NULL, DEFAULT 0                      |
| `created_at`          | `TIMESTAMPTZ`  | NOT NULL, DEFAULT NOW()                  |

**Unique constraint:** `(metric_date, resource_id)`

---

## Cross-Module Relationships (Summary)

```
auth.accounts ──────────────────────────────────── 1:1 ── users.profiles
auth.accounts ──────────────────────────────────── 1:N ── auth.sessions
auth.accounts ──────────────────────────────────── 1:N ── auth.oauth_providers
auth.accounts ──── via users.account_roles ──────── M:N ── users.roles
users.roles ──────── via users.role_permissions ─── M:N ── users.permissions
auth.accounts ──────────────────────────────────── 1:N ── inventory.transactions (performed_by)
auth.accounts ──────────────────────────────────── 1:N ── inventory.items (created_by)
auth.accounts ──────────────────────────────────── 1:N ── bookings.reservations (requested_by, reviewed_by)
inventory.items ────────────────────────────────── 1:1 ── bookings.resources
inventory.items ────────────────────────────────── 1:N ── inventory.stock_levels
inventory.locations ─────────────────────────────── 1:N ── inventory.stock_levels
inventory.transactions ─── (soft ref) ──────────── N:1 ── bookings.reservations (reference_id)
```

---

## Conventions

- All primary keys are `UUID` unless stated otherwise (SMALLINT for small lookup tables).
- All timestamps are `TIMESTAMPTZ` (UTC stored, timezone-aware).
- `created_at` / `updated_at` are present on all mutable tables. `updated_at` is maintained via a trigger.
- `updated_at` trigger function (shared, defined once in a `shared` schema or per-schema):
  ```sql
  CREATE OR REPLACE FUNCTION set_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
  $$ LANGUAGE plpgsql;
  ```
- Soft deletes are preferred over hard deletes where audit integrity matters (use `is_active` / `deleted_at`).
- Enum-like string fields use `VARCHAR` with `CHECK` constraints or application-level validation — not PostgreSQL `ENUM` types, to preserve migration flexibility.