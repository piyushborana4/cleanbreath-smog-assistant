import type { Translations } from '../../i18n/translations';

interface DashboardLoadingStateProps {
  locality: string;
  city: string;
}

/**
 * Accessible skeleton loading state rendered while initial AQI readings load.
 */
export function DashboardLoadingState({ locality, city }: DashboardLoadingStateProps) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading air quality data"
      className="flex-1 px-page-margin py-gutter-lg pb-32 flex flex-col gap-gutter-xl focus:outline-none"
    >
      <h1 className="sr-only">Loading Today’s Air Quality Dashboard</h1>
      <div className="p-gutter-xl rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant flex flex-col gap-gutter-md animate-pulse">
        <div className="h-4 w-44 rounded-sm bg-light-surface-container-highest dark:bg-dark-surface-container-highest" />
        <div className="h-12 w-32 rounded-sm bg-light-surface-container-highest dark:bg-dark-surface-container-highest" />
        <div className="h-4 w-full rounded-sm bg-light-surface-container-highest dark:bg-dark-surface-container-highest" />
      </div>
      <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant text-center">
        Fetching latest readings for {locality}, {city}…
      </p>
    </main>
  );
}

interface DashboardErrorStateProps {
  error: string;
  onRetry: () => void;
  onOpenHacks: () => void;
}

/**
 * Fatal AQI fetch error fallback offering retry and direct navigation to indoor hacks.
 */
export function DashboardErrorState({ error, onRetry, onOpenHacks }: DashboardErrorStateProps) {
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

interface PersonalizationBarProps {
  locationLabel: string;
  signals: string[];
  onOpenOnboarding: () => void;
}

/**
 * Compact personalization strip showing active location and household context with quick edit trigger.
 */
export function PersonalizationBar({
  locationLabel,
  signals,
  onOpenOnboarding,
}: PersonalizationBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-gutter-sm p-gutter-md rounded-md bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant">
      <p className="font-label text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
        <span className="text-light-on-surface dark:text-dark-on-surface">
          {locationLabel} · Tailored for:{' '}
        </span>
        {signals.join(' · ')}
      </p>
      <button
        type="button"
        onClick={onOpenOnboarding}
        className="inline-flex items-center gap-gutter-xs min-h-12 px-gutter-md rounded-full font-label text-label-sm text-light-primary dark:text-dark-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
      >
        <span className="material-symbols-outlined text-label-md" aria-hidden="true">
          tune
        </span>
        <span>Edit household</span>
      </button>
    </div>
  );
}

interface SafetyEscalationBannerProps {
  t: Translations;
  customEscalationText?: string;
}

/**
 * Persistent severe-symptom medical escalation notice.
 */
export function SafetyEscalationBanner({ t, customEscalationText }: SafetyEscalationBannerProps) {
  return (
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
          {customEscalationText || t.escalationBody}
        </p>
      </div>
    </section>
  );
}
