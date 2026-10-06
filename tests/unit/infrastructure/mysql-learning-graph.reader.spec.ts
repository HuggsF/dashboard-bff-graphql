import { MySqlLearningGraphReader } from '@infrastructure/database/mysql-learning-graph.reader';

describe('MySqlLearningGraphReader', () => {
  it('returns empty array when input IDs are empty without querying database', async () => {
    const fakeDb = jest.fn();
    const reader = new MySqlLearningGraphReader(fakeDb as any);

    expect(await reader.findEnrollmentsByUserIds([])).toEqual([]);
    expect(await reader.findCertificatesByUserIds([])).toEqual([]);
    expect(await reader.findCoursesByIds([])).toEqual([]);
    expect(await reader.findInstructorsByIds([])).toEqual([]);
    expect(await reader.findModulesByCourseIds([])).toEqual([]);
    expect(fakeDb).not.toHaveBeenCalled();
  });

  it('queries enrollments and maps to EnrollmentNodeDTO', async () => {
    const mockRows = [
      {
        id: 'e1',
        user_id: 'u1',
        course_id: 'c1',
        score: 90,
        progress: 100,
        started_at: new Date('2025-01-01T00:00:00.000Z'),
        completed_at: new Date('2025-02-01T00:00:00.000Z'),
      },
    ];

    const fakeDb: any = () => ({
      select: () => fakeDb(),
      whereIn: () => fakeDb(),
      orderBy: () => Promise.resolve(mockRows),
    });

    const reader = new MySqlLearningGraphReader(fakeDb);
    const result = await reader.findEnrollmentsByUserIds(['u1']);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'e1',
      userId: 'u1',
      courseId: 'c1',
      score: 90,
      progress: 100,
      startedAt: '2025-01-01T00:00:00.000Z',
      completedAt: '2025-02-01T00:00:00.000Z',
    });
  });

  it('queries certificates, courses, instructors, and modules', async () => {
    const certRows = [
      {
        id: 'cert1',
        user_id: 'u1',
        course_id: 'c1',
        issued_at: new Date('2025-03-01T00:00:00.000Z'),
        pdf_url: 'https://example.com/cert.pdf',
        certificate_number: 'CERT-1',
      },
    ];
    const courseRows = [
      {
        id: 'c1',
        name: 'Node Course',
        description: 'Desc',
        category: 'Tech',
        duration_hours: 10,
        instructor_id: 'i1',
      },
    ];
    const instructorRows = [
      { id: 'i1', name: 'Teacher', bio: 'Bio', avatar_url: 'https://example.com/avatar.png' },
    ];
    const moduleRows = [
      { id: 'm1', course_id: 'c1', title: 'Intro', content: 'Text', order_index: 0 },
    ];

    const fakeDb: any = () => ({
      select: () => fakeDb(),
      whereIn: (col: string, ids: string[]) => {
        if (col === 'user_id') return { orderBy: () => Promise.resolve(certRows) };
        if (col === 'course_id') return { orderBy: () => Promise.resolve(moduleRows) };
        if (col === 'id' && ids[0] === 'c1') return Promise.resolve(courseRows);
        return Promise.resolve(instructorRows);
      },
    });

    const reader = new MySqlLearningGraphReader(fakeDb);

    const certs = await reader.findCertificatesByUserIds(['u1']);
    expect(certs).toHaveLength(1);
    expect(certs[0]?.certificateNumber).toBe('CERT-1');

    const courses = await reader.findCoursesByIds(['c1']);
    expect(courses).toHaveLength(1);
    expect(courses[0]?.name).toBe('Node Course');

    const instructors = await reader.findInstructorsByIds(['i1']);
    expect(instructors).toHaveLength(1);
    expect(instructors[0]?.name).toBe('Teacher');

    const modules = await reader.findModulesByCourseIds(['c1']);
    expect(modules).toHaveLength(1);
    expect(modules[0]?.title).toBe('Intro');
  });
});
