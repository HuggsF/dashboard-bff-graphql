import { decodeCursor, encodeCursor } from '@presentation/graphql/cursor';

describe('GraphQL Cursor', () => {
  it('encodes and decodes a dashboard position accurately', () => {
    const position = { totalScore: 95, id: '01990001-0000-7000-8000-000000000001' };
    const cursor = encodeCursor(position);

    expect(typeof cursor).toBe('string');
    expect(cursor).not.toContain('dashboard:v1:'); // should be base64url

    const decoded = decodeCursor(cursor);
    expect(decoded).toEqual(position);
  });

  it('returns null for malformed or forged cursors', () => {
    expect(decodeCursor('not-valid-base64-!@#$')).toBeNull();
    expect(decodeCursor(Buffer.from('otherprefix:1:2').toString('base64url'))).toBeNull();
    expect(
      decodeCursor(Buffer.from('dashboard:v1:notanumber:id123').toString('base64url')),
    ).toBeNull();
    expect(decodeCursor(Buffer.from('dashboard:v1:100:').toString('base64url'))).toBeNull();
    expect(decodeCursor(Buffer.from('dashboard:v1::id123').toString('base64url'))).toBeNull();
    expect(decodeCursor(Buffer.from('dashboard:v1:no-separator').toString('base64url'))).toBeNull();
  });
});
