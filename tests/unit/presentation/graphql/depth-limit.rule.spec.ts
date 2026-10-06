import { buildSchema, parse, validate } from 'graphql';
import { createDepthLimitRule } from '@presentation/graphql/rules/depth-limit.rule';
import { typeDefs } from '@presentation/graphql/schema';

describe('DepthLimitRule', () => {
  const schema = buildSchema(typeDefs);

  it('allows queries within the maximum depth', () => {
    const query = parse(`
      query GetDashboard {
        dashboard {
          edges {
            node {
              name
              totalScore
            }
          }
        }
      }
    `);

    const errors = validate(schema, query, [createDepthLimitRule(5)]);
    expect(errors).toHaveLength(0);
  });

  it('rejects queries that exceed the maximum depth', () => {
    // Depth: query (0) -> user (1) -> enrollments (2) -> course (3) -> instructor (4) -> name (5) = depth 5
    const deepQuery = parse(`
      query DeepUser {
        user(id: "1") {
          enrollments {
            course {
              instructor {
                name
              }
            }
          }
        }
      }
    `);

    const errors = validate(schema, deepQuery, [createDepthLimitRule(3)]);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain('exceeds the maximum allowed depth of 3');
    expect(errors[0]?.extensions.code).toBe('QUERY_TOO_DEEP');
  });

  it('ignores introspection fields in depth calculation', () => {
    const query = parse(`
      query Introspect {
        __schema {
          types {
            name
          }
        }
      }
    `);

    const errors = validate(schema, query, [createDepthLimitRule(1)]);
    expect(errors).toHaveLength(0);
  });

  it('calculates depth accurately with inline fragments and named fragments', () => {
    const query = parse(`
      query WithFragments {
        user(id: "1") {
          ... on User {
            enrollments {
              ...CourseDetails
            }
          }
        }
      }
      fragment CourseDetails on Enrollment {
        course {
          name
        }
      }
    `);

    const shallowErrors = validate(schema, query, [createDepthLimitRule(2)]);
    expect(shallowErrors).toHaveLength(1);

    const deepErrors = validate(schema, query, [createDepthLimitRule(6)]);
    expect(deepErrors).toHaveLength(0);
  });
});
