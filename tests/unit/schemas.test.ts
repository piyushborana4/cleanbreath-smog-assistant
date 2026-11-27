import { describe, expect, it } from 'vitest';
import { AqiQuerySchema } from '../../src/shared/schemas/aqi.schema';
import { ChatRequestSchema } from '../../src/shared/schemas/chat.schema';
import { CommunityChecklistRequestSchema } from '../../src/shared/schemas/community.schema';
import { HouseholdProfileSchema } from '../../src/shared/schemas/profile.schema';

describe('Zod schema validation', () => {
  it('validates HouseholdProfileSchema and rejects out-of-range inputs', () => {
    const valid = HouseholdProfileSchema.safeParse({
      location: { city: 'Delhi', locality: 'Dwarka', lat: 28.59, lng: 77.04 },
      household: {
        householdSize: 3,
        hasChildren: true,
        hasElderly: false,
        hasRespiratorySensitivity: false,
        hasPets: true,
      },
      commuteMode: 'public_transit',
      homeType: 'apartment_high_rise',
      ownsAirPurifier: true,
      budgetLevel: 'medium',
      language: 'en',
    });
    expect(valid.success).toBe(true);

    const invalid = HouseholdProfileSchema.safeParse({
      location: { city: 'A', locality: '' },
      household: {
        householdSize: 99,
        hasChildren: true,
        hasElderly: false,
        hasRespiratorySensitivity: false,
        hasPets: true,
      },
      commuteMode: 'jetpack',
      homeType: 'apartment_high_rise',
      ownsAirPurifier: true,
      budgetLevel: 'medium',
      language: 'en',
    });
    expect(invalid.success).toBe(false);
  });

  it('coerces lat/lng strings in AqiQuerySchema and rejects invalid coordinates', () => {
    const ok = AqiQuerySchema.safeParse({ lat: '28.61', lng: '77.20', lang: 'hi' });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.lat).toBe(28.61);
    }

    const bad = AqiQuerySchema.safeParse({ lat: '190', lng: '77.20' });
    expect(bad.success).toBe(false);
  });

  it('enforces message caps on ChatRequestSchema and locality length on CommunityChecklistRequestSchema', () => {
    const longText = 'x'.repeat(650);
    const chatBad = ChatRequestSchema.safeParse({
      profile: {
        location: { city: 'Delhi', locality: 'Dwarka' },
        household: {
          householdSize: 2,
          hasChildren: false,
          hasElderly: false,
          hasRespiratorySensitivity: false,
          hasPets: false,
        },
        commuteMode: 'walk_cycle',
        homeType: 'independent_house',
        ownsAirPurifier: false,
        budgetLevel: 'low',
        language: 'en',
      },
      aqi: {
        locationLabel: 'Dwarka, Delhi',
        lat: 28.59,
        lng: 77.04,
        aqi: 150,
        category: 'sensitive',
        dominantPollutant: 'pm25',
        pollutants: { pm25: 55, pm10: 90, no2: 20, o3: 30 },
        forecast: [],
        fetchedAt: '2026-11-27T08:00:00Z',
        source: 'Test',
        isFallback: false,
      },
      messages: [{ role: 'user', text: longText }],
    });
    expect(chatBad.success).toBe(false);

    const commOk = CommunityChecklistRequestSchema.safeParse({
      settingType: 'school',
      locality: 'Saket, New Delhi',
      aqi: 210,
      category: 'very_unhealthy',
      language: 'en',
    });
    expect(commOk.success).toBe(true);
  });
});
