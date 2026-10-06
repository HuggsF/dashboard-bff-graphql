# 📊 dashboard-bff-graphql

> Reducing an ~9 MB API response to 2.6 KB — solving over-fetching and the N+1 problem with Backend-for-Frontend (BFF) and GraphQL.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![GraphQL](https://img.shields.io/badge/GraphQL-Apollo%20Server%20v4-e535ab?logo=graphql)](https://www.apollographql.com/)
[![Node.js](https://img.shields.io/badge/Node.js-24+-green?logo=node.js)](https://nodejs.org/)
[![Clean Architecture](https://img.shields.io/badge/Architecture-Clean%20%2B%20DDD-orange)](docs/adr/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue?logo=docker)](https://docs.docker.com/compose/)
[![Tests](https://img.shields.io/badge/Tests-43%20passed%20(248%20tests)-brightgreen)](tests/)
[![Coverage](https://img.shields.io/badge/Coverage-97.4%25-brightgreen)](coverage/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## 🎯 The Problem

In enterprise LMS and EdTech platforms, dashboard interfaces often suffer from severe API over-fetching. A generic REST endpoint returns entire domain entity graphs (users, enrollments, courses, modules, instructors, certificates), while the frontend UI only needs **3 visual fields** (`name`, `totalScore`, `avatarUrl`) to render the student leaderboard.

```
GET /api/v1/dashboard

Response: ~8.99 MB (8,990,000 bytes)
├── 1,000 users × full profile (bio, email, created_at, status)
├── 5,000 enrollments × all relational attributes
├── 200 courses × description + category + duration + instructors
├── 1,000 modules × full text content + orderIndex
└── 3,000 certificates × verification numbers + pdf URLs

Frontend UI needs: name, totalScore, avatarUrl  (3 fields)
```

---

## ⚡ Empirical Benchmark Results (Reproducible)

Benchmark executed against MySQL 8 with the deterministic SPEC dataset (**1,000 users, 50 instructors, 200 courses, 1,000 modules, 5,000 enrollments, 3,000 certificates**):

| Approach | Endpoint | Records | Raw Payload | Gzip | Brotli | SQL Queries | Median Latency | Payload Reduction |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **v1: REST Legacy** | `GET /api/v1/dashboard` | 1,000 | **8.99 MB** | 2.57 MB | 540.0 KB | 6 | 54.4 ms | *Baseline* |
| **v2: REST BFF** | `GET /api/v2/dashboard` | 20 | **2.6 KB** | 974 B | 943 B | 2 | **5.6 ms** | **3,541.9x** (-99.97%) |
| **v3: GraphQL + DataLoader** | `POST /graphql` | 20 | **2.8 KB** | 1.0 KB | 1.0 KB | **1** | **6.1 ms** | **3,249.0x** (-99.97%) |

> 📁 Detailed raw benchmark logs and artifacts are preserved in [`benchmarks/benchmark-results.md`](benchmarks/benchmark-results.md) and [`benchmarks/benchmark-results.json`](benchmarks/benchmark-results.json).

### 🔍 Key Architectural Insights:
1. **Over-fetching Eradication**: Both REST BFF and GraphQL reduce payload transfer by over **3,200x** (from ~9 MB down to ~2.6 KB), saving massive bandwidth on mobile devices.
2. **Database Load Reduction**: GraphQL with DataLoader and Field Selection AST projection executes in **1 single SQL query**, eliminating N+1 database roundtrips.
3. **Sub-10ms Latency**: Server-side processing latency dropped from **54.4 ms to ~5.6 ms** (nearly a **10x speedup** locally, and even more pronounced over mobile cellular networks).

---

## 🏗️ Architecture: Clean Architecture + DDD

The project strictly follows Domain-Driven Design (DDD) and Clean Architecture principles:

```
src/
├── domain/                    # Pure Domain Layer (Zero external dependencies)
│   ├── entities/              # User, Course, Enrollment, Instructor, Module, Certificate
│   ├── value-objects/         # Email, Score, Progress, UserName, AvatarUrl, Percentage
│   ├── repositories/          # Domain repository interfaces (Ports)
│   └── shared/                # Result pattern (Result<T, E>), type guards
│
├── application/               # Application Layer (Use Cases & Business Workflows)
│   ├── use-cases/             # GetDashboardLegacy, GetDashboardBFF, GetDashboardGraphQL, Compare
│   ├── services/              # FieldSelection, LearningGraphLoaders, PaginationPolicy
│   ├── dtos/                  # Strongly-typed input/output DTOs
│   └── interfaces/            # Port definitions (BatchLoader, QueryCounter, PerformanceMonitor)
│
├── infrastructure/            # Infrastructure Adapters
│   ├── database/              # Knex.js MySQL adapters, migrations, query counter
│   ├── batching/              # DataLoaderBatchLoaderFactory (Request-scoped batching & cache)
│   ├── compression/           # Zlib gzip & brotli compressor
│   ├── logging/               # Structured Pino logger (zero console.log in production)
│   └── config/                # Zod environment validation & DI composition container
│
└── presentation/              # Presentation Adapters
    ├── http/                  # Express 5 controllers, routes, middlewares (QueryMetrics, ErrorHandler)
    ├── graphql/               # Apollo Server v4 schema, resolvers, context, depth-limit rule
    └── compare/               # Payload comparison sources provider
```

### Architectural Decisions (ADRs)

| ADR | Decision | Context & Rationale |
|---|---|---|
| [ADR-001](docs/adr/001-bff-over-generic-api.md) | **BFF over Generic API** | Decouples frontend UX needs from internal legacy database structures. |
| [ADR-002](docs/adr/002-graphql-for-flexible-queries.md) | **GraphQL for Dynamic Field Selection** | Allows clients to specify exact required fields via AST, preventing over-fetching. |
| [ADR-003](docs/adr/003-dataloader-n-plus-one.md) | **Request-Scoped DataLoader for N+1** | Batches sibling relation lookups in one tick while preventing cross-tenant leaks. |

---

## 🧪 Quality Gates & Test Coverage

The project enforces strict type safety and high test coverage:

```bash
npm run typecheck      # TypeScript 5 strict mode: 0 errors
npm run lint           # ESLint strict rules (--max-warnings 0): 0 errors / 0 warnings
npm test               # 43 test suites, 248 tests (100% pass)
npm run test:coverage  # Coverage: 97.4% Lines, 97.4% Statements, 88.2% Branches, 95.2% Functions
npm run build          # Clean compilation into dist/
```

---

## 🚀 How to Run & Reproduce

### 1. Prerequisites
- Docker & Docker Compose
- Node.js >= 22 (tested with Node 24)

### 2. Quick Start

```bash
# 1. Start MySQL database container
docker-compose up -d mysql

# 2. Install dependencies, run migrations and seed dataset
npm install
npm run migrate
npm run seed

# 3. Run the live benchmark
npm run benchmark

# 4. Start the application in development mode
npm run dev

# 5. Explore endpoints:
# REST Legacy:    http://localhost:3030/api/v1/dashboard
# REST BFF:       http://localhost:3030/api/v2/dashboard
# Comparison API: http://localhost:3030/api/compare
# GraphQL API:    http://localhost:3030/graphql
# Health check:   http://localhost:3030/health
```

---

## 📄 License

MIT © Hugo Fernandes
