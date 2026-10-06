# 📊 dashboard-bff-graphql

> Reducing a 5MB API response to 300 bytes — solving over-fetching with BFF and GraphQL.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![GraphQL](https://img.shields.io/badge/GraphQL-Apollo-e535ab?logo=graphql)](https://www.apollographql.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green?logo=node.js)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue?logo=docker)](https://docs.docker.com/compose/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## 🎯 The Problem

The frontend only needs **3 fields** (name, score, avatar), but the API returns **everything** — all relations, all fields, all records. Result: **5MB payload** per request.

```
GET /api/v1/dashboard

Response: 5,242,880 bytes (5MB)
├── 1,000 users × full profile
├── 5,000 enrollments × all fields
├── 200 courses × description + modules
├── 1,000 modules × content
└── 3,000 certificates × all metadata

Frontend uses: name, score, avatarUrl  (3 fields)
```

## 💡 Three Solutions Compared

| Approach | Payload | Gzipped | DB Queries | Response Time |
|---|---|---|---|---|
| **v1: REST Legacy** | 5MB | ~1.5MB | 6+ (JOINs) | ~2.5s |
| **v2: REST BFF** | 1.2KB | 400B | 1 (projection) | ~15ms |
| **v3: GraphQL** | 800B | 300B | 1 (+ DataLoader) | ~12ms |

**That is a 17,000x reduction in payload size.**

## 🏗️ Architecture

**Clean Architecture + DDD + TypeScript**

```
backend/
├── src/
│   ├── domain/           # User, Course, Enrollment entities
│   ├── application/      # 3 use cases (Legacy, BFF, GraphQL)
│   ├── infrastructure/   # MySQL repos, GraphQL resolvers, DataLoader
│   └── presentation/     # Express routes, Apollo Server

frontend/
├── src/                  # React SPA — 3-tab comparison UI
```

### Key Technical Decisions

| Decision | Rationale | ADR |
|---|---|---|
| BFF over generic API | Backend serves exactly what frontend needs | [ADR-001](docs/adr/001-bff-over-generic-api.md) |
| GraphQL for flexible queries | Client declares needed fields. Zero over-fetching | [ADR-002](docs/adr/002-graphql-for-flexible-queries.md) |
| DataLoader for N+1 | Batches relation lookups. 100 queries → 1 query | [ADR-003](docs/adr/003-dataloader-n-plus-one.md) |
| SQL projection | `SELECT name, score, avatar` vs `SELECT *` | — |
| Gzip/Brotli compression | 5MB → 1.5MB raw. 1.2KB → 400B compressed | — |

## 🚀 Quick Start

```bash
docker-compose up -d
npm install && npm run migrate && npm run seed
npm run dev

# Compare endpoints
curl http://localhost:3000/api/compare

# GraphQL Sandbox
open http://localhost:3000/graphql

# React comparison UI
open http://localhost:5173
```

## 📚 Tech Stack

| Technology | Role |
|---|---|
| **Express** | REST endpoints |
| **Apollo Server** | GraphQL |
| **DataLoader** | N+1 prevention |
| **MySQL 8** | Database |
| **React + Vite** | Comparison frontend |
| **compression** | Gzip/Brotli |

## 📄 License

MIT
