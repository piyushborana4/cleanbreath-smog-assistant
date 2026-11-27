import { useState } from 'react';
import type { User } from 'firebase/auth';
import type { Translations } from '../i18n/translations';
import type { SavedPlanRecord } from '../services/firebase';
import type { Language } from '../shared/schemas/profile.schema';

export type FontSizeOption = '16px' | '18px' | '20px';

interface SettingsViewProps {
  language: Language;
  theme: 'light' | 'dark';
  fontSize: FontSizeOption;
  reduceMotion: boolean;
  user: User | null;
  savedPlans: SavedPlanRecord[];
  cloudStatus: string | null;
  t: Translations;
  onSetLanguage: (lang: Language) => void;
  onSetFontSize: (size: FontSizeOption) => void;
  onToggleTheme: () => void;
  onToggleReduceMotion: (next: boolean) => void;
  onSignIn: () => void;
  onSignInGuest: () => void;
  onSignOut: () => void;
  onDeletePlan: (planId: string) => void;
  onClearData: () => void;
}

/**
 * Stitch Settings & Accessibility screen managing EN/HI language, text scaling,
 * dark/light theme, reduced motion, Firebase Google account & saved plans, and local data clear.
 */
export function SettingsView({
  language,
  theme,
  fontSize,
  reduceMotion,
  user,
  savedPlans,
  cloudStatus,
  t,
  onSetLanguage,
  onSetFontSize,
  onToggleTheme,
  onToggleReduceMotion,
  onSignIn,
  onSignInGuest,
  onSignOut,
  onDeletePlan,
  onClearData,
}: SettingsViewProps) {
  const [cleared, setCleared] = useState(false);

  const pillBtn = (active: boolean) =>
    active
      ? 'min-h-12 px-gutter-lg rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-label text-label-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary'
      : 'min-h-12 px-gutter-lg rounded-full bg-light-surface-container-low dark:bg-dark-surface-container-low text-light-on-surface dark:text-dark-on-surface border border-light-outline-variant dark:border-dark-outline-variant font-label text-label-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary';

  const handleClear = () => {
    onClearData();
    setCleared(true);
    window.setTimeout(() => setCleared(false), 3500);
  };

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex-1 px-page-margin py-gutter-lg pb-32 flex flex-col gap-gutter-xl focus:outline-none"
    >
      <div className="flex flex-col gap-gutter-xs">
        <h1 className="font-headline text-headline-lg-mobile md:text-headline-lg">
          {t.settingsTitle}
        </h1>
        <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
          {t.settingsSub}
        </p>
      </div>

      {/* Language (English / Hindi) */}
      <section
        aria-labelledby="lang-heading"
        className="p-gutter-xl rounded-lg bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant flex flex-col gap-gutter-md"
      >
        <h2 id="lang-heading" className="font-title text-title-md">
          {t.languageHeading}
        </h2>
        <div
          className="grid grid-cols-2 gap-gutter-sm"
          role="group"
          aria-label="Choose app language"
        >
          <button
            type="button"
            aria-pressed={language === 'en'}
            onClick={() => onSetLanguage('en')}
            className={pillBtn(language === 'en')}
          >
            English
          </button>
          <button
            type="button"
            aria-pressed={language === 'hi'}
            onClick={() => onSetLanguage('hi')}
            className={pillBtn(language === 'hi')}
          >
            हिन्दी (Hindi)
          </button>
        </div>
      </section>

      {/* Display & Comfort */}
      <section
        aria-labelledby="display-heading"
        className="p-gutter-xl rounded-lg bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant flex flex-col gap-gutter-lg"
      >
        <h2 id="display-heading" className="font-title text-title-md">
          {t.displayHeading}
        </h2>

        <div className="flex flex-col gap-gutter-sm">
          <span className="font-label text-label-md">{t.textSizeLabel}</span>
          <div className="grid grid-cols-3 gap-gutter-sm" role="group" aria-label="Text size">
            {(['16px', '18px', '20px'] as const).map((sz) => (
              <button
                key={sz}
                type="button"
                aria-pressed={fontSize === sz}
                onClick={() => onSetFontSize(sz)}
                className={pillBtn(fontSize === sz)}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-gutter-sm">
          <span className="font-label text-label-md">Color theme</span>
          <div className="grid grid-cols-2 gap-gutter-sm" role="group" aria-label="Color theme">
            <button
              type="button"
              aria-pressed={theme === 'light'}
              onClick={() => theme !== 'light' && onToggleTheme()}
              className={pillBtn(theme === 'light')}
            >
              Light
            </button>
            <button
              type="button"
              aria-pressed={theme === 'dark'}
              onClick={() => theme !== 'dark' && onToggleTheme()}
              className={pillBtn(theme === 'dark')}
            >
              Dark
            </button>
          </div>
        </div>

        <label className="min-h-12 flex items-center justify-between gap-gutter-md cursor-pointer">
          <div>
            <p className="font-title text-title-md">{t.reduceMotionTitle}</p>
            <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
              {t.reduceMotionSub}
            </p>
          </div>
          <input
            type="checkbox"
            checked={reduceMotion}
            onChange={(e) => onToggleReduceMotion(e.target.checked)}
            className="w-6 h-6 rounded-sm text-light-primary focus:ring-light-primary"
          />
        </label>
      </section>

      {/* Account & Saved Plans (Firebase) */}
      <section
        aria-labelledby="account-heading"
        className="p-gutter-xl rounded-lg bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant flex flex-col gap-gutter-md"
      >
        <div className="flex flex-wrap items-center justify-between gap-gutter-md">
          <div>
            <h2 id="account-heading" className="font-title text-title-md">
              Account &amp; Saved Plans
            </h2>
            <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
              {user
                ? user.isAnonymous
                  ? `${t.guestSessionLabel} — plans synced to Firestore.`
                  : `Signed in as ${user.displayName || user.email || 'CleanBreath Member'}`
                : 'Continue as a guest or sign in with Google to save daily plans and checklists to Firestore.'}
            </p>
          </div>
          {user ? (
            <div className="flex flex-wrap items-center gap-gutter-sm">
              {user.isAnonymous && (
                <button
                  type="button"
                  onClick={onSignIn}
                  className="min-h-12 px-gutter-lg rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-label text-label-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
                >
                  {t.switchGoogle}
                </button>
              )}
              <button
                type="button"
                onClick={onSignOut}
                className="min-h-12 px-gutter-lg rounded-full bg-light-secondary-container dark:bg-dark-secondary-container text-light-on-secondary-container dark:text-dark-on-secondary-container font-label text-label-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
              >
                {t.signOut}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-gutter-sm">
              <button
                type="button"
                onClick={onSignInGuest}
                className="min-h-12 px-gutter-lg rounded-full bg-light-secondary-container dark:bg-dark-secondary-container text-light-on-secondary-container dark:text-dark-on-secondary-container font-label text-label-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
              >
                {t.signInGuest}
              </button>
              <button
                type="button"
                onClick={onSignIn}
                className="min-h-12 px-gutter-lg rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-label text-label-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
              >
                {t.signInGoogle}
              </button>
            </div>
          )}
        </div>

        {cloudStatus && cloudStatus !== 'saved' && (
          <p
            role="status"
            aria-live="polite"
            className="font-label text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
          >
            {cloudStatus}
          </p>
        )}

        {user && savedPlans.length > 0 && (
          <ul className="divide-y divide-light-outline-variant dark:divide-dark-outline-variant">
            {savedPlans.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-gutter-sm py-gutter-md"
              >
                <div>
                  <p className="font-title text-title-md tabular-nums">
                    {item.locationLabel} · AQI {item.aqi}
                  </p>
                  <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    {item.personalizationSummary}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDeletePlan(item.id)}
                  aria-label={`Remove saved plan for ${item.locationLabel}`}
                  className="inline-flex items-center gap-1 min-h-12 px-gutter-md rounded-full border border-light-outline-variant dark:border-dark-outline-variant font-label text-label-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
                >
                  <span className="material-symbols-outlined text-title-md" aria-hidden="true">
                    delete
                  </span>
                  <span>Remove</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Privacy & Data */}
      <section
        aria-labelledby="privacy-heading"
        className="p-gutter-xl rounded-lg bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant flex flex-col gap-gutter-md"
      >
        <h2 id="privacy-heading" className="font-title text-title-md">
          {t.privacyHeading}
        </h2>
        <div className="flex items-start gap-gutter-sm">
          <span
            className="material-symbols-outlined text-light-good dark:text-dark-good shrink-0"
            aria-hidden="true"
          >
            shield_lock
          </span>
          <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
            {t.privacyBody}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="self-start min-h-12 px-gutter-xl rounded-full bg-light-error-container dark:bg-dark-error-container text-light-on-error-container dark:text-dark-on-error-container font-label text-label-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-error dark:focus-visible:ring-dark-error"
        >
          {t.clearDataBtn}
        </button>
        {cleared && (
          <p role="status" className="font-label text-label-md text-light-good dark:text-dark-good">
            {t.clearedNotice}
          </p>
        )}
      </section>
    </main>
  );
}
