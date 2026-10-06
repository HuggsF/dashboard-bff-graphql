/** v1 payload: every user with every relation, exactly as the legacy endpoint serializes it. */
export type LegacyModuleDTO = {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly orderIndex: number;
};

export type LegacyInstructorDTO = {
  readonly id: string;
  readonly name: string;
  readonly bio: string;
  readonly avatarUrl: string | null;
};

export type LegacyCourseDTO = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly durationHours: number;
  readonly instructor: LegacyInstructorDTO;
  readonly modules: readonly LegacyModuleDTO[];
};

export type LegacyEnrollmentDTO = {
  readonly id: string;
  readonly userId: string;
  readonly score: number;
  readonly progress: number;
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly course: LegacyCourseDTO;
};

export type LegacyCertificateDTO = {
  readonly id: string;
  readonly userId: string;
  readonly courseId: string;
  readonly issuedAt: string;
  readonly pdfUrl: string;
  readonly certificateNumber: string;
};

export type LegacyUserDTO = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly avatarUrl: string | null;
  readonly bio: string;
  readonly createdAt: string;
  readonly enrollments: readonly LegacyEnrollmentDTO[];
  readonly certificates: readonly LegacyCertificateDTO[];
};

export type LegacyDashboardOutput = {
  readonly total: number;
  readonly users: readonly LegacyUserDTO[];
};
