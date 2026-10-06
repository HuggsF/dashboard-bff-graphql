import type { Request, Response } from 'express';
import { fail, ok } from '@domain/shared/result';
import { InvalidPaginationError } from '@application/errors/invalid-pagination.error';
import { CompareController } from '@presentation/http/controllers/compare.controller';
import { DashboardController } from '@presentation/http/controllers/dashboard.controller';
import { HealthController } from '@presentation/http/controllers/health.controller';
import { HttpError } from '@presentation/http/errors/http-error';

const mockResponse = (): Response => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res as Response;
};

describe('HTTP Controllers', () => {
  describe('HealthController', () => {
    it('responds 200 when health status is ok', async () => {
      const checkHealth = {
        execute: jest.fn().mockResolvedValue(
          ok({ status: 'ok', uptimeSeconds: 10, checks: { database: 'up' } }),
        ),
      };
      const controller = new HealthController(checkHealth);
      const res = mockResponse();

      await controller.check({} as Request, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ok' }),
      );
    });

    it('responds 503 when health status is degraded', async () => {
      const checkHealth = {
        execute: jest.fn().mockResolvedValue(
          ok({ status: 'degraded', uptimeSeconds: 10, checks: { database: 'down' } }),
        ),
      };
      const controller = new HealthController(checkHealth);
      const res = mockResponse();

      await controller.check({} as Request, res);

      expect(res.status).toHaveBeenCalledWith(503);
    });

    it('responds 503 when use case fails', async () => {
      const checkHealth = {
        execute: jest.fn().mockResolvedValue(fail(new Error('fail'))),
      };
      const controller = new HealthController(checkHealth);
      const res = mockResponse();

      await controller.check({} as Request, res);

      expect(res.status).toHaveBeenCalledWith(503);
    });
  });

  describe('DashboardController', () => {
    it('legacy returns 200 with dashboard data', async () => {
      const legacyUseCase = {
        execute: jest.fn().mockResolvedValue(ok({ total: 1, users: [] })),
      };
      const bffUseCase = { execute: jest.fn() };
      const controller = new DashboardController(legacyUseCase, bffUseCase);
      const res = mockResponse();

      await controller.legacy({} as Request, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ total: 1, users: [] });
    });

    it('bff validates query params and returns 200', async () => {
      const legacyUseCase = { execute: jest.fn() };
      const bffUseCase = {
        execute: jest.fn().mockResolvedValue(
          ok({ data: [], pagination: { page: 1, size: 20, totalItems: 0, totalPages: 0, hasNext: false } }),
        ),
      };
      const controller = new DashboardController(legacyUseCase, bffUseCase);
      const req = { query: { page: '2', size: '10' } } as unknown as Request;
      const res = mockResponse();

      await controller.bff(req, res);

      expect(bffUseCase.execute).toHaveBeenCalledWith({ page: 2, size: 10 });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('bff throws HttpError when use case fails', async () => {
      const legacyUseCase = { execute: jest.fn() };
      const bffUseCase = {
        execute: jest.fn().mockResolvedValue(fail(new InvalidPaginationError('size', 'Invalid size'))),
      };
      const controller = new DashboardController(legacyUseCase, bffUseCase);
      const req = { query: {} } as unknown as Request;
      const res = mockResponse();

      await expect(controller.bff(req, res)).rejects.toThrow(HttpError);
    });
  });

  describe('CompareController', () => {
    it('validates runs and returns 200 with no-store cache header', async () => {
      const compareUseCase = {
        execute: jest.fn().mockResolvedValue(
          ok({ measuredAt: '2026-01-01', runs: 3, baseline: 'v1', approaches: [] }),
        ),
      };
      const controller = new CompareController(compareUseCase);
      const req = { query: { runs: '3' } } as unknown as Request;
      const res = mockResponse();

      await controller.compare(req, res);

      expect(compareUseCase.execute).toHaveBeenCalledWith({ runs: 3 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
    });
  });
});
