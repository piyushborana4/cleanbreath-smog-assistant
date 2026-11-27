// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OnboardingWizard } from '../../src/components/OnboardingWizard';
import { ChatAssistant } from '../../src/components/ChatAssistant';
import { DEFAULT_PROFILE } from '../../src/hooks/useCleanBreath';
import { getTranslations } from '../../src/i18n/translations';
import type { AirQualitySnapshot } from '../../src/shared/schemas/aqi.schema';

const t = getTranslations('en');
const aqi: AirQualitySnapshot = {
  locationLabel: 'Rohini Sector 13, New Delhi',
  lat: 28.73,
  lng: 77.12,
  aqi: 245,
  category: 'very_unhealthy',
  dominantPollutant: 'pm25',
  pollutants: { pm25: 175, pm10: 255, no2: 48, o3: 32 },
  forecast: [],
  fetchedAt: '2026-11-27T08:00:00Z',
  source: 'Test Station',
  isFallback: false,
};

afterEach(() => {
  cleanup();
});

describe('Frontend behavioral tests', () => {
  it('navigates onboarding steps and submits profile on final step', () => {
    const onSubmit = vi.fn();
    const onChange = vi.fn();

    render(
      <OnboardingWizard
        profile={DEFAULT_PROFILE}
        theme="light"
        loading={false}
        t={t}
        onChange={onChange}
        onSubmit={onSubmit}
        onSkip={vi.fn()}
        onToggleTheme={vi.fn()}
      />,
    );

    // Step 1 -> Next: Household
    const nextBtn = screen.getByRole('button', { name: /Next: Household/i });
    fireEvent.click(nextBtn);

    // Step 2 -> Next: Lifestyle
    const nextLifestyleBtn = screen.getByRole('button', { name: /Next: Lifestyle/i });
    fireEvent.click(nextLifestyleBtn);

    // Step 3 -> See today's air plan (Submits)
    const submitBtn = screen.getByRole('button', { name: /See today’s air plan/i });
    fireEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('renders chat assistant and handles message input gracefully', async () => {
    render(<ChatAssistant profile={DEFAULT_PROFILE} aqi={aqi} t={t} />);

    const input = screen.getByPlaceholderText(/Ask about masks, windows, or kids…/i);
    expect(input).toBeInTheDocument();

    const sendBtn = screen.getByRole('button', { name: /Send question/i });
    expect(sendBtn).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'How bad is the smog today?' } });
    fireEvent.click(sendBtn);

    expect(screen.getByText('How bad is the smog today?')).toBeInTheDocument();
  });
});
