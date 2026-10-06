import { parse } from 'graphql';
import type { FieldNode, GraphQLResolveInfo, OperationDefinitionNode } from 'graphql';
import { ok } from '@domain/shared/result';
import { encodeCursor } from '@presentation/graphql/cursor';
import { buildResolvers } from '@presentation/graphql/resolvers';
import type { GraphQLContext } from '@presentation/graphql/context';

const createInfo = (queryText: string): GraphQLResolveInfo => {
  const doc = parse(queryText);
  const op = doc.definitions[0] as OperationDefinitionNode;
  const fieldNode = op.selectionSet.selections[0] as FieldNode;
  return {
    fieldNodes: [fieldNode],
    fragments: {},
    variableValues: {},
  } as unknown as GraphQLResolveInfo;
};

describe('GraphQL Resolvers', () => {
  const mockGetDashboard = {
    execute: jest.fn().mockResolvedValue(
      ok({
        edges: [
          {
            position: { totalScore: 100, id: 'u1' },
            node: { id: 'u1', name: 'Ada', totalScore: 100, avatarUrl: null, completedCourses: 1 },
          },
        ],
        hasNextPage: false,
        totalCount: 1,
      }),
    ),
  };

  const mockGetUserProfile = {
    execute: jest.fn().mockResolvedValue(
      ok({
        id: 'u1',
        name: 'Ada',
        email: 'ada@example.com',
        avatarUrl: null,
      }),
    ),
  };

  const mockLoaders: any = {
    enrollmentsByUserId: { load: jest.fn().mockResolvedValue([{ id: 'e1', courseId: 'c1' }]) },
    certificatesByUserId: { load: jest.fn().mockResolvedValue([{ id: 'cert1', courseId: 'c1' }]) },
    courseById: {
      load: jest.fn().mockImplementation((id: string) =>
        Promise.resolve({
          id,
          name: 'Course 1',
          instructorId: 'inst1',
        }),
      ),
    },
    instructorById: {
      load: jest.fn().mockImplementation((id: string) =>
        Promise.resolve({
          id,
          name: 'Grace',
        }),
      ),
    },
    modulesByCourseId: {
      load: jest.fn().mockResolvedValue([{ id: 'm1', title: 'Mod 1', orderIndex: 0 }]),
    },
  };

  const context: GraphQLContext = { loaders: mockLoaders };
  const resolvers = buildResolvers({
    getDashboardGraphQL: mockGetDashboard,
    getUserProfile: mockGetUserProfile,
  });

  it('resolves Query.dashboard with encoded cursors and pageInfo', async () => {
    const info = createInfo('{ dashboard { edges { node { name } } totalCount } }');
    const result = await resolvers.Query.dashboard({}, { pageSize: 10 }, context, info);

    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]?.cursor).toBe(encodeCursor({ totalScore: 100, id: 'u1' }));
    expect(result.edges[0]?.node.name).toBe('Ada');
    expect(result.pageInfo.hasNextPage).toBe(false);
    expect(result.totalCount).toBe(1);
  });

  it('resolves Query.user with use case output', async () => {
    const info = createInfo('{ user(id: "u1") { name email } }');
    const result = await resolvers.Query.user({}, { id: 'u1' }, context, info);

    expect(result?.name).toBe('Ada');
    expect(result?.email).toBe('ada@example.com');
  });

  it('resolves User relation fields using context loaders', async () => {
    const user = { id: 'u1', name: 'Ada', email: 'ada@example.com', avatarUrl: null };

    const enrollments = await resolvers.User.enrollments(user, {}, context, {} as any);
    expect(enrollments).toHaveLength(1);
    expect(mockLoaders.enrollmentsByUserId.load).toHaveBeenCalledWith('u1');

    const certs = await resolvers.User.certificates(user, {}, context, {} as any);
    expect(certs).toHaveLength(1);
    expect(mockLoaders.certificatesByUserId.load).toHaveBeenCalledWith('u1');
  });

  it('resolves Enrollment and Certificate course relation', async () => {
    const enrollment = { id: 'e1', courseId: 'c1', score: 80, progress: 100 };
    const course = await resolvers.Enrollment.course(enrollment as any, {}, context, {} as any);
    expect(course.id).toBe('c1');

    const certificate = {
      id: 'cert1',
      courseId: 'c1',
      issuedAt: '',
      pdfUrl: '',
      certificateNumber: '',
    };
    const certCourse = await resolvers.Certificate.course(
      certificate as any,
      {},
      context,
      {} as any,
    );
    expect(certCourse.id).toBe('c1');
  });

  it('resolves Course instructor and modules relations', async () => {
    const course = {
      id: 'c1',
      name: 'Course 1',
      instructorId: 'inst1',
      description: '',
      category: '',
      durationHours: 10,
    };

    const instructor = await resolvers.Course.instructor(course, {}, context, {} as any);
    expect(instructor.id).toBe('inst1');

    const modules = await resolvers.Course.modules(course, {}, context, {} as any);
    expect(modules).toHaveLength(1);
    expect(mockLoaders.modulesByCourseId.load).toHaveBeenCalledWith('c1');
  });

  it('throws GraphQLError when after cursor is invalid', async () => {
    const info = createInfo('{ dashboard { edges { node { name } } } }');
    await expect(
      resolvers.Query.dashboard({}, { after: 'invalid-cursor' }, context, info),
    ).rejects.toThrow('"after" is not a valid cursor');
  });

  it('throws GraphQLError when getDashboardGraphQL use case fails', async () => {
    const failingUseCase = {
      execute: jest.fn().mockResolvedValue({ success: false, error: new Error('boom') }),
    };
    const errorResolvers = buildResolvers({
      getDashboardGraphQL: failingUseCase,
      getUserProfile: mockGetUserProfile,
    });
    const info = createInfo('{ dashboard { edges { node { name } } } }');
    await expect(errorResolvers.Query.dashboard({}, {}, context, info)).rejects.toThrow();
  });

  it('throws GraphQLError when getUserProfile use case fails', async () => {
    const failingUseCase = {
      execute: jest.fn().mockResolvedValue({ success: false, error: new Error('boom') }),
    };
    const errorResolvers = buildResolvers({
      getDashboardGraphQL: mockGetDashboard,
      getUserProfile: failingUseCase,
    });
    const info = createInfo('{ user(id: "u1") { name } }');
    await expect(errorResolvers.Query.user({}, { id: 'u1' }, context, info)).rejects.toThrow();
  });

  it('throws missingNode when relation node loader returns null', async () => {
    const emptyLoaders: any = {
      courseById: { load: jest.fn().mockResolvedValue(null) },
      instructorById: { load: jest.fn().mockResolvedValue(null) },
    };
    const emptyContext: GraphQLContext = { loaders: emptyLoaders };

    await expect(
      resolvers.Enrollment.course({ courseId: 'missing-c' } as any, {}, emptyContext, {} as any),
    ).rejects.toThrow('Internal server error');

    await expect(
      resolvers.Course.instructor(
        { instructorId: 'missing-i' } as any,
        {},
        emptyContext,
        {} as any,
      ),
    ).rejects.toThrow('Internal server error');
  });
});
