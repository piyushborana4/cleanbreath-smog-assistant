// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { getLiveAirQuality } from '../../src/server/services/aqiService';
import { TtlCache } from '../../src/server/utils/cache';
import type { AirQualitySnapshot } from '../../src/shared/schemas/aqi.schema';

describe('aqiService (Google AQ, Open-Meteo fallback, caching, coordinate rounding)', () => {
  it('fetches Google Maps Air Quality current conditions and forecast, then caches by rounded 0.01° coordinates', async () => {
    const mockFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('currentConditions:lookup')) {
        return new Response(
          JSON.stringify({
            indexes: [{ code: 'usa_epa', aqi: 182, dominantPollutant: 'pm25' }],
            pollutants: [
              { code: 'pm25', concentration: { value: 112.4 } },
              { code: 'pm10', concentration: { value: 168.0 } },
              { code: 'no2', concentration: { value: 41.2 } },
              { code: 'o3', concentration: { value: 29.8 } },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          hourlyForecasts: [
            { dateTime: '2026-11-27T10:00:00Z', indexes: [{ aqi: 190 }] },
            { dateTime: '2026-11-27T14:00:00Z', indexes: [{ aqi: 140 }] },
          ],
        }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    const cache = new TtlCache<AirQualitySnapshot>(12 * 60 * 1000, 50);
    const snap1 = await getLiveAirQuality(
      { lat: 28.611, lng: 77.201, city: 'New Delhi', locality: 'CP', lang: 'en' },
      { googleMapsApiKey: 'maps-test-key', fetchFn: mockFetch, cache },
    );

    expect(snap1.aqi).toBe(182);
    expect(snap1.source).toBe('Google Maps Air Quality API');
    expect(snap1.forecast).toHaveLength(2);
    expect(snap1.forecast[1]?.isLowerPollutionWindow).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Nearby coordinate that rounds to the same 28.61,77.20 bucket hits the 12-min cache
    const snap2 = await getLiveAirQuality(
      { lat: 28.614, lng: 77.204, city: 'New Delhi', locality: 'CP', lang: 'en' },
      { googleMapsApiKey: 'maps-test-key', fetchFn: mockFetch, cache },
    );
    expect(snap2.aqi).toBe(182);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('falls back to Open-Meteo with mapsQuotaExceeded=true when Maps API returns 429', async () => {
    const mockFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('maps.googleapis.com') || url.includes('airquality.googleapis.com')) {
        return new Response('RESOURCE_EXHAUSTED', { status: 429 });
      }
      if (url.includes('geocoding-api.open-meteo.com')) {
        return new Response(
          JSON.stringify({
            results: [{ latitude: 28.61, longitude: 77.2, name: 'New Delhi', country: 'India' }],
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          current: { pm2_5: 135, pm10: 210, nitrogen_dioxide: 45, ozone: 35, us_aqi: 195 },
          hourly: {
            time: ['2026-11-27T08:00', '2026-11-27T09:00', '2026-11-27T10:00', '2026-11-27T11:00'],
            us_aqi: [195, 180, 165, 145],
          },
        }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    const cache = new TtlCache<AirQualitySnapshot>(12 * 60 * 1000, 50);
    const snapshot = await getLiveAirQuality(
      { city: 'New Delhi', locality: 'Connaught Place', lang: 'en' },
      { googleMapsApiKey: 'maps-test-key', fetchFn: mockFetch, cache },
    );
    expect(snapshot.aqi).toBe(195);
    expect(snapshot.source).toBe('Open-Meteo Air Quality');
    expect(snapshot.mapsQuotaExceeded).toBe(true);
    expect(snapshot.isFallback).toBe(false);
  });

  it('returns cached city snapshot on repeat queries and degrades to offline estimate when Open-Meteo fails', async () => {
    const cache = new TtlCache<AirQualitySnapshot>(12 * 60 * 1000, 50);
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [{ latitude: 19.07, longitude: 72.87, name: 'Mumbai', country: 'India' }],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            current: { pm2_5: 62, pm10: 110, nitrogen_dioxide: 30, ozone: 40, us_aqi: 154 },
            hourly: { time: ['2026-11-27T08:00'], us_aqi: [154] },
          }),
          { status: 200 },
        ),
      );

    const query = { city: 'Mumbai', locality: 'Bandra', lang: 'en' as const };
    const snap1 = await getLiveAirQuality(query, { fetchFn: mockFetch, cache });
    expect(snap1.aqi).toBe(154);

    const snap2 = await getLiveAirQuality(query, { fetchFn: mockFetch, cache });
    expect(snap2.aqi).toBe(154);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    const failingFetch = vi.fn().mockRejectedValue(new Error('Network down'));
    const offline = await getLiveAirQuality(
      { city: 'Pune', locality: 'Kothrud', lang: 'en' },
      { fetchFn: failingFetch, cache: new TtlCache<AirQualitySnapshot>(12 * 60 * 1000, 10) },
    );
    expect(offline.isFallback).toBe(true);
    expect(offline.aqi).toBe(185);
    expect(offline.source).toBe('Offline Conservative Estimate');
  });
});
