import {
  alignMany,
  alignOne,
  createLearningGraphLoaders,
} from '@application/services/learning-graph.loaders';
import type { LearningGraphReader } from '@application/interfaces/learning-graph.reader';
import { RecordingBatchLoaderFactory } from '../../../support/fakes';

describe('LearningGraphLoaders', () => {
  describe('alignOne', () => {
    it('aligns rows to keys in order, with null for missing keys', () => {
      const keys = ['k1', 'k2', 'k3'];
      const rows = [
        { id: 'k3', value: 'three' },
        { id: 'k1', value: 'one' },
      ];

      const result = alignOne(keys, rows, (r) => r.id);

      expect(result).toEqual([
        { id: 'k1', value: 'one' },
        null,
        { id: 'k3', value: 'three' },
      ]);
    });
  });

  describe('alignMany', () => {
    it('groups rows by foreign key matching input keys in order', () => {
      const keys = ['u1', 'u2', 'u3'];
      const rows = [
        { id: 'e1', userId: 'u1' },
        { id: 'e2', userId: 'u3' },
        { id: 'e3', userId: 'u1' },
      ];

      const result = alignMany(keys, rows, (r) => r.userId);

      expect(result).toEqual([
        [
          { id: 'e1', userId: 'u1' },
          { id: 'e3', userId: 'u1' },
        ],
        [],
        [{ id: 'e2', userId: 'u3' }],
      ]);
    });
  });

  describe('createLearningGraphLoaders', () => {
    it('creates all five batch loaders and batches calls via reader', async () => {
      const reader: LearningGraphReader = {
        findEnrollmentsByUserIds: jest.fn().mockResolvedValue([
          { id: 'e1', userId: 'u1', courseId: 'c1', score: 80, progress: 100 },
        ]),
        findCertificatesByUserIds: jest.fn().mockResolvedValue([
          {
            id: 'cert1',
            userId: 'u1',
            courseId: 'c1',
            issuedAt: '2025-01-01',
            pdfUrl: 'url',
            certificateNumber: 'C1',
          },
        ]),
        findCoursesByIds: jest.fn().mockResolvedValue([
          {
            id: 'c1',
            name: 'Course 1',
            description: 'Desc',
            category: 'Cat',
            durationHours: 10,
            instructorId: 'i1',
          },
        ]),
        findInstructorsByIds: jest.fn().mockResolvedValue([
          { id: 'i1', name: 'Instructor 1', bio: 'Bio', avatarUrl: null },
        ]),
        findModulesByCourseIds: jest.fn().mockResolvedValue([
          { id: 'm1', courseId: 'c1', title: 'Mod 1', content: 'Cont', orderIndex: 0 },
        ]),
      };

      const factory = new RecordingBatchLoaderFactory();
      const loaders = createLearningGraphLoaders(reader, factory);

      const [enrollments, certs, course, instructor, modules] = await Promise.all([
        loaders.enrollmentsByUserId.load('u1'),
        loaders.certificatesByUserId.load('u1'),
        loaders.courseById.load('c1'),
        loaders.instructorById.load('i1'),
        loaders.modulesByCourseId.load('c1'),
      ]);

      expect(enrollments).toHaveLength(1);
      expect(certs).toHaveLength(1);
      expect(course?.id).toBe('c1');
      expect(instructor?.id).toBe('i1');
      expect(modules).toHaveLength(1);

      expect(factory.calls).toHaveLength(5);
      expect(reader.findEnrollmentsByUserIds).toHaveBeenCalledWith(['u1']);
      expect(reader.findCertificatesByUserIds).toHaveBeenCalledWith(['u1']);
      expect(reader.findCoursesByIds).toHaveBeenCalledWith(['c1']);
      expect(reader.findInstructorsByIds).toHaveBeenCalledWith(['i1']);
      expect(reader.findModulesByCourseIds).toHaveBeenCalledWith(['c1']);
    });
  });
});
