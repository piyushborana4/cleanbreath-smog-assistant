import { Router } from 'express';
import {
  PlanRequestSchema,
  type PersonalizedDailyPlan,
  type PlanRequest,
} from '../../shared/schemas/plan.schema';
import type { AirQualitySnapshot, AqiQuery } from '../../shared/schemas/aqi.schema';
import { validateBody } from '../middleware/validate';
import { createAiRateLimiter } from '../middleware/security';
import { generatePersonalizedPlan } from '../services/planService';
import { getLiveAirQuality } from '../services/aqiService';
import type { GeminiClientOptions } from '../services/geminiClient';

export interface PlanRouterDeps {
  geminiApiKey?: string;
  googleMapsApiKey?: string;
  aiRateLimitMax?: number;
  geminiOptions?: GeminiClientOptions;
  generatePlan?: (req: PlanRequest & { aqi: AirQualitySnapshot }) => Promise<PersonalizedDailyPlan>;
  fetchAirQuality?: (query: AqiQuery) => Promise<AirQualitySnapshot>;
}

/**
 * Creates POST /api/plan route returning a structured, impact-explained daily plan.
 * Always re-fetches current AQI on the server based on profile location and language.
 */
export function createPlanRouter(deps: PlanRouterDeps = {}): Router {
  const router = Router();
  const generator =
    deps.generatePlan ??
    ((body: PlanRequest & { aqi: AirQualitySnapshot }) =>
      generatePersonalizedPlan(body.profile, body.aqi, {
        geminiApiKey: deps.geminiApiKey,
        geminiOptions: deps.geminiOptions,
      }));
  const aqiFetcher =
    deps.fetchAirQuality ??
    ((q: AqiQuery) => getLiveAirQuality(q, { googleMapsApiKey: deps.googleMapsApiKey }));

  router.post(
    '/plan',
    createAiRateLimiter(deps.aiRateLimitMax ?? 12),
    validateBody(PlanRequestSchema),
    async (req, res, next) => {
      try {
        const body = req.body as PlanRequest;
        const serverAqi = await aqiFetcher({
          city: body.profile.location.city,
          locality: body.profile.location.locality,
          lat: body.profile.location.lat,
          lng: body.profile.location.lng,
          lang: body.profile.language,
        });

        const plan = await generator({
          profile: body.profile,
          aqi: serverAqi,
        });
        res.status(200).json(plan);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
