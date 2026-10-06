/**
 * Keeps only the requested fields that are in the whitelist, in whitelist order and without
 * duplicates. Client input never reaches SQL directly: columns are picked from this list only.
 */
export const selectFields = <F extends string>(
  requested: readonly string[],
  allowed: readonly F[],
): F[] => {
  const wanted = new Set(requested);
  return allowed.filter((field) => wanted.has(field));
};
