import { promisify } from 'node:util';
import { brotliCompress, gzip } from 'node:zlib';
import type { PayloadCompressor, PayloadSizes } from '@application/interfaces/payload-compressor';
import { BROTLI_OPTIONS, GZIP_OPTIONS } from './compression-options';

const gzipAsync = promisify(gzip);
const brotliAsync = promisify(brotliCompress);

/** Compresses on the libuv thread pool (async zlib): the Event Loop is never blocked. */
export class ZlibPayloadCompressor implements PayloadCompressor {
  async measure(body: string): Promise<PayloadSizes> {
    const buffer = Buffer.from(body, 'utf8');
    const [gzipped, brotli] = await Promise.all([
      gzipAsync(buffer, GZIP_OPTIONS),
      brotliAsync(buffer, BROTLI_OPTIONS),
    ]);
    return { raw: buffer.byteLength, gzip: gzipped.byteLength, brotli: brotli.byteLength };
  }
}
