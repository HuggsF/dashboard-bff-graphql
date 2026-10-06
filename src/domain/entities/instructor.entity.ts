import type { InvalidEntityError } from '@domain/errors/invalid-entity.error';
import { ViolationCollector, requireId, requireText } from '@domain/shared/guards';
import { fail, ok } from '@domain/shared/result';
import type { Result } from '@domain/shared/result';
import { AvatarUrl } from '@domain/value-objects/avatar-url.value-object';
import { UserName } from '@domain/value-objects/user-name.value-object';

export type InstructorProps = {
  readonly id: string;
  readonly name: string;
  readonly bio: string;
  readonly avatarUrl: string | null;
};

export class Instructor {
  static readonly BIO_MAX_LENGTH = 2000;

  private constructor(
    readonly id: string,
    readonly name: UserName,
    readonly bio: string,
    readonly avatarUrl: AvatarUrl,
  ) {
    Object.freeze(this);
  }

  static create(props: InstructorProps): Result<Instructor, InvalidEntityError> {
    const violations = new ViolationCollector('Instructor');
    const id = violations.take(requireId('id', props.id));
    const name = violations.take(UserName.create(props.name));
    const bio = violations.take(requireText('bio', props.bio, { max: Instructor.BIO_MAX_LENGTH }));
    const avatarUrl = violations.take(AvatarUrl.create(props.avatarUrl));

    if (id === null || name === null || bio === null || avatarUrl === null) {
      return fail(violations.toError());
    }
    return ok(new Instructor(id, name, bio, avatarUrl));
  }

  equals(other: Instructor): boolean {
    return this.id === other.id;
  }
}
