import { Router } from 'express';
import {
  AqiQuerySchema,
  type AirQualitySnapshot,
  type AqiQuery,
} from '../../shared/schemas/aqi.schema';
import { getLiveAirQuality } from '../services/aqiService';

export interface AqiRouterDeps {
  googleMapsApiKey?: string;
  fetchAirQuality?: (query: AqiQuery) => Promise<AirQualitySnapshot>;
}

/**
 * Creates GET /api/aqi route validating location query params and returning cached AQI + forecast.
 */
export function createAqiRouter(deps: AqiRouterDeps = {}): Router {
  const router = Router();
  const fetcher =
    deps.fetchAirQuality ??
    ((q: AqiQuery) => getLiveAirQuality(q, { googleMapsApiKey: deps.googleMapsApiKey }));

  router.get('/aqi', async (req, res, next) => {
    const parsed = AqiQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid AQI query parameters',
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
      return;
    }

    if (
      !parsed.data.city &&
      !parsed.data.locality &&
      (parsed.data.lat === undefined || parsed.data.lng === undefined)
    ) {
      res.status(400).json({
        error: 'Provide either city/locality or lat/lng coordinates.',
      });
      return;
    }

    try {
      const snapshot = await fetcher(parsed.data);
      res.status(200).json(snapshot);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
