# ADR-003: DataLoader Pattern for N+1 Query Prevention in GraphQL

## Status
Accepted

## Context
When resolving nested relationship fields in GraphQL (e.g., fetching a list of 20 students, and for each student resolving their enrolled courses and the respective course instructors), GraphQL's default execution model invokes field resolvers independently in a depth-first or breadth-first tree traversal.

### The N+1 Problem
Without intervention, resolving 20 students with their enrollments and courses generates:
- 1 initial query for 20 users
- 20 separate queries for each user's enrollments (N queries)
- Up to 100 queries for each enrollment's course (M queries)
- Total: 1 + 20 + 100 = 121 separate SQL queries to MySQL for a single dashboard request.

Under concurrent user traffic, this query explosion saturates the database connection pool, introduces severe latency due to database round-trips, and risks database timeouts or crashing the service.

## Considered Options

1. **Greedy Relational SQL Joins in Root Resolver**:
   - In the root query resolver, execute a large `LEFT JOIN` encompassing all tables down the tree and assemble the graph in-memory.
   - *Rejected*: Violates GraphQL modularity; defeats the purpose of client-driven field selection; causes catastrophic Cartesian product data duplication over the database wire; breaks Clean Architecture by coupling root query to nested child schemas.

2. **Naive Per-Field Database Calls**:
   - Allow each resolver (`User.enrollments`, `Enrollment.course`, `Course.instructor`) to execute an independent `SELECT * FROM table WHERE id = ?`.
   - *Rejected*: Inevitable N+1 query amplification, crippling system scalability and violating production SLA.

3. **DataLoader Pattern with Per-Request Scoped Caching & Batching**:
   - Use Facebook's `dataloader` library to coalesce individual keys requested within a single Node.js event-loop tick into a single batched array query (`WHERE id IN (?, ?, ...)`).
   - Ensure loaders are instantiated **per-request** within the GraphQL context to prevent cross-request cache leaks and stale data anomalies.
   - *Chosen*: Decoupled, automatic batching and caching matching GraphQL's execution model with zero cross-request contamination.

## Decision Outcome

We decided to implement the **DataLoader Pattern** for all relational traversals across the learning graph:

1. **Per-Request Context Lifecycle**:
   - DataLoader instances are instantiated inside the GraphQL `context` factory for every incoming HTTP request.
   - DataLoader cache is scoped strictly to the lifecycle of that individual request, preventing cross-tenant data leaks and memory leaks in Node.js heap.
2. **Dedicated Loaders in Application Layer**:
   - `enrollmentsByUserId`: Batches student enrollment queries via `WHERE user_id IN (...)`.
   - `certificatesByUserId`: Batches certificate lookups via `WHERE user_id IN (...)`.
   - `courseById`: Batches course metadata via `WHERE id IN (...)`.
   - `instructorById`: Batches instructor lookups via `WHERE id IN (...)`.
   - `modulesByCourseId`: Batches course module lookups via `WHERE course_id IN (...)`.
3. **Deterministic Key-to-Value Alignment**:
   - Implemented strict alignment helpers (`alignOne` and `alignMany` in `@application/services/learning-graph.loaders.ts`) ensuring the returned array matches the input keys' exact order and length, with `null` or empty arrays for missing entities, as required by the DataLoader specification.
4. **Clean Architecture Boundary**:
   - The infrastructure layer provides `DataLoaderBatchLoaderFactory` implementing the domain/application `BatchLoaderFactory` interface. The application layer defines loader abstractions without directly binding to the `dataloader` npm package in domain entities.

## Consequences

### Positive
- **Drastic Query Count Reduction**: For 20 users with enrollments and courses, query count drops from 120+ queries to at most **3 to 4 batched queries** (`WHERE IN (...)`).
- **Optimal Connection Pool Utilization**: Eliminates connection pool starvation and contention under high concurrency.
- **In-Memory Request Memoization**: If multiple enrollments reference the same Course ID, `courseById` fetches it once and resolves subsequent promises from its per-request memoization cache.
- **Maintainable Resolver Architecture**: Resolvers remain focused and clean, delegating simply to `context.loaders.loaderName.load(id)`.

### Negative / Trade-offs
- **Microtask Scheduling Nuance**: DataLoader relies on Node.js `process.nextTick` or `queueMicrotask` to batch calls. Operations executing across asynchronous ticks without proper coordination could split batches.
- **MySQL IN Clause Limits**: For very large key sets (e.g., thousands of IDs), `WHERE IN` queries must be chunked (e.g., max 500 keys per chunk) to avoid hitting database query parser limits.

## Verification
- Validated via unit tests with `RecordingBatchLoaderFactory` (`tests/unit/application/services/learning-graph.loaders.spec.ts`) asserting that sibling lookups are coalesced into a single batched array.
- Validated in integration tests (`tests/integration/graphql-resolvers.test.ts`) asserting query count stays constant $O(1)$ regardless of result set size.
- Verified in `/api/compare` metrics tracking `dbQueries` across Legacy vs BFF vs GraphQL approaches.
