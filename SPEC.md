# SPEC.md — dashboard-bff-graphql

## Overview

| Field | Value |
|---|---|
| **Project** | dashboard-bff-graphql |
| **Problem** | API returning 5MB JSON when frontend only needs 3 fields (over-fetching) |
| **Interview Question** | Q10 — DOT Digital Group Senior Backend Node.js |
| **Architecture** | Clean Architecture + DDD + TypeScript |

## Problem Statement

The frontend team (React) complains that `GET /api/dashboard` is slow and returns a 5MB JSON payload. The UI only displays 3 text fields: student name, score, and avatar URL. The Senior Backend developer must solve this **structurally**, not with workarounds.

## Solution

Implement three approaches to compare:
1. **REST Legacy (v1)** — The problem: `SELECT *` returning everything
2. **REST BFF (v2)** — Backend For Frontend with SQL projections + pagination + compression
3. **GraphQL (v3)** — Client requests exactly what it needs + DataLoader for N+1

---

## Domain Model

### Entities

#### User
```typescript
class User {
  readonly id: string
  readonly name: UserName
  readonly email: Email
  readonly avatarUrl: AvatarUrl
  readonly bio: string
  readonly enrollments: Enrollment[]
  readonly certificates: Certificate[]
  readonly createdAt: Date
}
```

#### Enrollment
```typescript
class Enrollment {
  readonly id: string
  readonly userId: string
  readonly course: Course
  readonly score: Score
  readonly progress: Progress
  readonly startedAt: Date
  readonly completedAt: Date | null
}
```

#### Course
```typescript
class Course {
  readonly id: string
  readonly name: CourseName
  readonly description: string
  readonly category: string
  readonly duration: number
  readonly instructor: Instructor
  readonly modules: Module[]
}
```

#### Certificate, Module, Instructor (supporting entities)

### Value Objects
- **UserName**: 2-100 chars
- **Email**: valid email format
- **AvatarUrl**: valid URL or null
- **Score**: 0-100
- **Progress**: 0-100 (percentage)
- **CourseName**: 2-200 chars

### Repository Interfaces

```typescript
interface UserRepository {
  findAll(): Promise<User[]>                                    // Legacy: returns EVERYTHING
  findAllProjected(fields: string[]): Promise<Partial<User>[]>  // BFF: returns only requested fields
  findById(id: string): Promise<User | null>
  count(): Promise<number>
}

interface DashboardRepository {
  getDashboardSummary(page: number, pageSize: number): Promise<DashboardSummary[]>
}
```

---

## Application Layer

### Use Cases

#### GetDashboardLegacyUseCase (v1)
- Fetches ALL users with ALL relations (enrollments, courses, certificates, modules)
- Returns massive DTO (~5MB)
- No pagination
- Demonstrates the problem

#### GetDashboardBFFUseCase (v2)
- Fetches only `name`, `total_score`, `avatar_url` from DB (SQL projection)
- Cursor-based pagination (20 per page)
- Returns minimal DTO (~1.2KB before compression)

#### GetDashboardGraphQLUseCase (v3)
- Receives requested fields from GraphQL resolver
- Uses DataLoader for batching related queries (N+1 prevention)
- Returns exactly what was requested

#### CompareResponseSizesUseCase
- Calls all three approaches
- Returns comparison: payload size, query count, response time

---

## Infrastructure Layer

### Database
- MySQL 8 with multiple related tables
- Seed script creates enough data to produce ~5MB payload:
  - 1,000 users
  - 5,000 enrollments
  - 200 courses
  - 50 instructors
  - 1,000 modules
  - 3,000 certificates

### GraphQL (Apollo Server)

#### Schema
```graphql
type Query {
  dashboard(page: Int, pageSize: Int): DashboardConnection!
  user(id: ID!): User
}

type DashboardConnection {
  edges: [DashboardEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type DashboardEdge {
  cursor: String!
  node: DashboardEntry!
}

type DashboardEntry {
  id: ID!
  name: String!
  totalScore: Int!
  avatarUrl: String
  completedCourses: Int!
}

type User {
  id: ID!
  name: String!
  email: String!
  avatarUrl: String
  enrollments: [Enrollment!]!
  certificates: [Certificate!]!
}

type Enrollment {
  id: ID!
  course: Course!
  score: Int!
  progress: Int!
}

type Course {
  id: ID!
  name: String!
  description: String!
  instructor: Instructor!
  modules: [Module!]!
}

type PageInfo {
  hasNextPage: Boolean!
  endCursor: String
}
```

#### DataLoader
- `CourseLoader` — batches course lookups by enrollment
- `InstructorLoader` — batches instructor lookups by course
- `ModuleLoader` — batches module lookups by course

### Compression Middleware
- Gzip and Brotli via `compression` or `@fastify/compress`
- Compare payload sizes:
  - Raw JSON: 5MB → BFF: 1.2KB → GraphQL: 800B
  - With Gzip: ~1.5MB → ~400B → ~300B

---

## Presentation Layer

### REST Endpoints
```
GET /api/v1/dashboard                  # Legacy — returns ~5MB (the problem)
GET /api/v2/dashboard?page=1&size=20   # BFF — returns ~1.2KB + pagination
GET /api/compare                       # Comparison: size, time, queries for each
GET /health                            # Health check
```

### GraphQL Endpoint
```
POST /graphql                          # Apollo Server
GET  /graphql                          # Apollo Sandbox (dev only)
```

### Mini React Frontend
A small React SPA (`frontend/`) that:
- Has 3 tabs: "Legacy REST", "BFF REST", "GraphQL"
- Each tab calls its respective endpoint and displays:
  - Response time
  - Payload size (bytes)
  - Number of records
  - The actual 3 fields (name, score, avatar)
- Visual side-by-side comparison

---

## Tests

### Unit Tests
- `user.entity.spec.ts` — Entity creation
- `get-dashboard-bff.use-case.spec.ts` — Projection and pagination
- `get-dashboard-graphql.use-case.spec.ts` — Field selection

### Integration Tests
- `dashboard-repository.test.ts` — SQL projection vs full query
- `graphql-resolvers.test.ts` — Resolver + DataLoader

### E2E Tests
- `compare-endpoints.e2e.test.ts` — Hit all 3 endpoints, verify payload sizes

---

## Docker Compose

```yaml
services:
  mysql:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: dashboard_bff
    ports: ["3306:3306"]

  backend:
    build: .
    ports: ["3000:3000"]
    depends_on: [mysql]
    environment:
      - DB_HOST=mysql

  frontend:
    build: ./frontend
    ports: ["5173:5173"]
    depends_on: [backend]
```

---

## Dependencies

### Backend Production
- express, @apollo/server, graphql, dataloader, mysql2, knex, compression, pino, zod, dotenv, uuid

### Backend Development
- typescript, tsx, jest, ts-jest, supertest, @types/node, @types/express, eslint, prettier, @faker-js/faker

### Frontend
- react, react-dom, vite, @apollo/client, graphql

---

## ADR Documents

1. `docs/adr/001-bff-over-generic-api.md` — Why BFF instead of making the frontend filter data
2. `docs/adr/002-graphql-for-flexible-queries.md` — Why GraphQL solves over-fetching structurally
3. `docs/adr/003-dataloader-n-plus-one.md` — Why DataLoader is essential for GraphQL performance
