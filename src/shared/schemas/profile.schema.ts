import { z } from 'zod';

/**
 * Supported commute modes for personalizing exposure and CO2e savings.
 */
export const CommuteModeSchema = z.enum([
  'walk_cycle',
  'two_wheeler',
  'public_transit',
  'car_solo',
  'carpool',
  'work_from_home',
]);

export type CommuteMode = z.infer<typeof CommuteModeSchema>;

/**
 * Supported home types affecting ventilation and indoor filtration strategy.
 */
export const HomeTypeSchema = z.enum([
  'apartment_high_rise',
  'apartment_low_rise',
  'independent_house',
  'shared_housing',
]);

export type HomeType = z.infer<typeof HomeTypeSchema>;

/**
 * Budget tier controlling ranked indoor air quality hacks.
 */
export const BudgetLevelSchema = z.enum(['low', 'medium', 'flexible']);
export type BudgetLevel = z.infer<typeof BudgetLevelSchema>;

/**
 * Supported UI and AI output languages.
 */
export const LanguageSchema = z.enum(['en', 'hi']);
export type Language = z.infer<typeof LanguageSchema>;

/**
 * Geographic location details supplied by onboarding or geolocation.
 */
export const LocationSchema = z.object({
  city: z.string().trim().min(2).max(80),
  locality: z.string().trim().min(1).max(100),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  countryCode: z.string().trim().length(2).optional(),
});

export type LocationInfo = z.infer<typeof LocationSchema>;

/**
 * Household vulnerability profile used to calibrate exposure windows and safety advice.
 */
export const HouseholdCompositionSchema = z.object({
  householdSize: z.number().int().min(1).max(20),
  hasChildren: z.boolean(),
  hasElderly: z.boolean(),
  hasRespiratorySensitivity: z.boolean(),
  hasPets: z.boolean(),
});

export type HouseholdComposition = z.infer<typeof HouseholdCompositionSchema>;

/**
 * Complete user onboarding profile for CleanBreath personalisation.
 */
export const HouseholdProfileSchema = z.object({
  location: LocationSchema,
  household: HouseholdCompositionSchema,
  commuteMode: CommuteModeSchema,
  homeType: HomeTypeSchema,
  ownsAirPurifier: z.boolean(),
  budgetLevel: BudgetLevelSchema,
  language: LanguageSchema,
});

export type HouseholdProfile = z.infer<typeof HouseholdProfileSchema>;
