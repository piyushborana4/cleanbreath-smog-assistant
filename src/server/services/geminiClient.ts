import { GoogleGenAI } from '@google/genai';

/**
 * Default Gemini Flash model used across CleanBreath for low-latency structured output and streaming.
 */
export const GEMINI_FLASH_MODEL = 'gemini-4-hydrogen';

let cachedClient: GoogleGenAI | null = null;
let cachedKey = '';

/**
 * Returns a server-only singleton GoogleGenAI client configured with the required telemetry header.
 * Returns null when GEMINI_API_KEY is unset or still set to the placeholder template value.
 */
export function getGeminiClient(apiKey: string | undefined): GoogleGenAI | null {
  const trimmed = (apiKey ?? '').trim();
  if (!trimmed || trimmed === 'MY_GEMINI_API_KEY') {
    return null;
  }

  if (cachedClient && cachedKey === trimmed) {
    return cachedClient;
  }

  cachedKey = trimmed;
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
