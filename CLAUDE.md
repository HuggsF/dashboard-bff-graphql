# CLAUDE.md — dashboard-bff-graphql

## Project Context
This project demonstrates solving API over-fetching by comparing three approaches: legacy REST (the problem), BFF pattern (Backend For Frontend), and GraphQL. A mini React frontend visualizes the difference.

## Key Constraints
- MUST implement three endpoints: v1 (legacy), v2 (BFF), v3 (GraphQL)
- MUST seed enough data to produce ~5MB from v1 endpoint
- MUST use Apollo Server for GraphQL
- MUST use DataLoader to prevent N+1 queries
- MUST implement a /compare endpoint that shows payload sizes
- MUST include a mini React frontend for visual comparison
- MUST use compression middleware (Gzip/Brotli)
- MUST use cursor-based pagination for GraphQL, offset for REST

## Implementation Order
1. Domain: User, Course, Enrollment, Certificate entities and VOs
2. Domain: repository interfaces
3. Application: GetDashboardLegacyUseCase (SELECT *)
4. Application: GetDashboardBFFUseCase (projection + pagination)
5. Application: GetDashboardGraphQLUseCase (field selection)
6. Application: CompareResponseSizesUseCase
7. Infrastructure: MySQL repositories (full and projected)
8. Infrastructure: Config, logging
9. Presentation: Express REST routes (v1, v2, /compare)
10. Presentation: Apollo Server + schema + resolvers + DataLoaders
11. Frontend: React SPA with 3 tabs
12. Tests: unit -> integration -> e2e
13. Docker Compose

## Project-Specific Dependencies
### Backend
- express, @apollo/server, graphql, dataloader, mysql2, knex, compression, uuid
- supertest (dev)

### Frontend
- react, react-dom, vite, @apollo/client, graphql

## Database Schema
```sql
CREATE TABLE users (id, name, email, avatar_url, bio, created_at);
CREATE TABLE courses (id, name, description, category, duration_hours, instructor_id);
CREATE TABLE instructors (id, name, bio, avatar_url);
CREATE TABLE modules (id, course_id, title, content, order_index);
CREATE TABLE enrollments (id, user_id, course_id, score, progress, started_at, completed_at);
CREATE TABLE certificates (id, user_id, course_id, issued_at, pdf_url, certificate_number);
```
