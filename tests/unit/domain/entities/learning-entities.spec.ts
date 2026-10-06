import { Certificate } from '@domain/entities/certificate.entity';
import { Course } from '@domain/entities/course.entity';
import { Enrollment } from '@domain/entities/enrollment.entity';
import { Instructor } from '@domain/entities/instructor.entity';
import { Module } from '@domain/entities/module.entity';
import type { InvalidEntityError } from '@domain/errors/invalid-entity.error';
import type { Result } from '@domain/shared/result';
import {
  buildCertificate,
  buildCourse,
  buildEnrollment,
  buildInstructor,
  buildModule,
  certificateProps,
  courseProps,
  enrollmentProps,
  instructorProps,
  moduleProps,
  uuid,
} from '../../../support/builders';

const fieldsOf = <T>(result: Result<T, InvalidEntityError>): string[] =>
  result.success ? [] : result.error.violations.map((violation) => violation.field);

describe('Instructor', () => {
  it('creates an instructor', () => {
    const instructor = buildInstructor({ avatarUrl: null });

    expect(instructor.name.value).toBe('Grace Hopper');
    expect(instructor.avatarUrl.isPresent).toBe(false);
    expect(instructor.equals(buildInstructor())).toBe(true);
  });

  it('collects every violation', () => {
    const result = Instructor.create(
      instructorProps({ id: ' ', name: '1', bio: 'x'.repeat(2001), avatarUrl: 'nope' }),
    );

    expect(result.success).toBe(false);
    expect(fieldsOf(result)).toEqual(['id', 'name', 'bio', 'avatarUrl']);
  });
});

describe('Module', () => {
  it('creates a module', () => {
    const module = buildModule({ title: '  Intro  ' });

    expect(module.title).toBe('Intro');
    expect(module.equals(buildModule())).toBe(true);
  });

  it('collects every violation', () => {
    const result = Module.create(
      moduleProps({ id: 'x'.repeat(37), title: '', content: 'c'.repeat(20_001), orderIndex: -1 }),
    );

    expect(fieldsOf(result)).toEqual(['id', 'title', 'content', 'orderIndex']);
    expect(!result.success && result.error.violations[0]?.message).toBe(
      'id must be at most 36 characters',
    );
    expect(!result.success && result.error.violations[1]?.message).toBe('title is required');
  });
});

describe('Course', () => {
  it('sorts its modules by position', () => {
    const course = buildCourse();

    expect(course.modules.map((module) => module.orderIndex)).toEqual([0, 1]);
    expect(Object.isFrozen(course.modules)).toBe(true);
    expect(course.equals(buildCourse({ name: 'Other' }))).toBe(true);
  });

  it('rejects two modules at the same position', () => {
    const result = Course.create(
      courseProps({
        modules: [buildModule({ id: uuid(2, 1) }), buildModule({ id: uuid(2, 2) })],
      }),
    );

    expect(!result.success && result.error.violations[0]?.message).toBe(
      'Two modules of a course cannot share the same position',
    );
  });

  it('collects every violation', () => {
    const result = Course.create(
      courseProps({
        id: '',
        name: 'C',
        description: 'd'.repeat(5001),
        category: '',
        durationHours: 0,
      }),
    );

    expect(fieldsOf(result)).toEqual(['id', 'name', 'description', 'category', 'durationHours']);
    expect(!result.success && result.error.violations[2]?.message).toBe(
      'description must be at most 5000 characters',
    );
    expect(!result.success && result.error.violations[4]?.message).toBe(
      'durationHours must be an integer between 1 and 1000',
    );
  });
});

describe('Enrollment', () => {
  it('creates a completed enrollment', () => {
    const enrollment = buildEnrollment();

    expect(enrollment.isCompleted).toBe(true);
    expect(enrollment.score.value).toBe(80);
    expect(enrollment.equals(buildEnrollment())).toBe(true);
  });

  it('creates an enrollment in progress', () => {
    const enrollment = buildEnrollment({ progress: 100, completedAt: null });

    expect(enrollment.isCompleted).toBe(false);
  });

  it('cannot be completed before it started', () => {
    const result = Enrollment.create(
      enrollmentProps({ completedAt: new Date('2024-01-01T00:00:00.000Z') }),
    );

    expect(!result.success && result.error.violations[0]?.message).toBe(
      'An enrollment cannot be completed before it started',
    );
  });

  it('must have 100% progress once completed', () => {
    const result = Enrollment.create(enrollmentProps({ progress: 60 }));

    expect(!result.success && result.error.violations[0]?.message).toBe(
      'A completed enrollment must have 100% progress',
    );
  });

  it('collects every violation', () => {
    const result = Enrollment.create(
      enrollmentProps({
        id: '',
        userId: '',
        score: 120,
        progress: -5,
        startedAt: new Date('invalid'),
        completedAt: new Date('invalid'),
      }),
    );

    expect(fieldsOf(result)).toEqual([
      'id',
      'userId',
      'score',
      'progress',
      'startedAt',
      'completedAt',
    ]);
  });
});

describe('Certificate', () => {
  it('normalises the certificate number', () => {
    const certificate = buildCertificate({ certificateNumber: ' cert-2025-000001 ' });

    expect(certificate.certificateNumber).toBe('CERT-2025-000001');
    expect(certificate.equals(buildCertificate())).toBe(true);
  });

  it('collects every violation', () => {
    const result = Certificate.create(
      certificateProps({
        id: '',
        userId: '',
        courseId: '',
        issuedAt: new Date('x'),
        pdfUrl: 'file:///etc/passwd',
        certificateNumber: '#1',
      }),
    );

    expect(fieldsOf(result)).toEqual([
      'id',
      'userId',
      'courseId',
      'issuedAt',
      'pdfUrl',
      'certificateNumber',
    ]);
  });
});
