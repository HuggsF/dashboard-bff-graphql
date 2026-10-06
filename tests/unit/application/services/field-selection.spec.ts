import { selectFields } from '@application/services/field-selection';

describe('selectFields', () => {
  const allowed = ['id', 'name', 'avatarUrl', 'score'] as const;

  it('filters out fields not in the whitelist', () => {
    const requested = ['name', 'passwordHash', 'isAdmin', 'score'];
    const result = selectFields(requested, allowed);

    expect(result).toEqual(['name', 'score']);
  });

  it('preserves whitelist order regardless of requested order', () => {
    const requested = ['score', 'id'];
    const result = selectFields(requested, allowed);

    expect(result).toEqual(['id', 'score']);
  });

  it('deduplicates requested fields', () => {
    const requested = ['name', 'name', 'name'];
    const result = selectFields(requested, allowed);

    expect(result).toEqual(['name']);
  });

  it('returns empty array when none match', () => {
    const requested = ['unknown', 'other'];
    const result = selectFields(requested, allowed);

    expect(result).toEqual([]);
  });
});
