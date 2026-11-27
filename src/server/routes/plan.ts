import { Router } from 'express';
import {
  PlanRequestSchema,
  type PersonalizedDailyPlan,
  type PlanRequest,
} from '../../shared/schemas/plan.schema';
import { validateBody } from '../middleware/validate';
import { generatePersonalizedPlan } from '../services/planService';

export interface PlanRouterDeps {
  geminiApiKey?: string;
  generatePlan?: (req: PlanRequest) => Promise<PersonalizedDailyPlan>;
}

/**
 * Creates POST /api/plan route returning a structured, impact-explained daily plan.
 */
export function createPlanRouter(deps: PlanRouterDeps = {}): Router {
  const router = Router();
  const generator =
    deps.generatePlan ??
    ((body: PlanRequest) =>
      generatePersonalizedPlan(body.profile, body.aqi, { geminiApiKey: deps.geminiApiKey }));

  router.post('/plan', validateBody(PlanRequestSchema), async (req, res, next) => {
    try {
      const body = req.body as PlanRequest;
      const plan = await generator(body);
      res.status(200).json(plan);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
