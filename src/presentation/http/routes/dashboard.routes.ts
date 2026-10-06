import { Router } from 'express';
import type { CompareController } from '@presentation/http/controllers/compare.controller';
import type { DashboardController } from '@presentation/http/controllers/dashboard.controller';

/** Mounted on /api. */
export const buildDashboardRouter = (
  dashboard: DashboardController,
  compare: CompareController,
): Router => {
  const router = Router();
  router.get('/v1/dashboard', dashboard.legacy);
  router.get('/v2/dashboard', dashboard.bff);
  router.get('/compare', compare.compare);
  return router;
};
