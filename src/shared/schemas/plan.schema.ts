import { z } from 'zod';
import { HouseholdProfileSchema } from './profile.schema';
import { AirQualitySnapshotSchema } from './aqi.schema';

/**
 * Confidence level assigned to every impact estimate.
 */
export const ConfidenceLevelSchema = z.enum(['low', 'medium', 'high']);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

/**
 * Impact Explainer schema attached to every routine, indoor hack, and sustainable alternative.
 */
export const ImpactExplainerSchema = z.object({
  why: z.string().min(5).max(320),
  estimatedEffect: z.string().min(3).max(180),
  confidence: ConfidenceLevelSchema,
  isEstimateDisclaimer: z.string().min(5).max(200),
});

export type ImpactExplainer = z.infer<typeof ImpactExplainerSchema>;

/**
 * Time-of-day routine entry.
 */
export const DailyRoutineItemSchema = z.object({
  period: z.enum(['morning', 'afternoon', 'evening']),
  title: z.string().min(3).max(120),
  action: z.string().min(5).max(360),
  commuteGuidance: z.string().min(3).max(260),
  impact: ImpactExplainerSchema,
});

export type DailyRoutineItem = z.infer<typeof DailyRoutineItemSchema>;

/**
 * Outdoor timing window derived from current AQI and hourly forecast.
 */
export const OutdoorWindowSchema = z.object({
  recommendedWindow: z.string().min(3).max(140),
  avoidWindow: z.string().min(3).max(140),
  guidance: z.string().min(5).max(300),
  impact: ImpactExplainerSchema,
});

export type OutdoorWindow = z.infer<typeof OutdoorWindowSchema>;

/**
 * Mask selection and fit advice tailored to household risk and AQI.
 */
export const MaskGuidanceSchema = z.object({
  recommendedType: z.string().min(2).max(120),
  fitNote: z.string().min(5).max(240),
  whoNeedsItMost: z.string().min(5).max(220),
  impact: ImpactExplainerSchema,
});

export type MaskGuidance = z.infer<typeof MaskGuidanceSchema>;

/**
 * Cooking and home ventilation guidance minimizing indoor particle spikes.
 */
export const CookingVentilationSchema = z.object({
  bestVentilationTime: z.string().min(3).max(160),
  cookingTips: z.string().min(5).max(300),
  impact: ImpactExplainerSchema,
});

export type CookingVentilation = z.infer<typeof CookingVentilationSchema>;

/**
 * Ranked, budget-aware indoor air quality hack.
 */
export const IndoorHackSchema = z.object({
  rank: z.number().int().min(1).max(6),
  title: z.string().min(3).max(120),
  costTier: z.enum(['free', 'low_cost', 'moderate']),
  steps: z.string().min(5).max(320),
  honestyNote: z.string().min(5).max(240),
  impact: ImpactExplainerSchema,
});

export type IndoorHack = z.infer<typeof IndoorHackSchema>;

/**
 * Sustainable low-emission alternative with quantified estimate.
 */
export const SustainableAlternativeSchema = z.object({
  title: z.string().min(3).max(120),
  category: z.enum(['transport', 'waste', 'cooking_energy', 'community']),
  action: z.string().min(5).max(300),
  impact: ImpactExplainerSchema,
});

export type SustainableAlternative = z.infer<typeof SustainableAlternativeSchema>;

/**
 * Mandatory medical safety disclaimer and severe symptom escalation text.
 */
export const SafetyNoticeSchema = z.object({
  medicalDisclaimer: z.string().min(10).max(320),
  severeSymptomEscalation: z.string().min(10).max(320),
});

export type SafetyNotice = z.infer<typeof SafetyNoticeSchema>;

/**
 * Full structured daily plan returned by Gemini and validated by Zod.
 */
export const PersonalizedDailyPlanSchema = z.object({
  personalizationSummary: z.string().min(10).max(380),
  routines: z.array(DailyRoutineItemSchema).length(3),
  outdoorWindow: OutdoorWindowSchema,
  maskGuidance: MaskGuidanceSchema,
  cookingAndVentilation: CookingVentilationSchema,
  indoorHacks: z.array(IndoorHackSchema).min(3).max(5),
  sustainableAlternatives: z.array(SustainableAlternativeSchema).min(3).max(4),
  safetyNotice: SafetyNoticeSchema,
  isFallback: z.boolean().optional(),
});

export type PersonalizedDailyPlan = z.infer<typeof PersonalizedDailyPlanSchema>;

/**
 * Request body schema for POST /api/plan.
 * Client-supplied AQI is optional and ignored server-side in favor of authoritative cached AQI.
 */
export const PlanRequestSchema = z.object({
  profile: HouseholdProfileSchema,
  aqi: AirQualitySnapshotSchema.optional(),
});

export type PlanRequest = z.infer<typeof PlanRequestSchema>;
