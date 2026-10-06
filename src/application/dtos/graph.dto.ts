/**
 * Flat read models of the learning graph, resolved field by field by GraphQL resolvers.
 * Relations are expressed with ids (`courseId`, `instructorId`) and loaded on demand.
 */
export type UserProfileField = 'name' | 'email' | 'avatarUrl';

export type UserProfileDTO = {
  readonly id: string;
  readonly name?: string;
  readonly email?: string;
  readonly avatarUrl?: string | null;
};

export type EnrollmentNodeDTO = {
  readonly id: string;
  readonly userId: string;
  readonly courseId: string;
  readonly score: number;
  readonly progress: number;
  readonly startedAt: string;
  readonly completedAt: string | null;
};

export type CertificateNodeDTO = {
  readonly id: string;
  readonly userId: string;
  readonly courseId: string;
  readonly issuedAt: string;
  readonly pdfUrl: string;
  readonly certificateNumber: string;
};

export type CourseNodeDTO = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly durationHours: number;
  readonly instructorId: string;
};

export type InstructorNodeDTO = {
  readonly id: string;
  readonly name: string;
  readonly bio: string;
  readonly avatarUrl: string | null;
};

export type ModuleNodeDTO = {
  readonly id: string;
  readonly courseId: string;
  readonly title: string;
  readonly content: string;
  readonly orderIndex: number;
};

export type GetUserProfileInput = {
  readonly id: string;
  /** Fields selected by the client; anything that is not a projectable column is ignored. */
  readonly fields: readonly string[];
};
