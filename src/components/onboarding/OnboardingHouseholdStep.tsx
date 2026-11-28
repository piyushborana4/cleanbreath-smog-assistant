import type { Translations } from '../../i18n/translations';
import type { HouseholdProfile } from '../../shared/schemas/profile.schema';

interface OnboardingHouseholdStepProps {
  profile: HouseholdProfile;
  t: Translations;
  onChange: (next: HouseholdProfile) => void;
}

const HOUSEHOLD_GROUPS = [
  {
    field: 'hasChildren',
    icon: 'child_care',
    title: 'Kids (under 12)',
    sub: 'Stricter outdoor play limits',
  },
  {
    field: 'hasElderly',
    icon: 'elderly',
    title: 'Elderly (65+)',
    sub: 'Morning walk timing alerts',
  },
  {
    field: 'hasRespiratorySensitivity',
    icon: 'pulmonology',
    title: 'Asthma or breathing care',
    sub: 'Bedroom air & early warnings',
  },
  {
    field: 'hasPets',
    icon: 'pets',
    title: 'Pets at home',
    sub: 'Pet-safe ventilation & walks',
  },
] as const;

/**
 * Step 2 of OnboardingWizard: household sensitivity toggles and member count.
 */
export function OnboardingHouseholdStep({ profile, t, onChange }: OnboardingHouseholdStepProps) {
  return (
    <section className="flex flex-col gap-gutter-lg" aria-labelledby="step2-heading">
      <div className="flex flex-col gap-gutter-xs">
        <h1
          id="step2-heading"
          className="font-headline text-headline-lg-mobile md:text-headline-lg text-balance"
        >
          {t.onboardingStep2Title}
        </h1>
        <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant text-pretty">
          {t.onboardingStep2Sub}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-gutter-md">
        {HOUSEHOLD_GROUPS.map((item) => {
          const active = profile.household[item.field];
          return (
            <button
              key={item.field}
              type="button"
              aria-pressed={active}
              onClick={() =>
                onChange({
                  ...profile,
                  household: {
                    ...profile.household,
                    [item.field]: !active,
                  },
                })
              }
              className={`min-h-12 p-gutter-lg rounded-md flex items-center gap-gutter-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary ${
                active
                  ? 'bg-light-secondary-container dark:bg-dark-secondary-container border-2 border-light-primary dark:border-dark-primary'
                  : 'bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant'
              }`}
            >
              <span
                className={`material-symbols-outlined text-title-lg ${
                  active
                    ? 'text-light-primary dark:text-dark-primary'
                    : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                }`}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <div className="flex-1">
                <p className="font-title text-title-md">{item.title}</p>
                <p className="font-label text-label-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  {item.sub}
                </p>
              </div>
              {active && (
                <span
                  className="material-symbols-outlined text-light-primary dark:text-dark-primary"
                  aria-hidden="true"
                >
                  check_circle
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-gutter-sm max-w-xs">
        <label htmlFor="household-size" className="font-label text-label-md">
          {t.householdSizeLabel}
        </label>
        <input
          id="household-size"
          type="number"
          min={1}
          max={20}
          value={profile.household.householdSize}
          onChange={(e) =>
            onChange({
              ...profile,
              household: {
                ...profile.household,
                householdSize: Math.max(1, Math.min(20, Number(e.target.value) || 1)),
              },
            })
          }
          className="tabular-nums min-h-12 px-gutter-md rounded-md bg-light-surface-container-lowest dark:bg-dark-surface-container-low text-light-on-surface dark:text-dark-on-surface border border-light-outline dark:border-dark-outline font-mono text-mono-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
        />
      </div>
    </section>
  );
}
