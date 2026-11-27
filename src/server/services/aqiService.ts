import type {
  AirQualitySnapshot,
  AqiQuery,
  DominantPollutant,
  ForecastPoint,
} from '../../shared/schemas/aqi.schema';
import { mapNumericAqiToCategory, pm25ToUsAqi } from '../../shared/utils/aqiCategories';
import { TtlCache } from '../utils/cache';
import { withTimeoutAndRetry } from '../utils/retry';
import { sanitizePlainText } from '../utils/sanitize';

const AQI_CACHE_TTL_MS = 12 * 60 * 1000;
const GMP_ATTRIBUTION_HEADER = 'gmp_mcp_codeassist_v1_aistudio';

export interface AqiServiceDeps {
  googleMapsApiKey?: string;
  fetchFn?: typeof fetch;
  cache?: TtlCache<AirQualitySnapshot>;
}

interface Coordinates {
  lat: number;
  lng: number;
  label: string;
}

const defaultAqiCache = new TtlCache<AirQualitySnapshot>(AQI_CACHE_TTL_MS, 200);

function normalizeDominantPollutant(code: string | undefined): DominantPollutant {
  const normalized = (code ?? 'pm25').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (
    normalized === 'pm25' ||
    normalized === 'pm10' ||
    normalized === 'no2' ||
    normalized === 'o3' ||
    normalized === 'co' ||
    normalized === 'so2'
  ) {
    return normalized;
  }
  return 'pm25';
}

function isQuotaError(status: number, bodyText: string): boolean {
  return status === 429 || bodyText.includes('RESOURCE_EXHAUSTED');
}

async function resolveCoordinates(
  query: AqiQuery,
  mapsKey: string,
  fetchFn: typeof fetch,
): Promise<{ coords: Coordinates; quotaHit: boolean }> {
  if (typeof query.lat === 'number' && typeof query.lng === 'number') {
    const label =
      [query.locality, query.city].filter(Boolean).join(', ') ||
      `${query.lat.toFixed(2)}, ${query.lng.toFixed(2)}`;
    return {
      coords: { lat: query.lat, lng: query.lng, label: sanitizePlainText(label, 120) },
      quotaHit: false,
    };
  }

  const searchQuery = [query.locality, query.city].filter(Boolean).join(', ') || 'New Delhi';
  let quotaHit = false;

  if (mapsKey) {
    try {
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        searchQuery,
      )}&key=${encodeURIComponent(mapsKey)}`;
      const res = await withTimeoutAndRetry((signal) =>
        fetchFn(geocodeUrl, {
          signal,
          headers: { 'X-Goog-Maps-Solution-ID': GMP_ATTRIBUTION_HEADER },
        }),
      );
      if (res.ok) {
        const data = (await res.json()) as {
          status?: string;
          results?: Array<{
            formatted_address?: string;
            geometry?: { location?: { lat?: number; lng?: number } };
          }>;
        };
        const first = data.results?.[0];
        if (
          first?.geometry?.location?.lat !== undefined &&
          first?.geometry?.location?.lng !== undefined
        ) {
          return {
            coords: {
              lat: first.geometry.location.lat,
              lng: first.geometry.location.lng,
              label: sanitizePlainText(first.formatted_address || searchQuery, 120),
            },
            quotaHit: false,
          };
        }
      } else {
        const errText = await res.text();
        if (isQuotaError(res.status, errText)) {
          quotaHit = true;
        }
      }
    } catch {
      // Fall through to Open-Meteo Geocoding
    }
  }

  // Open-Meteo Geocoding fallback (free, no key required)
  const omName = query.city || query.locality || 'New Delhi';
  const omGeoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    omName,
  )}&count=1&language=en&format=json`;
  const geoRes = await withTimeoutAndRetry((signal) => fetchFn(omGeoUrl, { signal }));
  if (geoRes.ok) {
    const geoJson = (await geoRes.json()) as {
      results?: Array<{ latitude: number; longitude: number; name: string; country?: string }>;
    };
    const match = geoJson.results?.[0];
    if (match) {
      const label = query.locality
        ? `${query.locality}, ${match.name}${match.country ? `, ${match.country}` : ''}`
        : `${match.name}${match.country ? `, ${match.country}` : ''}`;
      return {
        coords: {
          lat: match.latitude,
          lng: match.longitude,
          label: sanitizePlainText(label, 120),
        },
        quotaHit,
      };
    }
  }

  // Conservative default (Delhi NCR coordinates) if geocoding returns no results
  return {
    coords: {
      lat: 28.6139,
      lng: 77.209,
      label: sanitizePlainText(searchQuery, 120),
    },
    quotaHit,
  };
}

async function fetchFromGoogleMapsAirQuality(
  coords: Coordinates,
  mapsKey: string,
  lang: 'en' | 'hi',
  fetchFn: typeof fetch,
): Promise<{ snapshot: AirQualitySnapshot | null; quotaHit: boolean }> {
  const currentUrl = `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${encodeURIComponent(
    mapsKey,
  )}`;

  const currentRes = await withTimeoutAndRetry((signal) =>
    fetchFn(currentUrl, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Maps-Solution-ID': GMP_ATTRIBUTION_HEADER,
      },
      body: JSON.stringify({
        universalAqi: true,
        location: { latitude: coords.lat, longitude: coords.lng },
        extraComputations: ['LOCAL_AQI', 'POLLUTANT_CONCENTRATION'],
        languageCode: lang,
      }),
    }),
  );

  if (!currentRes.ok) {
    const errText = await currentRes.text();
    return { snapshot: null, quotaHit: isQuotaError(currentRes.status, errText) };
  }

  const currentData = (await currentRes.json()) as {
    indexes?: Array<{ code?: string; aqi?: number; dominantPollutant?: string }>;
    pollutants?: Array<{ code?: string; concentration?: { value?: number } }>;
  };

  const usIndex =
    currentData.indexes?.find((i) => i.code === 'usa_epa') ?? currentData.indexes?.[0];
  const pollutantMap = new Map<string, number>();
  for (const p of currentData.pollutants ?? []) {
    if (p.code && typeof p.concentration?.value === 'number') {
      pollutantMap.set(
        p.code.toLowerCase(),
        Math.max(0, Math.round(p.concentration.value * 10) / 10),
      );
    }
  }

  const pm25 = pollutantMap.get('pm25') ?? 0;
  const aqiValue =
    typeof usIndex?.aqi === 'number'
      ? Math.max(0, Math.min(500, Math.round(usIndex.aqi)))
      : pm25ToUsAqi(pm25);

  // Fetch 24-hour forecast from Google Maps Air Quality API
  const forecast: ForecastPoint[] = [];
  const start = new Date(Date.now() + 60 * 60 * 1000);
  const end = new Date(start.getTime() + 18 * 60 * 60 * 1000);

  try {
    const forecastUrl = `https://airquality.googleapis.com/v1/forecast:lookup?key=${encodeURIComponent(
      mapsKey,
    )}`;
    const fRes = await withTimeoutAndRetry(
      (signal) =>
        fetchFn(forecastUrl, {
          method: 'POST',
          signal,
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Maps-Solution-ID': GMP_ATTRIBUTION_HEADER,
          },
          body: JSON.stringify({
            pageSize: 8,
            universalAqi: true,
            location: { latitude: coords.lat, longitude: coords.lng },
            period: { startTime: start.toISOString(), endTime: end.toISOString() },
            languageCode: lang,
          }),
        }),
      { timeoutMs: 6000, retries: 1 },
    );

    if (fRes.ok) {
      const fJson = (await fRes.json()) as {
        hourlyForecasts?: Array<{
          dateTime?: string;
          indexes?: Array<{ code?: string; aqi?: number }>;
        }>;
      };
      const entries = (fJson.hourlyForecasts ?? []).slice(0, 8);
      const minAqi = entries.reduce((min, e) => {
        const val = e.indexes?.[0]?.aqi ?? aqiValue;
        return Math.min(min, val);
      }, 500);

      for (const entry of entries) {
        const val = Math.max(0, Math.min(500, Math.round(entry.indexes?.[0]?.aqi ?? aqiValue)));
        const dt = entry.dateTime ? new Date(entry.dateTime) : new Date();
        const hourLabel = dt.toISOString().slice(11, 16) + ' UTC';
        forecast.push({
          hourLabel,
          aqi: val,
          category: mapNumericAqiToCategory(val),
          isLowerPollutionWindow: val <= minAqi + 15,
        });
      }
    }
  } catch {
    // Non-fatal: continue with current snapshot even if forecast fails
  }

  return {
    quotaHit: false,
    snapshot: {
      locationLabel: coords.label,
      lat: coords.lat,
      lng: coords.lng,
      aqi: aqiValue,
      category: mapNumericAqiToCategory(aqiValue),
      dominantPollutant: normalizeDominantPollutant(usIndex?.dominantPollutant),
      pollutants: {
        pm25,
        pm10: pollutantMap.get('pm10') ?? Math.round(pm25 * 1.45),
        no2: pollutantMap.get('no2') ?? 24,
        o3: pollutantMap.get('o3') ?? 32,
      },
      forecast,
      fetchedAt: new Date().toISOString(),
      source: 'Google Maps Air Quality API',
      isFallback: false,
    },
  };
}

async function fetchFromOpenMeteo(
  coords: Coordinates,
  fetchFn: typeof fetch,
  quotaHit: boolean,
): Promise<AirQualitySnapshot> {
  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${coords.lat}&longitude=${coords.lng}` +
    '&current=pm10,pm2_5,nitrogen_dioxide,ozone,us_aqi&hourly=pm2_5,us_aqi&forecast_days=1&timezone=auto';

  const res = await withTimeoutAndRetry((signal) => fetchFn(url, { signal }));
  if (!res.ok) {
    throw new Error(`Open-Meteo AQI failed: ${res.status}`);
  }

  const json = (await res.json()) as {
    current?: {
      pm2_5?: number;
      pm10?: number;
      nitrogen_dioxide?: number;
      ozone?: number;
      us_aqi?: number;
    };
    hourly?: {
      time?: string[];
      us_aqi?: number[];
      pm2_5?: number[];
    };
  };

  const pm25 = Math.max(0, Math.round((json.current?.pm2_5 ?? 35) * 10) / 10);
  const pm10 = Math.max(0, Math.round((json.current?.pm10 ?? pm25 * 1.5) * 10) / 10);
  const no2 = Math.max(0, Math.round((json.current?.nitrogen_dioxide ?? 28) * 10) / 10);
  const o3 = Math.max(0, Math.round((json.current?.ozone ?? 42) * 10) / 10);
  const aqi = Math.max(0, Math.min(500, Math.round(json.current?.us_aqi ?? pm25ToUsAqi(pm25))));

  const times = json.hourly?.time ?? [];
  const hourlyAqi = json.hourly?.us_aqi ?? [];
  const sampled: Array<{ hourLabel: string; aqi: number }> = [];

  for (let i = 0; i < times.length && sampled.length < 8; i += 3) {
    const val = Math.max(0, Math.min(500, Math.round(hourlyAqi[i] ?? aqi)));
    const label = times[i]?.slice(11, 16) || `${String(i).padStart(2, '0')}:00`;
    sampled.push({ hourLabel: label, aqi: val });
  }

  const minForecast = sampled.reduce((m, p) => Math.min(m, p.aqi), 500);
  const forecast: ForecastPoint[] = sampled.map((p) => ({
    hourLabel: p.hourLabel,
    aqi: p.aqi,
    category: mapNumericAqiToCategory(p.aqi),
    isLowerPollutionWindow: p.aqi <= minForecast + 15,
  }));

  return {
    locationLabel: coords.label,
    lat: coords.lat,
    lng: coords.lng,
    aqi,
    category: mapNumericAqiToCategory(aqi),
    dominantPollutant: pm25 >= 35 ? 'pm25' : no2 > 80 ? 'no2' : 'pm25',
    pollutants: { pm25, pm10, no2, o3 },
    forecast,
    fetchedAt: new Date().toISOString(),
    source: 'Open-Meteo Air Quality',
    isFallback: false,
    ...(quotaHit ? { mapsQuotaExceeded: true } : {}),
  };
}

/**
 * Retrieves live AQI + pollutants + forecast for a query, with 12-minute TTL caching
 * and automatic fallback if upstream air quality providers are unavailable.
 */
export async function getLiveAirQuality(
  query: AqiQuery,
  deps: AqiServiceDeps = {},
): Promise<AirQualitySnapshot> {
  const cache = deps.cache ?? defaultAqiCache;
  const fetchFn = deps.fetchFn ?? fetch;
  const mapsKey = (deps.googleMapsApiKey ?? '').trim();

  const cacheKey =
    typeof query.lat === 'number' && typeof query.lng === 'number'
      ? `geo:${query.lat.toFixed(2)},${query.lng.toFixed(2)}:${query.lang}`
      : `loc:${(query.city ?? '').toLowerCase()}:${(query.locality ?? '').toLowerCase()}:${query.lang}`;

  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  let coords: Coordinates = {
    lat: query.lat ?? 28.6139,
    lng: query.lng ?? 77.209,
    label: sanitizePlainText(
      [query.locality, query.city].filter(Boolean).join(', ') || 'New Delhi',
      120,
    ),
  };
  let quotaHit = false;

  try {
    const resolved = await resolveCoordinates(query, mapsKey, fetchFn);
    coords = resolved.coords;
    quotaHit = resolved.quotaHit;

    if (mapsKey && !quotaHit) {
      const mapsResult = await fetchFromGoogleMapsAirQuality(
        coords,
        mapsKey,
        query.lang ?? 'en',
        fetchFn,
      );
      if (mapsResult.quotaHit) {
        quotaHit = true;
      }
      if (mapsResult.snapshot) {
        cache.set(cacheKey, mapsResult.snapshot);
        return mapsResult.snapshot;
      }
    }

    const openMeteoSnapshot = await fetchFromOpenMeteo(coords, fetchFn, quotaHit);
    cache.set(cacheKey, openMeteoSnapshot);
    return openMeteoSnapshot;
  } catch {
    const conservativeFallback: AirQualitySnapshot = {
      locationLabel: coords.label,
      lat: coords.lat,
      lng: coords.lng,
      aqi: 185,
      category: 'unhealthy',
      dominantPollutant: 'pm25',
      pollutants: { pm25: 118, pm10: 192, no2: 46, o3: 34 },
      forecast: [
        { hourLabel: '07:00', aqi: 215, category: 'very_unhealthy', isLowerPollutionWindow: false },
        { hourLabel: '10:00', aqi: 185, category: 'unhealthy', isLowerPollutionWindow: false },
        { hourLabel: '13:00', aqi: 145, category: 'sensitive', isLowerPollutionWindow: true },
        { hourLabel: '16:00', aqi: 152, category: 'unhealthy', isLowerPollutionWindow: true },
        { hourLabel: '19:00', aqi: 205, category: 'very_unhealthy', isLowerPollutionWindow: false },
        { hourLabel: '22:00', aqi: 224, category: 'very_unhealthy', isLowerPollutionWindow: false },
      ],
      fetchedAt: new Date().toISOString(),
      source: 'Offline Conservative Estimate',
      isFallback: true,
      ...(quotaHit ? { mapsQuotaExceeded: true } : {}),
    };
    return conservativeFallback;
  }
}
