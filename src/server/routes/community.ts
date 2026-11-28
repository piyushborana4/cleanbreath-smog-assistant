import { Router } from 'express';
import {
  CommunityChecklistRequestSchema,
  type CommunityChecklist,
  type CommunityChecklistRequest,
} from '../../shared/schemas/community.schema';
import { createAiRateLimiter } from '../middleware/security';
import { validateBody } from '../middleware/validate';
import { generateCommunityChecklist } from '../services/communityService';
import type { GeminiClientOptions } from '../services/geminiClient';

export interface CommunityRouterDeps {
  geminiApiKey?: string;
  aiRateLimitMax?: number;
  geminiOptions?: GeminiClientOptions;
  generateChecklist?: (req: CommunityChecklistRequest) => Promise<CommunityChecklist>;
}

/**
 * Creates POST /api/community/checklist route for apartment societies and schools
 * with strict AI rate limiting.
 */
export function createCommunityRouter(deps: CommunityRouterDeps = {}): Router {
  const router = Router();
  const generator =
    deps.generateChecklist ??
    ((body: CommunityChecklistRequest) =>
      generateCommunityChecklist(body, {
        geminiApiKey: deps.geminiApiKey,
        geminiOptions: deps.geminiOptions,
      }));

  router.post(
    '/community/checklist',
    createAiRateLimiter(deps.aiRateLimitMax ?? 12),
    validateBody(CommunityChecklistRequestSchema),
    async (req, res, next) => {
      try {
        const body = req.body as CommunityChecklistRequest;
        const checklist = await generator(body);
        res.status(200).json(checklist);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
