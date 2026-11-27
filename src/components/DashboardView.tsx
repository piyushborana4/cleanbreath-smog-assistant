import type { User } from 'firebase/auth';
import type { Translations } from '../i18n/translations';
import type { AqiCategory, AirQualitySnapshot } from '../shared/schemas/aqi.schema';
import type { PersonalizedDailyPlan } from '../shared/schemas/plan.schema';
import type { HouseholdProfile } from '../shared/schemas/profile.schema';
import { getLocalizedAqiText } from '../shared/utils/aqiCategories';
import { AqiGauge } from './AqiGauge';
import type { RecommendationDetailItem } from './RecommendationDetailView';

interface DashboardViewProps {
  profile: HouseholdProfile;
  aqi: AirQualitySnapshot | null;
  plan: PersonalizedDailyPlan | null;
  loading: boolean;
  error: string | null;
  user: User | null;
  cloudStatus: string | null;
  completedIds: Record<string, boolean>;
  t: Translations;
  onRetry: () => void;
  onOpenOnboarding: () => void;
  onOpenHacks: () => void;
  onSelectDetail: (item: RecommendationDetailItem) => void;
  onSavePlan: () => void;
  onSignIn: () => void;
  onSignInGuest: () => void;
}

function getAqiBannerStyle(category: AqiCategory): {
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

function getPeriodMeta(period: 'morning' | 'afternoon' | 'evening'): {
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

function getAlternativeIcon(
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

/**
 * Stitch Today / Dashboard screen showing live AQI hero, 4 pollutant chips,
 * hourly forecast strip, interactive family plan cards, sustainable alternatives,
 * and severe-symptom escalation guidance.
 */
export function DashboardView({
  profile,
  aqi,
  plan,
  loading,
  error,
  user,
  cloudStatus,
  completedIds,
  t,
  onRetry,
  onOpenOnboarding,
  onOpenHacks,
  onSelectDetail,
  onSavePlan,
  onSignIn,
  onSignInGuest,
}: DashboardViewProps) {
  const activeSignals: string[] = [
    `${profile.household.householdSize} members`,
    profile.household.hasChildren ? 'Kids' : '',
    profile.household.hasElderly ? 'Elderly' : '',
    profile.household.hasRespiratorySensitivity ? 'Asthma care' : '',
    profile.ownsAirPurifier ? 'HEPA purifier' : 'No purifier',
    `Budget: ${profile.budgetLevel}`,
  ].filter(Boolean);

  if (loading && !aqi) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        aria-busy="true"
        aria-live="polite"
        aria-label="Loading air quality data"
        className="flex-1 px-page-margin py-gutter-lg pb-32 flex flex-col gap-gutter-xl focus:outline-none"
      >
        <div className="p-gutter-xl rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant flex flex-col gap-gutter-md animate-pulse">
          <div className="h-4 w-44 rounded-sm bg-light-surface-container-highest dark:bg-dark-surface-container-highest" />
          <div className="h-12 w-32 rounded-sm bg-light-surface-container-highest dark:bg-dark-surface-container-highest" />
          <div className="h-4 w-full rounded-sm bg-light-surface-container-highest dark:bg-dark-surface-container-highest" />
        </div>
        <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant text-center">
          Fetching latest readings for {profile.location.locality}, {profile.location.city}…
        </p>
      </main>
    );
  }

  if (error && !aqi) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 px-page-margin py-gutter-lg pb-32 flex flex-col gap-gutter-xl focus:outline-none"
      >
        <div
          role="alert"
          className="flex flex-col gap-gutter-md p-gutter-xl rounded-lg bg-light-error-container dark:bg-dark-error-container text-light-on-error-container dark:text-dark-on-error-container border border-light-outline-variant dark:border-dark-outline-variant"
        >
          <div className="flex items-center gap-gutter-sm">
            <span className="material-symbols-outlined text-title-lg" aria-hidden="true">
              error
            </span>
            <h1 className="font-title text-title-lg">Could not load AQI readings</h1>
          </div>
          <p className="font-body text-body-md">{error}</p>
          <div className="flex flex-wrap gap-gutter-sm">
            <button
              type="button"
              onClick={onRetry}
              className="min-h-12 px-gutter-xl rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-label text-label-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
            >
              Retry connection
            </button>
            <button
              type="button"
              onClick={onOpenHacks}
              className="min-h-12 px-gutter-xl rounded-full bg-light-surface-container-lowest dark:bg-dark-surface-container-low text-light-on-surface dark:text-dark-on-surface border border-light-outline-variant dark:border-dark-outline-variant font-label text-label-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
            >
              View indoor hacks
            </button>
          </div>
        </div>
      </main>
    );
  }

  const localized = aqi ? getLocalizedAqiText(aqi.category, profile.language) : null;
  const heroStyle = aqi ? getAqiBannerStyle(aqi.category) : getAqiBannerStyle('very_unhealthy');
  const updatedTime = aqi
    ? new Date(aqi.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex-1 px-page-margin py-gutter-lg pb-32 flex flex-col gap-gutter-xl focus:outline-none"
    >
      {/* Personalization Context Bar */}
      <div className="flex flex-wrap items-center justify-between gap-gutter-sm p-gutter-md rounded-md bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant">
        <p className="font-label text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
          <span className="text-light-on-surface dark:text-dark-on-surface">Tailored for: </span>
          {activeSignals.join(' · ')}
        </p>
        <button
          type="button"
          onClick={onOpenOnboarding}
          className="inline-flex items-center gap-gutter-xs font-label text-label-sm text-light-primary dark:text-dark-primary hover:underline min-h-8 px-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
        >
          <span className="material-symbols-outlined text-label-md" aria-hidden="true">
            tune
          </span>
          <span>Edit household</span>
        </button>
      </div>

      {/* Fallback or Partial Error Notice */}
      {(aqi?.isFallback || plan?.isFallback) && (
        <div
          role="status"
          className="flex items-start gap-gutter-sm p-gutter-md rounded-md bg-light-secondary-container dark:bg-dark-secondary-container text-light-on-secondary-container dark:text-dark-on-secondary-container border border-light-outline-variant dark:border-dark-outline-variant font-label text-label-md"
        >
          <span className="material-symbols-outlined shrink-0" aria-hidden="true">
            cloud_off
          </span>
          <span>{t.offlineBanner}</span>
        </div>
      )}

      {error && aqi && (
        <div
          role="alert"
          className="flex items-center justify-between gap-gutter-md p-gutter-md rounded-md bg-light-error-container dark:bg-dark-error-container text-light-on-error-container dark:text-dark-on-error-container font-label text-label-md"
        >
          <span>{error}</span>
          <button type="button" onClick={onRetry} className="underline font-label text-label-md">
            Retry
          </button>
        </div>
      )}

      {/* Large AQI Hero Card with D3 Severity Gauge */}
      {aqi && localized && (
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
                  <span className="material-symbols-outlined text-title-lg">
                    {heroStyle.iconName}
                  </span>
                </span>
                <h1
                  id="aqi-heading"
                  className="font-label text-label-md uppercase tracking-wide text-light-on-surface-variant dark:text-dark-on-surface-variant"
                >
                  {t.outdoorAqiLabel} · Updated {updatedTime} · {aqi.source}
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
              language={profile.language}
            />
          </div>
        </section>
      )}

      {/* Key Pollutants Grid */}
      {aqi && (
        <section aria-labelledby="pollutants-heading" className="flex flex-col gap-gutter-sm">
          <h2 id="pollutants-heading" className="font-headline text-title-md">
            {t.keyPollutants}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-gutter-sm">
            {(
              [
                {
                  key: 'PM2.5',
                  value: `${Math.round(aqi.pollutants.pm25)} µg/m³`,
                  icon: 'grain',
                  color: 'text-light-caution dark:text-dark-caution',
                },
                {
                  key: 'PM10',
                  value: `${Math.round(aqi.pollutants.pm10)} µg/m³`,
                  icon: 'blur_on',
                  color: 'text-light-caution dark:text-dark-caution',
                },
                {
                  key: 'NO2',
                  value: `${Math.round(aqi.pollutants.no2)} µg/m³`,
                  icon: 'directions_car',
                  color: 'text-light-primary dark:text-dark-primary',
                },
                {
                  key: 'O3',
                  value: `${Math.round(aqi.pollutants.o3)} µg/m³`,
                  icon: 'wb_sunny',
                  color: 'text-light-good dark:text-dark-good',
                },
              ] as const
            ).map((pollutant) => (
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
      )}

      {/* Hourly Forecast Strip */}
      {aqi && aqi.forecast.length > 0 && (
        <section aria-labelledby="forecast-heading" className="flex flex-col gap-gutter-sm">
          <h2 id="forecast-heading" className="font-headline text-title-md">
            {t.forecast24h}
          </h2>
          <div
            className="flex gap-gutter-sm overflow-x-auto pb-gutter-xs"
            tabIndex={0}
            aria-label="Hourly AQI forecast"
          >
            {aqi.forecast.map((point) => {
              const bandStyle = getAqiBannerStyle(point.category);
              const cardSurface = point.isLowerPollutionWindow
                ? 'bg-light-good-container dark:bg-dark-good-container text-light-on-good-container dark:text-dark-on-good-container'
                : point.category === 'severe' || point.category === 'very_unhealthy'
                  ? 'bg-light-error-container dark:bg-dark-error-container text-light-on-error-container dark:text-dark-on-error-container'
                  : 'bg-light-surface-container-lowest dark:bg-dark-surface-container-low';

              return (
                <div
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
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Today's Family Plan */}
      {loading && !plan && (
        <section
          aria-busy="true"
          aria-live="polite"
          className="p-gutter-lg rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant"
        >
          <p className="font-body text-body-md">Generating personalised daily plan…</p>
        </section>
      )}

      {plan && (
        <section aria-labelledby="plan-heading" className="flex flex-col gap-gutter-md">
          <div className="flex flex-wrap items-center justify-between gap-gutter-sm">
            <h2 id="plan-heading" className="font-headline text-title-md">
              {t.todayPlanTitle}
            </h2>
            {user ? (
              <button
                type="button"
                onClick={onSavePlan}
                className="inline-flex items-center gap-gutter-xs min-h-12 px-gutter-md rounded-full bg-light-secondary-container dark:bg-dark-secondary-container text-light-on-secondary-container dark:text-dark-on-secondary-container font-label text-label-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
              >
                <span className="material-symbols-outlined text-label-md" aria-hidden="true">
                  bookmark_add
                </span>
                <span>{cloudStatus === 'saved' ? t.savedSuccess : t.savePlanCloud}</span>
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-gutter-xs">
                <button
                  type="button"
                  onClick={onSignInGuest}
                  className="inline-flex items-center gap-gutter-xs min-h-12 px-gutter-md rounded-full bg-light-secondary-container dark:bg-dark-secondary-container text-light-on-secondary-container dark:text-dark-on-secondary-container font-label text-label-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
                >
                  <span className="material-symbols-outlined text-label-md" aria-hidden="true">
                    person_outline
                  </span>
                  <span>{t.signInGuest}</span>
                </button>
                <button
                  type="button"
                  onClick={onSignIn}
                  className="inline-flex items-center gap-gutter-xs min-h-12 px-gutter-md rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-label text-label-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
                >
                  <span className="material-symbols-outlined text-label-md" aria-hidden="true">
                    login
                  </span>
                  <span>{t.signInGoogle}</span>
                </button>
              </div>
            )}
          </div>

          {cloudStatus && cloudStatus !== 'saved' && (
            <p
              role="status"
              className="font-label text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
            >
              {cloudStatus}
            </p>
          )}

          <div className="grid grid-cols-1 gap-gutter-md">
            {plan.routines.map((routine) => {
              const meta = getPeriodMeta(routine.period);
              const itemId = `routine-${routine.period}`;
              const isDone = Boolean(completedIds[itemId]);

              return (
                <button
                  key={routine.period}
                  type="button"
                  onClick={() =>
                    onSelectDetail({
                      id: itemId,
                      badgeText: `${meta.label} routine`,
                      badgeIcon: meta.icon,
                      title: routine.title,
                      description: routine.action,
                      extraNote: `Commute guidance: ${routine.commuteGuidance}`,
                      costLabel: 'Daily routine',
                      timingOrDifficulty: meta.label,
                      impact: routine.impact,
                      returnTab: 'dashboard',
                    })
                  }
                  className="p-gutter-lg rounded-lg bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant flex items-start justify-between gap-gutter-md text-left hover:bg-light-surface-container-low dark:hover:bg-dark-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
                >
                  <div className="flex flex-col gap-gutter-xs">
                    <div className="flex flex-wrap items-center gap-gutter-sm">
                      <span
                        className={`material-symbols-outlined ${meta.color}`}
                        aria-hidden="true"
                      >
                        {meta.icon}
                      </span>
                      <span className={`font-label text-label-md ${meta.color}`}>{meta.label}</span>
                      {isDone && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-light-good-container dark:bg-dark-good-container text-light-on-good-container dark:text-dark-on-good-container font-label text-label-sm">
                          Done
                        </span>
                      )}
                    </div>
                    <h3 className="font-title text-title-lg">{routine.title}</h3>
                    <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
                      {routine.action}
                    </p>
                    <p className="font-label text-label-sm text-light-good dark:text-dark-good tabular-nums">
                      {routine.impact.estimatedEffect} · {routine.impact.confidence} confidence
                    </p>
                  </div>
                  <span
                    className="material-symbols-outlined text-light-primary dark:text-dark-primary shrink-0 mt-gutter-xs"
                    aria-hidden="true"
                  >
                    chevron_right
                  </span>
                </button>
              );
            })}

            {/* Key Guidance Cards: Outdoor Window, Mask Guidance, Cooking & Ventilation */}
            <button
              type="button"
              onClick={() =>
                onSelectDetail({
                  id: 'guide-outdoor-window',
                  badgeText: 'Outdoor activity window',
                  badgeIcon: 'schedule',
                  title: `Best window: ${plan.outdoorWindow.recommendedWindow}`,
                  description: plan.outdoorWindow.guidance,
                  extraNote: `Peak pollution to avoid: ${plan.outdoorWindow.avoidWindow}`,
                  costLabel: 'Zero cost',
                  timingOrDifficulty: plan.outdoorWindow.recommendedWindow,
                  impact: plan.outdoorWindow.impact,
                  returnTab: 'dashboard',
                })
              }
              className="p-gutter-lg rounded-lg bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant flex items-start justify-between gap-gutter-md text-left hover:bg-light-surface-container-low dark:hover:bg-dark-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
            >
              <div className="flex flex-col gap-gutter-xs">
                <div className="flex items-center gap-gutter-sm">
                  <span
                    className="material-symbols-outlined text-light-primary dark:text-dark-primary"
                    aria-hidden="true"
                  >
                    schedule
                  </span>
                  <span className="font-label text-label-md text-light-primary dark:text-dark-primary">
                    Outdoor window · {plan.outdoorWindow.recommendedWindow}
                  </span>
                </div>
                <h3 className="font-title text-title-lg">Avoid {plan.outdoorWindow.avoidWindow}</h3>
                <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  {plan.outdoorWindow.guidance}
                </p>
                <p className="font-label text-label-sm text-light-good dark:text-dark-good tabular-nums">
                  {plan.outdoorWindow.impact.estimatedEffect} ·{' '}
                  {plan.outdoorWindow.impact.confidence} confidence
                </p>
              </div>
              <span
                className="material-symbols-outlined text-light-primary dark:text-dark-primary shrink-0 mt-gutter-xs"
                aria-hidden="true"
              >
                chevron_right
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                onSelectDetail({
                  id: 'guide-mask',
                  badgeText: 'Mask guidance',
                  badgeIcon: 'masks',
                  title: plan.maskGuidance.recommendedType,
                  description: plan.maskGuidance.fitNote,
                  extraNote: `Priority: ${plan.maskGuidance.whoNeedsItMost}`,
                  costLabel: 'Personal gear',
                  timingOrDifficulty: 'Outdoors',
                  impact: plan.maskGuidance.impact,
                  returnTab: 'dashboard',
                })
              }
              className="p-gutter-lg rounded-lg bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant flex items-start justify-between gap-gutter-md text-left hover:bg-light-surface-container-low dark:hover:bg-dark-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
            >
              <div className="flex flex-col gap-gutter-xs">
                <div className="flex items-center gap-gutter-sm">
                  <span
                    className="material-symbols-outlined text-light-caution dark:text-dark-caution"
                    aria-hidden="true"
                  >
                    masks
                  </span>
                  <span className="font-label text-label-md text-light-caution dark:text-dark-caution">
                    Mask guidance
                  </span>
                </div>
                <h3 className="font-title text-title-lg">{plan.maskGuidance.recommendedType}</h3>
                <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  {plan.maskGuidance.fitNote}
                </p>
                <p className="font-label text-label-sm text-light-good dark:text-dark-good tabular-nums">
                  {plan.maskGuidance.impact.estimatedEffect} · {plan.maskGuidance.impact.confidence}{' '}
                  confidence
                </p>
              </div>
              <span
                className="material-symbols-outlined text-light-primary dark:text-dark-primary shrink-0 mt-gutter-xs"
                aria-hidden="true"
              >
                chevron_right
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                onSelectDetail({
                  id: 'guide-cooking-ventilation',
                  badgeText: 'Cooking & ventilation',
                  badgeIcon: 'kitchen',
                  title: `Ventilate: ${plan.cookingAndVentilation.bestVentilationTime}`,
                  description: plan.cookingAndVentilation.cookingTips,
                  costLabel: 'Zero cost',
                  timingOrDifficulty: plan.cookingAndVentilation.bestVentilationTime,
                  impact: plan.cookingAndVentilation.impact,
                  returnTab: 'dashboard',
                })
              }
              className="p-gutter-lg rounded-lg bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant flex items-start justify-between gap-gutter-md text-left hover:bg-light-surface-container-low dark:hover:bg-dark-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
            >
              <div className="flex flex-col gap-gutter-xs">
                <div className="flex items-center gap-gutter-sm">
                  <span
                    className="material-symbols-outlined text-light-good dark:text-dark-good"
                    aria-hidden="true"
                  >
                    kitchen
                  </span>
                  <span className="font-label text-label-md text-light-good dark:text-dark-good">
                    Cooking &amp; ventilation
                  </span>
                </div>
                <h3 className="font-title text-title-lg">
                  {plan.cookingAndVentilation.bestVentilationTime}
                </h3>
                <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  {plan.cookingAndVentilation.cookingTips}
                </p>
                <p className="font-label text-label-sm text-light-good dark:text-dark-good tabular-nums">
                  {plan.cookingAndVentilation.impact.estimatedEffect} ·{' '}
                  {plan.cookingAndVentilation.impact.confidence} confidence
                </p>
              </div>
              <span
                className="material-symbols-outlined text-light-primary dark:text-dark-primary shrink-0 mt-gutter-xs"
                aria-hidden="true"
              >
                chevron_right
              </span>
            </button>
          </div>
        </section>
      )}

      {/* Low-Emission Sustainable Alternatives */}
      {plan && plan.sustainableAlternatives.length > 0 && (
        <section aria-labelledby="sustainable-heading" className="flex flex-col gap-gutter-md">
          <h2 id="sustainable-heading" className="font-headline text-title-md">
            {t.sustainableTitle}
          </h2>
          <div className="grid grid-cols-1 gap-gutter-md">
            {plan.sustainableAlternatives.map((alt, idx) => {
              const itemId = `alt-${idx}-${alt.category}`;
              return (
                <button
                  key={itemId}
                  type="button"
                  onClick={() =>
                    onSelectDetail({
                      id: itemId,
                      badgeText: `Low-emission · ${alt.category.replace('_', ' ')}`,
                      badgeIcon: getAlternativeIcon(alt.category),
                      title: alt.title,
                      description: alt.action,
                      costLabel: 'Low-emission swap',
                      timingOrDifficulty: 'Daily choice',
                      impact: alt.impact,
                      returnTab: 'dashboard',
                    })
                  }
                  className="p-gutter-lg rounded-lg bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant flex items-start justify-between gap-gutter-md text-left hover:bg-light-surface-container-low dark:hover:bg-dark-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
                >
                  <div className="flex flex-col gap-gutter-xs">
                    <div className="flex items-center gap-gutter-sm">
                      <span
                        className="material-symbols-outlined text-light-primary dark:text-dark-primary"
                        aria-hidden="true"
                      >
                        {getAlternativeIcon(alt.category)}
                      </span>
                      <span className="font-label text-label-sm uppercase text-light-on-surface-variant dark:text-dark-on-surface-variant">
                        {alt.category.replace('_', ' ')}
                      </span>
                    </div>
                    <h3 className="font-title text-title-lg">{alt.title}</h3>
                    <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
                      {alt.action}
                    </p>
                    <p className="font-label text-label-sm text-light-good dark:text-dark-good tabular-nums">
                      {alt.impact.estimatedEffect} · {alt.impact.confidence} confidence
                    </p>
                  </div>
                  <span
                    className="material-symbols-outlined text-light-primary dark:text-dark-primary shrink-0 mt-gutter-xs"
                    aria-hidden="true"
                  >
                    chevron_right
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Safety Escalation Banner */}
      <section
        aria-labelledby="escalation-heading"
        className="p-gutter-lg rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant flex items-start gap-gutter-md"
      >
        <span
          className="material-symbols-outlined text-title-lg text-light-error dark:text-dark-error shrink-0"
          aria-hidden="true"
        >
          medical_services
        </span>
        <div className="flex flex-col gap-gutter-xs">
          <h2 id="escalation-heading" className="font-title text-title-md">
            {t.escalationTitle}
          </h2>
          <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
            {plan?.safetyNotice.severeSymptomEscalation || t.escalationBody}
          </p>
        </div>
      </section>
    </main>
  );
}
