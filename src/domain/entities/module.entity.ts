import type { InvalidEntityError } from '@domain/errors/invalid-entity.error';
import { ViolationCollector, requireId, requireInteger, requireText } from '@domain/shared/guards';
import { fail, ok } from '@domain/shared/result';
import type { Result } from '@domain/shared/result';

export type ModuleProps = {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  /** Position of the module inside its course (0-based). */
  readonly orderIndex: number;
};

/** A lesson of a Course. Only reachable through its Course aggregate. */
export class Module {
  static readonly TITLE_MAX_LENGTH = 200;
  static readonly CONTENT_MAX_LENGTH = 20_000;
  static readonly MAX_ORDER_INDEX = 999;

  private constructor(
    readonly id: string,
    readonly title: string,
    readonly content: string,
    readonly orderIndex: number,
  ) {
    Object.freeze(this);
  }

  static create(props: ModuleProps): Result<Module, InvalidEntityError> {
    const violations = new ViolationCollector('Module');
    const id = violations.take(requireId('id', props.id));
    const title = violations.take(
      requireText('title', props.title, { min: 1, max: Module.TITLE_MAX_LENGTH }),
    );
    const content = violations.take(
      requireText('content', props.content, { max: Module.CONTENT_MAX_LENGTH }),
    );
    const orderIndex = violations.take(
      requireInteger('orderIndex', props.orderIndex, { min: 0, max: Module.MAX_ORDER_INDEX }),
    );

    if (id === null || title === null || content === null || orderIndex === null) {
      return fail(violations.toError());
    }
    return ok(new Module(id, title, content, orderIndex));
  }

  equals(other: Module): boolean {
    return this.id === other.id;
  }
}
