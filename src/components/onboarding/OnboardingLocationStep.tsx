import type { StationPreset } from '../../hooks/useOnboardingWizard';
import type { Translations } from '../../i18n/translations';
import type { HouseholdProfile } from '../../shared/schemas/profile.schema';

interface OnboardingLocationStepProps {
  profile: HouseholdProfile;
  searchQuery: string;
  locating: boolean;
  geoError: string | null;
  displayPresets: readonly StationPreset[];
  t: Translations;
  onChange: (next: HouseholdProfile) => void;
  onSearchInput: (value: string) => void;
  onGeolocate: () => void;
  onSelectStation: (preset: StationPreset) => void;
}

/**
 * Step 1 of OnboardingWizard: city/locality search, GPS lookup, and nearby monitoring presets.
 */
export function OnboardingLocationStep({
  profile,
  searchQuery,
  locating,
  geoError,
  displayPresets,
  t,
  onChange,
  onSearchInput,
  onGeolocate,
  onSelectStation,
}: OnboardingLocationStepProps) {
  return (
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
            onChange={(e) => onSearchInput(e.target.value)}
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
          onClick={onGeolocate}
          disabled={locating}
          aria-describedby={geoError ? 'geo-error-msg' : undefined}
          className="inline-flex items-center justify-center gap-gutter-sm min-h-12 px-gutter-lg rounded-full bg-light-secondary-container dark:bg-dark-secondary-container text-light-on-secondary-container dark:text-dark-on-secondary-container font-label text-label-lg self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-title-md" aria-hidden="true">
            my_location
          </span>
          <span>{locating ? t.locating : t.useGps}</span>
        </button>

        {geoError && (
          <p
            id="geo-error-msg"
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
                onClick={() => onSelectStation(preset)}
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
  );
}
