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