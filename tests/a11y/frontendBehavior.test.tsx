// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { ChatAssistant } from '../../src/components/ChatAssistant';
import { DashboardView } from '../../src/components/DashboardView';
import { OnboardingWizard } from '../../src/components/OnboardingWizard';
import { DEFAULT_PROFILE } from '../../src/hooks/useCleanBreath';
import { getTranslations } from '../../src/i18n/translations';
import type { AirQualitySnapshot } from '../../src/shared/schemas/aqi.schema';
import { buildFallbackDailyPlan } from '../../src/shared/utils/impactMath';

const t = getTranslations('en');
const aqi: AirQualitySnapshot = {
  locationLabel: 'Rohini Sector 13, New Delhi',
  lat: 28.73,
  lng: 77.12,
  aqi: 245,
  category: 'very_unhealthy',
  dominantPollutant: 'pm25',
  pollutants: { pm25: 175, pm10: 255, no2: 48, o3: 32 },
  forecast: [{ hourLabel: '14:00', aqi: 155, category: 'unhealthy', isLowerPollutionWindow: true }],
  fetchedAt: '2026-11-27T08:00:00Z',
  source: 'Test Station',
  isFallback: false,
};

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('Frontend behavioral tests (Onboarding, Dashboard states, Chat SSE/error, i18n, focus & landmarks)', () => {
  it('navigates onboarding steps, saves profile, and submits final step', () => {
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

    expect(document.querySelectorAll('main')).toHaveLength(1);
    expect(document.querySelectorAll('h1')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: /Next: Household/i }));
    fireEvent.click(screen.getByRole('button', { name: /Next: Lifestyle/i }));
    fireEvent.click(screen.getByRole('button', { name: /See today’s air plan/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('renders DashboardView loading, fatal error with retry, and offline fallback banner states', () => {
    const onRetry = vi.fn();

    const { rerender } = render(
      <DashboardView
        profile={DEFAULT_PROFILE}
        aqi={null}
        plan={null}
        loading={true}
        error={null}
        user={null}
        cloudStatus={null}
        completedIds={{}}
        t={t}
        onRetry={onRetry}
        onOpenOnboarding={vi.fn()}
        onOpenHacks={vi.fn()}
        onSelectDetail={vi.fn()}
        onSavePlan={vi.fn()}
        onSignIn={vi.fn()}
        onSignInGuest={vi.fn()}
      />,
    );
    expect(screen.getByText(/Fetching latest readings/i)).toBeInTheDocument();

    rerender(
      <DashboardView
        profile={DEFAULT_PROFILE}
        aqi={null}
        plan={null}
        loading={false}
        error="Upstream AQI timeout"
        user={null}
        cloudStatus={null}
        completedIds={{}}
        t={t}
        onRetry={onRetry}
        onOpenOnboarding={vi.fn()}
        onOpenHacks={vi.fn()}
        onSelectDetail={vi.fn()}
        onSavePlan={vi.fn()}
        onSignIn={vi.fn()}
        onSignInGuest={vi.fn()}
      />,
    );
    expect(screen.getByText(/Upstream AQI timeout/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    const fallbackAqi = { ...aqi, isFallback: true };
    const fallbackPlan = buildFallbackDailyPlan(DEFAULT_PROFILE, fallbackAqi);
    rerender(
      <DashboardView
        profile={DEFAULT_PROFILE}
        aqi={fallbackAqi}
        plan={fallbackPlan}
        loading={false}
        error={null}
        user={null}
        cloudStatus={null}
        completedIds={{}}
        t={t}
        onRetry={onRetry}
        onOpenOnboarding={vi.fn()}
        onOpenHacks={vi.fn()}
        onSelectDetail={vi.fn()}
        onSavePlan={vi.fn()}
        onSignIn={vi.fn()}
        onSignInGuest={vi.fn()}
      />,
    );
    expect(screen.getByText(t.offlineBanner)).toBeInTheDocument();
  });

  it('streams SSE chunks in ChatAssistant and renders accessible error alert when chat fails', async () => {
    const encoder = new TextEncoder();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: 'chunk', text: 'Keep windows shut until 13:00.' })}\n\n`,
                ),
              );
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
              controller.close();
            },
          }),
          { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Too many AI requests. Please wait.' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    render(<ChatAssistant profile={DEFAULT_PROFILE} aqi={aqi} t={t} />);

    const input = screen.getByPlaceholderText(/Ask about masks, windows, or kids…/i);
    const sendBtn = screen.getByRole('button', { name: /Send question/i });

    fireEvent.change(input, { target: { value: 'Best window time?' } });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText('Keep windows shut until 13:00.')).toBeInTheDocument();
    });

    fireEvent.change(input, { target: { value: 'Follow up question?' } });
    fireEvent.click(screen.getByRole('button', { name: /Send question/i }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Too many AI requests. Please wait.');
    });
  });

  it('switches language to Hindi, moves focus cleanly on route switch, and persists onboarding in App', async () => {
    const samplePlan = buildFallbackDailyPlan(DEFAULT_PROFILE, aqi);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/aqi')) {
          return new Response(JSON.stringify(aqi), { status: 200 });
        }
        if (url.includes('/api/plan')) {
          return new Response(JSON.stringify(samplePlan), { status: 200 });
        }
        return new Response(JSON.stringify({ items: [], shareableText: '' }), { status: 200 });
      }),
    );

    render(<App />);

    await waitFor(() => {
      expect(document.querySelectorAll('main')).toHaveLength(1);
      expect(document.querySelectorAll('h1')).toHaveLength(1);
    });

    // Toggle language to Hindi
    const langBtn = screen.getByRole('button', { name: /Switch language to Hindi/i });
    fireEvent.click(langBtn);

    await waitFor(() => {
      expect(document.documentElement.lang).toBe('hi');
      expect(
        screen.getByRole('button', { name: /Switch language to English/i }),
      ).toBeInTheDocument();
    });

    // Switch back to English and navigate to Settings tab
    fireEvent.click(screen.getByRole('button', { name: /Switch language to English/i }));
    fireEvent.click(screen.getByRole('button', { name: /Settings/i }));

    await waitFor(() => {
      const h1 = document.querySelector('#main-content h1');
      expect(h1).toBeInTheDocument();
      expect(document.querySelectorAll('main')).toHaveLength(1);
      expect(document.querySelectorAll('h1')).toHaveLength(1);
    });

    // Open onboarding via neighbourhood header button, change city, submit and verify localStorage persistence
    fireEvent.click(screen.getByRole('button', { name: /Change neighbourhood/i }));
    await waitFor(() => {
      expect(screen.getByLabelText(/^City$/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/^City$/i), { target: { value: 'Noida' } });
    fireEvent.click(screen.getByRole('button', { name: /Next: Household/i }));
    fireEvent.click(screen.getByRole('button', { name: /Next: Lifestyle/i }));
    fireEvent.click(screen.getByRole('button', { name: /See today’s air plan/i }));

    await waitFor(() => {
      const stored = window.localStorage.getItem('cleanbreath_profile_v1');
      expect(stored).toContain('Noida');
    });
  });
});
