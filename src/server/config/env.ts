import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  GEMINI_API_KEY: z.string().optional().default(''),
  GOOGLE_MAPS_API_KEY: z.string().optional().default(''),
  VITE_GOOGLE_MAPS_API_KEY: z.string().optional().default(''),
  APP_URL: z.string().optional().default(''),
  ALLOWED_ORIGINS: z.string().optional().default(''),
  ALLOW_EMBEDDING: z.string().optional().default(''),
  API_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(5000).default(90),
  AI_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1000).default(12),
  CHAT_STREAM_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(45000),
  CHAT_MAX_CONCURRENT_PER_IP: z.coerce.number().int().min(1).max(20).default(2),
  FIREBASE_APP_CHECK_ENABLED: z.string().optional().default('false'),
  FIREBASE_PROJECT_NUMBER: z.string().optional().default(''),
  GOOGLE_GENAI_USE_VERTEXAI: z.string().optional().default('false'),
  GOOGLE_CLOUD_PROJECT: z.string().optional().default(''),
  GOOGLE_CLOUD_LOCATION: z.string().optional().default('asia-south1'),
});

export interface ServerConfig {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  geminiApiKey: string;
  googleMapsApiKey: string;
  allowedOrigins: string[];
  allowEmbedding: boolean;
  apiRateLimitMax: number;
  aiRateLimitMax: number;
  chatStreamTimeoutMs: number;
  chatMaxConcurrentPerIp: number;
  firebaseAppCheckEnabled: boolean;
  firebaseProjectNumber: string;
  useVertexAi: boolean;
  gcpProject: string;
  gcpLocation: string;
}

/**
 * Loads and validates server configuration from environment variables.
 * Never exposes secrets to client bundles.
 */
export function loadServerConfig(): ServerConfig {
  const parsed = EnvSchema.parse(process.env);
  const origins = new Set<string>(['http://localhost:3000', 'http://127.0.0.1:3000']);

  if (parsed.APP_URL) {
    origins.add(parsed.APP_URL.replace(/\/+$/, ''));
  }

  for (const raw of parsed.ALLOWED_ORIGINS.split(',')) {
    const trimmed = raw.trim().replace(/\/+$/, '');
    if (trimmed) {
      origins.add(trimmed);
    }
  }

  const allowEmbedding =
    parsed.ALLOW_EMBEDDING.trim() !== ''
      ? parsed.ALLOW_EMBEDDING.trim().toLowerCase() === 'true'
      : parsed.NODE_ENV !== 'production';

  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    geminiApiKey: parsed.GEMINI_API_KEY.trim(),
    googleMapsApiKey: (parsed.GOOGLE_MAPS_API_KEY || parsed.VITE_GOOGLE_MAPS_API_KEY).trim(),
    allowedOrigins: Array.from(origins),
    allowEmbedding,
    apiRateLimitMax: parsed.API_RATE_LIMIT_MAX,
    aiRateLimitMax: parsed.AI_RATE_LIMIT_MAX,
    chatStreamTimeoutMs: parsed.CHAT_STREAM_TIMEOUT_MS,
    chatMaxConcurrentPerIp: parsed.CHAT_MAX_CONCURRENT_PER_IP,
    firebaseAppCheckEnabled: parsed.FIREBASE_APP_CHECK_ENABLED.trim().toLowerCase() === 'true',
    firebaseProjectNumber: parsed.FIREBASE_PROJECT_NUMBER.trim(),
    useVertexAi: parsed.GOOGLE_GENAI_USE_VERTEXAI.trim().toLowerCase() === 'true',
    gcpProject: parsed.GOOGLE_CLOUD_PROJECT.trim(),
    gcpLocation: parsed.GOOGLE_CLOUD_LOCATION.trim() || 'asia-south1',
  };
}
