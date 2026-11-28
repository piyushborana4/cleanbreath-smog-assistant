import type { Translations } from '../../i18n/translations';
import type { ForecastPoint } from '../../shared/schemas/aqi.schema';
import { getAqiBannerStyle } from './dashboardMeta';

interface ForecastStripProps {
  forecast: ForecastPoint[];
  t: Translations;
}

/**
 * Horizontal hourly AQI forecast strip highlighting cleaner ventilation windows.
 */
export function ForecastStrip({ forecast, t }: ForecastStripProps) {
  if (forecast.length === 0) return null;

  return (
    <section aria-labelledby="forecast-heading" className="flex flex-col gap-gutter-sm">
      <h2 id="forecast-heading" className="font-headline text-title-md">
        {t.forecast24h}
      </h2>
      <ul
        className="flex gap-gutter-sm overflow-x-auto pb-gutter-xs list-none p-0 m-0"
        aria-label="Hourly AQI forecast"
      >
        {forecast.map((point) => {
          const bandStyle = getAqiBannerStyle(point.category);
          const cardSurface = point.isLowerPollutionWindow
            ? 'bg-light-good-container dark:bg-dark-good-container text-light-on-good-container dark:text-dark-on-good-container'
            : point.category === 'severe' || point.category === 'very_unhealthy'
              ? 'bg-light-error-container dark:bg-dark-error-container text-light-on-error-container dark:text-dark-on-error-container'
              : 'bg-light-surface-container-lowest dark:bg-dark-surface-container-low';

          return (
            <li
              key={point.hourLabel}
              className={`min-w-[92px] p-gutter-md rounded-md border border-light-outline-variant dark:border-dark-outline-variant flex flex-col items-center gap-gutter-xs ${cardSurface}`}
            >
              <span className="font-label text-label-sm">{point.hourLabel}</span>
              <span className="material-symbols-outlined text-title-lg" aria-hidden="true">
                {point.isLowerPollutionWindow ? 'air' : bandStyle.iconName}
              </span>
              <span className="font-mono text-mono-md tabular-nums">{point.aqi}</span>
              <span className="font-label text-label-sm">
                {point.isLowerPollutionWindow ? 'Cleaner' : bandStyle.shortLabel}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
