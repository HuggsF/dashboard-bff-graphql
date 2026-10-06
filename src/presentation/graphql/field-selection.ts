import { GraphQLIncludeDirective, GraphQLSkipDirective, Kind, getDirectiveValues } from 'graphql';
import type { FieldNode, GraphQLResolveInfo, SelectionSetNode } from 'graphql';

type SelectionContext = Pick<GraphQLResolveInfo, 'fragments' | 'variableValues'>;

const isIncluded = (
  node: Parameters<typeof getDirectiveValues>[1],
  context: SelectionContext,
): boolean => {
  const skip = getDirectiveValues(GraphQLSkipDirective, node, context.variableValues);
  if (skip?.if === true) {
    return false;
  }
  const include = getDirectiveValues(GraphQLIncludeDirective, node, context.variableValues);
  return include?.if !== false;
};

/** Every field of a selection set, with inline fragments and fragment spreads flattened. */
const fieldsOf = (selectionSet: SelectionSetNode, context: SelectionContext): FieldNode[] =>
  selectionSet.selections.flatMap((selection): FieldNode[] => {
    if (!isIncluded(selection, context)) {
      return [];
    }
    if (selection.kind === Kind.FIELD) {
      return [selection];
    }
    if (selection.kind === Kind.INLINE_FRAGMENT) {
      return fieldsOf(selection.selectionSet, context);
    }
    const fragment = context.fragments[selection.name.value];
    return fragment === undefined ? [] : fieldsOf(fragment.selectionSet, context);
  });

/**
 * Names of the fields the client selected under the current field, following `path`
 * (e.g. `['edges', 'node']`). Honours fragments, aliases and `@skip`/`@include`.
 *
 *   dashboard { edges { node { name avatarUrl } } }   →  path ['edges','node'] → {name, avatarUrl}
 */
export const selectedFieldNames = (
  info: Pick<GraphQLResolveInfo, 'fieldNodes' | 'fragments' | 'variableValues'>,
  path: readonly string[] = [],
): Set<string> => {
  let nodes: readonly FieldNode[] = info.fieldNodes;
  for (const segment of path) {
    nodes = nodes.flatMap((node) =>
      node.selectionSet === undefined
        ? []
        : fieldsOf(node.selectionSet, info).filter((field) => field.name.value === segment),
    );
  }
  return new Set(
    nodes.flatMap((node) =>
      node.selectionSet === undefined
        ? []
        : fieldsOf(node.selectionSet, info).map((field) => field.name.value),
    ),
  );
};
