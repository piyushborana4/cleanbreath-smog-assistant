import type { Translations } from '../../i18n/translations';
import type { SustainableAlternative } from '../../shared/schemas/plan.schema';
import type { RecommendationDetailItem } from '../RecommendationDetailView';
import { getAlternativeIcon } from './dashboardMeta';

interface SustainableAlternativesSectionProps {
  alternatives: SustainableAlternative[];
  t: Translations;
  onSelectDetail: (item: RecommendationDetailItem) => void;
}

/**
 * Renders low-emission sustainable alternatives (transit, waste, clean cooking, community).
 */
export function SustainableAlternativesSection({
  alternatives,
  t,
  onSelectDetail,
}: SustainableAlternativesSectionProps) {
  if (alternatives.length === 0) return null;

  return (
    <section aria-labelledby="sustainable-heading" className="flex flex-col gap-gutter-md">
      <h2 id="sustainable-heading" className="font-headline text-title-md">
        {t.sustainableTitle}
      </h2>
      <div className="grid grid-cols-1 gap-gutter-md">
        {alternatives.map((alt, idx) => {
          const itemId = `alt-${idx}-${alt.category}`;
          return (
            <button
              key={itemId}
              type="button"
              onClick={() =>
                onSelectDetail({
                  id: itemId,
                  badgeText: `Low-emission · ${alt.category.replace('_', ' ')}`,
                  badgeIcon: getAlternativeIcon(alt.category),
                  title: alt.title,
                  description: alt.action,
                  costLabel: 'Low-emission swap',
                  timingOrDifficulty: 'Daily choice',
                  impact: alt.impact,
                  returnTab: 'dashboard',
                })
              }
              className="p-gutter-lg rounded-lg bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant flex items-start justify-between gap-gutter-md text-left hover:bg-light-surface-container-low dark:hover:bg-dark-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
            >
              <div className="flex flex-col gap-gutter-xs">
                <div className="flex items-center gap-gutter-sm">
                  <span
                    className="material-symbols-outlined text-light-primary dark:text-dark-primary"
                    aria-hidden="true"
                  >
                    {getAlternativeIcon(alt.category)}
                  </span>
                  <span className="font-label text-label-sm uppercase text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    {alt.category.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="font-title text-title-lg">{alt.title}</h3>
                <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  {alt.action}
                </p>
                <p className="font-label text-label-sm text-light-good dark:text-dark-good tabular-nums">
                  {alt.impact.estimatedEffect} · {alt.impact.confidence} confidence
                </p>
              </div>
              <span
                className="material-symbols-outlined text-light-primary dark:text-dark-primary shrink-0 mt-gutter-xs"
                aria-hidden="true"
              >
                chevron_right
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
