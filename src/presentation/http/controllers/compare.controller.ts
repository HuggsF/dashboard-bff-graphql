import type { Request, Response } from 'express';
import type { CompareResponseSizesUseCase } from '@application/use-cases/compare-response-sizes.use-case';
import { toHttpError } from '@presentation/http/errors/error-mapper';
import { compareQuerySchema } from '@presentation/http/schemas/dashboard.schemas';
import { validate } from '@presentation/http/schemas/validate';

export class CompareController {
  constructor(
    private readonly compareResponseSizes: Pick<CompareResponseSizesUseCase, 'execute'>,
  ) {}

  /** GET /api/compare?runs=3 — payload bytes (raw/gzip/brotli), time and SQL queries per approach. */
  compare = async (request: Request, response: Response): Promise<void> => {
    const { runs } = validate(compareQuerySchema, request.query);
    const result = await this.compareResponseSizes.execute({ runs });
    if (!result.success) {
      throw toHttpError(result.error);
    }
    response.status(200).set('Cache-Control', 'no-store').json(result.data);
  };
}
