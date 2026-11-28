// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatAssistant } from '../../src/components/ChatAssistant';
import { CommunityChecklist } from '../../src/components/CommunityChecklist';
import { DashboardView } from '../../src/components/DashboardView';
import { IndoorHacksPanel } from '../../src/components/IndoorHacksPanel';
import { OnboardingWizard } from '../../src/components/OnboardingWizard';
import { RecommendationDetailView } from '../../src/components/RecommendationDetailView';
import { SettingsView } from '../../src/components/SettingsView';
import { StitchShell } from '../../src/components/StitchShell';
import { getTranslations } from '../../src/i18n/translations';
import type { AirQualitySnapshot } from '../../src/shared/schemas/aqi.schema';
import type { HouseholdProfile } from '../../src/shared/schemas/profile.schema';
import {
  buildFallbackCommunityChecklist,
  buildFallbackDailyPlan,
} from '../../src/shared/utils/impactMath';

const profile: HouseholdProfile = {
  location: { city: 'New Delhi', locality: 'Rohini Sector 13' },
  household: {
    householdSize: 4,
    hasChildren: true,
    hasElderly: true,
    hasRespiratorySensitivity: true,
    hasPets: false,
  },
  commuteMode: 'public_transit',
  homeType: 'apartment_high_rise',
  ownsAirPurifier: false,
  budgetLevel: 'low',
  language: 'en',
};

const aqi: AirQualitySnapshot = {
  locationLabel: 'Rohini Sector 13, New Delhi',
  lat: 28.73,
  lng: 77.12,
  aqi: 245,
  category: 'very_unhealthy',
  dominantPollutant: 'pm25',
  pollutants: { pm25: 175, pm10: 255, no2: 48, o3: 32 },
  forecast: [
    { hourLabel: '09:00', aqi: 260, category: 'very_unhealthy', isLowerPollutionWindow: false },
    { hourLabel: '14:00', aqi: 155, category: 'unhealthy', isLowerPollutionWindow: true },
  ],
  fetchedAt: '2026-11-27T08:00:00Z',
  source: 'Test Station',
  isFallback: false,
};

const plan = buildFallbackDailyPlan(profile, aqi);
const checklist = buildFallbackCommunityChecklist({
  settingType: 'apartment_society',
  locality: 'Rohini Sector 13, New Delhi',
  aqi: 245,
  category: 'very_unhealthy',
  language: 'en',
});
const t = getTranslations('en');

async function expectNoA11yViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: {
      // jsdom does not render CSS paint/canvas needed by axe color-contrast
      'color-contrast': { enabled: false },
    },
  });
  expect(results.violations).toEqual([]);
}

afterEach(() => {
  cleanup();
});

describe('Frontend WCAG 2.2 AA accessibility (axe-core)', () => {
  it('DashboardView inside StitchShell passes axe checks and exposes non-color AQI indicators', async () => {
    const { container, getAllByText } = render(
      <StitchShell
        activeTab="dashboard"
        locationLabel="Rohini Sector 13, New Delhi"
        language="en"
        theme="light"
        t={t}
        onSelectTab={vi.fn()}
        onOpenOnboarding={vi.fn()}
        onToggleTheme={vi.fn()}
        onToggleLanguage={vi.fn()}
      >
        <DashboardView
          profile={profile}
          aqi={aqi}
          plan={plan}
          loading={false}
          error={null}
          user={null}
          cloudStatus={null}
          completedIds={{}}
          t={t}
          onRetry={vi.fn()}
          onOpenOnboarding={vi.fn()}
          onOpenHacks={vi.fn()}
          onSelectDetail={vi.fn()}
          onSavePlan={vi.fn()}
          onSignIn={vi.fn()}
          onSignInGuest={vi.fn()}
        />
      </StitchShell>,
    );

    expect(getAllByText(/Very Unhealthy/i)[0]).toBeInTheDocument();
    expect(container.querySelector('svg[role="img"][aria-label*="245"]')).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('OnboardingWizard passes axe checks with labeled inputs and ARIA step tabs', async () => {
    const { container } = render(
      <OnboardingWizard
        profile={profile}
        theme="light"
        loading={false}
        t={t}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onSkip={vi.fn()}
        onToggleTheme={vi.fn()}
      />,
    );
    await expectNoA11yViolations(container);
  });

  it('IndoorHacksPanel passes axe checks', async () => {
    const { container } = render(
      <IndoorHacksPanel hacks={plan.indoorHacks} loading={false} t={t} onSelectDetail={vi.fn()} />,
    );
    await expectNoA11yViolations(container);
  });

  it('RecommendationDetailView passes axe checks including Impact progressbar', async () => {
    const firstHack = plan.indoorHacks[0];
    if (!firstHack) throw new Error('Expected at least one indoor hack');
    const { container } = render(
      <RecommendationDetailView
        item={{
          id: 'hack-1',
          badgeText: 'Rank #1 · Free',
          badgeIcon: 'tips_and_updates',
          title: firstHack.title,
          description: firstHack.steps,
          extraNote: firstHack.honestyNote,
          impact: firstHack.impact,
          returnTab: 'hacks',
        }}
        isDone={false}
        theme="light"
        t={t}
        onToggleDone={vi.fn()}
        onBack={vi.fn()}
        onToggleTheme={vi.fn()}
      />,
    );
    await expectNoA11yViolations(container);
  });

  it('ChatAssistant passes axe checks with aria-live thread and labeled input', async () => {
    const { container } = render(<ChatAssistant profile={profile} aqi={aqi} t={t} />);
    await expectNoA11yViolations(container);
  });

  it('CommunityChecklist passes axe checks', async () => {
    const { container } = render(
      <CommunityChecklist
        checklist={checklist}
        setting="apartment_society"
        loading={false}
        t={t}
        user={null}
        onSwitchSetting={vi.fn()}
        onPublishCloud={vi.fn(async () => null)}
        onSignInGuest={vi.fn()}
      />,
    );
    await expectNoA11yViolations(container);
  });

  it('SettingsView passes axe checks in Hindi mode', async () => {
    const { container } = render(
      <SettingsView
        language="hi"
        theme="dark"
        fontSize="18px"
        reduceMotion={true}
        user={null}
        savedPlans={[]}
        cloudStatus={null}
        t={getTranslations('hi')}
        onSetLanguage={vi.fn()}
        onSetFontSize={vi.fn()}
        onToggleTheme={vi.fn()}
        onToggleReduceMotion={vi.fn()}
        onSignIn={vi.fn()}
        onSignInGuest={vi.fn()}
        onSignOut={vi.fn()}
        onDeletePlan={vi.fn()}
        onClearData={vi.fn()}
      />,
    );
    await expectNoA11yViolations(container);
  });

  it('passes axe checks in dark mode for DashboardView and Hindi mode for IndoorHacksPanel', async () => {
    const hiT = getTranslations('hi');
    const hiProfile: HouseholdProfile = { ...profile, language: 'hi' };
    const hiPlan = buildFallbackDailyPlan(hiProfile, aqi);

    const { container: darkContainer } = render(
      <StitchShell
        activeTab="dashboard"
        locationLabel="Rohini Sector 13, New Delhi"
        language="hi"
        theme="dark"
        t={hiT}
        onSelectTab={vi.fn()}
        onOpenOnboarding={vi.fn()}
        onToggleTheme={vi.fn()}
        onToggleLanguage={vi.fn()}
      >
        <DashboardView
          profile={hiProfile}
          aqi={aqi}
          plan={hiPlan}
          loading={false}
          error={null}
          user={null}
          cloudStatus={null}
          completedIds={{}}
          t={hiT}
          onRetry={vi.fn()}
          onOpenOnboarding={vi.fn()}
          onOpenHacks={vi.fn()}
          onSelectDetail={vi.fn()}
          onSavePlan={vi.fn()}
          onSignIn={vi.fn()}
          onSignInGuest={vi.fn()}
        />
      </StitchShell>,
    );
    await expectNoA11yViolations(darkContainer);

    cleanup();

    const { container: hacksContainer } = render(
      <IndoorHacksPanel
        hacks={hiPlan.indoorHacks}
        loading={false}
        t={hiT}
        onSelectDetail={vi.fn()}
      />,
    );
    await expectNoA11yViolations(hacksContainer);
  });
});
