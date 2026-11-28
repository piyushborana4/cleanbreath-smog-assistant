import type { Translations } from '../i18n/translations';
import type { ImpactExplainer } from '../shared/schemas/plan.schema';

export interface RecommendationDetailItem {
  id: string;
  badgeText: string;
  badgeIcon: string;
  title: string;
  description: string;
  extraNote?: string;
  costLabel?: string;
  timingOrDifficulty?: string;
  impact: ImpactExplainer;
  returnTab: 'dashboard' | 'hacks';
}

interface RecommendationDetailViewProps {
  item: RecommendationDetailItem;
  isDone: boolean;
  theme: 'light' | 'dark';
  t: Translations;
  onToggleDone: (id: string) => void;
  onBack: () => void;
  onToggleTheme: () => void;
}

function parsePercentEstimate(effect: string): number {
  const match = effect.match(/(\d{1,3})\s*%/);
  if (!match) return 30;
  return Math.max(10, Math.min(95, Number(match[1])));
}

/**
 * Dedicated Stitch Recommendation Detail screen displaying the full Impact Explainer
 * (Why it helps, Estimated impact meter, Confidence, Disclaimer, and Severe-symptom notice).
 */
export function RecommendationDetailView({
  item,
  isDone,
  theme,
  t,
  onToggleDone,
  onBack,
  onToggleTheme,
}: RecommendationDetailViewProps) {
  const confidenceText =
    item.impact.confidence === 'high'
      ? 'High confidence'
      : item.impact.confidence === 'medium'
        ? 'Medium confidence'
        : 'Low confidence';

  const progressPct = parsePercentEstimate(item.impact.estimatedEffect);

  return (
    <div className="min-h-screen flex flex-col max-w-3xl mx-auto">
      <header className="sticky top-0 z-20 bg-light-surface dark:bg-dark-surface border-b border-light-outline-variant dark:border-dark-outline-variant px-page-margin py-gutter-md flex items-center justify-between gap-gutter-md">
        <div className="flex items-center gap-gutter-sm">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-light-surface-container-low dark:bg-dark-surface-container-low text-light-on-surface dark:text-dark-on-surface border border-light-outline-variant dark:border-dark-outline-variant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
          >
            <span className="material-symbols-outlined text-title-lg" aria-hidden="true">
              arrow_back
            </span>
          </button>
          <p className="font-headline text-title-lg text-light-on-surface dark:text-dark-on-surface">
            Recommendation detail
          </p>
        </div>
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
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 px-page-margin py-gutter-lg pb-32 flex flex-col gap-gutter-xl focus:outline-none"
      >
        {/* Action Hero */}
        <section className="p-gutter-xl rounded-lg bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant flex flex-col gap-gutter-md">
          <div className="flex items-center gap-gutter-sm">
            <span className="inline-flex items-center gap-gutter-xs px-gutter-md py-gutter-xs rounded-full bg-light-secondary-container dark:bg-dark-secondary-container text-light-on-secondary-container dark:text-dark-on-secondary-container font-label text-label-sm">
              <span className="material-symbols-outlined text-label-md" aria-hidden="true">
                {item.badgeIcon}
              </span>
              <span>{item.badgeText}</span>
            </span>
          </div>

          <h1
            tabIndex={-1}
            className="font-headline text-headline-lg-mobile md:text-headline-lg text-balance focus:outline-none"
          >
            {item.title}
          </h1>
          <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant text-pretty">
            {item.description}
          </p>

          {item.extraNote && (
            <p className="font-body text-body-md text-light-on-surface dark:text-dark-on-surface bg-light-surface-container-low dark:bg-dark-surface-container p-gutter-md rounded-md border border-light-outline-variant dark:border-dark-outline-variant">
              {item.extraNote}
            </p>
          )}

          <button
            type="button"
            aria-pressed={isDone}
            onClick={() => onToggleDone(item.id)}
            className={`inline-flex items-center justify-center gap-gutter-sm min-h-12 px-gutter-xl rounded-full font-label text-label-lg self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary ${
              isDone
                ? 'bg-light-good-container dark:bg-dark-good-container text-light-on-good-container dark:text-dark-on-good-container border border-light-good dark:border-dark-good'
                : 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary'
            }`}
          >
            <span className="material-symbols-outlined text-title-md" aria-hidden="true">
              {isDone ? 'task_alt' : 'check_circle'}
            </span>
            <span>{isDone ? 'Done for today' : 'Mark as done today'}</span>
          </button>
        </section>

        {/* Impact Meter */}
        <section
          aria-labelledby="impact-heading"
          className="p-gutter-xl rounded-lg bg-light-good-container dark:bg-dark-good-container text-light-on-good-container dark:text-dark-on-good-container border border-light-outline-variant dark:border-dark-outline-variant flex flex-col gap-gutter-md"
        >
          <div className="flex flex-wrap items-center justify-between gap-gutter-md">
            <h2 id="impact-heading" className="font-headline text-title-md">
              {t.effectLabel}
            </h2>
            <span className="px-gutter-md py-gutter-xs rounded-full bg-light-surface-container-lowest dark:bg-dark-surface-container-low text-light-on-surface dark:text-dark-on-surface font-label text-label-md">
              {confidenceText}
            </span>
          </div>

          <p className="font-headline text-title-lg tabular-nums">{item.impact.estimatedEffect}</p>

          <div
            className="w-full h-3 rounded-full bg-light-surface-container-lowest dark:bg-dark-surface-container-low overflow-hidden"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Estimated impact magnitude: ${item.impact.estimatedEffect}`}
          >
            <div
              className="h-full rounded-full bg-light-good dark:bg-dark-good"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <p className="font-label text-label-md">{item.impact.isEstimateDisclaimer}</p>
        </section>

        {/* Why It Helps */}
        <section aria-labelledby="why-heading" className="flex flex-col gap-gutter-sm">
          <h2 id="why-heading" className="font-headline text-title-md">
            {t.whyLabel}
          </h2>
          <div className="p-gutter-lg rounded-lg bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant">
            <p className="font-body text-body-md text-pretty">{item.impact.why}</p>
          </div>
        </section>

        {/* Attributes Grid */}
        <section
          aria-label="Action details"
          className="grid grid-cols-1 sm:grid-cols-3 gap-gutter-md"
        >
          <div className="p-gutter-lg rounded-md bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant flex items-center gap-gutter-md">
            <span
              className="material-symbols-outlined text-title-lg text-light-primary dark:text-dark-primary"
              aria-hidden="true"
            >
              verified
            </span>
            <div>
              <p className="font-label text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                {t.confidenceLabel}
              </p>
              <p className="font-title text-title-md capitalize">{item.impact.confidence}</p>
            </div>
          </div>

          <div className="p-gutter-lg rounded-md bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant flex items-center gap-gutter-md">
            <span
              className="material-symbols-outlined text-title-lg text-light-primary dark:text-dark-primary"
              aria-hidden="true"
            >
              payments
            </span>
            <div>
              <p className="font-label text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Cost / Type
              </p>
              <p className="font-title text-title-md">{item.costLabel || 'Daily habit'}</p>
            </div>
          </div>

          <div className="p-gutter-lg rounded-md bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant flex items-center gap-gutter-md">
            <span
              className="material-symbols-outlined text-title-lg text-light-primary dark:text-dark-primary"
              aria-hidden="true"
            >
              schedule
            </span>
            <div>
              <p className="font-label text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Timing
              </p>
              <p className="font-title text-title-md">{item.timingOrDifficulty || 'Today'}</p>
            </div>
          </div>
        </section>

        {/* Escalation reminder */}
        <section
          aria-labelledby="detail-escalation-heading"
          className="p-gutter-lg rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant flex items-start gap-gutter-md"
        >
          <span
            className="material-symbols-outlined text-title-lg text-light-error dark:text-dark-error shrink-0"
            aria-hidden="true"
          >
            medical_services
          </span>
          <div className="flex flex-col gap-gutter-xs">
            <h2 id="detail-escalation-heading" className="font-title text-title-md">
              {t.escalationTitle}
            </h2>
            <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
              {t.escalationBody}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
