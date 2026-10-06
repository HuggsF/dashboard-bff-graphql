import type { GraphQLResolveInfo } from 'graphql';
import type {
  CertificateNodeDTO,
  CourseNodeDTO,
  EnrollmentNodeDTO,
  InstructorNodeDTO,
  ModuleNodeDTO,
  UserProfileDTO,
} from '@application/dtos/graph.dto';
import type { DashboardEntryDTO } from '@application/dtos/graphql-dashboard.dto';
import type { GetDashboardGraphQLUseCase } from '@application/use-cases/get-dashboard-graphql.use-case';
import type { GetUserProfileUseCase } from '@application/use-cases/get-user-profile.use-case';
import type { DashboardPosition } from '@domain/repositories/dashboard.repository';
import type { GraphQLContext } from './context';
import { decodeCursor, encodeCursor } from './cursor';
import { badUserInput, missingNode, toGraphQLError } from './errors';
import { selectedFieldNames } from './field-selection';

export type ResolverDependencies = {
  readonly getDashboardGraphQL: Pick<GetDashboardGraphQLUseCase, 'execute'>;
  readonly getUserProfile: Pick<GetUserProfileUseCase, 'execute'>;
};

type DashboardArgs = {
  readonly page?: number | null;
  readonly pageSize?: number | null;
  readonly after?: string | null;
};

export type DashboardConnection = {
  readonly edges: readonly { readonly cursor: string; readonly node: DashboardEntryDTO }[];
  readonly pageInfo: { readonly hasNextPage: boolean; readonly endCursor: string | null };
  readonly totalCount: number | null;
};

type Resolver<TParent, TArgs, TResult> = (
  parent: TParent,
  args: TArgs,
  context: GraphQLContext,
  info: GraphQLResolveInfo,
) => Promise<TResult>;

export type Resolvers = {
  readonly Query: {
    readonly dashboard: Resolver<unknown, DashboardArgs, DashboardConnection>;
    readonly user: Resolver<unknown, { readonly id: string }, UserProfileDTO | null>;
  };
  readonly User: {
    readonly enrollments: Resolver<UserProfileDTO, unknown, readonly EnrollmentNodeDTO[]>;
    readonly certificates: Resolver<UserProfileDTO, unknown, readonly CertificateNodeDTO[]>;
  };
  readonly Enrollment: { readonly course: Resolver<EnrollmentNodeDTO, unknown, CourseNodeDTO> };
  readonly Certificate: { readonly course: Resolver<CertificateNodeDTO, unknown, CourseNodeDTO> };
  readonly Course: {
    readonly instructor: Resolver<CourseNodeDTO, unknown, InstructorNodeDTO>;
    readonly modules: Resolver<CourseNodeDTO, unknown, readonly ModuleNodeDTO[]>;
  };
};

const decodeAfter = (after: string | null | undefined): DashboardPosition | null => {
  if (after === undefined || after === null) {
    return null;
  }
  const position = decodeCursor(after);
  if (position === null) {
    throw badUserInput('"after" is not a valid cursor', 'after');
  }
  return position;
};

const requireNode = <T>(node: T | null, type: string, id: string): T => {
  if (node === null) {
    throw missingNode(type, id);
  }
  return node;
};

/**
 * Resolvers are thin: root fields call a use case with the client's field selection; relation
 * fields go through the per-request DataLoaders (context.loaders), so sibling lookups are batched.
 */
export const buildResolvers = (dependencies: ResolverDependencies): Resolvers => ({
  Query: {
    dashboard: async (
      _parent: unknown,
      args: DashboardArgs,
      _context: GraphQLContext,
      info: GraphQLResolveInfo,
    ): Promise<DashboardConnection> => {
      const after = decodeAfter(args.after);
      const result = await dependencies.getDashboardGraphQL.execute({
        page: args.page,
        pageSize: args.pageSize,
        after,
        fields: [...selectedFieldNames(info, ['edges', 'node'])],
        includeTotalCount: selectedFieldNames(info).has('totalCount'),
      });
      if (!result.success) {
        throw toGraphQLError(result.error);
      }
      const edges = result.data.edges.map((edge) => ({
        cursor: encodeCursor(edge.position),
        node: edge.node,
      }));
      return {
        edges,
        pageInfo: {
          hasNextPage: result.data.hasNextPage,
          endCursor: edges[edges.length - 1]?.cursor ?? null,
        },
        totalCount: result.data.totalCount,
      };
    },

    user: async (
      _parent: unknown,
      args: { readonly id: string },
      _context: GraphQLContext,
      info: GraphQLResolveInfo,
    ): Promise<UserProfileDTO | null> => {
      const result = await dependencies.getUserProfile.execute({
        id: args.id,
        fields: [...selectedFieldNames(info)],
      });
      if (!result.success) {
        throw toGraphQLError(result.error);
      }
      return result.data;
    },
  },

  User: {
    enrollments: (
      user: UserProfileDTO,
      _args: unknown,
      context: GraphQLContext,
    ): Promise<readonly EnrollmentNodeDTO[]> => context.loaders.enrollmentsByUserId.load(user.id),
    certificates: (
      user: UserProfileDTO,
      _args: unknown,
      context: GraphQLContext,
    ): Promise<readonly CertificateNodeDTO[]> => context.loaders.certificatesByUserId.load(user.id),
  },

  Enrollment: {
    course: async (
      enrollment: EnrollmentNodeDTO,
      _args: unknown,
      context: GraphQLContext,
    ): Promise<CourseNodeDTO> =>
      requireNode(
        await context.loaders.courseById.load(enrollment.courseId),
        'Course',
        enrollment.courseId,
      ),
  },

  Certificate: {
    course: async (
      certificate: CertificateNodeDTO,
      _args: unknown,
      context: GraphQLContext,
    ): Promise<CourseNodeDTO> =>
      requireNode(
        await context.loaders.courseById.load(certificate.courseId),
        'Course',
        certificate.courseId,
      ),
  },

  Course: {
    instructor: async (
      course: CourseNodeDTO,
      _args: unknown,
      context: GraphQLContext,
    ): Promise<InstructorNodeDTO> =>
      requireNode(
        await context.loaders.instructorById.load(course.instructorId),
        'Instructor',
        course.instructorId,
      ),
    modules: (
      course: CourseNodeDTO,
      _args: unknown,
      context: GraphQLContext,
    ): Promise<readonly ModuleNodeDTO[]> => context.loaders.modulesByCourseId.load(course.id),
  },
});
