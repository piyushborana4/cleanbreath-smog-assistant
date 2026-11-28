import type { AirQualitySnapshot } from '../../shared/schemas/aqi.schema';
import type { ChatMessage } from '../../shared/schemas/chat.schema';
import type { HouseholdProfile } from '../../shared/schemas/profile.schema';
import { wrapUntrustedText } from '../utils/sanitize';

export const MAX_CHAT_HISTORY_CHARS = 2400;

/**
 * Pure prompt builder grounding each chat turn in live AQI and household profile context.
 * Wraps conversation turns as delimited data and caps total history characters to prevent prompt bloat.
 */
export function buildGroundedChatContents(
  profile: HouseholdProfile,
  aqi: AirQualitySnapshot,
  messages: ChatMessage[],
): string {
  const safeCity = wrapUntrustedText('city', profile.location.city, 80);
  const safeLocality = wrapUntrustedText('locality', profile.location.locality, 100);

  const boundedHistory: string[] = [];
  let charBudget = MAX_CHAT_HISTORY_CHARS;

  // Walk backwards from most recent message so the latest question is always retained
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (!msg) continue;
    const tag = msg.role === 'user' ? 'user_message' : 'assistant_message';
    const wrapped = wrapUntrustedText(tag, msg.text, 600);
    if (boundedHistory.length > 0 && charBudget - wrapped.length < 0) {
      break;
    }
    charBudget -= wrapped.length;
    boundedHistory.unshift(wrapped);
  }

  return [
    '<grounded_context>',
    `  <location>${safeLocality}, ${safeCity}</location>`,
    `  <aqi>${aqi.aqi} (${aqi.category}), dominant=${aqi.dominantPollutant}</aqi>`,
    `  <pollutants>PM2.5=${aqi.pollutants.pm25} ug/m3, PM10=${aqi.pollutants.pm10} ug/m3, NO2=${aqi.pollutants.no2} ug/m3, O3=${aqi.pollutants.o3} ug/m3</pollutants>`,
    `  <household>size=${profile.household.householdSize}, children=${profile.household.hasChildren}, elderly=${profile.household.hasElderly}, asthma_or_respiratory=${profile.household.hasRespiratorySensitivity}, pets=${profile.household.hasPets}</household>`,
    `  <lifestyle>commute=${profile.commuteMode}, home=${profile.homeType}, purifier=${profile.ownsAirPurifier}, budget=${profile.budgetLevel}</lifestyle>`,
    '</grounded_context>',
    '<conversation_history>',
    ...boundedHistory,
    '</conversation_history>',
    'Answer the latest <user_message> directly, grounded in the <grounded_context> above.',
  ].join('\n');
}
