import type { Knex } from 'knex';
import { TABLES, TABLES_CHILDREN_FIRST } from '@infrastructure/database/tables';
import type {
  CertificateRow,
  CourseRow,
  EnrollmentRow,
  InstructorRow,
  ModuleRow,
  UserRow,
} from '@infrastructure/database/tables';

/** A complete, referentially consistent set of rows for the six tables. */
export type Dataset = {
  readonly users: readonly UserRow[];
  readonly instructors: readonly InstructorRow[];
  readonly courses: readonly CourseRow[];
  readonly modules: readonly ModuleRow[];
  readonly enrollments: readonly EnrollmentRow[];
  readonly certificates: readonly CertificateRow[];
};

export type DatasetCounts = { readonly [K in keyof Dataset]: number };

export const countDataset = (dataset: Dataset): DatasetCounts => ({
  users: dataset.users.length,
  instructors: dataset.instructors.length,
  courses: dataset.courses.length,
  modules: dataset.modules.length,
  enrollments: dataset.enrollments.length,
  certificates: dataset.certificates.length,
});

/** Deletes every row, children first (foreign keys). */
export const clearDataset = async (db: Knex): Promise<void> => {
  for (const table of TABLES_CHILDREN_FIRST) {
    await db(table).delete();
  }
};

/** Inserts the dataset (parents first) in multi-row INSERTs, inside one transaction. */
export const insertDataset = async (db: Knex, dataset: Dataset, batchSize = 500): Promise<void> => {
  await db.transaction(async (trx) => {
    await trx.batchInsert(TABLES.users, [...dataset.users], batchSize);
    await trx.batchInsert(TABLES.instructors, [...dataset.instructors], batchSize);
    await trx.batchInsert(TABLES.courses, [...dataset.courses], batchSize);
    await trx.batchInsert(TABLES.modules, [...dataset.modules], batchSize);
    await trx.batchInsert(TABLES.enrollments, [...dataset.enrollments], batchSize);
    await trx.batchInsert(TABLES.certificates, [...dataset.certificates], batchSize);
  });
};
