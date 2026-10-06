import type { Faker } from '@faker-js/faker' with { 'resolution-mode': 'import' };
import { v7 as uuidv7 } from 'uuid';
import type {
  CertificateRow,
  CourseRow,
  EnrollmentRow,
  InstructorRow,
  ModuleRow,
  UserRow,
} from '@infrastructure/database/tables';
import type { Dataset } from './dataset';

/** Faker v10 is ESM-only: loaded with a dynamic import from this CommonJS project. */
export const loadFaker = async (): Promise<Faker> => (await import('@faker-js/faker')).faker;

/** Volumes from SPEC.md. */
export const SPEC_VOLUMES = {
  users: 1000,
  instructors: 50,
  courses: 200,
  modulesPerCourse: 5,
  enrollments: 5000,
  certificates: 3000,
} as const;

export type DatasetVolumes = typeof SPEC_VOLUMES;

const CATEGORIES = [
  'Programming',
  'Data Science',
  'Cloud',
  'Security',
  'Design',
  'Business',
  'Mathematics',
  'Languages',
  'Marketing',
  'Science',
];
const EMAIL_DOMAINS = ['school.edu', 'university.edu.br', 'campus.org', 'learn.io'];
const MIN_COURSES_PER_USER = 1;
const MAX_COURSES_PER_USER = 9;
const DAY_MS = 86_400_000;

const slug = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/**
 * Generates the whole dataset deterministically (same seed → same rows → same payload sizes,
 * so the numbers in the README are reproducible). Ids are UUID v7 derived from the seeded faker.
 */
export const generateDataset = (
  faker: Faker,
  seed: number,
  volumes: DatasetVolumes = SPEC_VOLUMES,
): Dataset => {
  faker.seed(seed);
  const id = (at: Date): string =>
    uuidv7({
      msecs: at.getTime(),
      random: Uint8Array.from({ length: 16 }, () => faker.number.int(255)),
    });
  const between = (from: string, to: string): Date => faker.date.between({ from, to });

  const instructors: InstructorRow[] = Array.from({ length: volumes.instructors }, (_, index) => ({
    id: id(between('2020-01-01', '2022-12-31')),
    name: faker.person.fullName(),
    bio: faker.lorem.sentences(2),
    avatar_url: `https://i.pravatar.cc/150?img=${(index % 70) + 1}`,
  }));

  const courses: CourseRow[] = Array.from({ length: volumes.courses }, () => ({
    id: id(between('2022-01-01', '2022-12-31')),
    name: `${faker.hacker.adjective()} ${faker.hacker.noun()} ${faker.helpers.arrayElement(['101', 'Fundamentals', 'in Practice', 'Masterclass', 'Advanced'])}`.replace(
      /^./,
      (first) => first.toUpperCase(),
    ),
    description: faker.lorem.sentences(2),
    category: faker.helpers.arrayElement(CATEGORIES),
    duration_hours: faker.number.int({ min: 4, max: 120 }),
    instructor_id: faker.helpers.arrayElement(instructors).id,
  }));

  const modules: ModuleRow[] = courses.flatMap((course) =>
    Array.from({ length: volumes.modulesPerCourse }, (_, position) => ({
      id: id(between('2022-01-01', '2022-12-31')),
      course_id: course.id,
      title: `${position + 1}. ${faker.lorem.words({ min: 2, max: 4 })}`,
      content: faker.lorem.sentence({ min: 8, max: 14 }),
      order_index: position,
    })),
  );

  const users: UserRow[] = Array.from({ length: volumes.users }, (_, index) => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const createdAt = between('2023-01-01', '2024-12-31');
    return {
      id: id(createdAt),
      name: `${firstName} ${lastName}`,
      email: `${slug(firstName)}.${slug(lastName)}.${index}@${faker.helpers.arrayElement(EMAIL_DOMAINS)}`,
      avatar_url: faker.datatype.boolean(0.85) ? `https://i.pravatar.cc/150?u=${index + 1}` : null,
      bio: faker.lorem.sentences({ min: 1, max: 2 }),
      created_at: createdAt,
    };
  });

  // Every user takes between 1 and 9 courses, 5 on average: exactly `volumes.enrollments` in total.
  const coursesPerUser = users.map(() => volumes.enrollments / volumes.users);
  for (let move = 0; move < volumes.users * 2; move += 1) {
    const from = faker.number.int(users.length - 1);
    const to = faker.number.int(users.length - 1);
    const fromCount = coursesPerUser[from] ?? 0;
    const toCount = coursesPerUser[to] ?? 0;
    if (from !== to && fromCount > MIN_COURSES_PER_USER && toCount < MAX_COURSES_PER_USER) {
      coursesPerUser[from] = fromCount - 1;
      coursesPerUser[to] = toCount + 1;
    }
  }

  const completed = new Set(
    faker.helpers.arrayElements(
      Array.from({ length: volumes.enrollments }, (_, index) => index),
      volumes.certificates,
    ),
  );
  const enrollments: EnrollmentRow[] = [];
  const certificates: CertificateRow[] = [];
  users.forEach((user, userIndex) => {
    const taken = faker.helpers.arrayElements(courses, coursesPerUser[userIndex] ?? 0);
    for (const course of taken) {
      const isCompleted = completed.has(enrollments.length);
      const startedAt = between('2024-01-01', '2025-06-30');
      const completedAt = isCompleted
        ? new Date(startedAt.getTime() + faker.number.int({ min: 7, max: 180 }) * DAY_MS)
        : null;
      enrollments.push({
        id: id(startedAt),
        user_id: user.id,
        course_id: course.id,
        score: isCompleted ? faker.number.int({ min: 50, max: 100 }) : faker.number.int(100),
        progress: isCompleted ? 100 : faker.number.int(99),
        started_at: startedAt,
        completed_at: completedAt,
      });
      if (completedAt !== null) {
        const issuedAt = new Date(completedAt.getTime() + faker.number.int(3) * DAY_MS);
        const number = `CERT-${issuedAt.getUTCFullYear()}-${String(certificates.length + 1).padStart(6, '0')}`;
        certificates.push({
          id: id(issuedAt),
          user_id: user.id,
          course_id: course.id,
          issued_at: issuedAt,
          pdf_url: `https://certificates.edtech.example/${number}.pdf`,
          certificate_number: number,
        });
      }
    }
  });

  return { users, instructors, courses, modules, enrollments, certificates };
};
