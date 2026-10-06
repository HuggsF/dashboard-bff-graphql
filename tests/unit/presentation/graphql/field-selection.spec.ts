import { parse } from 'graphql';
import type { FieldNode, OperationDefinitionNode } from 'graphql';
import { selectedFieldNames } from '@presentation/graphql/field-selection';

describe('selectedFieldNames', () => {
  it('extracts top-level field names under a selection', () => {
    const doc = parse(`
      query {
        dashboard {
          edges {
            node {
              name
              avatarUrl
            }
          }
          totalCount
        }
      }
    `);
    const op = doc.definitions[0] as OperationDefinitionNode;
    const dashboardNode = op.selectionSet.selections[0] as FieldNode;

    const topFields = selectedFieldNames({
      fieldNodes: [dashboardNode],
      fragments: {},
      variableValues: {},
    });

    expect(topFields).toEqual(new Set(['edges', 'totalCount']));
  });

  it('extracts nested field names following path', () => {
    const doc = parse(`
      query {
        dashboard {
          edges {
            node {
              name
              avatarUrl
            }
          }
        }
      }
    `);
    const op = doc.definitions[0] as OperationDefinitionNode;
    const dashboardNode = op.selectionSet.selections[0] as FieldNode;

    const nodeFields = selectedFieldNames(
      {
        fieldNodes: [dashboardNode],
        fragments: {},
        variableValues: {},
      },
      ['edges', 'node'],
    );

    expect(nodeFields).toEqual(new Set(['name', 'avatarUrl']));
  });

  it('handles fragments and skip/include directives', () => {
    const doc = parse(`
      query GetUser($skipAvatar: Boolean!, $includeBio: Boolean!) {
        user {
          name
          avatarUrl @skip(if: $skipAvatar)
          bio @include(if: $includeBio)
        }
      }
    `);
    const op = doc.definitions[0] as OperationDefinitionNode;
    const userNode = op.selectionSet.selections[0] as FieldNode;

    const fields = selectedFieldNames({
      fieldNodes: [userNode],
      fragments: {},
      variableValues: { skipAvatar: true, includeBio: false },
    });

    expect(fields).toEqual(new Set(['name']));
  });

  it('handles inline fragments and fragment spreads', () => {
    const doc = parse(`
      query GetUser {
        user {
          name
          ... on User {
            email
          }
          ...UserBio
        }
      }
      fragment UserBio on User {
        bio
      }
    `);
    const op = doc.definitions[0] as OperationDefinitionNode;
    const frag = doc.definitions[1] as any;
    const userNode = op.selectionSet.selections[0] as FieldNode;

    const fields = selectedFieldNames({
      fieldNodes: [userNode],
      fragments: { UserBio: frag },
      variableValues: {},
    });

    expect(fields).toEqual(new Set(['name', 'email', 'bio']));
  });
});
