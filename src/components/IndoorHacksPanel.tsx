import { useState } from 'react';
import type { Translations } from '../i18n/translations';
import type { IndoorHack } from '../shared/schemas/plan.schema';
import type { RecommendationDetailItem } from './RecommendationDetailView';

interface IndoorHacksPanelProps {
  hacks: IndoorHack[];
  loading: boolean;
  t: Translations;
  onSelectDetail: (item: RecommendationDetailItem) => void;
}

type CostFilter = 'all' | IndoorHack['costTier'];

const COST_BADGE: Record<IndoorHack['costTier'], { label: string; classes: string }> = {
  free: {
    label: 'Free',
    classes:
      'bg-light-good-container dark:bg-dark-good-container text-light-on-good-container dark:text-dark-on-good-container',
  },
  low_cost: {
    label: 'Low cost',
    classes:
      'bg-light-secondary-container dark:bg-dark-secondary-container text-light-on-secondary-container dark:text-dark-on-secondary-container',
  },
  moderate: {
    label: 'Moderate',
    classes:
      'bg-light-caution-container dark:bg-dark-caution-container text-light-on-caution-container dark:text-dark-on-caution-container',
  },
};

/**
 * Stitch Indoor Air Hacks screen with budget filter chips, honest note cards,
 * clickable Impact Detail navigation, and accessible empty state.
 */
export function IndoorHacksPanel({ hacks, loading, t, onSelectDetail }: IndoorHacksPanelProps) {
  const [filter, setFilter] = useState<CostFilter>('all');

  const sorted = [...hacks].sort((a, b) => a.rank - b.rank);
  const filtered = filter === 'all' ? sorted : sorted.filter((h) => h.costTier === filter);

  const chipClass = (active: boolean) =>
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
          {t.indoorHacksTitle}
        </h1>
        <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
          {t.indoorHacksSub}
        </p>
      </div>

      {/* Budget Filter Chips */}
      <div className="flex flex-wrap gap-gutter-sm" role="group" aria-label="Filter by budget">
        <button
          type="button"
          aria-pressed={filter === 'all'}
          onClick={() => setFilter('all')}
          className={chipClass(filter === 'all')}
        >
          All ({sorted.length})
        </button>
        <button
          type="button"
          aria-pressed={filter === 'free'}
          onClick={() => setFilter('free')}
          className={chipClass(filter === 'free')}
        >
          Free
        </button>
        <button
          type="button"
          aria-pressed={filter === 'low_cost'}
          onClick={() => setFilter('low_cost')}
          className={chipClass(filter === 'low_cost')}
        >
          Low cost
        </button>
        <button
          type="button"
          aria-pressed={filter === 'moderate'}
          onClick={() => setFilter('moderate')}
          className={chipClass(filter === 'moderate')}
        >
          Moderate
        </button>
      </div>

      {loading && hacks.length === 0 ? (
        <div
          aria-busy="true"
          aria-live="polite"
          className="p-gutter-xl rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant"
        >
          <p className="font-body text-body-md">
            Ranking indoor air quality hacks for your budget…
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <section className="flex flex-col items-center text-center gap-gutter-md p-gutter-xl rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant">
          <span
            className="material-symbols-outlined text-display-lg-mobile text-light-primary dark:text-dark-primary"
            aria-hidden="true"
          >
            filter_alt_off
          </span>
          <h2 className="font-title text-title-lg">No hacks match this filter</h2>
          <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant max-w-prose">
            Try viewing all budget levels to see free and low-cost ways to protect your home.
          </p>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className="min-h-12 px-gutter-xl rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-label text-label-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
          >
            Show all hacks
          </button>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-gutter-md" aria-label="Indoor air hacks list">
          {filtered.map((hack) => {
            const badge = COST_BADGE[hack.costTier];
            return (
              <button
                key={hack.rank}
                type="button"
                onClick={() =>
                  onSelectDetail({
                    id: `hack-${hack.rank}`,
                    badgeText: `Rank #${hack.rank} · ${badge.label}`,
                    badgeIcon: 'tips_and_updates',
                    title: hack.title,
                    description: hack.steps,
                    extraNote: `Honest evidence note: ${hack.honestyNote}`,
                    costLabel: badge.label,
                    timingOrDifficulty: `Rank #${hack.rank}`,
                    impact: hack.impact,
                    returnTab: 'hacks',
                  })
                }
                className="p-gutter-xl rounded-lg bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant flex flex-col gap-gutter-sm text-left hover:bg-light-surface-container-low dark:hover:bg-dark-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
              >
                <div className="w-full flex items-center justify-between gap-gutter-sm">
                  <span
                    className={`px-gutter-md py-gutter-xs rounded-full font-label text-label-sm ${badge.classes}`}
                  >
                    #{hack.rank} · {badge.label}
                  </span>
                  <span className="font-label text-label-sm text-light-good dark:text-dark-good tabular-nums">
                    {hack.impact.estimatedEffect}
                  </span>
                </div>
                <div className="w-full flex items-start justify-between gap-gutter-md">
                  <div className="flex flex-col gap-gutter-xs">
                    <h2 className="font-title text-title-lg">{hack.title}</h2>
                    <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
                      {hack.steps}
                    </p>
                    <p className="font-label text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                      Note: {hack.honestyNote}
                    </p>
                  </div>
                  <span
                    className="material-symbols-outlined text-light-primary dark:text-dark-primary shrink-0 mt-1"
                    aria-hidden="true"
                  >
                    chevron_right
                  </span>
                </div>
              </button>
            );
          })}
        </section>
      )}
    </main>
  );
}
