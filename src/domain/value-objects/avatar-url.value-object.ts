import { InvalidAvatarUrlError } from '@domain/errors/invalid-avatar-url.error';
import { HTTP_URL_MAX_LENGTH, isHttpUrl } from '@domain/shared/http-url';
import { fail, ok } from '@domain/shared/result';
import type { Result } from '@domain/shared/result';

/** A profile picture: an absolute http(s) URL, or `null` when the person has no avatar. */
export class AvatarUrl {
  private constructor(readonly value: string | null) {
    Object.freeze(this);
  }

  static none(): AvatarUrl {
    return new AvatarUrl(null);
  }

  /** `null`, `undefined` and blank strings mean "no avatar". */
  static create(raw: string | null | undefined): Result<AvatarUrl, InvalidAvatarUrlError> {
    const trimmed = raw?.trim() ?? '';
    if (trimmed.length === 0) {
      return ok(AvatarUrl.none());
    }
    if (trimmed.length > HTTP_URL_MAX_LENGTH) {
      return fail(
        new InvalidAvatarUrlError(
          trimmed,
          `Avatar URL must be at most ${HTTP_URL_MAX_LENGTH} characters`,
        ),
      );
    }
    if (!isHttpUrl(trimmed)) {
      return fail(new InvalidAvatarUrlError(trimmed, 'Avatar URL must be an absolute http(s) URL'));
    }
    return ok(new AvatarUrl(trimmed));
  }

  get isPresent(): boolean {
    return this.value !== null;
  }

  equals(other: AvatarUrl): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value ?? '';
  }
}
