System Architecture
1. Architectural Style

The system follows a Modular Monolith Architecture.

The application is deployed as a single unit but internally divided into independent modules with:
Clear ownership
Strict dependency direction
No shared business logic across modules
Explicit inter-module communication

Each module owns:
Its domain logic
Its database models
Its service layer
Its validation rules

2. High-Level System Diagram

Frontend (React + TypeScript)
↓
REST API Layer (Express)
↓
Application Layer (Modules)
↓
Prisma ORM
↓
PostgreSQL

3. Backend Layered Structure

backend/
src/
app.ts
server.ts
modules/
middleware/
config/
utils/

3.1 API Layer

Responsible for:
Route definitions
Request validation
Passing data to services
Returning standardized responses

Controllers must NOT:
Access database directly
Contain business logic

3.2 Application Layer (Modules)

Each module follows internal structure:

modules/<module-name>/
controller.ts
service.ts
repository.ts
routes.ts
types.ts

Responsibilities:

Controller:
HTTP layer adapter

Service:
Business logic
Validation
Conflict handling

Repository:
Prisma database interactions

Types:
Domain types
DTO definitions

4. Defined Modules
4.1 Auth Module
Responsibilities:
JWT issuance
Refresh token rotation
OAuth provider integration
Password hashing (bcrypt)

Security Principles:
No plain-text password storage
Token expiration enforced
Secure secret management via environment variables

4.2 Users Module
Responsibilities:
User creation
Role assignment
Role hierarchy logic

RBAC Strategy:
Roles mapped to permissions
Middleware enforces access control
Role hierarchy supports priority scheduling

4.3 Inventory Module
Responsibilities:
Item lifecycle management
Stock updates
Version-based optimistic locking

Concurrency Strategy:
version column for conflict detection
Update fails if version mismatch
Retry logic handled at service layer

4.4 Bookings Module
Core Complexity Module.

Responsibilities:
Resource reservation
Time slot validation
Priority override logic
Conflict detection

Priority Scheduling Logic:
Each role has a priority score

On booking conflict:
Compare priority
Higher priority can override
Override event logged in Audit module

Concurrency Handling:
Database transaction wrapping
Optimistic locking
Atomic booking operations

4.5 Audit Module
Responsibilities:
Immutable activity logging
Security event tracking
Booking override tracking
Role change logging

Design:
Append-only table
No update/delete allowed
Indexed by userId and timestamp

4.6 Analytics Module
Responsibilities:
Aggregated statistics
Booking heatmaps
Conflict frequency

Role-based activity analysis
Implementation Strategy:
Query-based aggregation
Materialized views (future enhancement)

5. Concurrency & Data Integrity Strategy

The system uses layered protection:
Application-level validation
Optimistic locking via version fields
Database transactions
Explicit booking conflict checks
Audit logging for overrides
No silent conflict resolution.

All conflicts are:
Explicitly detected
Explicitly logged
Explicitly returned to client

6. Database Design Principles

PostgreSQL relational model

Prisma as ORM
Soft deletes where required
Composite indexes for booking time ranges
Foreign key constraints enforced

Key entities:
User
Role
Item
Booking
AuditLog

7. Deployment Architecture (AWS Free Tier)

Planned setup:

Option A (Initial Phase):
EC2 instance (backend + database)
React frontend served statically
Nginx reverse proxy

Option B (Improved Setup):
Backend on EC2
PostgreSQL on RDS (Free Tier)
Frontend on S3 + CloudFront

Cost Control:
t2.micro instance
Monitor usage monthly
Disable unused services

8. Security Architecture

JWT-based authentication
bcrypt hashing
Role-based middleware enforcement
Environment variable configuration
Audit logging of sensitive actions

Future Enhancements:
Rate limiting
Account lockout policy
CSRF protection

Structured logging

9. Evolution Path

If system scales:

Extract Booking module as microservice
Separate Auth as identity provider
Introduce message queue for async audit logging
Modular boundaries are designed to allow gradual service extraction.