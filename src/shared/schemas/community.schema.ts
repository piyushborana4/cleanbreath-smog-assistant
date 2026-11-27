import { z } from 'zod';
import { ImpactExplainerSchema } from './plan.schema';
import { AqiCategorySchema } from './aqi.schema';
import { LanguageSchema } from './profile.schema';

/**
 * Target community setting for shareable smog action checklists.
 */
export const CommunitySettingSchema = z.enum(['apartment_society', 'school']);
export type CommunitySetting = z.infer<typeof CommunitySettingSchema>;

/**
 * Individual action item on a shareable community checklist.
 */
export const CommunityChecklistItemSchema = z.object({
  id: z.string().min(1).max(64),
  audience: z.string().min(2).max(80),
  action: z.string().min(5).max(260),
  frequency: z.string().min(2).max(80),
  impact: ImpactExplainerSchema,
});

export type CommunityChecklistItem = z.infer<typeof CommunityChecklistItemSchema>;

/**
 * Complete shareable checklist returned by POST /api/community/checklist.
 */
export const CommunityChecklistSchema = z.object({
  settingType: CommunitySettingSchema,
  locality: z.string().min(2).max(120),
  aqi: z.number().int().min(0).max(500),
  category: AqiCategorySchema,
  items: z.array(CommunityChecklistItemSchema).min(4).max(8),
  shareableText: z.string().min(20).max(4000),
});

export type CommunityChecklist = z.infer<typeof CommunityChecklistSchema>;

/**
 * Request body schema for POST /api/community/checklist.
 */
export const CommunityChecklistRequestSchema = z.object({
  settingType: CommunitySettingSchema,
  locality: z.string().trim().min(2).max(120),
  aqi: z.number().int().min(0).max(500),
  category: AqiCategorySchema,
  language: LanguageSchema,
});

export type CommunityChecklistRequest = z.infer<typeof CommunityChecklistRequestSchema>;
