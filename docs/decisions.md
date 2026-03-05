## ADR-001: Adopt Modular Monolith Architecture

Date: 2026-03-03

Decision:
The system will be implemented using a modular monolith architecture. 
It will be deployed as a single application, but internally divided 
into well-defined modules with strict boundaries and ownership rules.

Reasoning:
- The project is developed by a single engineer with a 2-month timeline.
- Microservices would introduce unnecessary operational and deployment complexity.
- A modular monolith allows strong separation of concerns while maintaining
  simplicity in deployment and debugging.
- Clear module boundaries make future extraction into microservices possible
  if the system scales.
- Enables enforcement of domain ownership (each module owns its own data and logic).

Tradeoffs:
- All modules share a single runtime and database.
- Requires discipline to avoid cross-module coupling.
- Scaling is vertical rather than horizontal at the architecture level.

## ADR-002 — PostgreSQL Schema-Per-Module

**Date:** 2026-05-03
**Status:** Decided

### Decision
Each application module gets its own PostgreSQL schema namespace. The mapping is direct:

| Module      | PG Schema   |
|-------------|-------------|
| Auth        | `auth`      |
| Users       | `users`     |
| Inventory   | `inventory` |
| Bookings    | `bookings`  |
| Audit       | `audit`     |
| Analytics   | `analytics` |

### Rationale
- PostgreSQL schemas are the natural enforcement mechanism for module boundaries at the data layer. Without them, all tables share one flat namespace, making it easy to accidentally couple modules through lazy joins.
- Cross-module references are explicit and visible (e.g., `users.profiles` referencing `auth.accounts(id)`). You always know when you're crossing a boundary.
- Aligns with the modular monolith premise: if a module is ever extracted into a separate service, its schema is already isolated and can be migrated to a standalone database with minimal restructuring.
- No additional infrastructure cost — this is a single PostgreSQL instance with multiple schemas, not separate databases.

### Alternatives considered
- **Single flat schema (`public`):** Rejected. Offers no enforcement of module boundaries. All tables would exist in the same namespace, which undermines the modular design.
- **Separate databases per module:** Rejected. Eliminates the ability to use cross-module foreign keys at all, forcing application-level joins. Overkill for a monolith; that's a microservices pattern.
- **Prefix-based naming in `public` (e.g., `auth_accounts`):** Rejected. Better than nothing but is a convention, not a constraint. Any query can still reach any table without discipline.

### Trade-offs accepted
- Cross-module foreign keys require fully qualified names (`schema.table(column)`). Slightly more verbose, but this is a feature not a bug — it makes cross-module dependencies obvious.
- The PostgreSQL user running the app will need `USAGE` granted on all schemas. This is a one-time migration setup cost.

---

## ADR-003 — Audit Log Design (Append-Only, Decoupled)

**Date:** 2026-05-03
**Status:** Decided

### Decision
The `audit.events` table has **no foreign keys** to other schemas. Actor identity is denormalized (email snapshot stored alongside UUID). The table is append-only — no UPDATE or DELETE is ever issued against it.

### Rationale
- A foreign key from `audit.events` to `auth.accounts` would mean that deleting a user account would either cascade-delete their audit trail (unacceptable) or block the deletion (surprising to the caller).
- Denormalizing `actor_email` ensures the audit trail is human-readable even after an account is deleted or email is changed.
- Append-only removes the possibility of evidence tampering. The application layer enforces this; a DB-level approach (e.g., a trigger that raises on UPDATE/DELETE) can be added later.

### Trade-offs accepted
- `actor_email` can go stale if a user changes their email. This is intentional — the audit log records what was true *at the time of the event*, not what is true now. It is a historical record, not a live view.

---

## ADR-004 — No PostgreSQL ENUM Types

**Date:** 2026-05-03 
**Status:** Decided

### Decision
Status fields and other enum-like columns use `VARCHAR` with application-level validation (and optionally `CHECK` constraints), not PostgreSQL `ENUM` types.

### Rationale
- PostgreSQL ENUMs are painful to migrate. Adding a new value requires `ALTER TYPE`, which is a schema migration. Removing a value is even harder.
- On a fast-moving portfolio project with a 2-month timeline, the set of valid statuses may evolve (e.g., adding `'on_hold'` to booking statuses). `VARCHAR` + application validation makes this a code change rather than a schema migration.
- Validation can be enforced via `CHECK` constraints if stricter DB-level control is wanted later, with the same migration footprint as a simple column `ALTER`.

---

## ADR-005 — Analytics via Pre-Aggregated Snapshots

**Date:** 2026-05-03
**Status:** Decided

### Decision
The `analytics` module stores pre-aggregated daily snapshots rather than running live aggregate queries over raw transaction data.

### Rationale
- Live aggregate queries over `inventory.transactions` and `bookings.reservations` will get expensive as data grows. Dashboard load time should not be a function of total historical transaction volume.
- Snapshots are cheap to compute incrementally (run once at end of day) and cheap to query (a handful of rows per day per item).
- The raw data is always available in `inventory.transactions` for ad-hoc or audit queries. Analytics is a read-optimized projection of that data, not a replacement.

### Trade-offs accepted
- Dashboard data is trailing by up to one day. For a portfolio-grade inventory system, this is acceptable. A real-time analytics layer (e.g., materialized views refreshed on a schedule) can be added later if needed.

---

## ADR-006 — Booking Conflict Prevention via Redis Advisory Locks

**Date:** 2026-05-03
**Status:** Decided

### Decision
Booking overlap detection and conflict resolution will use **Redis distributed locks** at the application layer, combined with a PostgreSQL index over active reservations.

### Rationale
- A pure DB-level uniqueness constraint cannot express "no two approved bookings for the same resource should overlap in time" without a range exclusion constraint (which requires the `btree_gist` extension and is non-trivial to reason about).
- Redis was already planned in the tech stack for caching. Using it for distributed locking adds no new infrastructure.
- The lock key will be `lock:booking:<resource_id>` and held only for the duration of the conflict check + insert transaction, keeping contention minimal.
- A partial index on `bookings.reservations (resource_id, start_time, end_time) WHERE status IN ('pending', 'approved')` supports the conflict check query and ensures it stays fast.

### Trade-offs accepted
- The distributed lock adds a Redis dependency to the critical path of booking creation. If Redis is unavailable, booking creation is unavailable. This is acceptable — Redis is an infrastructure dependency already, not an optional one.
- Lock-based prevention is "optimistic enough" for this use case. Fully serializable PostgreSQL transactions (`SERIALIZABLE` isolation) would be the pure-SQL alternative but are heavier and trickier to implement correctly.


## ADR-007 — API Routes Mirror Database Module Boundaries

| Field  | Value          |
|--------|----------------|
| Date   | 2026-03-06     |
| Status | Decided     |

### Decision

The API route structure mirrors the six module namespaces defined in the PostgreSQL schema:

| Route          | Owns                        |
|----------------|-----------------------------|
| `/auth`        | Authentication & OAuth      |
| `/users`       | User accounts & roles       |
| `/inventory`   | Items & transactions        |
| `/bookings`    | Reservations                |
| `/audit`       | Event log                   |
| `/analytics`   | Pre-aggregated metrics      |

Each route namespace corresponds directly to the schema that owns the underlying tables.

### Rationale

- The database schema was intentionally designed as a modular monolith with clear ownership boundaries between modules.
- Aligning API routes with schema namespaces makes it immediately obvious which tables back each endpoint.
- This structure simplifies access control policies, service ownership, and developer navigation of the codebase.
- It also ensures API documentation remains tightly coupled to the canonical schema definition.

### Trade-offs Accepted

Some operations involve multiple modules (e.g. booking creation reads role priority from the `users` module). In these cases, the endpoint is documented under the module that owns the primary record, while cross-module interactions are described inline.

---

## ADR-008 — Actor Fields Are Derived from the Authenticated Session

| Field  | Value          |
|--------|----------------|
| Date   | 2026-03-06     |
| Status | Decided     |

### Decision

Fields representing the actor responsible for an action (e.g. `created_by`, `performed_by`, `requested_by`) will **never** be accepted in API request bodies. These values are always inferred from the authenticated session and set server-side.

### Rationale

Several tables include foreign keys referencing `auth.accounts(id)` to track who performed an action. Allowing the client to supply these values would permit impersonation or falsification of records. By deriving the value from the authenticated session, the system guarantees:

- The actor identity is trustworthy
- Audit trails remain reliable
- Permission enforcement remains consistent

### Trade-offs Accepted

Clients cannot simulate actions performed by other users via the API. Administrative tooling that needs this capability must operate through privileged internal services rather than the public API.

---

## ADR-009 — Reservation Priority Is Snapshotted at Booking Time

| Field  | Value          |
|--------|----------------|
| Date   | 2026-03-06     |
| Status | Decided     |

### Decision

Reservation priority is determined when the booking is created and stored directly on the reservation record. The priority is copied from the user's highest-priority role at booking time rather than dynamically looked up.

### Rationale

The schema explicitly specifies that `bookings.reservations.priority` is a snapshot value. If role priority were evaluated dynamically, changing a role's priority could retroactively reorder existing reservations. Storing the snapshot ensures:

- Deterministic booking order
- Predictable fairness
- Simpler queries when sorting reservations by priority

### Trade-offs Accepted

If a user's role priority changes later, existing reservations will not update automatically. Historical reservations may reflect outdated priorities relative to current role configuration.

---

## ADR-010 — Inventory Transactions Are Immutable

| Field  | Value          |
|--------|----------------|
| Date   | 2026-03-06     |
| Status | Decided     |

### Decision

Inventory transactions are treated as an immutable ledger.

| Exposed | Not Exposed |
|---------|-------------|
| `POST /inventory/transactions` | `PATCH /inventory/transactions/:id` |
| | `DELETE /inventory/transactions/:id` |

Corrections must be performed using **compensating transactions**.

### Rationale

The schema defines `inventory.transactions` as a permanent record of all stock movements. Mutating historical transactions would break the integrity of the inventory ledger. Immutable logs are a well-established accounting pattern and provide:

- Auditability
- Easier debugging
- Accurate historical reconstruction of stock levels

### Trade-offs Accepted

Mistakes cannot be edited directly. Fixing an incorrect transaction requires adding a new adjustment transaction with the opposite `quantity_delta`.

---

## ADR-011 — Audit Events Are Write-Only Internally and Read-Only via API

| Field  | Value          |
|--------|----------------|
| Date   | 2026-03-06     |
| Status | Decided     |

### Decision

The audit event API exposes only read operations:

```
GET  /audit/events
GET  /audit/events/:id
```

There is no public API endpoint for creating audit events.

### Rationale

Audit events are generated internally as side effects of application operations. Allowing clients to create audit events directly would permit fabrication or manipulation of the audit log. The audit system is designed as an append-only record of system activity. The schema also stores a denormalized `actor_email` snapshot, ensuring records remain meaningful even if accounts are later deleted.

### Trade-offs Accepted

Developers cannot manually insert audit events via the public API. Internal services must explicitly write audit records when relevant actions occur.

---

## ADR-012 — Analytics API Serves Pre-Aggregated Data Only

| Field  | Value          |
|--------|----------------|
| Date   | 2026-03-06     |
| Status | Decided     |

### Decision

Analytics endpoints return pre-aggregated data stored in the `analytics` schema rather than performing live aggregation queries. Example endpoints:

```
GET /analytics/inventory/snapshots
GET /analytics/bookings/metrics
```

### Rationale

The analytics module is explicitly designed to store pre-computed aggregates derived from operational tables. Running heavy aggregation queries directly on transactional tables (e.g. `inventory.transactions`) would introduce performance risks. Pre-aggregation ensures:

- Fast API responses
- Predictable load on the database
- Isolation between operational workloads and reporting workloads

### Trade-offs Accepted

Analytics data may be slightly delayed depending on the snapshot refresh schedule. Ad-hoc analytical queries are not supported through the production API and should be performed through a separate reporting or data warehouse system.

---

## ADR-013 — Booking Overlap Prevention Implemented at Application Layer

| Field  | Value          |
|--------|----------------|
| Date   | 2026-03-06     |
| Status | Decided     |

### Decision

Booking conflict prevention is implemented using application-level logic with **Redis advisory locks**, supported by a PostgreSQL index used for conflict detection queries.

### Rationale

PostgreSQL cannot express time-range overlap prevention on `TIMESTAMPTZ` columns without an exclusion constraint and the `btree_gist` extension. The system architecture already includes Redis for caching, making it suitable for distributed locking. Redis locks ensure that only one booking operation for a given resource runs the conflict check and insert transaction at a time.

### Trade-offs Accepted

- Booking creation becomes dependent on Redis availability.
- The solution is not purely database-enforced, requiring correct implementation of the locking logic in the application layer.

---

## ADR-014 — Reservation List Endpoint Is Scoped by User Role

| Field  | Value          |
|--------|----------------|
| Date   | 2026-03-06     |
| Status | Decided     |

### Decision

The `GET /bookings/reservations` endpoint returns results based on the role of the authenticated user:

| Role | Visible Reservations |
|------|----------------------|
| Employee | Only reservations where `requested_by` = their account |
| Manager / Administrator | All reservations; may filter by `requested_by` |

### Rationale

Reservations reference the requesting account through `bookings.reservations.requested_by`. Allowing unrestricted access would allow users to enumerate other users' bookings. Role-based scoping ensures that sensitive scheduling data is only visible to authorised roles.

### Trade-offs Accepted

The endpoint requires additional role-checking logic at the application layer. Queries must dynamically adjust their filters based on user permissions.

---

## ADR-015 — Inventory Items Use Soft Deletion

| Field  | Value          |
|--------|----------------|
| Date   | 2026-03-06     |
| Status | Decided     |

### Decision

Deleting an inventory item via the API performs a **soft delete** by setting `is_active = false`. A hard delete is only permitted if no inventory transactions reference the item.

### Rationale

The inventory transaction ledger stores historical references to item IDs. Hard deleting an item would break the integrity of historical records. Soft deletion preserves:

- Auditability
- Referential coherence
- Historical transaction visibility

### Trade-offs Accepted

Soft-deleted items remain in the database and must be filtered out in queries where inactive items should not appear. Over time, the items table may accumulate inactive records.

---

## ADR-016 — OAuth Email Conflict Handling Returns 409

| Field  | Value          |
|--------|----------------|
| Date   | 2026-03-06     |
| Status | Decided     |

### Decision

If an OAuth authentication callback returns an email that already exists for a password-based account, the server returns **HTTP `409 Conflict`** rather than automatically linking the OAuth provider.

### Rationale

- `auth.accounts` enforces a unique constraint on `email`.
- `auth.oauth_providers` enforces a unique constraint on `(provider, provider_uid)`.
- Automatically linking accounts based solely on a matching email would introduce identity verification risks.
- Requiring the user to log in first and explicitly link the OAuth provider ensures the action is intentional and authenticated.

### Trade-offs Accepted

The user experience during OAuth login may involve an additional step when an email conflict occurs. Account linking requires an explicit workflow after the user authenticates using their existing credentials.