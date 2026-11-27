import express, { type Express } from 'express';
import type { AirQualitySnapshot, AqiQuery } from '../shared/schemas/aqi.schema';
import type { ChatRequest } from '../shared/schemas/chat.schema';
import type {
  CommunityChecklist,
  CommunityChecklistRequest,
} from '../shared/schemas/community.schema';
import type { PersonalizedDailyPlan, PlanRequest } from '../shared/schemas/plan.schema';
import { applySecurityMiddleware, createApiRateLimiter } from './middleware/security';
import { apiErrorHandler } from './middleware/validate';
import { createAqiRouter } from './routes/aqi';
import { createChatRouter } from './routes/chat';
import { createCommunityRouter } from './routes/community';
import { createHealthRouter } from './routes/health';
import { createPlanRouter } from './routes/plan';
import { createRequestLogger } from './utils/logger';

export interface AppDependencies {
  geminiApiKey?: string;
  googleMapsApiKey?: string;
  allowedOrigins?: string[];
  rateLimitMax?: number;
  fetchAirQuality?: (query: AqiQuery) => Promise<AirQualitySnapshot>;
  generatePlan?: (req: PlanRequest) => Promise<PersonalizedDailyPlan>;
  streamChat?: (req: ChatRequest, onChunk: (text: string) => void) => Promise<void>;
  generateChecklist?: (req: CommunityChecklistRequest) => Promise<CommunityChecklist>;
}

/**
 * Builds and configures the CleanBreath Express application.
 * Separated from server listening so integration tests can invoke routes directly.
 */
export function createApp(deps: AppDependencies = {}): Express {
  const app = express();
  app.set('trust proxy', 1);
  const allowedOrigins = deps.allowedOrigins ?? ['http://localhost:3000', 'http://127.0.0.1:3000'];

  applySecurityMiddleware(app, allowedOrigins);
  app.use(createRequestLogger());
  app.use('/api', createApiRateLimiter(deps.rateLimitMax ?? 90));

  app.use('/api', createHealthRouter());
  app.use(
    '/api',
    createAqiRouter({
      googleMapsApiKey: deps.googleMapsApiKey,
      fetchAirQuality: deps.fetchAirQuality,
    }),
  );
  app.use(
    '/api',
    createPlanRouter({
      geminiApiKey: deps.geminiApiKey,
      generatePlan: deps.generatePlan,
    }),
  );
  app.use(
    '/api',
    createChatRouter({
      geminiApiKey: deps.geminiApiKey,
      streamChat: deps.streamChat,
    }),
  );
  app.use(
    '/api',
    createCommunityRouter({
      geminiApiKey: deps.geminiApiKey,
      generateChecklist: deps.generateChecklist,
    }),
  );

  app.use(apiErrorHandler);

  return app;
}
