import type { ReactNode } from 'react';
import type { Translations } from '../i18n/translations';
import type { Language } from '../shared/schemas/profile.schema';

export type AppTab = 'dashboard' | 'hacks' | 'chat' | 'community' | 'settings';

interface StitchShellProps {
  activeTab: AppTab;
  locationLabel: string;
  language: Language;
  theme: 'light' | 'dark';
  t: Translations;
  onSelectTab: (tab: AppTab) => void;
  onOpenOnboarding: () => void;
  onToggleTheme: () => void;
  onToggleLanguage: () => void;
  children: ReactNode;
  hideBottomNav?: boolean;
}

/**
 * Shared CleanBreath application shell implementing the Google Stitch sticky header,
 * persistent bottom medical disclaimer, and 5-tab accessible navigation bar.
 */
export function StitchShell({
  activeTab,
  locationLabel,
  language,
  theme,
  t,
  onSelectTab,
  onOpenOnboarding,
  onToggleTheme,
  onToggleLanguage,
  children,
  hideBottomNav = false,
}: StitchShellProps) {
  const navItems: Array<{ id: AppTab; label: string; icon: string }> = [
    { id: 'dashboard', label: t.tabToday, icon: 'home' },
    { id: 'hacks', label: t.tabHacks, icon: 'tips_and_updates' },
    { id: 'chat', label: t.tabAsk, icon: 'chat_bubble' },
    { id: 'community', label: t.tabCommunity, icon: 'groups' },
    { id: 'settings', label: t.tabSettings, icon: 'settings' },
  ];

  return (
    <div className="min-h-screen flex flex-col max-w-3xl mx-auto">
      <header className="sticky top-0 z-20 bg-light-surface dark:bg-dark-surface border-b border-light-outline-variant dark:border-dark-outline-variant px-page-margin py-gutter-md flex items-center justify-between gap-gutter-md">
        <div className="flex items-center gap-gutter-sm min-w-0">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary shrink-0">
            <span className="material-symbols-outlined text-title-lg" aria-hidden="true">
              air
            </span>
          </span>
          <div className="min-w-0">
            <p className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface leading-tight">
              {t.brandName}
            </p>
            <button
              type="button"
              onClick={onOpenOnboarding}
              aria-label={`Change neighbourhood, currently ${locationLabel}`}
              className="inline-flex items-center gap-gutter-xs font-label text-label-sm text-light-primary dark:text-dark-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary rounded-sm min-h-6 max-w-full truncate"
            >
              <span className="material-symbols-outlined text-label-md shrink-0" aria-hidden="true">
                location_on
              </span>
              <span className="truncate">{locationLabel}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-gutter-sm shrink-0">
          <button
            type="button"
            onClick={onToggleLanguage}
            aria-label={
              language === 'en' ? 'Switch language to Hindi' : 'Switch language to English'
            }
            className="inline-flex items-center justify-center min-h-12 px-gutter-md rounded-full bg-light-surface-container-low dark:bg-dark-surface-container-low text-light-on-surface dark:text-dark-on-surface border border-light-outline-variant dark:border-dark-outline-variant font-label text-label-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
          >
            {language === 'en' ? 'हिन्दी' : 'EN'}
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-light-surface-container-low dark:bg-dark-surface-container-low text-light-on-surface dark:text-dark-on-surface border border-light-outline-variant dark:border-dark-outline-variant shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
          >
            <span className="material-symbols-outlined text-title-lg" aria-hidden="true">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col">{children}</div>

      {!hideBottomNav && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-light-surface dark:bg-dark-surface border-t border-light-outline-variant dark:border-dark-outline-variant">
          <div className="max-w-3xl mx-auto">
            <p className="px-page-margin py-gutter-xs font-label text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant text-center border-b border-light-outline-variant dark:border-dark-outline-variant">
              {t.disclaimerBar}
            </p>
            <nav aria-label="Primary navigation" className="grid grid-cols-5">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectTab(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`min-h-12 py-gutter-sm flex flex-col items-center justify-center gap-gutter-xs font-label text-label-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary ${
                      isActive
                        ? 'text-light-primary dark:text-dark-primary'
                        : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-title-lg"
                      style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
