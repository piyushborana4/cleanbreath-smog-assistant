import crypto from 'node:crypto';
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

function buildSnapshotEtag(snapshot: AirQualitySnapshot): string {
  const stablePayload = { ...snapshot, fetchedAt: undefined };
  const digest = crypto
    .createHash('sha1')
    .update(JSON.stringify(stablePayload))
    .digest('base64url');
  return `"${digest}"`;
}

/**
 * Creates GET /api/aqi route validating location query params and returning cached AQI + forecast
 * with Cache-Control and deterministic ETag/304 support.
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
      const etag = buildSnapshotEtag(snapshot);
      res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
      res.setHeader('ETag', etag);

      const ifNoneMatch = req.header('If-None-Match');
      if (ifNoneMatch && ifNoneMatch.split(',').some((tag) => tag.trim() === etag)) {
        res.status(304).end();
        return;
      }

      res.status(200).json(snapshot);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
