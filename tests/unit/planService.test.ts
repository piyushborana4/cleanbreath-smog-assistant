// @vitest-environment node
import type { GoogleGenAI } from '@google/genai';
import { describe, expect, it, vi } from 'vitest';
import { generatePersonalizedPlan } from '../../src/server/services/planService';
import { TtlCache } from '../../src/server/utils/cache';
import type { AirQualitySnapshot } from '../../src/shared/schemas/aqi.schema';
import type { PersonalizedDailyPlan } from '../../src/shared/schemas/plan.schema';
import type { HouseholdProfile } from '../../src/shared/schemas/profile.schema';
import { buildFallbackDailyPlan } from '../../src/shared/utils/impactMath';

const sampleProfile: HouseholdProfile = {
  location: { city: 'New Delhi', locality: 'Rohini Sector 13' },
  household: {
    householdSize: 4,
    hasChildren: true,
    hasElderly: true,
    hasRespiratorySensitivity: false,
    hasPets: false,
  },
  commuteMode: 'public_transit',
  homeType: 'apartment_high_rise',
  ownsAirPurifier: true,
  budgetLevel: 'low',
  language: 'en',
};

const sampleAqi: AirQualitySnapshot = {
  locationLabel: 'Rohini Sector 13, New Delhi',
  lat: 28.73,
  lng: 77.12,
  aqi: 225,
  category: 'very_unhealthy',
  dominantPollutant: 'pm25',
  pollutants: { pm25: 160, pm10: 245, no2: 46, o3: 29 },
  forecast: [{ hourLabel: '14:00', aqi: 155, category: 'unhealthy', isLowerPollutionWindow: true }],
  fetchedAt: '2026-11-27T08:00:00Z',
  source: 'Test',
  isFallback: false,
};

describe('planService (Gemini structured plan, caching, sanitization, fallback)', () => {
  it('generates structured plan via Gemini, strips HTML tags, and caches by profile + AQI bucket', async () => {
    const valid = buildFallbackDailyPlan(sampleProfile, sampleAqi);
    const generateContent = vi.fn(async () => ({
      text: JSON.stringify({
        ...valid,
        personalizationSummary: '<strong>Safe routine</strong> for Rohini household',
        isFallback: undefined,
      }),
    }));
    const aiClient = { models: { generateContent } } as unknown as GoogleGenAI;
    const cache = new TtlCache<PersonalizedDailyPlan>(60_000, 20);

    const p1 = await generatePersonalizedPlan(sampleProfile, sampleAqi, { aiClient, cache });
    expect(p1.isFallback).toBe(false);
    expect(p1.personalizationSummary).toBe('Safe routine for Rohini household');
    expect(generateContent).toHaveBeenCalledTimes(1);

    // Same AQI bucket (225 -> 225) hits cache
    const p2 = await generatePersonalizedPlan(
      sampleProfile,
      { ...sampleAqi, aqi: 227 },
      { aiClient, cache },
    );
    expect(p2.personalizationSummary).toBe(p1.personalizationSummary);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it('degrades to deterministic fallback on null AI client, malformed JSON, schema failure, and timeout', async () => {
    const cache = new TtlCache<PersonalizedDailyPlan>(60_000, 20);

    const nullFallback = await generatePersonalizedPlan(sampleProfile, sampleAqi, {
      aiClient: null,
      cache,
    });
    expect(nullFallback.isFallback).toBe(true);

    const badJsonAi = {
      models: { generateContent: vi.fn(async () => ({ text: 'not json at all' })) },
    } as unknown as GoogleGenAI;
    const badJsonFallback = await generatePersonalizedPlan(sampleProfile, sampleAqi, {
      aiClient: badJsonAi,
      cache: new TtlCache<PersonalizedDailyPlan>(60_000, 10),
    });
    expect(badJsonFallback.isFallback).toBe(true);

    const invalidSchemaAi = {
      models: { generateContent: vi.fn(async () => ({ text: JSON.stringify({ routines: [] }) })) },
    } as unknown as GoogleGenAI;
    const schemaFallback = await generatePersonalizedPlan(sampleProfile, sampleAqi, {
      aiClient: invalidSchemaAi,
      cache: new TtlCache<PersonalizedDailyPlan>(60_000, 10),
    });
    expect(schemaFallback.isFallback).toBe(true);

    const hangingAi = {
      models: { generateContent: vi.fn(() => new Promise(() => {})) },
    } as unknown as GoogleGenAI;
    const timeoutFallback = await generatePersonalizedPlan(sampleProfile, sampleAqi, {
      aiClient: hangingAi,
      cache: new TtlCache<PersonalizedDailyPlan>(60_000, 10),
      timeoutMs: 15,
    });
    expect(timeoutFallback.isFallback).toBe(true);
    expect(timeoutFallback.routines).toHaveLength(3);
  });
});
