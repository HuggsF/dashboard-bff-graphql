import type { Request, Response } from 'express';
import type { GetDashboardBFFUseCase } from '@application/use-cases/get-dashboard-bff.use-case';
import type { GetDashboardLegacyUseCase } from '@application/use-cases/get-dashboard-legacy.use-case';
import { toHttpError } from '@presentation/http/errors/error-mapper';
import { bffDashboardQuerySchema } from '@presentation/http/schemas/dashboard.schemas';
import { validate } from '@presentation/http/schemas/validate';

export class DashboardController {
  constructor(
    private readonly getDashboardLegacy: Pick<GetDashboardLegacyUseCase, 'execute'>,
    private readonly getDashboardBFF: Pick<GetDashboardBFFUseCase, 'execute'>,
  ) {}

  /** GET /api/v1/dashboard — the legacy endpoint: everything, unpaginated. */
  legacy = async (_request: Request, response: Response): Promise<void> => {
    const result = await this.getDashboardLegacy.execute();
    if (!result.success) {
      throw toHttpError(result.error);
    }
    response.status(200).json(result.data);
  };

  /** GET /api/v2/dashboard?page=1&size=20 — the BFF endpoint: the screen's 3 fields, paginated. */
  bff = async (request: Request, response: Response): Promise<void> => {
    const query = validate(bffDashboardQuerySchema, request.query);
    const result = await this.getDashboardBFF.execute({ page: query.page, size: query.size });
    if (!result.success) {
      throw toHttpError(result.error);
    }
    response.status(200).json(result.data);
  };
}
