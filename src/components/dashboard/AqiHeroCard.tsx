import type { Translations } from '../../i18n/translations';
import type { AirQualitySnapshot } from '../../shared/schemas/aqi.schema';
import type { PersonalizedDailyPlan } from '../../shared/schemas/plan.schema';
import type { Language } from '../../shared/schemas/profile.schema';
import { getLocalizedAqiText } from '../../shared/utils/aqiCategories';
import { AqiGauge } from '../AqiGauge';
import { getAqiBannerStyle } from './dashboardMeta';

interface AqiHeroCardProps {
  aqi: AirQualitySnapshot;
  plan: PersonalizedDailyPlan | null;
  language: Language;
  locationLabel: string;
  t: Translations;
}

/**
 * Hero card displaying the live AQI score, localized severity badge, D3 gauge, and summary.
 */
export function AqiHeroCard({ aqi, plan, language, locationLabel, t }: AqiHeroCardProps) {
  const localized = getLocalizedAqiText(aqi.category, language);
  const heroStyle = getAqiBannerStyle(aqi.category);
  const updatedTime = new Date(aqi.fetchedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <section
      aria-labelledby="aqi-heading"
      className="p-gutter-xl rounded-lg border border-light-outline-variant dark:border-dark-outline-variant bg-light-surface-container-lowest dark:bg-dark-surface-container-low flex flex-col gap-gutter-md"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-gutter-lg">
        <div className="flex-1 min-w-0 flex flex-col gap-gutter-sm">
          <div className="flex items-center gap-gutter-sm">
            <span
              className={`inline-flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${heroStyle.iconBg}`}
              aria-hidden="true"
            >
              <span className="material-symbols-outlined text-title-lg">{heroStyle.iconName}</span>
            </span>
            <h1
              id="aqi-heading"
              className="font-label text-label-md uppercase tracking-wide text-light-on-surface-variant dark:text-dark-on-surface-variant"
            >
              {t.outdoorAqiLabel} · {locationLabel} · Updated {updatedTime} · {aqi.source}
            </h1>
          </div>

          <div className="flex flex-wrap items-baseline gap-gutter-md">
            <span className="font-display text-display-lg-mobile md:text-display-lg tabular-nums text-light-on-surface dark:text-dark-on-surface">
              {aqi.aqi}
            </span>
            <span className="font-headline text-title-lg text-light-on-surface dark:text-dark-on-surface">
              {localized.label}
            </span>
          </div>

          <p className="font-body text-body-md text-pretty text-light-on-surface-variant dark:text-dark-on-surface-variant">
            {plan ? plan.personalizationSummary : localized.guidance}
          </p>
        </div>

        <AqiGauge
          aqi={aqi.aqi}
          category={aqi.category}
          categoryLabel={localized.label}
          language={language}
        />
      </div>
    </section>
  );
}
