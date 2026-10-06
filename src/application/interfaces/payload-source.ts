export type LoadedPayload = {
  /** The response body exactly as the API sends it (serialized JSON). */
  readonly body: string;
  /** Number of top-level records in the payload (users / dashboard entries). */
  readonly records: number;
};

/** One way of serving the dashboard (v1 legacy, v2 BFF, v3 GraphQL) that can be measured. */
export interface PayloadSource {
  readonly id: string;
  readonly label: string;
  /** Human-readable description of the request, e.g. `GET /api/v2/dashboard?page=1&size=20`. */
  readonly request: string;
  load(): Promise<LoadedPayload>;
}
