import { createApolloServer } from '@presentation/graphql/apollo-server';
import { createLearningGraphLoaders } from '@application/services/learning-graph.loaders';
import { DataLoaderBatchLoaderFactory } from '@infrastructure/batching/dataloader-batch-loader.factory';
import type { LearningGraphReader } from '@application/interfaces/learning-graph.reader';
import type { GraphQLContext } from '@presentation/graphql/context';
import type { CourseNodeDTO } from '@application/dtos/graph.dto';
import { ok } from '@domain/shared/result';
import { createLoggerMock } from '../support/fakes';

describe('DataLoader Lifecycle, Security & Multi-Tenancy Isolation', () => {
  const query = `
    query GetUserProfile($userId: ID!) {
      user(id: $userId) {
        id
        name
        enrollments {
          id
          course {
            id
            name
          }
        }
      }
    }
  `;

  it('demonstrates request-scoped isolation: prevents cross-request data leaks and stale cache', async () => {
    // Simulated DB state that can change between requests
    let dbCourseTitle = 'Architecture 101 - Tenant A';
    let courseReaderCalls = 0;

    const mockReader: LearningGraphReader = {
      findEnrollmentsByUserIds: jest.fn().mockImplementation((userIds: readonly string[]) =>
        Promise.resolve([
          {
            id: `enr-${userIds[0]}`,
            userId: userIds[0] ?? 'usr-1',
            courseId: 'crs-common',
            score: 100,
            progress: 100,
          },
        ]),
      ),
      findCoursesByIds: jest.fn().mockImplementation((courseIds: readonly string[]) => {
        courseReaderCalls += 1;
        const result: CourseNodeDTO[] = (courseIds as string[]).map((id) => ({
          id,
          name: dbCourseTitle,
          description: 'Secure course content',
          category: 'Architecture',
          durationHours: 20,
          instructorId: 'inst-1',
        }));
        return Promise.resolve(result);
      }),
      findInstructorsByIds: jest.fn().mockResolvedValue([]),
      findModulesByCourseIds: jest.fn().mockResolvedValue([]),
      findCertificatesByUserIds: jest.fn().mockResolvedValue([]),
    };

    const mockGetUserProfile = {
      execute: jest.fn().mockImplementation((input: { readonly id: string }) =>
        Promise.resolve(
          ok({
            id: input.id,
            name: `User ${input.id}`,
            email: `${input.id}@company.org`,
            avatarUrl: null,
          }),
        ),
      ),
    };

    const apolloServer = createApolloServer({
      getDashboardGraphQL: { execute: jest.fn() },
      getUserProfile: mockGetUserProfile,
      logger: createLoggerMock(),
      playground: false,
      maxDepth: 10,
      includeStacktrace: false,
    });

    await apolloServer.start();

    const factory = new DataLoaderBatchLoaderFactory({ batch: true });

    // REQUEST 1 (e.g., Tenant A): Fresh request context
    const contextReq1: GraphQLContext = {
      loaders: createLearningGraphLoaders(mockReader, factory),
    };

    const res1 = await apolloServer.executeOperation(
      { query, variables: { userId: 'tenant-a-user' } },
      { contextValue: contextReq1 },
    );

    expect(res1.body.kind).toBe('single');
    if (res1.body.kind === 'single') {
      expect(res1.body.singleResult.errors).toBeUndefined();
      const user = res1.body.singleResult.data?.user as {
        enrollments: [{ course: { name: string } }];
      };
      expect(user.enrollments[0].course.name).toBe('Architecture 101 - Tenant A');
    }
    expect(courseReaderCalls).toBe(1);

    // Simulate database update / multi-tenant configuration change before Request 2
    dbCourseTitle = 'Architecture 101 - Updated / Tenant B';

    // REQUEST 2 (e.g., Tenant B): Fresh request context with new DataLoader instances
    const contextReq2: GraphQLContext = {
      loaders: createLearningGraphLoaders(mockReader, factory),
    };

    const res2 = await apolloServer.executeOperation(
      { query, variables: { userId: 'tenant-b-user' } },
      { contextValue: contextReq2 },
    );

    expect(res2.body.kind).toBe('single');
    if (res2.body.kind === 'single') {
      expect(res2.body.singleResult.errors).toBeUndefined();
      const user = res2.body.singleResult.data?.user as {
        enrollments: [{ course: { name: string } }];
      };
      // PROOF: Request 2 got the updated / isolated tenant data, NOT the cached data from Request 1!
      expect(user.enrollments[0].course.name).toBe('Architecture 101 - Updated / Tenant B');
    }
    // PROOF: Course reader was called again for Request 2 (2 calls total)
    expect(courseReaderCalls).toBe(2);

    await apolloServer.stop();
  });

  it('demonstrates the ANTI-PATTERN: global singleton DataLoader causes data leak & stale cache', async () => {
    let dbCourseTitle = 'Confidential Course - Tenant Alpha';
    let dbCalls = 0;

    const mockReader: LearningGraphReader = {
      findEnrollmentsByUserIds: jest.fn().mockImplementation((userIds: readonly string[]) =>
        Promise.resolve([
          {
            id: `enr-${userIds[0]}`,
            userId: userIds[0] ?? 'usr-1',
            courseId: 'crs-leak',
            score: 100,
            progress: 100,
          },
        ]),
      ),
      findCoursesByIds: jest.fn().mockImplementation((courseIds: readonly string[]) => {
        dbCalls += 1;
        return Promise.resolve(
          (courseIds as string[]).map((id) => ({
            id,
            name: dbCourseTitle,
            description: 'Sensitive Data',
            category: 'Security',
            durationHours: 10,
            instructorId: 'inst-1',
          })),
        );
      }),
      findInstructorsByIds: jest.fn().mockResolvedValue([]),
      findModulesByCourseIds: jest.fn().mockResolvedValue([]),
      findCertificatesByUserIds: jest.fn().mockResolvedValue([]),
    };

    const mockGetUserProfile = {
      execute: jest.fn().mockImplementation((input: { readonly id: string }) =>
        Promise.resolve(
          ok({
            id: input.id,
            name: `User ${input.id}`,
            email: `${input.id}@company.org`,
            avatarUrl: null,
          }),
        ),
      ),
    };

    const apolloServer = createApolloServer({
      getDashboardGraphQL: { execute: jest.fn() },
      getUserProfile: mockGetUserProfile,
      logger: createLoggerMock(),
      playground: false,
      maxDepth: 10,
      includeStacktrace: false,
    });

    await apolloServer.start();

    // ANTI-PATTERN: A SINGLE GLOBAL SINGLETON DATALOADER SHARED ACROSS REQUESTS
    const factory = new DataLoaderBatchLoaderFactory({ batch: true });
    const globalSingletonLoaders = createLearningGraphLoaders(mockReader, factory);
    const sharedSingletonContext: GraphQLContext = { loaders: globalSingletonLoaders };

    // Request 1 from User A
    const res1 = await apolloServer.executeOperation(
      { query, variables: { userId: 'user-alpha' } },
      { contextValue: sharedSingletonContext },
    );

    expect(res1.body.kind).toBe('single');
    expect(dbCalls).toBe(1);

    // Now, DB title changes or Tenant Beta should not see Tenant Alpha's data
    dbCourseTitle = 'Public Course - Tenant Beta';

    // Request 2 from User B reusing the global singleton context
    const res2 = await apolloServer.executeOperation(
      { query, variables: { userId: 'user-beta' } },
      { contextValue: sharedSingletonContext },
    );

    expect(res2.body.kind).toBe('single');
    if (res2.body.kind === 'single') {
      const user = res2.body.singleResult.data?.user as {
        enrollments: [{ course: { name: string } }];
      };
      // VULNERABILITY REVEALED:
      // User Beta receives the STALE / LEAKED cached name from User Alpha!
      expect(user.enrollments[0].course.name).toBe('Confidential Course - Tenant Alpha');
      // DB was NEVER contacted for Request 2 (stuck at 1 call)
      expect(dbCalls).toBe(1);
    }

    await apolloServer.stop();
  });

  it('guarantees memory safety: request loaders are fresh instances decoupled from long-lived container', () => {
    const mockReader = {} as LearningGraphReader;
    const factory = new DataLoaderBatchLoaderFactory({ batch: true });

    const loadersReq1 = createLearningGraphLoaders(mockReader, factory);
    const loadersReq2 = createLearningGraphLoaders(mockReader, factory);

    // Each request gets independent instances — allowing GC after request lifecycle completes
    expect(loadersReq1).not.toBe(loadersReq2);
    expect(loadersReq1.courseById).not.toBe(loadersReq2.courseById);
    expect(loadersReq1.enrollmentsByUserId).not.toBe(loadersReq2.enrollmentsByUserId);
  });

  it('solves N+1 within a single request: sibling nodes coalesce into a single batch query', async () => {
    let courseBatchQueries = 0;
    const requestedCourseIds: string[][] = [];

    const mockReader: LearningGraphReader = {
      findEnrollmentsByUserIds: jest.fn().mockImplementation((userIds: readonly string[]) =>
        Promise.resolve([
          // 3 enrollments in the same request pointing to 2 distinct courses
          { id: 'enr-1', userId: userIds[0] ?? 'u1', courseId: 'crs-1', score: 80, progress: 100 },
          { id: 'enr-2', userId: userIds[0] ?? 'u1', courseId: 'crs-2', score: 90, progress: 100 },
          { id: 'enr-3', userId: userIds[0] ?? 'u1', courseId: 'crs-1', score: 85, progress: 100 },
        ]),
      ),
      findCoursesByIds: jest.fn().mockImplementation((courseIds: readonly string[]) => {
        courseBatchQueries += 1;
        requestedCourseIds.push([...courseIds]);
        return Promise.resolve(
          (courseIds as string[]).map((id) => ({
            id,
            name: `Course ${id}`,
            description: 'Course Desc',
            category: 'Tech',
            durationHours: 10,
            instructorId: 'inst-1',
          })),
        );
      }),
      findInstructorsByIds: jest.fn().mockResolvedValue([]),
      findModulesByCourseIds: jest.fn().mockResolvedValue([]),
      findCertificatesByUserIds: jest.fn().mockResolvedValue([]),
    };

    const mockGetUserProfile = {
      execute: jest.fn().mockImplementation((input: { readonly id: string }) =>
        Promise.resolve(
          ok({
            id: input.id,
            name: `User ${input.id}`,
            email: `${input.id}@company.org`,
            avatarUrl: null,
          }),
        ),
      ),
    };

    const apolloServer = createApolloServer({
      getDashboardGraphQL: { execute: jest.fn() },
      getUserProfile: mockGetUserProfile,
      logger: createLoggerMock(),
      playground: false,
      maxDepth: 10,
      includeStacktrace: false,
    });

    await apolloServer.start();

    const factory = new DataLoaderBatchLoaderFactory({ batch: true });
    const context: GraphQLContext = { loaders: createLearningGraphLoaders(mockReader, factory) };

    const res = await apolloServer.executeOperation(
      { query, variables: { userId: 'u1' } },
      { contextValue: context },
    );

    expect(res.body.kind).toBe('single');
    // PROOF: 3 enrollments did NOT trigger 3 separate queries.
    // Sibling course lookups were batched into exactly 1 database query!
    expect(courseBatchQueries).toBe(1);
    expect(requestedCourseIds[0]).toEqual(['crs-1', 'crs-2']);

    await apolloServer.stop();
  });
});
