import { ZlibPayloadCompressor } from '@infrastructure/compression/zlib-payload-compressor';

describe('ZlibPayloadCompressor', () => {
  it('compresses a payload with gzip and brotli and returns byte lengths', async () => {
    const compressor = new ZlibPayloadCompressor();
    const body = 'x'.repeat(5000);

    const result = await compressor.measure(body);

    expect(result.raw).toBe(5000);
    expect(result.gzip).toBeGreaterThan(0);
    expect(result.gzip).toBeLessThan(result.raw);
    expect(result.brotli).toBeGreaterThan(0);
    expect(result.brotli).toBeLessThan(result.raw);
  });
});
