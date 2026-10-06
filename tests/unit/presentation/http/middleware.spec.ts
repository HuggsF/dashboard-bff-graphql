import { EventEmitter } from 'node:events';
import type { Request, Response } from 'express';
import { createLoggerMock } from '../../../support/fakes';
import { errorHandler } from '@presentation/http/middleware/error-handler.middleware';
import { notFoundHandler } from '@presentation/http/middleware/not-found.middleware';
import { HttpError } from '@presentation/http/errors/http-error';
import { queryMetrics } from '@presentation/http/middleware/query-metrics.middleware';
import { requestLogger } from '@presentation/http/middleware/request-logger.middleware';

describe('HTTP Middlewares', () => {
  describe('notFoundHandler', () => {
    it('responds 404 with NOT_FOUND code', () => {
      const req = { method: 'POST', path: '/unknown' } as Request;
      const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      notFoundHandler(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: { code: 'NOT_FOUND', message: 'Route POST /unknown not found' },
      });
    });
  });

  describe('errorHandler', () => {
    it('handles HttpError and formats response', () => {
      const logger = createLoggerMock();
      const handler = errorHandler(logger);
      const req = { path: '/test' } as Request;
      const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const error = new HttpError(400, 'BAD_INPUT', 'Bad input', [{ path: 'p', message: 'm' }]);

      handler(error, req, res as Response, () => {});

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'BAD_INPUT',
          message: 'Bad input',
          details: [{ path: 'p', message: 'm' }],
        },
      });
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('logs 500 HttpErrors and masks unhandled errors', () => {
      const logger = createLoggerMock();
      const handler = errorHandler(logger);
      const req = { path: '/test', method: 'GET' } as Request;
      const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const error = new Error('Database exploded');

      handler(error, req, res as Response, () => {});

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it('handles Express client error status objects', () => {
      const logger = createLoggerMock();
      const handler = errorHandler(logger);
      const req = { path: '/test' } as Request;
      const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const clientErr = { status: 400 };

      handler(clientErr, req, res as Response, () => {});

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: { code: 'BAD_REQUEST', message: 'Bad request' },
      });
    });
  });

  describe('requestLogger', () => {
    it('logs completed request details on finish event', () => {
      const logger = createLoggerMock();
      const middleware = requestLogger(logger);
      const req = {
        method: 'GET',
        originalUrl: '/api/v1/dashboard',
        path: '/api/v1/dashboard',
      } as Request;
      const resEmitter = new EventEmitter();
      (resEmitter as any).statusCode = 200;
      const next = jest.fn();

      middleware(req, resEmitter as unknown as Response, next);
      expect(next).toHaveBeenCalled();

      resEmitter.emit('finish');

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'GET', path: '/api/v1/dashboard', status: 200 }),
        'HTTP request',
      );
    });

    it('logs error on finish when status is 500', () => {
      const logger = createLoggerMock();
      const middleware = requestLogger(logger);
      const req = { method: 'GET', originalUrl: '/error', path: '/error' } as Request;
      const resEmitter = new EventEmitter();
      (resEmitter as any).statusCode = 500;
      const next = jest.fn();

      middleware(req, resEmitter as unknown as Response, next);
      resEmitter.emit('finish');

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('queryMetrics', () => {
    it('runs next inside queryCounter scope', () => {
      const counter = {
        run: jest.fn().mockImplementation((fn: any) => fn({ queries: 2 })),
      };
      const middleware = queryMetrics(counter);
      const req = {} as Request;
      const res = {} as Response;
      const next = jest.fn();

      middleware(req, res, next);

      expect(counter.run).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });
});
