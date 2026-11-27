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
    expect(result.items[0].action).toContain('diesel generator');
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
});
