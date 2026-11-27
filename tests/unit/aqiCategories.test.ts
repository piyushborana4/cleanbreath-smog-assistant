import { describe, expect, it } from 'vitest';
import {
  getAqiCategoryMeta,
  getLocalizedAqiText,
  mapNumericAqiToCategory,
  pm25ToUsAqi,
} from '../../src/shared/utils/aqiCategories';

describe('aqiCategories utilities', () => {
  it('maps numeric AQI values across all six severity bands and clamps extremes', () => {
    expect(mapNumericAqiToCategory(-10)).toBe('good');
    expect(mapNumericAqiToCategory(50)).toBe('good');
    expect(mapNumericAqiToCategory(51)).toBe('moderate');
    expect(mapNumericAqiToCategory(100)).toBe('moderate');
    expect(mapNumericAqiToCategory(125)).toBe('sensitive');
    expect(mapNumericAqiToCategory(180)).toBe('unhealthy');
    expect(mapNumericAqiToCategory(250)).toBe('very_unhealthy');
    expect(mapNumericAqiToCategory(350)).toBe('severe');
    expect(mapNumericAqiToCategory(999)).toBe('severe');
  });

  it('converts PM2.5 concentrations to US-EPA style AQI accurately', () => {
    expect(pm25ToUsAqi(0)).toBe(0);
    expect(pm25ToUsAqi(12)).toBe(50);
    expect(pm25ToUsAqi(35.4)).toBe(100);
    expect(pm25ToUsAqi(55.4)).toBe(150);
    expect(pm25ToUsAqi(150.4)).toBe(200);
    expect(pm25ToUsAqi(250.4)).toBe(300);
    expect(pm25ToUsAqi(600)).toBe(500);
  });

  it('provides non-color-only icons and bilingual labels for every category', () => {
    const categories = [
      'good',
      'moderate',
      'sensitive',
      'unhealthy',
      'very_unhealthy',
      'severe',
    ] as const;
    for (const cat of categories) {
      const meta = getAqiCategoryMeta(cat);
      expect(meta.iconName).toBeTruthy();
      expect(meta.badgeClasses).toContain('bg-');
      const en = getLocalizedAqiText(cat, 'en');
      const hi = getLocalizedAqiText(cat, 'hi');
      expect(en.label.length).toBeGreaterThan(2);
      expect(hi.label.length).toBeGreaterThan(2);
    }
  });
});
