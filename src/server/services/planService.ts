import { ThinkingLevel, Type, type GoogleGenAI, type Schema } from '@google/genai';
import type { AirQualitySnapshot } from '../../shared/schemas/aqi.schema';
import {
  PersonalizedDailyPlanSchema,
  type PersonalizedDailyPlan,
} from '../../shared/schemas/plan.schema';
import type { HouseholdProfile } from '../../shared/schemas/profile.schema';
import { buildFallbackDailyPlan } from '../../shared/utils/impactMath';
import { buildDailyPlanPrompt } from '../prompts/planPrompt';
import { buildPlanSystemInstruction } from '../prompts/systemInstructions';
import { TtlCache } from '../utils/cache';
import { withTimeoutAndRetry } from '../utils/retry';
import { hashCacheKey, sanitizePlanOutput } from '../utils/sanitize';
import { GEMINI_FLASH_MODEL, getGeminiClient } from './geminiClient';

const PLAN_CACHE_TTL_MS = 30 * 60 * 1000;
const defaultPlanCache = new TtlCache<PersonalizedDailyPlan>(PLAN_CACHE_TTL_MS, 150);

const IMPACT_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    why: { type: Type.STRING },
    estimatedEffect: { type: Type.STRING },
    confidence: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
    isEstimateDisclaimer: { type: Type.STRING },
  },
  required: ['why', 'estimatedEffect', 'confidence', 'isEstimateDisclaimer'],
};

const DAILY_PLAN_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    personalizationSummary: { type: Type.STRING },
    routines: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          period: { type: Type.STRING, enum: ['morning', 'afternoon', 'evening'] },
          title: { type: Type.STRING },
          action: { type: Type.STRING },
          commuteGuidance: { type: Type.STRING },
          impact: IMPACT_RESPONSE_SCHEMA,
        },
        required: ['period', 'title', 'action', 'commuteGuidance', 'impact'],
      },
    },
    outdoorWindow: {
      type: Type.OBJECT,
      properties: {
        recommendedWindow: { type: Type.STRING },
        avoidWindow: { type: Type.STRING },
        guidance: { type: Type.STRING },
        impact: IMPACT_RESPONSE_SCHEMA,
      },
      required: ['recommendedWindow', 'avoidWindow', 'guidance', 'impact'],
    },
    maskGuidance: {
      type: Type.OBJECT,
      properties: {
        recommendedType: { type: Type.STRING },
        fitNote: { type: Type.STRING },
        whoNeedsItMost: { type: Type.STRING },
        impact: IMPACT_RESPONSE_SCHEMA,
      },
      required: ['recommendedType', 'fitNote', 'whoNeedsItMost', 'impact'],
    },
    cookingAndVentilation: {
      type: Type.OBJECT,
      properties: {
        bestVentilationTime: { type: Type.STRING },
        cookingTips: { type: Type.STRING },
        impact: IMPACT_RESPONSE_SCHEMA,
      },
      required: ['bestVentilationTime', 'cookingTips', 'impact'],
    },
    indoorHacks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          rank: { type: Type.INTEGER },
          title: { type: Type.STRING },
          costTier: { type: Type.STRING, enum: ['free', 'low_cost', 'moderate'] },
          steps: { type: Type.STRING },
          honestyNote: { type: Type.STRING },
          impact: IMPACT_RESPONSE_SCHEMA,
        },
        required: ['rank', 'title', 'costTier', 'steps', 'honestyNote', 'impact'],
      },
    },
    sustainableAlternatives: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          category: {
            type: Type.STRING,
            enum: ['transport', 'waste', 'cooking_energy', 'community'],
          },
          action: { type: Type.STRING },
          impact: IMPACT_RESPONSE_SCHEMA,
        },
        required: ['title', 'category', 'action', 'impact'],
      },
    },
    safetyNotice: {
      type: Type.OBJECT,
      properties: {
        medicalDisclaimer: { type: Type.STRING },
        severeSymptomEscalation: { type: Type.STRING },
      },
      required: ['medicalDisclaimer', 'severeSymptomEscalation'],
    },
  },
  required: [
    'personalizationSummary',
    'routines',
    'outdoorWindow',
    'maskGuidance',
    'cookingAndVentilation',
    'indoorHacks',
    'sustainableAlternatives',
    'safetyNotice',
  ],
};

export interface PlanServiceDeps {
  geminiApiKey?: string;
  aiClient?: GoogleGenAI | null;
  cache?: TtlCache<PersonalizedDailyPlan>;
  timeoutMs?: number;
}

/**
 * Generates a personalized daily plan via Gemini Flash structured JSON output,
 * caches identical profile+AQI requests, validates with Zod, and degrades gracefully on outage.
 */
export async function generatePersonalizedPlan(
  profile: HouseholdProfile,
  aqi: AirQualitySnapshot,
  deps: PlanServiceDeps = {},
): Promise<PersonalizedDailyPlan> {
  const cache = deps.cache ?? defaultPlanCache;
  const cacheKey = hashCacheKey({
    profile,
    aqiBand: aqi.category,
    aqiBucket: Math.round(aqi.aqi / 15) * 15,
    dominantPollutant: aqi.dominantPollutant,
  });

  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const ai = deps.aiClient !== undefined ? deps.aiClient : getGeminiClient(deps.geminiApiKey);
  if (!ai) {
    return buildFallbackDailyPlan(profile, aqi);
  }

  try {
    const prompt = buildDailyPlanPrompt(profile, aqi);
    const systemInstruction = buildPlanSystemInstruction(profile.language);

    const response = await withTimeoutAndRetry(
      async () =>
        ai.models.generateContent({
          model: GEMINI_FLASH_MODEL,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: DAILY_PLAN_RESPONSE_SCHEMA,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        }),
      { timeoutMs: deps.timeoutMs ?? 18000, retries: 1 },
    );

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      return buildFallbackDailyPlan(profile, aqi);
    }

    const parsedJson: unknown = JSON.parse(rawText);
    const validated = PersonalizedDailyPlanSchema.safeParse(parsedJson);
    if (!validated.success) {
      return buildFallbackDailyPlan(profile, aqi);
    }

    const sanitized = sanitizePlanOutput({ ...validated.data, isFallback: false });
    cache.set(cacheKey, sanitized);
    return sanitized;
  } catch {
    return buildFallbackDailyPlan(profile, aqi);
  }
}
