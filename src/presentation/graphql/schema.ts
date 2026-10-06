/**
 * GraphQL schema (SDL). Same types as SPEC.md, plus:
 *   - `dashboard(after:)` — the connection exposes cursors, so it needs the argument that
 *     consumes them (Relay cursor connections). `page` is kept for OFFSET random access.
 *   - `Certificate`, `Instructor` and `Module` — referenced by the SPEC types but not spelled out.
 */
export const typeDefs = /* GraphQL */ `
  type Query {
    """
    Students ranked by total score (desc). Cursor pagination: pass the last \`endCursor\` as
    \`after\`. \`page\` (1-based) gives OFFSET access to an arbitrary page; it cannot be combined
    with \`after\`. \`pageSize\` defaults to 20 (max 100).
    """
    dashboard(page: Int, pageSize: Int, after: String): DashboardConnection!
    user(id: ID!): User
  }

  type DashboardConnection {
    edges: [DashboardEdge!]!
    pageInfo: PageInfo!
    "Costs one extra COUNT query: only computed when selected."
    totalCount: Int!
  }

  type DashboardEdge {
    "Opaque cursor (base64url) of this entry."
    cursor: String!
    node: DashboardEntry!
  }

  type DashboardEntry {
    id: ID!
    name: String!
    "Sum of the scores of every course the student is enrolled in."
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

  type Instructor {
    id: ID!
    name: String!
    bio: String!
    avatarUrl: String
  }

  type Module {
    id: ID!
    title: String!
    content: String!
    orderIndex: Int!
  }

  type Certificate {
    id: ID!
    course: Course!
    issuedAt: String!
    pdfUrl: String!
    certificateNumber: String!
  }

  type PageInfo {
    hasNextPage: Boolean!
    endCursor: String
  }
`;
