/**
 * A row read from the database violates a Domain invariant. This is an infrastructure failure
 * (bad migration, manual edit…), not a client error: it surfaces as a 500 / UnexpectedError.
 */
export class CorruptedRecordError extends Error {
  readonly code = 'CORRUPTED_RECORD';

  constructor(
    readonly table: string,
    readonly recordId: string,
    cause: unknown,
  ) {
    super(
      `Row ${recordId} of table ${table} is invalid: ${cause instanceof Error ? cause.message : String(cause)}`,
      { cause },
    );
    this.name = 'CorruptedRecordError';
  }
}
