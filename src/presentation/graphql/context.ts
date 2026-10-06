import type { LearningGraphLoaders } from '@application/services/learning-graph.loaders';

/** Built for EVERY GraphQL request: DataLoader caches must never outlive (or cross) a request. */
export type GraphQLContext = {
  readonly loaders: LearningGraphLoaders;
};
