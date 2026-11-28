import type { Translations } from '../../i18n/translations';
import type { AirQualitySnapshot } from '../../shared/schemas/aqi.schema';

interface PollutantsGridProps {
  pollutants: AirQualitySnapshot['pollutants'];
  t: Translations;
}

/**
 * 4-card grid displaying live PM2.5, PM10, NO2, and O3 concentrations in µg/m³.
 */
export function PollutantsGrid({ pollutants, t }: PollutantsGridProps) {
  const items = [
    {
      key: 'PM2.5',
      value: `${Math.round(pollutants.pm25)} µg/m³`,
      icon: 'grain',
      color: 'text-light-caution dark:text-dark-caution',
    },
    {
      key: 'PM10',
      value: `${Math.round(pollutants.pm10)} µg/m³`,
      icon: 'blur_on',
      color: 'text-light-caution dark:text-dark-caution',
    },
    {
      key: 'NO2',
      value: `${Math.round(pollutants.no2)} µg/m³`,
      icon: 'directions_car',
      color: 'text-light-primary dark:text-dark-primary',
    },
    {
      key: 'O3',
      value: `${Math.round(pollutants.o3)} µg/m³`,
      icon: 'wb_sunny',
      color: 'text-light-good dark:text-dark-good',
    },
  ] as const;

  return (
    <section aria-labelledby="pollutants-heading" className="flex flex-col gap-gutter-sm">
      <h2 id="pollutants-heading" className="font-headline text-title-md">
        {t.keyPollutants}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-gutter-sm">
        {items.map((pollutant) => (
          <div
            key={pollutant.key}
            className="p-gutter-md rounded-md bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant flex items-center gap-gutter-sm"
          >
            <span
              className={`material-symbols-outlined shrink-0 ${pollutant.color}`}
              aria-hidden="true"
            >
              {pollutant.icon}
            </span>
            <div>
              <p className="font-label text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                {pollutant.key}
              </p>
              <p className="font-mono text-mono-md tabular-nums">{pollutant.value}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
