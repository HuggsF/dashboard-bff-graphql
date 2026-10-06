import request from 'supertest';
import { createHttpApp } from '@presentation/http/app';
import { HealthController } from '@presentation/http/controllers/health.controller';
import { DashboardController } from '@presentation/http/controllers/dashboard.controller';
import { CompareController } from '@presentation/http/controllers/compare.controller';
import { createLoggerMock, FakeQueryCounter } from '../support/fakes';
import { ok } from '@domain/shared/result';

describe('E2E Endpoints Comparison (Legacy vs BFF vs GraphQL)', () => {
  // Build realistic simulated payloads
  // Legacy payload: large simulated array of users with full relations
  const legacyUsers = Array.from({ length: 50 }, (_, i) => ({
    id: `usr-${i}`,
    name: `Student ${i}`,
    email: `student${i}@edtech.example`,
    avatarUrl: `https://avatars.example.com/${i}.png`,
    bio: 'Extensive bio description with multiple sentences for testing payload size.',
    createdAt: new Date().toISOString(),
    enrollments: Array.from({ length: 5 }, (__, e) => ({
      id: `enr-${i}-${e}`,
      userId: `usr-${i}`,
      score: 85,
      progress: 100,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      course: {
        id: `crs-${e}`,
        name: `Course Number ${e} - Full Stack Node.js Architecture`,
        description: 'Comprehensive course overview with detailed modules and prerequisites.',
        category: 'Backend',
        durationHours: 40,
        instructor: { id: `inst-${e}`, name: 'Instructor Name', bio: 'Bio', avatarUrl: null },
        modules: [
          { id: `mod-${e}-1`, title: 'Module 1', content: 'Detailed content', orderIndex: 0 },
          { id: `mod-${e}-2`, title: 'Module 2', content: 'Detailed content', orderIndex: 1 },
        ],
      },
    })),
    certificates: [
      {
        id: `cert-${i}`,
        userId: `usr-${i}`,
        courseId: 'crs-0',
        issuedAt: new Date().toISOString(),
        pdfUrl: `https://certs.example.com/${i}.pdf`,
        certificateNumber: `CERT-${i}`,
      },
    ],
  }));

  // BFF payload: exactly the 3 visual fields (id, name, totalScore, avatarUrl)
  const bffItems = Array.from({ length: 20 }, (_, i) => ({
    id: `usr-${i}`,
    name: `Student ${i}`,
    totalScore: 425,
    avatarUrl: `https://avatars.example.com/${i}.png`,
  }));

  const mockCheckHealth = {
    execute: jest.fn().mockResolvedValue(
      ok({ status: 'ok', uptimeSeconds: 3600, checks: { database: 'up' } }),
    ),
  };

  const mockGetDashboardLegacy = {
    execute: jest.fn().mockResolvedValue(
      ok({ total: 50, users: legacyUsers }),
    ),
  };

  const mockGetDashboardBFF = {
    execute: jest.fn().mockResolvedValue(
      ok({
        data: bffItems,
        pagination: { page: 1, size: 20, totalItems: 50, totalPages: 3, hasNext: true },
      }),
    ),
  };

  const mockCompareResponseSizes = {
    execute: jest.fn().mockResolvedValue(
      ok({
        measuredAt: new Date().toISOString(),
        runs: 1,
        baseline: 'v1',
        approaches: [
          {
            id: 'v1',
            label: 'REST Legacy',
            request: { method: 'GET', url: '/api/v1/dashboard' },
            records: 50,
            dbQueries: 6,
            timeMs: { min: 250, median: 260, max: 280 },
            bytes: { raw: 150000, gzip: 25000, brotli: 18000 },
            reductionVsBaseline: { raw: 1, gzip: 1, brotli: 1 },
          },
          {
            id: 'v2',
            label: 'REST BFF',
            request: { method: 'GET', url: '/api/v2/dashboard?page=1&size=20' },
            records: 20,
            dbQueries: 2,
            timeMs: { min: 15, median: 18, max: 22 },
            bytes: { raw: 1200, gzip: 400, brotli: 320 },
            reductionVsBaseline: { raw: 125, gzip: 62.5, brotli: 56.2 },
          },
          {
            id: 'v3',
            label: 'GraphQL',
            request: { method: 'POST', url: '/graphql' },
            records: 20,
            dbQueries: 1,
            timeMs: { min: 12, median: 14, max: 18 },
            bytes: { raw: 800, gzip: 300, brotli: 250 },
            reductionVsBaseline: { raw: 187.5, gzip: 83.3, brotli: 72 },
          },
        ],
      }),
    ),
  };

  const graphqlMockHandler = (_req: any, res: any): void => {
    res.status(200).json({
      data: {
        dashboard: {
          edges: bffItems.slice(0, 5).map((item) => ({
            cursor: Buffer.from(`c:${item.id}`).toString('base64url'),
            node: item,
          })),
          pageInfo: { hasNextPage: true, endCursor: 'end' },
          totalCount: 50,
        },
      },
    });
  };

  const app = createHttpApp({
    logger: createLoggerMock(),
    queryCounter: new FakeQueryCounter(),
    healthController: new HealthController(mockCheckHealth),
    dashboardController: new DashboardController(mockGetDashboardLegacy, mockGetDashboardBFF),
    compareController: new CompareController(mockCompareResponseSizes),
    graphqlHandler: graphqlMockHandler,
    corsOrigins: ['http://localhost:5173'],
    compressionThresholdBytes: 500,
  });

  it('GET /health returns 200 and ok status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/v1/dashboard returns legacy large payload', async () => {
    const res = await request(app).get('/api/v1/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(50);
    expect(res.body.users).toHaveLength(50);
    const payloadBytes = Buffer.byteLength(JSON.stringify(res.body));
    // Verify that the legacy response is significantly larger (> 20KB even with simulated users)
    expect(payloadBytes).toBeGreaterThan(20000);
  });

  it('GET /api/v2/dashboard returns compact BFF payload with pagination', async () => {
    const res = await request(app).get('/api/v2/dashboard?page=1&size=20');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(20);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.totalPages).toBe(3);

    const payloadBytes = Buffer.byteLength(JSON.stringify(res.body));
    // Verify that BFF payload is small (~1-2KB)
    expect(payloadBytes).toBeLessThan(3000);
  });

  it('POST /graphql returns targeted GraphQL dashboard payload', async () => {
    const res = await request(app)
      .post('/graphql')
      .send({
        query: `
          query {
            dashboard(pageSize: 5) {
              edges {
                node {
                  name
                  totalScore
                }
              }
            }
          }
        `,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.dashboard.edges).toHaveLength(5);
    const payloadBytes = Buffer.byteLength(JSON.stringify(res.body));
    expect(payloadBytes).toBeLessThan(1000);
  });

  it('GET /api/compare returns architectural benchmark metrics demonstrating over-fetching solution', async () => {
    const res = await request(app).get('/api/compare?runs=1');
    expect(res.status).toBe(200);
    expect(res.body.baseline).toBe('v1');
    expect(res.body.approaches).toHaveLength(3);

    const legacy = res.body.approaches.find((a: any) => a.id === 'v1');
    const bff = res.body.approaches.find((a: any) => a.id === 'v2');
    const gql = res.body.approaches.find((a: any) => a.id === 'v3');

    expect(legacy).toBeDefined();
    // Confirm that BFF and GraphQL have massive payload reduction vs baseline
    expect(bff.reductionVsBaseline.raw).toBeGreaterThan(50);
    expect(gql.reductionVsBaseline.raw).toBeGreaterThan(50);
  });
});
