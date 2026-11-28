import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { HouseholdProfile } from '../shared/schemas/profile.schema';

export interface StationPreset {
  locality: string;
  city: string;
  meta: string;
}

export const STATION_PRESETS: readonly StationPreset[] = [
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

export const STEP_LABELS: Record<1 | 2 | 3, string> = {
  1: 'Step 1 of 3 · Neighbourhood',
  2: 'Step 2 of 3 · Household',
  3: 'Step 3 of 3 · Lifestyle',
};

/**
 * Encapsulates multi-step onboarding state, geolocation lookup, station preset filtering,
 * and focus management when advancing steps.
 */
export function useOnboardingWizard(
  profile: HouseholdProfile,
  onChange: (next: HouseholdProfile) => void,
  onSubmit: (profile: HouseholdProfile) => void,
) {
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
    const firstPart = parts[0] ?? '';
    if (parts.length >= 2 && firstPart) {
      onChange({
        ...profile,
        location: {
          locality: firstPart.slice(0, 100),
          city: parts.slice(1).join(', ').slice(0, 80),
        },
      });
    } else if (parts.length === 1 && firstPart.length >= 2) {
      onChange({
        ...profile,
        location: {
          locality: firstPart.slice(0, 100),
          city: profile.location.city,
        },
      });
    }
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep((s) => (s + 1) as 1 | 2 | 3);
      return;
    }
    onSubmit(profile);
  };

  const displayPresets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return STATION_PRESETS;
    const filtered = STATION_PRESETS.filter((preset) => {
      const full = `${preset.locality}, ${preset.city}`.toLowerCase();
      return (
        full.includes(q) ||
        preset.locality.toLowerCase().includes(q) ||
        preset.city.toLowerCase().includes(q) ||
        full === `${profile.location.locality}, ${profile.location.city}`.toLowerCase()
      );
    });
    return filtered.length > 0 ? filtered : STATION_PRESETS;
  }, [profile.location.city, profile.location.locality, searchQuery]);

  return {
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
  };
}
