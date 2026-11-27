import { useState } from 'react';
import type { User } from 'firebase/auth';
import type { Translations } from '../i18n/translations';
import type {
  CommunityChecklist as CommunityChecklistData,
  CommunitySetting,
} from '../shared/schemas/community.schema';
import { ImpactExplainer } from './ImpactExplainer';

interface CommunityChecklistProps {
  checklist: CommunityChecklistData | null;
  setting: CommunitySetting;
  loading: boolean;
  t: Translations;
  user: User | null;
  onSwitchSetting: (setting: CommunitySetting) => void;
  onPublishCloud: () => Promise<string | null>;
  onSignInGuest: () => void;
}

/**
 * Stitch Community Checklist screen for Apartment Society / RWA and School Campus
 * winter smog coordination with shareable summary and interactive progress tracking.
 */
export function CommunityChecklist({
  checklist,
  setting,
  loading,
  t,
  user,
  onSwitchSetting,
  onPublishCloud,
  onSignInGuest,
}: CommunityChecklistProps) {
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [publishedId, setPublishedId] = useState<string | null>(null);

  const items = checklist?.items ?? [];
  const activeCount = items.filter((item) => checkedIds[item.id]).length;

  const handleToggle = (id: string) => {
    setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = async () => {
    if (!checklist) return;
    try {
      await navigator.clipboard.writeText(checklist.shareableText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 3000);
    } catch {
      // Ignore if clipboard permission is blocked
    }
  };

  const handlePublish = async () => {
    const id = await onPublishCloud();
    if (id) setPublishedId(id);
  };

  const settingPill = (active: boolean) =>
    active
      ? 'min-h-12 px-gutter-lg rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-label text-label-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary'
      : 'min-h-12 px-gutter-lg rounded-full bg-light-surface-container-low dark:bg-dark-surface-container-low text-light-on-surface dark:text-dark-on-surface border border-light-outline-variant dark:border-dark-outline-variant font-label text-label-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary';

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex-1 px-page-margin py-gutter-lg pb-32 flex flex-col gap-gutter-lg focus:outline-none"
    >
      <div className="flex flex-col gap-gutter-xs">
        <h1 className="font-headline text-headline-lg-mobile md:text-headline-lg">
          {t.communityTitle}
        </h1>
        <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
          {t.communitySub}
        </p>
      </div>

      {/* Society vs School Selector */}
      <div
        className="flex flex-wrap gap-gutter-sm"
        role="group"
        aria-label="Community checklist setting"
      >
        <button
          type="button"
          aria-pressed={setting === 'apartment_society'}
          onClick={() => onSwitchSetting('apartment_society')}
          className={settingPill(setting === 'apartment_society')}
        >
          {t.societyOption}
        </button>
        <button
          type="button"
          aria-pressed={setting === 'school'}
          onClick={() => onSwitchSetting('school')}
          className={settingPill(setting === 'school')}
        >
          {t.schoolOption}
        </button>
      </div>

      {/* Progress Summary Card */}
      {checklist && (
        <section className="p-gutter-lg rounded-lg bg-light-secondary-container dark:bg-dark-secondary-container text-light-on-secondary-container dark:text-dark-on-secondary-container flex flex-wrap items-center justify-between gap-gutter-md">
          <div>
            <p className="font-headline text-title-md tabular-nums">
              {activeCount} of {items.length} actions active
            </p>
            <p className="font-label text-label-md">
              {checklist.locality} · AQI {checklist.aqi}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-gutter-sm">
            {user ? (
              <button
                type="button"
                onClick={() => void handlePublish()}
                className="inline-flex items-center justify-center gap-gutter-xs min-h-12 px-gutter-lg rounded-full bg-light-surface-container-lowest dark:bg-dark-surface-container-low text-light-on-surface dark:text-dark-on-surface border border-light-outline-variant dark:border-dark-outline-variant font-label text-label-md shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
              >
                <span className="material-symbols-outlined text-title-md" aria-hidden="true">
                  cloud_upload
                </span>
                <span>{publishedId ? 'Saved' : 'Save'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onSignInGuest}
                className="inline-flex items-center justify-center gap-gutter-xs min-h-12 px-gutter-lg rounded-full bg-light-surface-container-lowest dark:bg-dark-surface-container-low text-light-on-surface dark:text-dark-on-surface border border-light-outline-variant dark:border-dark-outline-variant font-label text-label-md shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
              >
                <span className="material-symbols-outlined text-title-md" aria-hidden="true">
                  person_outline
                </span>
                <span>{t.signInGuest}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex items-center justify-center gap-gutter-xs min-h-12 px-gutter-lg rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-label text-label-md shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
            >
              <span className="material-symbols-outlined text-title-md" aria-hidden="true">
                share
              </span>
              <span>{t.shareBtn}</span>
            </button>
          </div>
        </section>
      )}

      {copied && (
        <div
          role="status"
          className="p-gutter-md rounded-md bg-light-good-container dark:bg-dark-good-container text-light-on-good-container dark:text-dark-on-good-container font-label text-label-md"
        >
          {t.copiedNotice}
        </div>
      )}

      {loading && (
        <p
          aria-live="polite"
          className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant"
        >
          Updating community checklist…
        </p>
      )}

      {checklist && (
        <section aria-label="Neighbourhood checklist items" className="flex flex-col gap-gutter-sm">
          {items.map((item) => {
            const checked = Boolean(checkedIds[item.id]);
            return (
              <label
                key={item.id}
                className="min-h-12 p-gutter-lg rounded-lg bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant flex items-start gap-gutter-md cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleToggle(item.id)}
                  className="mt-1 w-6 h-6 rounded-sm text-light-primary focus:ring-light-primary shrink-0"
                />
                <div className="flex-1">
                  <p className="font-label text-label-sm text-light-primary dark:text-dark-primary">
                    {item.audience} · {item.frequency}
                  </p>
                  <p className="font-title text-title-md mt-0.5">{item.action}</p>
                  <ImpactExplainer impact={item.impact} t={t} />
                </div>
              </label>
            );
          })}
        </section>
      )}
    </main>
  );
}
