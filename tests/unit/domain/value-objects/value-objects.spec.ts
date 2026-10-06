import { InvalidAvatarUrlError } from '@domain/errors/invalid-avatar-url.error';
import { InvalidCourseNameError } from '@domain/errors/invalid-course-name.error';
import { InvalidProgressError } from '@domain/errors/invalid-progress.error';
import { InvalidScoreError } from '@domain/errors/invalid-score.error';
import { InvalidUserNameError } from '@domain/errors/invalid-user-name.error';
import { AvatarUrl } from '@domain/value-objects/avatar-url.value-object';
import { CourseName } from '@domain/value-objects/course-name.value-object';
import { Progress } from '@domain/value-objects/progress.value-object';
import { Score } from '@domain/value-objects/score.value-object';
import { UserName } from '@domain/value-objects/user-name.value-object';

describe('UserName', () => {
  it.each(['Ana', 'José da Silva', "Sinéad O'Connor", 'Jean-Luc Picard', 'Dr. Grace Hopper'])(
    'accepts %s',
    (raw) => {
      expect(UserName.create(raw).success).toBe(true);
    },
  );

  it('trims and collapses inner whitespace', () => {
    const result = UserName.create('  Ada    Lovelace ');

    expect(result.success && result.data.value).toBe('Ada Lovelace');
    expect(result.success && result.data.toString()).toBe('Ada Lovelace');
  });

  it.each([
    ['', 'Name is required'],
    ['A', 'Name must be at least 2 characters'],
    ['x'.repeat(101), 'Name must be at most 100 characters'],
    ['R2-D2', 'Name may only contain letters, spaces, periods, hyphens and apostrophes'],
    ['- -', 'Name may only contain letters, spaces, periods, hyphens and apostrophes'],
  ])('rejects %p', (raw, message) => {
    const result = UserName.create(raw);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(InvalidUserNameError);
      expect(result.error.message).toBe(message);
      expect(result.error.field).toBe('name');
      expect(result.error.code).toBe('INVALID_USER_NAME');
    }
  });

  it('compares by value and is immutable', () => {
    const first = UserName.create('Ada');
    const second = UserName.create(' Ada ');

    expect(first.success && second.success && first.data.equals(second.data)).toBe(true);
    expect(first.success && Object.isFrozen(first.data)).toBe(true);
  });
});

describe('AvatarUrl', () => {
  it.each([
    'https://i.pravatar.cc/150?u=42',
    'http://localhost:5173/avatar.png',
    'https://cdn.example.com/a/b/c.webp#v2',
  ])('accepts %s', (raw) => {
    const result = AvatarUrl.create(raw);

    expect(result.success && result.data.value).toBe(raw);
    expect(result.success && result.data.isPresent).toBe(true);
  });

  it.each([null, undefined, '', '   '])('treats %p as "no avatar"', (raw) => {
    const result = AvatarUrl.create(raw);

    expect(result.success && result.data.value).toBeNull();
    expect(result.success && result.data.isPresent).toBe(false);
    expect(result.success && result.data.toString()).toBe('');
  });

  it.each([
    'javascript:alert(1)',
    'data:image/png;base64,AAAA',
    '/avatar.png',
    'ftp://x.org/a',
    'https://exa mple.com',
  ])('rejects %s', (raw) => {
    const result = AvatarUrl.create(raw);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(InvalidAvatarUrlError);
      expect(result.error.message).toBe('Avatar URL must be an absolute http(s) URL');
    }
  });

  it('rejects URLs longer than 2048 characters', () => {
    const result = AvatarUrl.create(`https://example.com/${'a'.repeat(2048)}`);

    expect(!result.success && result.error.message).toBe(
      'Avatar URL must be at most 2048 characters',
    );
  });

  it('compares by value', () => {
    expect(AvatarUrl.none().equals(AvatarUrl.none())).toBe(true);
  });
});

describe.each([
  ['Score', Score.create, InvalidScoreError, 'INVALID_SCORE'],
  ['Progress', Progress.create, InvalidProgressError, 'INVALID_PROGRESS'],
] as const)('%s', (label, create, ErrorType, code) => {
  it.each([0, 1, 50, 99, 100])('accepts %d', (raw) => {
    const result = create(raw);

    expect(result.success && result.data.value).toBe(raw);
  });

  it.each([
    [-1, `${label} must be between 0 and 100`],
    [101, `${label} must be between 0 and 100`],
    [87.5, `${label} must be an integer`],
    [Number.NaN, `${label} must be a number`],
    [Number.POSITIVE_INFINITY, `${label} must be a number`],
  ])('rejects %p', (raw, message) => {
    const result = create(raw);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(ErrorType);
      expect(result.error.message).toBe(message);
      expect(result.error.code).toBe(code);
    }
  });
});

describe('Score / Progress specifics', () => {
  it('compares scores by value', () => {
    const first = Score.create(90);
    const second = Score.create(90);

    expect(first.success && second.success && first.data.equals(second.data)).toBe(true);
  });

  it('knows when progress is complete', () => {
    const done = Progress.create(100);
    const halfway = Progress.create(50);

    expect(done.success && done.data.isComplete).toBe(true);
    expect(halfway.success && halfway.data.isComplete).toBe(false);
    expect(done.success && halfway.success && done.data.equals(halfway.data)).toBe(false);
  });
});

describe('CourseName', () => {
  it('normalises whitespace', () => {
    const result = CourseName.create('  Clean   Architecture ');

    expect(result.success && result.data.value).toBe('Clean Architecture');
    expect(result.success && result.data.toString()).toBe('Clean Architecture');
  });

  it.each([
    ['  ', 'Course name is required'],
    ['C', 'Course name must be at least 2 characters'],
    ['c'.repeat(201), 'Course name must be at most 200 characters'],
  ])('rejects %p', (raw, message) => {
    const result = CourseName.create(raw);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(InvalidCourseNameError);
      expect(result.error.message).toBe(message);
    }
  });

  it('compares by value', () => {
    const first = CourseName.create('GraphQL');
    const second = CourseName.create('GraphQL ');

    expect(first.success && second.success && first.data.equals(second.data)).toBe(true);
  });
});
