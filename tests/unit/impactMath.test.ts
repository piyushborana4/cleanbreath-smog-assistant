import { describe, expect, it } from 'vitest';
import {
  buildFallbackCommunityChecklist,
  buildFallbackDailyPlan,
  estimateCommuteCo2eSavedGrams,
  summarizeForecastWindows,
} from '../../src/shared/utils/impactMath';
import type { AirQualitySnapshot } from '../../src/shared/schemas/aqi.schema';
import type { HouseholdProfile } from '../../src/shared/schemas/profile.schema';

const sampleProfile: HouseholdProfile = {
  location: { city: 'New Delhi', locality: 'Rohini' },
  household: {
    householdSize: 4,
    hasChildren: true,
    hasElderly: false,
    hasRespiratorySensitivity: true,
    hasPets: false,
  },
  commuteMode: 'car_solo',
  homeType: 'apartment_high_rise',
  ownsAirPurifier: false,
  budgetLevel: 'low',
  language: 'en',
};

const sampleAqi: AirQualitySnapshot = {
  locationLabel: 'Rohini, New Delhi',
  lat: 28.7,
  lng: 77.1,
  aqi: 220,
  category: 'very_unhealthy',
  dominantPollutant: 'pm25',
  pollutants: { pm25: 165, pm10: 250, no2: 52, o3: 28 },
  forecast: [
    { hourLabel: '08:00', aqi: 245, category: 'very_unhealthy', isLowerPollutionWindow: false },
    { hourLabel: '14:00', aqi: 145, category: 'sensitive', isLowerPollutionWindow: true },
  ],
  fetchedAt: '2026-11-27T08:00:00.000Z',
  source: 'Test Feed',
  isFallback: false,
};

describe('impactMath utilities', () => {
  it('calculates positive CO2e savings when switching away from higher-emission commutes', () => {
    expect(estimateCommuteCo2eSavedGrams('car_solo', 'public_transit', 10)).toBe(1350);
    expect(estimateCommuteCo2eSavedGrams('car_solo', 'carpool', 10)).toBe(1050);
    expect(estimateCommuteCo2eSavedGrams('walk_cycle', 'public_transit', 10)).toBe(0);
  });

  it('summarizes lowest and highest forecast windows and handles empty forecasts', () => {
    const summary = summarizeForecastWindows(sampleAqi.forecast);
    expect(summary.bestLabel).toContain('14:00');
    expect(summary.worstLabel).toContain('08:00');

    const empty = summarizeForecastWindows([]);
    expect(empty.bestLabel).toContain('13:00');
  });

  it('builds a valid fallback daily plan tailored to purifier ownership and language', () => {
    const planEn = buildFallbackDailyPlan(sampleProfile, sampleAqi);
    expect(planEn.isFallback).toBe(true);
    expect(planEn.routines).toHaveLength(3);
    expect(planEn.indoorHacks[0].title).toContain('Box-Fan');
    expect(planEn.safetyNotice.severeSymptomEscalation).toContain('chest pain');

    const planHi = buildFallbackDailyPlan(
      { ...sampleProfile, ownsAirPurifier: true, language: 'hi' },
      sampleAqi,
    );
    expect(planHi.personalizationSummary).toContain('Rohini');
    expect(planHi.indoorHacks[0].title).toContain('Single-Room');
  });

  it('builds fallback community checklists for both apartment societies and schools', () => {
    const society = buildFallbackCommunityChecklist({
      settingType: 'apartment_society',
      locality: 'Rohini, Delhi',
      aqi: 220,
      category: 'very_unhealthy',
      language: 'en',
    });
    expect(society.items.length).toBeGreaterThanOrEqual(4);
    expect(society.shareableText).toContain('RWA Checklist');

    const school = buildFallbackCommunityChecklist({
      settingType: 'school',
      locality: 'Rohini, Delhi',
      aqi: 220,
      category: 'very_unhealthy',
      language: 'en',
    });
    expect(school.shareableText).toContain('School Smog Action Checklist');
  });
});
