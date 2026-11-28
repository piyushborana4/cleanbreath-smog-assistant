import type { AqiCategory } from '../../shared/schemas/aqi.schema';

/**
 * Maps an AQI severity category to Stitch color tokens, icon name, and concise label.
 */
export function getAqiBannerStyle(category: AqiCategory): {
  container: string;
  iconBg: string;
  iconName: string;
  shortLabel: string;
} {
  switch (category) {
    case 'good':
      return {
        container:
          'bg-light-good-container dark:bg-dark-good-container text-light-on-good-container dark:text-dark-on-good-container',
        iconBg: 'bg-light-good dark:bg-dark-good text-light-on-good dark:text-dark-on-good',
        iconName: 'air',
        shortLabel: 'Good',
      };
    case 'moderate':
      return {
        container:
          'bg-light-secondary-container dark:bg-dark-secondary-container text-light-on-secondary-container dark:text-dark-on-secondary-container',
        iconBg:
          'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary',
        iconName: 'info',
        shortLabel: 'Mod.',
      };
    case 'sensitive':
      return {
        container:
          'bg-light-caution-container dark:bg-dark-caution-container text-light-on-caution-container dark:text-dark-on-caution-container',
        iconBg:
          'bg-light-caution dark:bg-dark-caution text-light-on-caution dark:text-dark-on-caution',
        iconName: 'masks',
        shortLabel: 'Sens.',
      };
    case 'unhealthy':
      return {
        container:
          'bg-light-caution-container dark:bg-dark-caution-container text-light-on-caution-container dark:text-dark-on-caution-container',
        iconBg:
          'bg-light-caution dark:bg-dark-caution text-light-on-caution dark:text-dark-on-caution',
        iconName: 'masks',
        shortLabel: 'Poor',
      };
    case 'very_unhealthy':
      return {
        container:
          'bg-light-error-container dark:bg-dark-error-container text-light-on-error-container dark:text-dark-on-error-container',
        iconBg: 'bg-light-error dark:bg-dark-error text-light-on-error dark:text-dark-on-error',
        iconName: 'warning',
        shortLabel: 'V. Poor',
      };
    case 'severe':
      return {
        container:
          'bg-light-error-container dark:bg-dark-error-container text-light-on-error-container dark:text-dark-on-error-container',
        iconBg: 'bg-light-error dark:bg-dark-error text-light-on-error dark:text-dark-on-error',
        iconName: 'error',
        shortLabel: 'Severe',
      };
  }
}

/**
 * Maps a routine period to display label, Material icon name, and color token.
 */
export function getPeriodMeta(period: 'morning' | 'afternoon' | 'evening'): {
  label: string;
  icon: string;
  color: string;
} {
  if (period === 'morning') {
    return {
      label: 'Morning',
      icon: 'wb_twilight',
      color: 'text-light-caution dark:text-dark-caution',
    };
  }
  if (period === 'afternoon') {
    return {
      label: 'Afternoon',
      icon: 'sunny',
      color: 'text-light-good dark:text-dark-good',
    };
  }
  return {
    label: 'Evening',
    icon: 'nights_stay',
    color: 'text-light-error dark:text-dark-error',
  };
}

/**
 * Maps a sustainable alternative category to its Material Symbol icon name.
 */
export function getAlternativeIcon(
  category: 'transport' | 'waste' | 'cooking_energy' | 'community',
): string {
  switch (category) {
    case 'transport':
      return 'directions_subway';
    case 'waste':
      return 'compost';
    case 'cooking_energy':
      return 'kitchen';
    case 'community':
      return 'groups';
  }
}
