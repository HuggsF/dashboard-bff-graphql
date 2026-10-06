# ADR-002: GraphQL for Flexible Queries and Structural Over-Fetching Prevention

## Status
Accepted

## Context
While the REST BFF pattern (ADR-001) effectively solves over-fetching for a static, predetermined dashboard view, our EdTech ecosystem features multiple client applications (Web React SPA, iOS student app, Android low-bandwidth app, and Partner LMS widgets). 

Each client surface requires slightly different subsets of student data:
- The Web Dashboard requires `name`, `avatarUrl`, and `totalScore`.
- The Mobile App needs `name`, `avatarUrl`, and `completedCourses`, but omits heavy relation details on initial load.
- A drill-down view requires full student profiles with enrolled courses, module progress, and issued certificate URLs.

Creating a distinct REST BFF endpoint for every screen variation would lead to endpoint sprawl, high maintenance overhead, and tight coupling between frontend UI releases and backend deployments.

## Considered Options

1. **REST with Sparse Fieldsets (JSON:API / Custom Query Params)**:
   - Client specifies query parameters like `?include=enrollments.course&fields[users]=name,avatarUrl`.
   - *Rejected*: Lacks static type safety, requires bespoke parsing and nested query generation, prone to edge cases with nested joins, and provides no standard tooling for client-side state management (such as Apollo Client cache or Relay).

2. **Proliferation of REST BFF Endpoints (`/api/v2/dashboard/mobile`, `/api/v2/dashboard/compact`)**:
   - Create tailored REST endpoints for every client profile and screen variant.
   - *Rejected*: Exponential growth of backend endpoints, versioning friction, and continuous backend dependency for simple UI changes.

3. **GraphQL with Apollo Server (`POST /graphql`)**:
   - Expose a unified GraphQL schema with strongly typed queries, types, and connections.
   - Client specifies the exact selection set required for its active view tree.
   - Combine with DataLoader (ADR-003) for efficient batched execution of relation fields.
   - *Chosen*: Solves over-fetching and under-fetching structurally at the protocol level, provides a strongly typed schema contract, supports query introspection and developer tooling (Apollo Sandbox), and enables independent client evolution.

## Decision Outcome

We decided to adopt **GraphQL (Apollo Server v4)** alongside the REST endpoints:

1. **Selection-Driven Application Use Case**: The `GetDashboardGraphQLUseCase` accepts an array of requested fields derived from the GraphQL AST (`info.fieldNodes`). SQL queries are dynamic down to only the requested columns.
2. **Relay-Style Keyset Pagination**: Implemented `DashboardConnection` with `DashboardEdge` (`cursor`, `node`), `PageInfo` (`hasNextPage`, `endCursor`), and `totalCount`. Cursors are encoded using composite index keys (`totalScore` + `id`), providing stable $O(1)$ database index seeks without OFFSET degradation.
3. **Strict Query Protection**: 
   - Configured query depth limiting (`createDepthLimitRule(maxDepth = 6)`) to prevent recursive query attacks (e.g., `user -> enrollments -> course -> modules -> course -> ...`).
   - Disabled introspection and landing page in production environments.
4. **Result Pattern Integration**: Resolvers delegate directly to application use cases returning `Result<T, E>`. Domain/Application errors are mapped to RFC-compliant GraphQL errors (`BAD_USER_INPUT`, `INTERNAL_SERVER_ERROR`) with sanitized messages.

## Consequences

### Positive
- **Zero Over-Fetching**: Client receives exactly the fields it requested; payload for the 3-field dashboard drops to ~800 bytes uncompressed (~300 bytes compressed).
- **Zero Under-Fetching**: Multiple entities (User, Enrollment, Course, Instructor) can be resolved in a single network round-trip.
- **Client Autonomy**: Frontend teams can add or remove fields from UI components without requiring backend schema or controller changes.
- **Strong Typing & Introspection**: Self-documenting schema with GraphQL SDL, enabling automatic TypeScript type generation on frontend.

### Negative / Trade-offs
- **Complexity of Caching**: HTTP caching based on URLs and `Cache-Control` headers is harder with `POST /graphql` compared to standard REST `GET`.
- **N+1 Query Risk**: Nested resolver execution without batching causes massive database connection and query amplification (addressed in ADR-003).
- **Execution Overhead**: GraphQL query parsing, validation, and field-by-field execution introduce slight CPU overhead compared to static REST handlers (mitigated by field selection pushdown and DataLoader).

## Verification
- Validated via GraphQL unit tests (`tests/unit/presentation/graphql/`) verifying cursor encoding, field selection, depth limits, and error formatting.
- Integration tests (`tests/integration/graphql-resolvers.test.ts`) asserting resolver behavior with DataLoader.
- Verified in `/api/compare` benchmarking comparing REST Legacy, REST BFF, and GraphQL payloads.
