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

export interface PlanRouterDeps {
  geminiApiKey?: string;
  googleMapsApiKey?: string;
  generatePlan?: (req: PlanRequest) => Promise<PersonalizedDailyPlan>;
  fetchAirQuality?: (query: AqiQuery) => Promise<AirQualitySnapshot>;
}

/**
 * Creates POST /api/plan route returning a structured, impact-explained daily plan.
 * Re-fetches current AQI on the server based on profile location and language.
 */
export function createPlanRouter(deps: PlanRouterDeps = {}): Router {
  const router = Router();
  const generator =
    deps.generatePlan ??
    ((body: PlanRequest) =>
      generatePersonalizedPlan(body.profile, body.aqi, { geminiApiKey: deps.geminiApiKey }));
  const aqiFetcher =
    deps.fetchAirQuality ??
    ((q: AqiQuery) => getLiveAirQuality(q, { googleMapsApiKey: deps.googleMapsApiKey }));

  router.post('/plan', createAiRateLimiter(), validateBody(PlanRequestSchema), async (req, res, next) => {
    try {
      const body = req.body as PlanRequest;
      const serverAqi = await aqiFetcher({
        city: body.profile.location.city,
        locality: body.profile.location.locality,
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
  });

  return router;
}
