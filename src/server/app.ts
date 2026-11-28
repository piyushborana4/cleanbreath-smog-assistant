import express, { type Express } from 'express';
import type { AirQualitySnapshot, AqiQuery } from '../shared/schemas/aqi.schema';
import type { ChatRequest } from '../shared/schemas/chat.schema';
import type {
  CommunityChecklist,
  CommunityChecklistRequest,
} from '../shared/schemas/community.schema';
import type { PersonalizedDailyPlan, PlanRequest } from '../shared/schemas/plan.schema';
import { createAppCheckMiddleware } from './middleware/appCheck';
import { applySecurityMiddleware, createApiRateLimiter } from './middleware/security';
import { apiErrorHandler } from './middleware/validate';
import { createAqiRouter } from './routes/aqi';
import { createChatRouter } from './routes/chat';
import { createCommunityRouter } from './routes/community';
import { createHealthRouter } from './routes/health';
import { createPlanRouter } from './routes/plan';
import type { GeminiClientOptions } from './services/geminiClient';
import { createRequestLogger } from './utils/logger';

export interface AppDependencies {
  geminiApiKey?: string;
  googleMapsApiKey?: string;
  allowedOrigins?: string[];
  isProduction?: boolean;
  allowEmbedding?: boolean;
  rateLimitMax?: number;
  aiRateLimitMax?: number;
  chatStreamTimeoutMs?: number;
  chatMaxConcurrentPerIp?: number;
  appCheckEnabled?: boolean;
  firebaseProjectNumber?: string;
  appCheckFetchFn?: typeof fetch;
  geminiOptions?: GeminiClientOptions;
  fetchAirQuality?: (query: AqiQuery) => Promise<AirQualitySnapshot>;
  generatePlan?: (req: PlanRequest & { aqi: AirQualitySnapshot }) => Promise<PersonalizedDailyPlan>;
  streamChat?: (
    req: ChatRequest & { aqi: AirQualitySnapshot },
    onChunk: (text: string) => void,
    signal?: AbortSignal,
  ) => Promise<void>;
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

  applySecurityMiddleware(app, allowedOrigins, {
    isProduction: deps.isProduction,
    allowEmbedding: deps.allowEmbedding,
  });
  app.use(createRequestLogger());
  app.use(
    '/api',
    createAppCheckMiddleware({
      enabled: deps.appCheckEnabled,
      projectNumber: deps.firebaseProjectNumber,
      fetchFn: deps.appCheckFetchFn,
    }),
  );
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
      googleMapsApiKey: deps.googleMapsApiKey,
      aiRateLimitMax: deps.aiRateLimitMax,
      geminiOptions: deps.geminiOptions,
      generatePlan: deps.generatePlan,
      fetchAirQuality: deps.fetchAirQuality,
    }),
  );
  app.use(
    '/api',
    createChatRouter({
      geminiApiKey: deps.geminiApiKey,
      googleMapsApiKey: deps.googleMapsApiKey,
      aiRateLimitMax: deps.aiRateLimitMax,
      streamTimeoutMs: deps.chatStreamTimeoutMs,
      maxConcurrentPerIp: deps.chatMaxConcurrentPerIp,
      geminiOptions: deps.geminiOptions,
      streamChat: deps.streamChat,
      fetchAirQuality: deps.fetchAirQuality,
    }),
  );
  app.use(
    '/api',
    createCommunityRouter({
      geminiApiKey: deps.geminiApiKey,
      aiRateLimitMax: deps.aiRateLimitMax,
      geminiOptions: deps.geminiOptions,
      generateChecklist: deps.generateChecklist,
    }),
  );

  app.use(apiErrorHandler);

  return app;
}
