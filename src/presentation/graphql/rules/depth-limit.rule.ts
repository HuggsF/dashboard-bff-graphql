import { GraphQLError, Kind } from 'graphql';
import type { ASTVisitor, SelectionSetNode, ValidationContext, ValidationRule } from 'graphql';

/** Depth of a selection set; fragments are inlined, introspection fields (`__schema`…) ignored. */
const depthOf = (
  selectionSet: SelectionSetNode,
  context: ValidationContext,
  visitedFragments: ReadonlySet<string>,
): number => {
  let deepest = 0;
  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      if (selection.name.value.startsWith('__')) {
        continue;
      }
      const children =
        selection.selectionSet === undefined
          ? 0
          : depthOf(selection.selectionSet, context, visitedFragments);
      deepest = Math.max(deepest, 1 + children);
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      deepest = Math.max(deepest, depthOf(selection.selectionSet, context, visitedFragments));
    } else {
      const name = selection.name.value;
      const fragment = context.getFragment(name);
      // Cycles are reported by the standard NoFragmentCycles rule; here we only must not loop.
      if (fragment !== undefined && fragment !== null && !visitedFragments.has(name)) {
        deepest = Math.max(
          deepest,
          depthOf(fragment.selectionSet, context, new Set([...visitedFragments, name])),
        );
      }
    }
  }
  return deepest;
};

/**
 * Rejects operations nested deeper than `maxDepth` BEFORE execution. Without it a single request
 * such as `user { enrollments { course { modules … } } }` repeated through cyclic types could
 * fan out into thousands of resolver calls (denial of service).
 */
export const createDepthLimitRule =
  (maxDepth: number): ValidationRule =>
  (context: ValidationContext): ASTVisitor => ({
    OperationDefinition(operation): void {
      const depth = depthOf(operation.selectionSet, context, new Set());
      if (depth > maxDepth) {
        context.reportError(
          new GraphQLError(
            `Query depth ${depth} exceeds the maximum allowed depth of ${maxDepth}`,
            { nodes: [operation], extensions: { code: 'QUERY_TOO_DEEP', depth, maxDepth } },
          ),
        );
      }
    },
  });
