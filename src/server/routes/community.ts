import { Router } from 'express';
import {
  CommunityChecklistRequestSchema,
  type CommunityChecklist,
  type CommunityChecklistRequest,
} from '../../shared/schemas/community.schema';
import { validateBody } from '../middleware/validate';
import { generateCommunityChecklist } from '../services/communityService';

export interface CommunityRouterDeps {
  geminiApiKey?: string;
  generateChecklist?: (req: CommunityChecklistRequest) => Promise<CommunityChecklist>;
}

/**
 * Creates POST /api/community/checklist route for apartment societies and schools.
 */
export function createCommunityRouter(deps: CommunityRouterDeps = {}): Router {
  const router = Router();
  const generator =
    deps.generateChecklist ??
    ((body: CommunityChecklistRequest) =>
      generateCommunityChecklist(body, { geminiApiKey: deps.geminiApiKey }));

  router.post(
    '/community/checklist',
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
