import { STEP_LABELS, useOnboardingWizard } from '../hooks/useOnboardingWizard';
import type { Translations } from '../i18n/translations';
import type { HouseholdProfile } from '../shared/schemas/profile.schema';
import { OnboardingHouseholdStep } from './onboarding/OnboardingHouseholdStep';
import { OnboardingLifestyleStep } from './onboarding/OnboardingLifestyleStep';
import { OnboardingLocationStep } from './onboarding/OnboardingLocationStep';

export interface OnboardingWizardProps {
  profile: HouseholdProfile;
  theme: 'light' | 'dark';
  loading: boolean;
  t: Translations;
  onChange: (next: HouseholdProfile) => void;
  onSubmit: (profile: HouseholdProfile) => void;
  onSkip: () => void;
  onToggleTheme: () => void;
}

/**
 * 3-step progressive Stitch onboarding wizard driving neighbourhood, household risk,
 * commute, home type, purifier ownership, and budget personalisation.
 */
export function OnboardingWizard({
  profile,
  theme,
  loading,
  t,
  onChange,
  onSubmit,
  onSkip,
  onToggleTheme,
}: OnboardingWizardProps) {
  const {
    step,
    setStep,
    searchQuery,
    locating,
    geoError,
    displayPresets,
    handleGeolocate,
    handleSelectStation,
    handleSearchInput,
    handleFormSubmit,
  } = useOnboardingWizard(profile, onChange, onSubmit);

  return (
    <form
      onSubmit={handleFormSubmit}
      className="min-h-screen flex flex-col max-w-2xl mx-auto px-page-margin py-gutter-lg gap-gutter-xl"
    >
      <header className="flex items-center justify-between gap-gutter-md">
        <div className="flex items-center gap-gutter-sm">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary">
            <span className="material-symbols-outlined text-title-lg" aria-hidden="true">
              air
            </span>
          </span>
          <span className="font-headline text-title-lg text-light-on-surface dark:text-dark-on-surface">
            {t.brandName}
          </span>
        </div>

        <div className="flex items-center gap-gutter-sm">
          <button
            type="button"
            onClick={onSkip}
            className="inline-flex items-center justify-center min-h-12 px-gutter-md rounded-full font-label text-label-md text-light-primary dark:text-dark-primary hover:bg-light-surface-container-low dark:hover:bg-dark-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
          >
            {t.onboardingSkip}
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-light-surface-container-low dark:bg-dark-surface-container-low text-light-on-surface dark:text-dark-on-surface border border-light-outline-variant dark:border-dark-outline-variant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
          >
            <span className="material-symbols-outlined text-title-lg" aria-hidden="true">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>
      </header>

      <nav aria-label="Onboarding steps" className="flex flex-col gap-gutter-sm">
        <div className="flex items-center justify-between">
          <span
            aria-live="polite"
            className="font-label text-label-md text-light-primary dark:text-dark-primary"
          >
            {STEP_LABELS[step]}
          </span>
          <span className="font-label text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
            Tailored for winter smog
          </span>
        </div>
        <ol className="grid grid-cols-3 gap-gutter-sm list-none p-0 m-0">
          {(
            [
              [1, 'Step 1: Location'],
              [2, 'Step 2: Household'],
              [3, 'Step 3: Lifestyle'],
            ] as const
          ).map(([n, label]) => (
            <li
              key={n}
              aria-current={step === n ? 'step' : undefined}
              className={`h-2.5 rounded-full ${
                step === n
                  ? 'bg-light-primary dark:bg-dark-primary'
                  : 'bg-light-surface-container-highest dark:bg-dark-surface-container-highest'
              }`}
            >
              <span className="sr-only">{label}</span>
            </li>
          ))}
        </ol>
      </nav>

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 flex flex-col gap-gutter-xl focus:outline-none"
      >
        {step === 1 && (
          <OnboardingLocationStep
            profile={profile}
            searchQuery={searchQuery}
            locating={locating}
            geoError={geoError}
            displayPresets={displayPresets}
            t={t}
            onChange={onChange}
            onSearchInput={handleSearchInput}
            onGeolocate={handleGeolocate}
            onSelectStation={handleSelectStation}
          />
        )}
        {step === 2 && <OnboardingHouseholdStep profile={profile} t={t} onChange={onChange} />}
        {step === 3 && <OnboardingLifestyleStep profile={profile} t={t} onChange={onChange} />}
      </main>

      <footer className="flex flex-col gap-gutter-md pt-gutter-md border-t border-light-outline-variant dark:border-dark-outline-variant">
        <div className="flex items-center justify-between gap-gutter-md">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
              className="min-h-12 px-gutter-xl rounded-full bg-light-secondary-container dark:bg-dark-secondary-container text-light-on-secondary-container dark:text-dark-on-secondary-container font-label text-label-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
            >
              {t.back}
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="ml-auto inline-flex items-center justify-center gap-gutter-sm min-h-12 px-gutter-xl rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-label text-label-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary disabled:opacity-60"
          >
            <span>
              {step === 1
                ? t.nextHousehold
                : step === 2
                  ? t.nextLifestyle
                  : loading
                    ? 'Updating…'
                    : t.seeTodayPlan}
            </span>
            <span className="material-symbols-outlined text-title-md" aria-hidden="true">
              arrow_forward
            </span>
          </button>
        </div>
        <p className="font-label text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant text-center">
          {t.disclaimerBar}
        </p>
      </footer>
    </form>
  );
}
