import { createPayloadSources } from '@presentation/compare/payload-sources';
import { ok, fail } from '@domain/shared/result';

describe('PayloadSources', () => {
  it('creates three sources: v1-legacy, v2-bff, and v3-graphql', async () => {
    const mockLegacy = {
      execute: jest.fn().mockResolvedValue(ok({ total: 1, users: [{ id: 'u1' }] })),
    };
    const mockBFF = {
      execute: jest.fn().mockResolvedValue(ok({ data: [{ id: 'u1' }], pagination: {} })),
    };
    const mockGraphQL = {
      executeHTTPGraphQLRequest: jest.fn().mockResolvedValue({
        body: {
          kind: 'complete',
          string: JSON.stringify({ data: { dashboard: { edges: [{ node: { id: 'u1' } }] } } }),
        },
      }),
    };
    const mockContext = { loaders: {} as any };

    const sources = createPayloadSources({
      getDashboardLegacy: mockLegacy,
      getDashboardBFF: mockBFF,
      graphql: mockGraphQL,
      createContext: () => mockContext,
      pageSize: 20,
    });

    expect(sources).toHaveLength(3);
    expect(sources[0]?.id).toBe('v1-legacy');
    expect(sources[1]?.id).toBe('v2-bff');
    expect(sources[2]?.id).toBe('v3-graphql');

    // Test load() for v1-legacy
    const legacyPayload = await sources[0]!.load();
    expect(legacyPayload.records).toBe(1);
    expect(JSON.parse(legacyPayload.body)).toEqual({ total: 1, users: [{ id: 'u1' }] });

    // Test load() for v2-bff
    const bffPayload = await sources[1]!.load();
    expect(bffPayload.records).toBe(1);
    expect(mockBFF.execute).toHaveBeenCalledWith({ page: 1, size: 20 });

    // Test load() for v3-graphql
    const gqlPayload = await sources[2]!.load();
    expect(gqlPayload.records).toBe(1);
    expect(mockGraphQL.executeHTTPGraphQLRequest).toHaveBeenCalled();
  });

  it('throws error when use cases fail', async () => {
    const mockLegacy = {
      execute: jest.fn().mockResolvedValue(fail(new Error('Legacy boom'))),
    };
    const mockBFF = {
      execute: jest.fn().mockResolvedValue(fail(new Error('BFF boom'))),
    };
    const mockGraphQL = {
      executeHTTPGraphQLRequest: jest.fn().mockResolvedValue({
        body: {
          kind: 'complete',
          string: JSON.stringify({ errors: [{ message: 'GQL error' }] }),
        },
      }),
    };

    const sources = createPayloadSources({
      getDashboardLegacy: mockLegacy,
      getDashboardBFF: mockBFF,
      graphql: mockGraphQL,
      createContext: () => ({ loaders: {} as any }),
      pageSize: 20,
    });

    await expect(sources[0]!.load()).rejects.toThrow();
    await expect(sources[1]!.load()).rejects.toThrow();
    await expect(sources[2]!.load()).rejects.toThrow('GraphQL errors: GQL error');
  });
});
