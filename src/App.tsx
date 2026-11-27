import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { DashboardView } from './components/DashboardView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { IndoorHacksPanel } from './components/IndoorHacksPanel';
import { OnboardingWizard } from './components/OnboardingWizard';
import {
  RecommendationDetailView,
  type RecommendationDetailItem,
} from './components/RecommendationDetailView';
import { SettingsView, type FontSizeOption } from './components/SettingsView';
import { StitchShell, type AppTab } from './components/StitchShell';
import { DEFAULT_PROFILE, useCleanBreath } from './hooks/useCleanBreath';
import { getTranslations } from './i18n/translations';
import type { Language } from './shared/schemas/profile.schema';

const ChatAssistant = lazy(() =>
  import('./components/ChatAssistant').then((m) => ({ default: m.ChatAssistant })),
);
const CommunityChecklist = lazy(() =>
  import('./components/CommunityChecklist').then((m) => ({ default: m.CommunityChecklist })),
);

type ActiveView = AppTab | 'onboarding' | 'detail';

const THEME_KEY = 'cb_theme';
const DONE_KEY = 'cb_done_actions';

function loadInitialTheme(): 'light' | 'dark' {
  try {
    return window.localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function loadCompletedActions(): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(DONE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

/**
 * CleanBreath root application shell implementing the Google Stitch 6-screen flow
 * with WCAG 2.2 AA accessibility, dark/light themes, EN/HI switching, and live AI/AQI wiring.
 */
export default function App() {
  const {
    profile,
    setProfile,
    aqi,
    plan,
    checklist,
    communitySetting,
    loading,
    checklistLoading,
    error,
    user,
    savedPlans,
    cloudStatus,
    refreshAqiAndPlan,
    switchCommunitySetting,
    toggleLanguage,
    handleSignIn,
    handleSignInAnonymously,
    handleSignOut,
    handleSavePlan,
    handleDeletePlan,
    handlePublishChecklist,
  } = useCleanBreath();

  const [view, setView] = useState<ActiveView>('dashboard');
  const [selectedDetail, setSelectedDetail] = useState<RecommendationDetailItem | null>(null);
  const [completedIds, setCompletedIds] = useState<Record<string, boolean>>(loadCompletedActions);
  const [theme, setTheme] = useState<'light' | 'dark'>(loadInitialTheme);
  const [fontSize, setFontSize] = useState<FontSizeOption>('16px');
  const [reduceMotion, setReduceMotion] = useState<boolean>(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [routeAnnouncement, setRouteAnnouncement] = useState('');
  const isFirstViewRender = useRef(true);

  useEffect(() => {
    const onQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  useEffect(() => {
    document.documentElement.lang = profile.language;
  }, [profile.language]);

  useEffect(() => {
    if (isFirstViewRender.current) {
      isFirstViewRender.current = false;
      return;
    }
    const labels: Record<ActiveView, string> = {
      dashboard: 'Today’s Air Quality Dashboard',
      onboarding: 'Household Profile Setup',
      detail: 'Recommendation Impact Detail',
      hacks: 'Indoor Air Hacks',
      chat: 'Ask CleanBreath Assistant',
      community: 'Community Checklist',
      settings: 'Settings & Accessibility',
    };
    setRouteAnnouncement(labels[view]);
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('main-content')?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [view, selectedDetail?.id]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.fontSize = fontSize;
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleToggleDone = (id: string) => {
    setCompletedIds((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem(DONE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const handleSetLanguage = (nextLang: Language) => {
    if (profile.language === nextLang) return;
    toggleLanguage();
  };

  const handleClearData = () => {
    try {
      window.localStorage.removeItem('cleanbreath_profile_v1');
      window.localStorage.removeItem(THEME_KEY);
      window.localStorage.removeItem(DONE_KEY);
    } catch {
      // Ignore storage errors
    }
    setCompletedIds({});
    setTheme('light');
    setFontSize('16px');
    setReduceMotion(false);
    setProfile(DEFAULT_PROFILE);
    void refreshAqiAndPlan(DEFAULT_PROFILE, communitySetting);
  };

  const t = getTranslations(profile.language);
  const locationLabel = `${profile.location.locality}, ${profile.location.city}`;

  const activeTab: AppTab =
    view === 'detail'
      ? (selectedDetail?.returnTab ?? 'dashboard')
      : view === 'onboarding'
        ? 'dashboard'
        : view;

  return (
    <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
      <ErrorBoundary>
        <div
          id="top"
          className="min-h-screen bg-light-surface dark:bg-dark-surface text-light-on-surface dark:text-dark-on-surface font-body text-body-md antialiased"
        >
          <a href="#main-content" className="skip-link">
            {t.skipToContent}
          </a>
          <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
            {routeAnnouncement}
          </div>

          {quotaExceeded && (
            <div
              role="status"
              className="sticky top-0 z-50 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-xs text-amber-950 shadow-sm md:text-sm"
            >
              <span>
                Google Maps Platform quota reached. If you are the app owner, visit{' '}
                <a
                  href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-amber-950 underline hover:text-amber-800"
                >
                  maps developer site
                </a>{' '}
                for instructions to update your account. Fallback live AQI remains active.
              </span>
            </div>
          )}

          {view === 'onboarding' ? (
            <OnboardingWizard
              profile={profile}
              theme={theme}
              loading={loading}
              t={t}
              onChange={setProfile}
              onSubmit={(nextProfile) => {
                void refreshAqiAndPlan(nextProfile, communitySetting);
                setView('dashboard');
              }}
              onSkip={() => setView('dashboard')}
              onToggleTheme={toggleTheme}
            />
          ) : view === 'detail' && selectedDetail ? (
            <RecommendationDetailView
              item={selectedDetail}
              isDone={Boolean(completedIds[selectedDetail.id])}
              theme={theme}
              t={t}
              onToggleDone={handleToggleDone}
              onBack={() => setView(selectedDetail.returnTab)}
              onToggleTheme={toggleTheme}
            />
          ) : (
            <StitchShell
              activeTab={activeTab}
              locationLabel={locationLabel}
              language={profile.language}
              theme={theme}
              t={t}
              onSelectTab={(tab) => setView(tab)}
              onOpenOnboarding={() => setView('onboarding')}
              onToggleTheme={toggleTheme}
              onToggleLanguage={toggleLanguage}
            >
              {view === 'dashboard' && (
                <DashboardView
                  profile={profile}
                  aqi={aqi}
                  plan={plan}
                  loading={loading}
                  error={error}
                  user={user}
                  cloudStatus={cloudStatus}
                  completedIds={completedIds}
                  t={t}
                  onRetry={() => void refreshAqiAndPlan(profile, communitySetting)}
                  onOpenOnboarding={() => setView('onboarding')}
                  onOpenHacks={() => setView('hacks')}
                  onSelectDetail={(item) => {
                    setSelectedDetail(item);
                    setView('detail');
                  }}
                  onSavePlan={() => void handleSavePlan()}
                  onSignIn={() => void handleSignIn()}
                  onSignInGuest={() => void handleSignInAnonymously()}
                />
              )}

              {view === 'hacks' && (
                <IndoorHacksPanel
                  hacks={plan?.indoorHacks ?? []}
                  loading={loading}
                  t={t}
                  onSelectDetail={(item) => {
                    setSelectedDetail(item);
                    setView('detail');
                  }}
                />
              )}

              {view === 'chat' && (
                <Suspense
                  fallback={
                    <main
                      id="main-content"
                      tabIndex={-1}
                      aria-busy="true"
                      aria-live="polite"
                      className="flex-1 px-page-margin py-gutter-lg focus:outline-none"
                    >
                      <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
                        Loading interactive assistant…
                      </p>
                    </main>
                  }
                >
                  <ChatAssistant profile={profile} aqi={aqi} t={t} />
                </Suspense>
              )}

              {view === 'community' && (
                <Suspense
                  fallback={
                    <main
                      id="main-content"
                      tabIndex={-1}
                      aria-busy="true"
                      aria-live="polite"
                      className="flex-1 px-page-margin py-gutter-lg focus:outline-none"
                    >
                      <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
                        Loading community checklist…
                      </p>
                    </main>
                  }
                >
                  <CommunityChecklist
                    checklist={checklist}
                    setting={communitySetting}
                    loading={checklistLoading}
                    t={t}
                    user={user}
                    onSwitchSetting={(next) => void switchCommunitySetting(next)}
                    onPublishCloud={handlePublishChecklist}
                    onSignInGuest={() => void handleSignInAnonymously()}
                  />
                </Suspense>
              )}

              {view === 'settings' && (
                <SettingsView
                  language={profile.language}
                  theme={theme}
                  fontSize={fontSize}
                  reduceMotion={reduceMotion}
                  user={user}
                  savedPlans={savedPlans}
                  cloudStatus={cloudStatus}
                  t={t}
                  onSetLanguage={handleSetLanguage}
                  onSetFontSize={setFontSize}
                  onToggleTheme={toggleTheme}
                  onToggleReduceMotion={setReduceMotion}
                  onSignIn={() => void handleSignIn()}
                  onSignInGuest={() => void handleSignInAnonymously()}
                  onSignOut={() => void handleSignOut()}
                  onDeletePlan={(id) => void handleDeletePlan(id)}
                  onClearData={handleClearData}
                />
              )}
            </StitchShell>
          )}
        </div>
      </ErrorBoundary>
    </MotionConfig>
  );
}
