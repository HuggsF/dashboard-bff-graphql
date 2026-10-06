export type PayloadSizes = {
  /** UTF-8 bytes of the uncompressed body. */
  readonly raw: number;
  readonly gzip: number;
  readonly brotli: number;
};

/** Measures how many bytes a response body takes on the wire with each Content-Encoding. */
export interface PayloadCompressor {
  measure(body: string): Promise<PayloadSizes>;
}
