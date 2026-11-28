import type { Translations } from '../../i18n/translations';
import type {
  BudgetLevel,
  CommuteMode,
  HomeType,
  HouseholdProfile,
} from '../../shared/schemas/profile.schema';

interface OnboardingLifestyleStepProps {
  profile: HouseholdProfile;
  t: Translations;
  onChange: (next: HouseholdProfile) => void;
}

const COMMUTE_OPTIONS: ReadonlyArray<[CommuteMode, string]> = [
  ['walk_cycle', 'Walk / Cycle'],
  ['public_transit', 'Metro / Bus'],
  ['two_wheeler', 'Two-Wheeler'],
  ['carpool', 'Carpool'],
  ['car_solo', 'Car / Cab'],
  ['work_from_home', 'Work From Home'],
];

const HOME_OPTIONS: ReadonlyArray<[HomeType, string]> = [
  ['apartment_high_rise', 'Apartment (High-Rise)'],
  ['apartment_low_rise', 'Low-Rise / Ground Floor'],
  ['independent_house', 'Independent House'],
  ['shared_housing', 'Shared Housing'],
];

const BUDGET_OPTIONS: ReadonlyArray<[BudgetLevel, string]> = [
  ['low', 'Free / Low cost'],
  ['medium', 'Moderate'],
  ['flexible', 'Premium / Flexible'],
];

const pillClass = (active: boolean) =>
  active
    ? 'min-h-12 px-gutter-lg rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-label text-label-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary'
    : 'min-h-12 px-gutter-lg rounded-full bg-light-surface-container-low dark:bg-dark-surface-container-low text-light-on-surface dark:text-dark-on-surface border border-light-outline-variant dark:border-dark-outline-variant font-label text-label-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary';

/**
 * Step 3 of OnboardingWizard: commute mode, home type, air purifier ownership, and budget tier.
 */
export function OnboardingLifestyleStep({ profile, t, onChange }: OnboardingLifestyleStepProps) {
  return (
    <section className="flex flex-col gap-gutter-lg" aria-labelledby="step3-heading">
      <div className="flex flex-col gap-gutter-xs">
        <h1
          id="step3-heading"
          className="font-headline text-headline-lg-mobile md:text-headline-lg text-balance"
        >
          {t.onboardingStep3Title}
        </h1>
        <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant text-pretty">
          {t.onboardingStep3Sub}
        </p>
      </div>

      <div className="flex flex-col gap-gutter-lg">
        <div className="flex flex-col gap-gutter-sm">
          <span className="font-label text-label-md">Primary commute</span>
          <div className="flex flex-wrap gap-gutter-sm" role="group" aria-label="Primary commute">
            {COMMUTE_OPTIONS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={profile.commuteMode === value}
                onClick={() => onChange({ ...profile, commuteMode: value })}
                className={pillClass(profile.commuteMode === value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-gutter-sm">
          <span className="font-label text-label-md">Home type</span>
          <div className="flex flex-wrap gap-gutter-sm" role="group" aria-label="Home type">
            {HOME_OPTIONS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={profile.homeType === value}
                onClick={() => onChange({ ...profile, homeType: value })}
                className={pillClass(profile.homeType === value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-gutter-sm">
          <span className="font-label text-label-md">Air purifier at home?</span>
          <div
            className="flex flex-wrap gap-gutter-sm"
            role="group"
            aria-label="Air purifier ownership"
          >
            <button
              type="button"
              aria-pressed={profile.ownsAirPurifier}
              onClick={() => onChange({ ...profile, ownsAirPurifier: true })}
              className={pillClass(profile.ownsAirPurifier)}
            >
              Yes, I have one
            </button>
            <button
              type="button"
              aria-pressed={!profile.ownsAirPurifier}
              onClick={() => onChange({ ...profile, ownsAirPurifier: false })}
              className={pillClass(!profile.ownsAirPurifier)}
            >
              No purifier
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-gutter-sm">
          <span className="font-label text-label-md">Preferred budget for air hacks</span>
          <div className="flex flex-wrap gap-gutter-sm" role="group" aria-label="Preferred budget">
            {BUDGET_OPTIONS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={profile.budgetLevel === value}
                onClick={() => onChange({ ...profile, budgetLevel: value })}
                className={pillClass(profile.budgetLevel === value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
