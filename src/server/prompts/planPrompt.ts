import type { AirQualitySnapshot } from '../../shared/schemas/aqi.schema';
import type { HouseholdProfile } from '../../shared/schemas/profile.schema';
import { summarizeForecastWindows } from '../../shared/utils/impactMath';
import { wrapUntrustedText } from '../utils/sanitize';

/**
 * Pure prompt builder for generating a personalized daily CleanBreath plan.
 * Wraps user-supplied location strings in XML delimiters to block prompt injection.
 */
export function buildDailyPlanPrompt(profile: HouseholdProfile, aqi: AirQualitySnapshot): string {
  const { bestLabel, worstLabel } = summarizeForecastWindows(aqi.forecast);

  const safeCity = wrapUntrustedText('city', profile.location.city, 80);
  const safeLocality = wrapUntrustedText('locality', profile.location.locality, 100);
  const safeLocationLabel = wrapUntrustedText('location_label', aqi.locationLabel, 140);

  return [
    'Generate a tailored CleanBreath daily plan using ONLY the structured data below.',
    '<user_profile>',
    `  <location>${safeLocality}, ${safeCity}</location>`,
    `  <household_size>${profile.household.householdSize}</household_size>`,
    `  <has_children>${profile.household.hasChildren}</has_children>`,
    `  <has_elderly>${profile.household.hasElderly}</has_elderly>`,
    `  <has_respiratory_sensitivity>${profile.household.hasRespiratorySensitivity}</has_respiratory_sensitivity>`,
    `  <has_pets>${profile.household.hasPets}</has_pets>`,
    `  <commute_mode>${profile.commuteMode}</commute_mode>`,
    `  <home_type>${profile.homeType}</home_type>`,
    `  <owns_air_purifier>${profile.ownsAirPurifier}</owns_air_purifier>`,
    `  <budget_level>${profile.budgetLevel}</budget_level>`,
    '</user_profile>',
    '<aqi_context>',
    `  <resolved_location>${safeLocationLabel}</resolved_location>`,
    `  <aqi>${aqi.aqi}</aqi>`,
    `  <category>${aqi.category}</category>`,
    `  <dominant_pollutant>${aqi.dominantPollutant}</dominant_pollutant>`,
    `  <pm25_ugm3>${aqi.pollutants.pm25}</pm25_ugm3>`,
    `  <pm10_ugm3>${aqi.pollutants.pm10}</pm10_ugm3>`,
    `  <no2_ugm3>${aqi.pollutants.no2}</no2_ugm3>`,
    `  <o3_ugm3>${aqi.pollutants.o3}</o3_ugm3>`,
    `  <lowest_forecast_window>${bestLabel}</lowest_forecast_window>`,
    `  <highest_forecast_window>${worstLabel}</highest_forecast_window>`,
    '</aqi_context>',
    'Requirements:',
    '1. Provide exactly 3 routines (morning, afternoon, evening) aligned with the forecast windows and commute mode.',
    '2. Provide 3-5 indoorHacks ranked #1 upward matching the budgetLevel and ownsAirPurifier flag.',
    '3. Provide 3-4 sustainableAlternatives with concrete g CO2e or % emission estimates.',
    '4. Attach a complete ImpactExplainer (why, estimatedEffect, confidence, isEstimateDisclaimer) to EVERY item.',
  ].join('\n');
}
