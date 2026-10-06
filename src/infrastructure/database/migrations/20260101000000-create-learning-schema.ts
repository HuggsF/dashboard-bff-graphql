import type { Knex } from 'knex';

export const name = '20260101000000_create_learning_schema';

/**
 * Six tables, all keyed by CHAR(36) UUIDs. Every foreign key is indexed (InnoDB requires it);
 * `idx_enrollments_dashboard` is a covering index for the dashboard aggregate
 * (SUM(score), COUNT(completed_at) GROUP BY user_id) so MySQL never touches the clustered rows.
 */
export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary();
    table.string('name', 100).notNullable();
    table.string('email', 255).notNullable().unique({ indexName: 'uq_users_email' });
    table.string('avatar_url', 2048).nullable();
    table.text('bio').notNullable();
    table.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
  });

  await knex.schema.createTable('instructors', (table) => {
    table.uuid('id').primary();
    table.string('name', 100).notNullable();
    table.text('bio').notNullable();
    table.string('avatar_url', 2048).nullable();
  });

  await knex.schema.createTable('courses', (table) => {
    table.uuid('id').primary();
    table.string('name', 200).notNullable();
    table.text('description').notNullable();
    table.string('category', 50).notNullable();
    table.smallint('duration_hours').unsigned().notNullable();
    table
      .uuid('instructor_id')
      .notNullable()
      .references('id')
      .inTable('instructors')
      .withKeyName('fk_courses_instructor')
      .onDelete('RESTRICT');
    table.index(['instructor_id'], 'idx_courses_instructor');
  });

  await knex.schema.createTable('modules', (table) => {
    table.uuid('id').primary();
    table
      .uuid('course_id')
      .notNullable()
      .references('id')
      .inTable('courses')
      .withKeyName('fk_modules_course')
      .onDelete('CASCADE');
    table.string('title', 200).notNullable();
    table.text('content').notNullable();
    table.smallint('order_index').unsigned().notNullable();
    table.unique(['course_id', 'order_index'], { indexName: 'uq_modules_course_position' });
  });

  await knex.schema.createTable('enrollments', (table) => {
    table.uuid('id').primary();
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .withKeyName('fk_enrollments_user')
      .onDelete('CASCADE');
    table
      .uuid('course_id')
      .notNullable()
      .references('id')
      .inTable('courses')
      .withKeyName('fk_enrollments_course')
      .onDelete('RESTRICT');
    table.tinyint('score').unsigned().notNullable();
    table.tinyint('progress').unsigned().notNullable();
    table.datetime('started_at', { precision: 3 }).notNullable();
    table.datetime('completed_at', { precision: 3 }).nullable();
    table.unique(['user_id', 'course_id'], { indexName: 'uq_enrollments_user_course' });
    table.index(['course_id'], 'idx_enrollments_course');
    table.index(['user_id', 'score', 'completed_at'], 'idx_enrollments_dashboard');
  });

  await knex.schema.createTable('certificates', (table) => {
    table.uuid('id').primary();
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .withKeyName('fk_certificates_user')
      .onDelete('CASCADE');
    table
      .uuid('course_id')
      .notNullable()
      .references('id')
      .inTable('courses')
      .withKeyName('fk_certificates_course')
      .onDelete('RESTRICT');
    table.datetime('issued_at', { precision: 3 }).notNullable();
    table.string('pdf_url', 2048).notNullable();
    table
      .string('certificate_number', 32)
      .notNullable()
      .unique({ indexName: 'uq_certificates_number' });
    table.unique(['user_id', 'course_id'], { indexName: 'uq_certificates_user_course' });
    table.index(['course_id'], 'idx_certificates_course');
  });

  // Range rules enforced by MySQL 8 itself, mirroring the Score and Progress value objects.
  await knex.raw(
    'ALTER TABLE enrollments ' +
      'ADD CONSTRAINT chk_enrollments_score CHECK (score BETWEEN 0 AND 100), ' +
      'ADD CONSTRAINT chk_enrollments_progress CHECK (progress BETWEEN 0 AND 100)',
  );
};

export const down = async (knex: Knex): Promise<void> => {
  for (const table of [
    'certificates',
    'enrollments',
    'modules',
    'courses',
    'instructors',
    'users',
  ]) {
    await knex.schema.dropTableIfExists(table);
  }
};
