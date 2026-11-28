// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { generateCommunityChecklist } from '../../src/server/services/communityService';
import type { GoogleGenAI } from '@google/genai';

describe('communityService (apartment & school checklists)', () => {
  it('generates structured checklist via mocked Gemini client', async () => {
    const mockAiClient = {
      models: {
        generateContent: async () => ({
          text: JSON.stringify({
            items: [
              {
                id: 'item-1',
                audience: 'Resident Welfare Association',
                action: 'diesel generator runtime prohibited during peak smog hours',
                frequency: 'Daily',
                impact: {
                  why: 'Cuts local neighborhood PM2.5 emissions significantly',
                  estimatedEffect: '-25 µg/m³ PM2.5',
                  confidence: 'high',
                  isEstimateDisclaimer: 'Directional estimate only',
                },
              },
              {
                id: 'item-2',
                audience: 'Security Guards',
                action: 'Enforce dust control at all construction and repair zones',
                frequency: 'Continuous',
                impact: {
                  why: 'Prevents fugitive dust resuspension',
                  estimatedEffect: '-15 µg/m³ PM10',
                  confidence: 'medium',
                  isEstimateDisclaimer: 'Directional estimate only',
                },
              },
              {
                id: 'item-3',
                audience: 'Residents',
                action: 'Use carpooling and metro for daily commuting',
                frequency: 'Weekdays',
                impact: {
                  why: 'Reduces vehicular exhaust emissions',
                  estimatedEffect: '-20 µg/m³ NO2',
                  confidence: 'high',
                  isEstimateDisclaimer: 'Directional estimate only',
                },
              },
              {
                id: 'item-4',
                audience: 'Facility Management',
                action: 'Keep common area air filtration running continuously',
                frequency: '24/7',
                impact: {
                  why: 'Maintains clean indoor air baseline',
                  estimatedEffect: '-30% indoor PM2.5',
                  confidence: 'high',
                  isEstimateDisclaimer: 'Directional estimate only',
                },
              },
            ],
          }),
        }),
      },
    } as unknown as GoogleGenAI;

    const result = await generateCommunityChecklist(
      {
        settingType: 'apartment_society',
        locality: 'Green Park, New Delhi',
        aqi: 280,
        category: 'very_unhealthy',
        language: 'en',
      },
      { aiClient: mockAiClient },
    );

    expect(result.items.length).toBe(4);
    expect(result.items[0]?.action).toContain('diesel generator');
    expect(result.shareableText).toContain('CleanBreath Apartment Society Checklist');
  });

  it('falls back to rule-based checklist when AI client is null or fails', async () => {
    const result = await generateCommunityChecklist(
      {
        settingType: 'school',
        locality: 'Vasant Vihar',
        aqi: 320,
        category: 'severe',
        language: 'en',
      },
      { aiClient: null },
    );

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.settingType).toBe('school');
  });

  it('degrades gracefully on malformed JSON or thrown AI errors and strips HTML tags in Hindi mode', async () => {
    const malformedAi = {
      models: {
        generateContent: async () => ({ text: '{bad-json' }),
      },
    } as unknown as GoogleGenAI;

    const badJsonFallback = await generateCommunityChecklist(
      {
        settingType: 'apartment_society',
        locality: 'Indirapuram',
        aqi: 260,
        category: 'very_unhealthy',
        language: 'hi',
      },
      { aiClient: malformedAi },
    );
    expect(badJsonFallback.items.length).toBeGreaterThanOrEqual(4);

    const throwingAi = {
      models: {
        generateContent: async () => {
          throw new Error('Gemini unavailable');
        },
      },
    } as unknown as GoogleGenAI;

    const errFallback = await generateCommunityChecklist(
      {
        settingType: 'school',
        locality: 'Saket',
        aqi: 210,
        category: 'very_unhealthy',
        language: 'en',
      },
      { aiClient: throwingAi },
    );
    expect(errFallback.items.length).toBeGreaterThanOrEqual(4);

    const htmlAi = {
      models: {
        generateContent: async () => ({
          text: JSON.stringify({
            items: [1, 2, 3, 4].map((n) => ({
              id: `id-${n}`,
              audience: '<b>Students</b>',
              action: '<script>alert(1)</script>Keep windows shut during traffic peaks',
              frequency: 'Daily',
              impact: {
                why: 'Lowers indoor PM2.5.',
                estimatedEffect: '15-25% lower classroom PM2.5',
                confidence: 'high',
                isEstimateDisclaimer: 'Directional estimate.',
              },
            })),
          }),
        }),
      },
    } as unknown as GoogleGenAI;

    const cleaned = await generateCommunityChecklist(
      {
        settingType: 'school',
        locality: 'Saket',
        aqi: 210,
        category: 'very_unhealthy',
        language: 'hi',
      },
      { aiClient: htmlAi },
    );
    expect(cleaned.items[0]?.audience).toBe('Students');
    expect(cleaned.items[0]?.action).not.toContain('<script>');
  });
});
