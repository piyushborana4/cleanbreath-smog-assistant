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
});

export interface ServerConfig {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  geminiApiKey: string;
  googleMapsApiKey: string;
  allowedOrigins: string[];
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

  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    geminiApiKey: parsed.GEMINI_API_KEY.trim(),
    googleMapsApiKey: (parsed.GOOGLE_MAPS_API_KEY || parsed.VITE_GOOGLE_MAPS_API_KEY).trim(),
    allowedOrigins: Array.from(origins),
  };
}
