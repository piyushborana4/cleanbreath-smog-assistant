import { z } from 'zod';

/**
 * Canonical AQI severity bands mapped consistently across providers.
 */
export const AqiCategorySchema = z.enum([
  'good',
  'moderate',
  'sensitive',
  'unhealthy',
  'very_unhealthy',
  'severe',
]);

export type AqiCategory = z.infer<typeof AqiCategorySchema>;

/**
 * Tracked primary pollutants in micrograms/m3 or ppb.
 */
export const DominantPollutantSchema = z.enum(['pm25', 'pm10', 'no2', 'o3', 'co', 'so2']);
export type DominantPollutant = z.infer<typeof DominantPollutantSchema>;

/**
 * Measured pollutant concentrations (µg/m³).
 */
export const PollutantsSchema = z.object({
  pm25: z.number().min(0).max(2000),
  pm10: z.number().min(0).max(3000),
  no2: z.number().min(0).max(2000),
  o3: z.number().min(0).max(2000),
});

export type Pollutants = z.infer<typeof PollutantsSchema>;

/**
 * Single hourly forecast entry used to highlight lower-pollution windows.
 */
export const ForecastPointSchema = z.object({
  hourLabel: z.string().min(1).max(32),
  aqi: z.number().int().min(0).max(500),
  category: AqiCategorySchema,
  isLowerPollutionWindow: z.boolean(),
});

export type ForecastPoint = z.infer<typeof ForecastPointSchema>;

/**
 * Live air quality snapshot returned by GET /api/aqi.
 */
export const AirQualitySnapshotSchema = z.object({
  locationLabel: z.string().min(1).max(140),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  aqi: z.number().int().min(0).max(500),
  category: AqiCategorySchema,
  dominantPollutant: DominantPollutantSchema,
  pollutants: PollutantsSchema,
  forecast: z.array(ForecastPointSchema).max(12),
  fetchedAt: z.string().min(10).max(64),
  source: z.string().min(2).max(80),
  isFallback: z.boolean(),
  mapsQuotaExceeded: z.boolean().optional(),
});

export type AirQualitySnapshot = z.infer<typeof AirQualitySnapshotSchema>;

/**
 * Query parameter schema for GET /api/aqi.
 */
export const AqiQuerySchema = z.object({
  city: z.string().trim().min(2).max(80).optional(),
  locality: z.string().trim().min(1).max(100).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  lang: z.enum(['en', 'hi']).optional().default('en'),
});

export type AqiQuery = z.infer<typeof AqiQuerySchema>;
