import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { Translations } from '../i18n/translations';
import type {
  BudgetLevel,
  CommuteMode,
  HomeType,
  HouseholdProfile,
} from '../shared/schemas/profile.schema';

interface OnboardingWizardProps {
  profile: HouseholdProfile;
  theme: 'light' | 'dark';
  loading: boolean;
  t: Translations;
  onChange: (next: HouseholdProfile) => void;
  onSubmit: (profile: HouseholdProfile) => void;
  onSkip: () => void;
  onToggleTheme: () => void;
}

interface StationPreset {
  locality: string;
  city: string;
  meta: string;
}

const STATION_PRESETS: StationPreset[] = [
  {
    locality: 'Rohini Sector 13',
    city: 'New Delhi',
    meta: 'DPCC Station · Delhi NCR',
  },
  {
    locality: 'Indirapuram',
    city: 'Ghaziabad',
    meta: 'UPPCB Station · East NCR',
  },
  {
    locality: 'Sector 56',
    city: 'Gurugram',
    meta: 'HSPCB Station · South NCR',
  },
];

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
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [searchQuery, setSearchQuery] = useState(
    `${profile.location.locality}, ${profile.location.city}`,
  );
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const isFirstStepRender = useRef(true);

  useEffect(() => {
    if (isFirstStepRender.current) {
      isFirstStepRender.current = false;
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('main-content')?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [step]);

  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, current: 1 | 2 | 3) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setStep((current === 3 ? 1 : current + 1) as 1 | 2 | 3);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setStep((current === 1 ? 3 : current - 1) as 1 | 2 | 3);
    }
  };

  const stepLabels: Record<1 | 2 | 3, string> = {
    1: 'Step 1 of 3 · Neighbourhood',
    2: 'Step 2 of 3 · Household',
    3: 'Step 3 of 3 · Lifestyle',
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setGeoError('Browser geolocation is unavailable.');
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const updated: HouseholdProfile = {
          ...profile,
          location: {
            ...profile.location,
            lat: Number(pos.coords.latitude.toFixed(4)),
            lng: Number(pos.coords.longitude.toFixed(4)),
            locality: 'Current GPS Area',
          },
        };
        setSearchQuery(`Current GPS Area, ${updated.location.city}`);
        onChange(updated);
        setLocating(false);
      },
      () => {
        setGeoError('Location permission denied. Choose a station or enter your city below.');
        setLocating(false);
      },
      { timeout: 8000 },
    );
  };

  const handleSelectStation = (preset: StationPreset) => {
    setGeoError(null);
    setSearchQuery(`${preset.locality}, ${preset.city}`);
    onChange({
      ...profile,
      location: {
        city: preset.city,
        locality: preset.locality,
      },
    });
  };

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    const parts = value
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      onChange({
        ...profile,
        location: {
          locality: parts[0].slice(0, 100),
          city: parts.slice(1).join(', ').slice(0, 80),
        },
      });
    } else if (parts.length === 1 && parts[0].length >= 2) {
      onChange({
        ...profile,
        location: {
          locality: parts[0].slice(0, 100),
          city: profile.location.city,
        },
      });
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep((s) => (s + 1) as 1 | 2 | 3);
      return;
    }
    onSubmit(profile);
  };

  const filteredPresets = STATION_PRESETS.filter((preset) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const full = `${preset.locality}, ${preset.city}`.toLowerCase();
    return (
      full.includes(q) ||
      preset.locality.toLowerCase().includes(q) ||
      preset.city.toLowerCase().includes(q) ||
      full === `${profile.location.locality}, ${profile.location.city}`.toLowerCase()
    );
  });

  const displayPresets = filteredPresets.length > 0 ? filteredPresets : STATION_PRESETS;

  const pillClass = (active: boolean) =>
    active
      ? 'min-h-12 px-gutter-lg rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-label text-label-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary'
      : 'min-h-12 px-gutter-lg rounded-full bg-light-surface-container-low dark:bg-dark-surface-container-low text-light-on-surface dark:text-dark-on-surface border border-light-outline-variant dark:border-dark-outline-variant font-label text-label-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary';

  return (
    <form
      onSubmit={handleSubmit}
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
            {stepLabels[step]}
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
              aria-label={label}
              className={`h-2.5 rounded-full ${
                step === n
                  ? 'bg-light-primary dark:bg-dark-primary'
                  : 'bg-light-surface-container-highest dark:bg-dark-surface-container-highest'
              }`}
            />
          ))}
        </ol>
      </nav>

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 flex flex-col gap-gutter-xl focus:outline-none"
      >
        {step === 1 && (
          <section className="flex flex-col gap-gutter-lg" aria-labelledby="step1-heading">
            <div className="flex flex-col gap-gutter-xs">
              <h1
                id="step1-heading"
                className="font-headline text-headline-lg-mobile md:text-headline-lg text-balance"
              >
                {t.onboardingStep1Title}
              </h1>
              <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant text-pretty">
                {t.onboardingStep1Sub}
              </p>
            </div>

            <div className="flex flex-col gap-gutter-sm">
              <label
                htmlFor="location-search"
                className="font-label text-label-md text-light-on-surface dark:text-dark-on-surface"
              >
                Search city or locality (e.g. Rohini Sector 13, New Delhi)
              </label>
              <div className="relative flex items-center">
                <span
                  className="material-symbols-outlined absolute left-4 text-light-on-surface-variant dark:text-dark-on-surface-variant"
                  aria-hidden="true"
                >
                  search
                </span>
                <input
                  id="location-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  placeholder="e.g. Rohini Sector 13, New Delhi"
                  className="w-full min-h-12 pl-12 pr-4 py-gutter-md rounded-md bg-light-surface-container-lowest dark:bg-dark-surface-container-low text-light-on-surface dark:text-dark-on-surface border border-light-outline dark:border-dark-outline font-body text-body-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-gutter-sm pt-gutter-xs">
                <div>
                  <label htmlFor="city-input" className="block font-label text-label-sm mb-1">
                    {t.cityLabel}
                  </label>
                  <input
                    id="city-input"
                    type="text"
                    required
                    minLength={2}
                    maxLength={80}
                    value={profile.location.city}
                    onChange={(e) =>
                      onChange({
                        ...profile,
                        location: {
                          city: e.target.value,
                          locality: profile.location.locality,
                        },
                      })
                    }
                    className="w-full min-h-12 px-gutter-md rounded-md bg-light-surface-container-lowest dark:bg-dark-surface-container-low text-light-on-surface dark:text-dark-on-surface border border-light-outline-variant dark:border-dark-outline-variant font-body text-body-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
                  />
                </div>
                <div>
                  <label htmlFor="locality-input" className="block font-label text-label-sm mb-1">
                    {t.localityLabel}
                  </label>
                  <input
                    id="locality-input"
                    type="text"
                    required
                    minLength={1}
                    maxLength={100}
                    value={profile.location.locality}
                    onChange={(e) =>
                      onChange({
                        ...profile,
                        location: {
                          city: profile.location.city,
                          locality: e.target.value,
                        },
                      })
                    }
                    className="w-full min-h-12 px-gutter-md rounded-md bg-light-surface-container-lowest dark:bg-dark-surface-container-low text-light-on-surface dark:text-dark-on-surface border border-light-outline-variant dark:border-dark-outline-variant font-body text-body-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleGeolocate}
                disabled={locating}
                className="inline-flex items-center justify-center gap-gutter-sm min-h-12 px-gutter-lg rounded-full bg-light-secondary-container dark:bg-dark-secondary-container text-light-on-secondary-container dark:text-dark-on-secondary-container font-label text-label-lg self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-title-md" aria-hidden="true">
                  my_location
                </span>
                <span>{locating ? t.locating : t.useGps}</span>
              </button>

              {geoError && (
                <p
                  role="status"
                  className="font-label text-label-md text-light-caution dark:text-dark-caution"
                >
                  {geoError}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-gutter-sm">
              <h2 className="font-label text-label-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Nearby monitoring stations
              </h2>
              <div
                className="grid grid-cols-1 gap-gutter-sm"
                role="radiogroup"
                aria-label="Select monitoring station"
              >
                {displayPresets.map((preset) => {
                  const selected =
                    profile.location.locality.toLowerCase() === preset.locality.toLowerCase() &&
                    profile.location.city.toLowerCase() === preset.city.toLowerCase();
                  return (
                    <button
                      key={`${preset.locality}-${preset.city}`}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => handleSelectStation(preset)}
                      className={`min-h-12 p-gutter-lg rounded-md flex items-center justify-between gap-gutter-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary ${
                        selected
                          ? 'bg-light-secondary-container dark:bg-dark-secondary-container border-2 border-light-primary dark:border-dark-primary'
                          : 'bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant'
                      }`}
                    >
                      <div className="flex items-center gap-gutter-md">
                        <span
                          className={`material-symbols-outlined ${
                            selected
                              ? 'text-light-primary dark:text-dark-primary'
                              : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                          }`}
                          aria-hidden="true"
                        >
                          location_on
                        </span>
                        <div>
                          <p className="font-title text-title-md text-light-on-surface dark:text-dark-on-surface">
                            {preset.locality}, {preset.city}
                          </p>
                          <p className="font-label text-label-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
                            {preset.meta}
                          </p>
                        </div>
                      </div>
                      {selected && (
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
            </div>
          </section>
        )}

        {step === 2 && (
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
              {(
                [
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
                ] as const
              ).map((item) => {
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
        )}

        {step === 3 && (
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
                <div
                  className="flex flex-wrap gap-gutter-sm"
                  role="group"
                  aria-label="Primary commute"
                >
                  {(
                    [
                      ['walk_cycle', 'Walk / Cycle'],
                      ['public_transit', 'Metro / Bus'],
                      ['two_wheeler', 'Two-Wheeler'],
                      ['carpool', 'Carpool'],
                      ['car_solo', 'Car / Cab'],
                      ['work_from_home', 'Work From Home'],
                    ] as Array<[CommuteMode, string]>
                  ).map(([value, label]) => (
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
                  {(
                    [
                      ['apartment_high_rise', 'Apartment (High-Rise)'],
                      ['apartment_low_rise', 'Low-Rise / Ground Floor'],
                      ['independent_house', 'Independent House'],
                      ['shared_housing', 'Shared Housing'],
                    ] as Array<[HomeType, string]>
                  ).map(([value, label]) => (
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
                <div
                  className="flex flex-wrap gap-gutter-sm"
                  role="group"
                  aria-label="Preferred budget"
                >
                  {(
                    [
                      ['low', 'Free / Low cost'],
                      ['medium', 'Moderate'],
                      ['flexible', 'Premium / Flexible'],
                    ] as Array<[BudgetLevel, string]>
                  ).map(([value, label]) => (
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
        )}
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
