import { Router } from 'express';

/**
 * Creates the health-check route used by Cloud Run and uptime probes.
 */
export function createHealthRouter(): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'cleanbreath',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
