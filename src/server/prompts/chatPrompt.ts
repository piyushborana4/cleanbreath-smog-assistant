import type { AirQualitySnapshot } from '../../shared/schemas/aqi.schema';
import type { ChatMessage } from '../../shared/schemas/chat.schema';
import type { HouseholdProfile } from '../../shared/schemas/profile.schema';
import { wrapUntrustedText } from '../utils/sanitize';

/**
 * Pure prompt builder grounding each chat turn in live AQI and household profile context.
 * Wraps conversation turns as delimited data to mitigate prompt injection.
 */
export function buildGroundedChatContents(
  profile: HouseholdProfile,
  aqi: AirQualitySnapshot,
  messages: ChatMessage[],
): string {
  const safeCity = wrapUntrustedText('city', profile.location.city, 80);
  const safeLocality = wrapUntrustedText('locality', profile.location.locality, 100);

  const historyLines = messages.map((msg) => {
    const tag = msg.role === 'user' ? 'user_message' : 'assistant_message';
    return wrapUntrustedText(tag, msg.text, 600);
  });

  return [
    '<grounded_context>',
    `  <location>${safeLocality}, ${safeCity}</location>`,
    `  <aqi>${aqi.aqi} (${aqi.category}), dominant=${aqi.dominantPollutant}</aqi>`,
    `  <pollutants>PM2.5=${aqi.pollutants.pm25} ug/m3, PM10=${aqi.pollutants.pm10} ug/m3, NO2=${aqi.pollutants.no2} ug/m3, O3=${aqi.pollutants.o3} ug/m3</pollutants>`,
    `  <household>size=${profile.household.householdSize}, children=${profile.household.hasChildren}, elderly=${profile.household.hasElderly}, asthma_or_respiratory=${profile.household.hasRespiratorySensitivity}, pets=${profile.household.hasPets}</household>`,
    `  <lifestyle>commute=${profile.commuteMode}, home=${profile.homeType}, purifier=${profile.ownsAirPurifier}, budget=${profile.budgetLevel}</lifestyle>`,
    '</grounded_context>',
    '<conversation_history>',
    ...historyLines,
    '</conversation_history>',
    'Answer the latest <user_message> directly, grounded in the <grounded_context> above.',
  ].join('\n');
}
