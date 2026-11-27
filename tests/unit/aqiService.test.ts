// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { getLiveAirQuality } from '../../src/server/services/aqiService';

describe('aqiService (live AQI with fallbacks & caching)', () => {
  it('returns cached AQI snapshot on subsequent identical queries', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{ latitude: 28.61, longitude: 77.2, name: 'New Delhi', country: 'India' }],
      }),
    });

    // Mock open-meteo response for air quality
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ latitude: 28.61, longitude: 77.2, name: 'New Delhi', country: 'India' }],
      }),
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        current: { pm2_5: 145, pm10: 210, nitrogen_dioxide: 45, ozone: 35, us_aqi: 195 },
        hourly: { time: ['2026-11-27T08:00'], us_aqi: [195], pm2_5: [145] },
      }),
    });

    const query = { city: 'New Delhi', locality: 'Connaught Place', lang: 'en' as const };
    const snapshot1 = await getLiveAirQuality(query, { fetchFn: mockFetch });
    expect(snapshot1.aqi).toBe(195);
    expect(snapshot1.locationLabel).toContain('New Delhi');

    // Second call should hit TTL cache without invoking fetchFn again
    const callCountBefore = mockFetch.mock.calls.length;
    const snapshot2 = await getLiveAirQuality(query, { fetchFn: mockFetch });
    expect(snapshot2.aqi).toBe(195);
    expect(mockFetch.mock.calls.length).toBe(callCountBefore);
  });

  it('falls back to conservative estimate when fetch fails', async () => {
    const failingFetch = vi.fn().mockRejectedValue(new Error('Network down'));
    const snapshot = await getLiveAirQuality(
      { city: 'Mumbai', locality: 'Bandra', lang: 'en' },
      { fetchFn: failingFetch },
    );
    expect(snapshot.isFallback).toBe(true);
    expect(snapshot.aqi).toBe(185);
  });
});
