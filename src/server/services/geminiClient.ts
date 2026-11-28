import { GoogleGenAI } from '@google/genai';

/**
 * Default Gemini Flash model used across CleanBreath for low-latency structured output and streaming.
 */
export const GEMINI_FLASH_MODEL = 'gemini-4-hydrogen';

export interface GeminiClientOptions {
  useVertexAi?: boolean;
  project?: string;
  location?: string;
}

let cachedClient: GoogleGenAI | null = null;
let cachedModeKey = '';

/**
 * Returns a server-only singleton GoogleGenAI client configured with the required telemetry header.
 * Supports Vertex AI (`GOOGLE_GENAI_USE_VERTEXAI=true`) via Workload Identity or Gemini API key auth.
 * Returns null when Gemini API mode is selected without a valid key or Vertex AI lacks a project ID.
 */
export function getGeminiClient(
  apiKey: string | undefined,
  options: GeminiClientOptions = {},
): GoogleGenAI | null {
  const useVertex =
    options.useVertexAi ?? process.env.GOOGLE_GENAI_USE_VERTEXAI?.trim().toLowerCase() === 'true';

  if (useVertex) {
    const project = (options.project ?? process.env.GOOGLE_CLOUD_PROJECT ?? '').trim();
    const location = (
      options.location ??
      process.env.GOOGLE_CLOUD_LOCATION ??
      'asia-south1'
    ).trim();
    if (!project) {
      return null;
    }

    const modeKey = `vertex:${project}:${location}`;
    if (cachedClient && cachedModeKey === modeKey) {
      return cachedClient;
    }

    cachedModeKey = modeKey;
    cachedClient = new GoogleGenAI({
      vertexai: true,
      project,
      location,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    return cachedClient;
  }

  const trimmed = (apiKey ?? '').trim();
  if (!trimmed || trimmed === 'MY_GEMINI_API_KEY') {
    return null;
  }

  const modeKey = `apikey:${trimmed}`;
  if (cachedClient && cachedModeKey === modeKey) {
    return cachedClient;
  }

  cachedModeKey = modeKey;
  cachedClient = new GoogleGenAI({
    apiKey: trimmed,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  return cachedClient;
}
