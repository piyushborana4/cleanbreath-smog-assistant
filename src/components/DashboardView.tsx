import { useMemo } from 'react';
import type { User } from 'firebase/auth';
import type { Translations } from '../i18n/translations';
import type { AirQualitySnapshot } from '../shared/schemas/aqi.schema';
import type { PersonalizedDailyPlan } from '../shared/schemas/plan.schema';
import type { HouseholdProfile } from '../shared/schemas/profile.schema';
import { AqiHeroCard } from './dashboard/AqiHeroCard';
import { DailyPlanSection } from './dashboard/DailyPlanSection';
import {
  DashboardErrorState,
  DashboardLoadingState,
  PersonalizationBar,
  SafetyEscalationBanner,
} from './dashboard/DashboardStates';
import { ForecastStrip } from './dashboard/ForecastStrip';
import { PollutantsGrid } from './dashboard/PollutantsGrid';
import { SustainableAlternativesSection } from './dashboard/SustainableAlternativesSection';
import type { RecommendationDetailItem } from './RecommendationDetailView';

export interface DashboardViewProps {
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

/**
 * Stitch Today / Dashboard screen composing live AQI hero + D3 gauge, 4 pollutant chips,
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
  const activeSignals = useMemo(
    () =>
      [
        `${profile.household.householdSize} members`,
        profile.household.hasChildren ? 'Kids' : '',
        profile.household.hasElderly ? 'Elderly' : '',
        profile.household.hasRespiratorySensitivity ? 'Asthma care' : '',
        profile.ownsAirPurifier ? 'HEPA purifier' : 'No purifier',
        `Budget: ${profile.budgetLevel}`,
      ].filter(Boolean),
    [profile],
  );

  if (loading && !aqi) {
    return (
      <DashboardLoadingState locality={profile.location.locality} city={profile.location.city} />
    );
  }

  if (error && !aqi) {
    return <DashboardErrorState error={error} onRetry={onRetry} onOpenHacks={onOpenHacks} />;
  }

  const locationLabel = `${profile.location.locality}, ${profile.location.city}`;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex-1 px-page-margin py-gutter-lg pb-32 flex flex-col gap-gutter-xl focus:outline-none"
    >
      <PersonalizationBar
        locationLabel={locationLabel}
        signals={activeSignals}
        onOpenOnboarding={onOpenOnboarding}
      />

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
          <button
            type="button"
            onClick={onRetry}
            className="min-h-12 px-gutter-md underline font-label text-label-md"
          >
            Retry
          </button>
        </div>
      )}

      {aqi && (
        <>
          <AqiHeroCard
            aqi={aqi}
            plan={plan}
            language={profile.language}
            locationLabel={locationLabel}
            t={t}
          />
          <PollutantsGrid pollutants={aqi.pollutants} t={t} />
          <ForecastStrip forecast={aqi.forecast} t={t} />
        </>
      )}

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
        <>
          <DailyPlanSection
            plan={plan}
            user={user}
            cloudStatus={cloudStatus}
            completedIds={completedIds}
            t={t}
            onSelectDetail={onSelectDetail}
            onSavePlan={onSavePlan}
            onSignIn={onSignIn}
            onSignInGuest={onSignInGuest}
          />
          <SustainableAlternativesSection
            alternatives={plan.sustainableAlternatives}
            t={t}
            onSelectDetail={onSelectDetail}
          />
        </>
      )}

      <SafetyEscalationBanner
        t={t}
        customEscalationText={plan?.safetyNotice.severeSymptomEscalation}
      />
    </main>
  );
}
