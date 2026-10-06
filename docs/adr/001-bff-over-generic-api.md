# ADR-001: Backend-For-Frontend (BFF) vs. Generic Over-Fetching API

## Status
Accepted

## Context
In our EdTech platform, the student dashboard (`GET /api/v1/dashboard`) was implemented as a generic monolithic endpoint. To serve potentially diverse frontend widgets, it executed broad `SELECT *` queries across the `users` table and joined all relational data: enrollments, course catalogs, modules, and certificate records.

### The Problem
- The legacy endpoint produces an uncompressed JSON payload of **8.99 MB** (9,428,641 bytes) for 1,000 students (measured by `npm run benchmark`, see `benchmarks/benchmark-results.md`).
- The React dashboard UI strictly requires only **3 visual fields**: student name (`name`), total score (`totalScore`), and avatar URL (`avatarUrl`).
- Over 99.9% of the transported data over the wire was discarded by the client.
- In Node.js, serializing a ~9 MB JSON payload blocks the V8 single-threaded event loop for tens of milliseconds, triggers high GC (Garbage Collection) memory pressure under concurrent traffic, and severely degrades mobile client performance on constrained cellular networks (latency and bandwidth saturation).

## Considered Options

1. **Client-Side Filtering (Status Quo with Client Workaround)**:
   - Keep the generic endpoint returning the full ~9 MB payload.
   - Have the React frontend pick only `{ name, score, avatarUrl }`.
   - *Rejected*: Does not solve the network transfer bottleneck, high latency, server CPU/memory exhaustion, or bandwidth costs.

2. **Dynamic Query Parameters on Generic API (`?fields=name,score,avatarUrl`)**:
   - Allow the client to pass arbitrary field lists to a generic entity endpoint.
   - *Rejected*: Leads to complex ORM query builder logic, arbitrary join explosion, lack of caching optimization, security risks (unbounded relation traversal), and leaky abstractions between internal domain schema and external consumers.

3. **Backend-For-Frontend (BFF) Pattern (`GET /api/v2/dashboard`)**:
   - Implement a dedicated endpoint tailored specifically to the presentation needs of the dashboard screen.
   - Execute a push-down SQL projection (`SELECT u.id, u.name, u.avatar_url, SUM(e.score) … LEFT JOIN enrollments … GROUP BY u.id`) at the MySQL engine level.
   - Enforce mandatory server-side pagination (limit/offset or cursor).
   - *Chosen*: Decouples the frontend's visual contract from the internal aggregate schema, minimizes database I/O, minimizes memory allocation in Node.js, and drastically cuts payload size.

## Decision Outcome

We decided to implement the **Backend-For-Frontend (BFF)** pattern for the dashboard:

1. **Tailored Data Contract**: The application layer exposes `GetDashboardBFFUseCase` returning a lightweight DTO containing only `DashboardItemDTO` (`id`, `name`, `totalScore`, `avatarUrl`) and a standard pagination envelope.
2. **SQL Projection Pushdown**: The infrastructure repository (`MySqlDashboardRepository`) queries only the columns requested by the BFF, calculating the total score via SQL aggregation instead of hydrating domain entities into Node.js heap memory.
3. **Mandatory Pagination**: Default page size of 20 items (max 100 items), preventing unbounded memory growth.
4. **Transport Compression**: Combined with HTTP compression middleware (Gzip / Brotli), reducing payload size from 8.99 MB to 2.6 KB raw (943 B with Brotli).

## Consequences

### Positive
- **Dramatic Payload Reduction**: Response size dropped from 8.99 MB to 2.6 KB raw — **3,542× smaller** (Brotli vs Brotli: 540 KB → 943 B, 586× smaller).
- **Lower Latency**: Median end-to-end latency dropped from 54.4 ms to 5.6 ms (5 runs, local MySQL). Serializing 2.6 KB instead of ~9 MB also keeps event-loop blocks short under concurrent traffic.
- **Lower Database Load**: MySQL reads index pages and minimal column buffers rather than scanning large text/blob columns and joining multiple secondary tables.
- **Decoupled Evolution**: The frontend team can iterate on dashboard screen requirements without risking regressions in other consumers of user data.

### Negative / Trade-offs
- **API Surface Proliferation**: Adding dedicated BFF endpoints increases the total number of route handlers and DTOs that the backend team must maintain.
- **Code Duplication**: Logic might appear similar to generic user queries unless cleanly segregated into domain services or specialized read repositories.

## Verification
- Validated via automated unit tests (`tests/unit/application/use-cases/get-dashboard-bff.use-case.spec.ts`) and end-to-end payload measurement tests (`tests/e2e/compare-endpoints.e2e.test.ts`).
- Monitored via the `/api/compare` benchmark endpoint, asserting raw and compressed byte counts and query counts.
