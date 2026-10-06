import { createApolloServer } from '@presentation/graphql/apollo-server';
import { createLearningGraphLoaders } from '@application/services/learning-graph.loaders';
import { DataLoaderBatchLoaderFactory } from '@infrastructure/batching/dataloader-batch-loader.factory';
import type { LearningGraphReader } from '@application/interfaces/learning-graph.reader';
import { ok } from '@domain/shared/result';
import { createLoggerMock } from '../support/fakes';

describe('GraphQL Resolvers + DataLoader Integration', () => {
  it('resolves nested learning graph without N+1 query explosion using DataLoader', async () => {
    // Track reader calls
    const readerCalls = {
      enrollments: 0,
      courses: 0,
      instructors: 0,
      modules: 0,
      certificates: 0,
    };

    const mockReader: LearningGraphReader = {
      findEnrollmentsByUserIds: jest.fn().mockImplementation(() => {
        readerCalls.enrollments += 1;
        return Promise.resolve([
          { id: 'enr-1', userId: 'usr-1', courseId: 'crs-1', score: 90, progress: 100 },
          { id: 'enr-2', userId: 'usr-1', courseId: 'crs-1', score: 85, progress: 100 }, // same course!
        ]);
      }),
      findCoursesByIds: jest.fn().mockImplementation(() => {
        readerCalls.courses += 1;
        return Promise.resolve([
          {
            id: 'crs-1',
            name: 'Advanced Clean Architecture',
            description: 'DDD & Hexagonal',
            category: 'Architecture',
            durationHours: 15,
            instructorId: 'inst-1',
          },
        ]);
      }),
      findInstructorsByIds: jest.fn().mockImplementation(() => {
        readerCalls.instructors += 1;
        return Promise.resolve([
          { id: 'inst-1', name: 'Martin Fowler', bio: 'Author and speaker', avatarUrl: null },
        ]);
      }),
      findModulesByCourseIds: jest.fn().mockImplementation(() => {
        readerCalls.modules += 1;
        return Promise.resolve([
          { id: 'mod-1', courseId: 'crs-1', title: 'Module 1', content: 'Intro', orderIndex: 0 },
        ]);
      }),
      findCertificatesByUserIds: jest.fn().mockImplementation(() => Promise.resolve([])),
    };

    const mockGetUserProfile = {
      execute: jest.fn().mockResolvedValue(
        ok({
          id: 'usr-1',
          name: 'Student One',
          email: 'student@example.com',
          avatarUrl: 'https://example.com/avatar.png',
        }),
      ),
    };

    const mockGetDashboard = {
      execute: jest.fn(),
    };

    const apolloServer = createApolloServer({
      getDashboardGraphQL: mockGetDashboard,
      getUserProfile: mockGetUserProfile,
      logger: createLoggerMock(),
      playground: false,
      maxDepth: 10,
      includeStacktrace: false,
    });

    await apolloServer.start();

    const factory = new DataLoaderBatchLoaderFactory({ batch: true });
    const loaders = createLearningGraphLoaders(mockReader, factory);

    const query = `
      query GetUserProfileGraph {
        user(id: "usr-1") {
          name
          email
          enrollments {
            score
            course {
              name
              instructor {
                name
              }
              modules {
                title
              }
            }
          }
        }
      }
    `;

    const response = await apolloServer.executeOperation(
      { query },
      { contextValue: { loaders } },
    );

    await apolloServer.stop();

    expect(response.body.kind).toBe('single');
    if (response.body.kind === 'single') {
      expect(response.body.singleResult.errors).toBeUndefined();
      const userData = response.body.singleResult.data?.user as any;
      expect(userData).toMatchObject({
        name: 'Student One',
        email: 'student@example.com',
        enrollments: [
          {
            score: 90,
            course: {
              name: 'Advanced Clean Architecture',
              instructor: { name: 'Martin Fowler' },
              modules: [{ title: 'Module 1' }],
            },
          },
          {
            score: 85,
            course: {
              name: 'Advanced Clean Architecture',
              instructor: { name: 'Martin Fowler' },
              modules: [{ title: 'Module 1' }],
            },
          },
        ],
      });
    }

    // Verify DataLoader batching:
    // Even though there are 2 enrollments with the same course crs-1,
    // findCoursesByIds must be called exactly ONCE (batched and memoized).
    expect(readerCalls.courses).toBe(1);
    expect(readerCalls.instructors).toBe(1);
    expect(readerCalls.modules).toBe(1);
    expect(readerCalls.enrollments).toBe(1);
  });
});
