import { InvalidAttributeError } from '@domain/errors/invalid-attribute.error';
import type { InvalidEntityError } from '@domain/errors/invalid-entity.error';
import { ViolationCollector, requireId, requireInteger, requireText } from '@domain/shared/guards';
import { fail, ok } from '@domain/shared/result';
import type { Result } from '@domain/shared/result';
import { CourseName } from '@domain/value-objects/course-name.value-object';
import type { Instructor } from './instructor.entity';
import type { Module } from './module.entity';

export type CourseProps = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly durationHours: number;
  readonly instructor: Instructor;
  readonly modules: readonly Module[];
};

export class Course {
  static readonly DESCRIPTION_MAX_LENGTH = 5000;
  static readonly CATEGORY_MAX_LENGTH = 50;
  static readonly MAX_DURATION_HOURS = 1000;

  private constructor(
    readonly id: string,
    readonly name: CourseName,
    readonly description: string,
    readonly category: string,
    readonly durationHours: number,
    readonly instructor: Instructor,
    /** Always sorted by `orderIndex`. */
    readonly modules: readonly Module[],
  ) {
    Object.freeze(this);
  }

  static create(props: CourseProps): Result<Course, InvalidEntityError> {
    const violations = new ViolationCollector('Course');
    const id = violations.take(requireId('id', props.id));
    const name = violations.take(CourseName.create(props.name));
    const description = violations.take(
      requireText('description', props.description, { max: Course.DESCRIPTION_MAX_LENGTH }),
    );
    const category = violations.take(
      requireText('category', props.category, { min: 1, max: Course.CATEGORY_MAX_LENGTH }),
    );
    const durationHours = violations.take(
      requireInteger('durationHours', props.durationHours, {
        min: 1,
        max: Course.MAX_DURATION_HOURS,
      }),
    );
    const modules = [...props.modules].sort((a, b) => a.orderIndex - b.orderIndex);
    const duplicated = modules.find(
      (module, index) => index > 0 && modules[index - 1]?.orderIndex === module.orderIndex,
    );
    if (duplicated !== undefined) {
      violations.add(
        new InvalidAttributeError(
          'modules',
          String(duplicated.orderIndex),
          'Two modules of a course cannot share the same position',
        ),
      );
    }

    if (
      id === null ||
      name === null ||
      description === null ||
      category === null ||
      durationHours === null ||
      violations.hasViolations
    ) {
      return fail(violations.toError());
    }
    return ok(
      new Course(
        id,
        name,
        description,
        category,
        durationHours,
        props.instructor,
        Object.freeze(modules),
      ),
    );
  }

  equals(other: Course): boolean {
    return this.id === other.id;
  }
}
