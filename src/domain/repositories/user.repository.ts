import type { User } from '@domain/entities/user.entity';

/** Scalar attributes of a user that can be selected individually (SQL projection). */
export type UserField = 'name' | 'email' | 'avatarUrl' | 'bio' | 'createdAt';

export type UserColumns = {
  readonly name: string;
  readonly email: string;
  readonly avatarUrl: string | null;
  readonly bio: string;
  readonly createdAt: Date;
};

/** A user row reduced to its id plus the requested fields — never the whole aggregate. */
export type UserProjection<F extends UserField> = { readonly id: string } & Pick<UserColumns, F>;

export type UserProjectionFilter = {
  /** Restrict the projection to these users (missing ids are simply absent from the result). */
  readonly ids?: readonly string[];
};

export interface UserRepository {
  /** Legacy: every user with every relation (enrollments → course → instructor + modules, certificates). */
  findAll(): Promise<User[]>;
  /** BFF / GraphQL: only the requested columns are read from the database. */
  findAllProjected<F extends UserField>(
    fields: readonly F[],
    filter?: UserProjectionFilter,
  ): Promise<UserProjection<F>[]>;
  /** The full aggregate of a single user. */
  findById(id: string): Promise<User | null>;
  count(): Promise<number>;
}
