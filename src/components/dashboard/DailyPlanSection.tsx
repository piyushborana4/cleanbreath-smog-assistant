import type { User } from 'firebase/auth';
import type { Translations } from '../../i18n/translations';
import type { PersonalizedDailyPlan } from '../../shared/schemas/plan.schema';
import { ImpactExplainer } from '../ImpactExplainer';
import type { RecommendationDetailItem } from '../RecommendationDetailView';
import { getPeriodMeta } from './dashboardMeta';

interface DailyPlanSectionProps {
  plan: PersonalizedDailyPlan;
  user: User | null;
  cloudStatus: string | null;
  completedIds: Record<string, boolean>;
  t: Translations;
  onSelectDetail: (item: RecommendationDetailItem) => void;
  onSavePlan: () => void;
  onSignIn: () => void;
  onSignInGuest: () => void;
}

/**
 * Renders personalized routines (morning, afternoon, evening), outdoor window,
 * mask guidance, cooking/ventilation tips, and visible Impact Explainer on the primary screen.
 */
export function DailyPlanSection({
  plan,
  user,
  cloudStatus,
  completedIds,
  t,
  onSelectDetail,
  onSavePlan,
  onSignIn,
  onSignInGuest,
}: DailyPlanSectionProps) {
  return (
    <section aria-labelledby="plan-heading" className="flex flex-col gap-gutter-md">
      <div className="flex flex-wrap items-center justify-between gap-gutter-sm">
        <h2 id="plan-heading" className="font-headline text-title-md">
          {t.todayPlanTitle}
        </h2>
        {user ? (
          <button
            type="button"
            onClick={onSavePlan}
            className="inline-flex items-center gap-gutter-xs min-h-12 px-gutter-md rounded-full bg-light-secondary-container dark:bg-dark-secondary-container text-light-on-secondary-container dark:text-dark-on-secondary-container font-label text-label-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
          >
            <span className="material-symbols-outlined text-label-md" aria-hidden="true">
              bookmark_add
            </span>
            <span>{cloudStatus === 'saved' ? t.savedSuccess : t.savePlanCloud}</span>
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-gutter-xs">
            <button
              type="button"
              onClick={onSignInGuest}
              className="inline-flex items-center gap-gutter-xs min-h-12 px-gutter-md rounded-full bg-light-secondary-container dark:bg-dark-secondary-container text-light-on-secondary-container dark:text-dark-on-secondary-container font-label text-label-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
            >
              <span className="material-symbols-outlined text-label-md" aria-hidden="true">
                person_outline
              </span>
              <span>{t.signInGuest}</span>
            </button>
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center gap-gutter-xs min-h-12 px-gutter-md rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-label text-label-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
            >
              <span className="material-symbols-outlined text-label-md" aria-hidden="true">
                login
              </span>
              <span>{t.signInGoogle}</span>
            </button>
          </div>
        )}
      </div>

      {cloudStatus && cloudStatus !== 'saved' && (
        <p
          role="status"
          className="font-label text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
        >
          {cloudStatus}
        </p>
      )}

      <div className="grid grid-cols-1 gap-gutter-md">
        {plan.routines.map((routine, index) => {
          const meta = getPeriodMeta(routine.period);
          const itemId = `routine-${routine.period}`;
          const isDone = Boolean(completedIds[itemId]);

          return (
            <button
              key={routine.period}
              type="button"
              onClick={() =>
                onSelectDetail({
                  id: itemId,
                  badgeText: `${meta.label} routine`,
                  badgeIcon: meta.icon,
                  title: routine.title,
                  description: routine.action,
                  extraNote: `Commute guidance: ${routine.commuteGuidance}`,
                  costLabel: 'Daily routine',
                  timingOrDifficulty: meta.label,
                  impact: routine.impact,
                  returnTab: 'dashboard',
                })
              }
              className="p-gutter-lg rounded-lg bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant flex items-start justify-between gap-gutter-md text-left hover:bg-light-surface-container-low dark:hover:bg-dark-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
            >
              <div className="flex flex-col gap-gutter-xs flex-1">
                <div className="flex flex-wrap items-center gap-gutter-sm">
                  <span className={`material-symbols-outlined ${meta.color}`} aria-hidden="true">
                    {meta.icon}
                  </span>
                  <span className={`font-label text-label-md ${meta.color}`}>{meta.label}</span>
                  {isDone && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-light-good-container dark:bg-dark-good-container text-light-on-good-container dark:text-dark-on-good-container font-label text-label-sm">
                      Done
                    </span>
                  )}
                </div>
                <h3 className="font-title text-title-lg">{routine.title}</h3>
                <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  {routine.action}
                </p>
                {index === 0 ? (
                  <ImpactExplainer impact={routine.impact} t={t} />
                ) : (
                  <p className="font-label text-label-sm text-light-good dark:text-dark-good tabular-nums">
                    {routine.impact.estimatedEffect} · {routine.impact.confidence} confidence
                  </p>
                )}
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

        <GuidanceCards plan={plan} onSelectDetail={onSelectDetail} />
      </div>
    </section>
  );
}

interface GuidanceCardsProps {
  plan: PersonalizedDailyPlan;
  onSelectDetail: (item: RecommendationDetailItem) => void;
}

function GuidanceCards({ plan, onSelectDetail }: GuidanceCardsProps) {
  const cards: Array<{
    key: string;
    icon: string;
    iconColor: string;
    badge: string;
    title: string;
    body: string;
    footer: string;
    detail: RecommendationDetailItem;
  }> = [
    {
      key: 'outdoor',
      icon: 'schedule',
      iconColor: 'text-light-primary dark:text-dark-primary',
      badge: `Outdoor window · ${plan.outdoorWindow.recommendedWindow}`,
      title: `Avoid ${plan.outdoorWindow.avoidWindow}`,
      body: plan.outdoorWindow.guidance,
      footer: `${plan.outdoorWindow.impact.estimatedEffect} · ${plan.outdoorWindow.impact.confidence} confidence`,
      detail: {
        id: 'guide-outdoor-window',
        badgeText: 'Outdoor activity window',
        badgeIcon: 'schedule',
        title: `Best window: ${plan.outdoorWindow.recommendedWindow}`,
        description: plan.outdoorWindow.guidance,
        extraNote: `Peak pollution to avoid: ${plan.outdoorWindow.avoidWindow}`,
        costLabel: 'Zero cost',
        timingOrDifficulty: plan.outdoorWindow.recommendedWindow,
        impact: plan.outdoorWindow.impact,
        returnTab: 'dashboard',
      },
    },
    {
      key: 'mask',
      icon: 'masks',
      iconColor: 'text-light-caution dark:text-dark-caution',
      badge: 'Mask guidance',
      title: plan.maskGuidance.recommendedType,
      body: plan.maskGuidance.fitNote,
      footer: `${plan.maskGuidance.impact.estimatedEffect} · ${plan.maskGuidance.impact.confidence} confidence`,
      detail: {
        id: 'guide-mask',
        badgeText: 'Mask guidance',
        badgeIcon: 'masks',
        title: plan.maskGuidance.recommendedType,
        description: plan.maskGuidance.fitNote,
        extraNote: `Priority: ${plan.maskGuidance.whoNeedsItMost}`,
        costLabel: 'Personal gear',
        timingOrDifficulty: 'Outdoors',
        impact: plan.maskGuidance.impact,
        returnTab: 'dashboard',
      },
    },
    {
      key: 'cooking',
      icon: 'kitchen',
      iconColor: 'text-light-good dark:text-dark-good',
      badge: 'Cooking & ventilation',
      title: plan.cookingAndVentilation.bestVentilationTime,
      body: plan.cookingAndVentilation.cookingTips,
      footer: `${plan.cookingAndVentilation.impact.estimatedEffect} · ${plan.cookingAndVentilation.impact.confidence} confidence`,
      detail: {
        id: 'guide-cooking-ventilation',
        badgeText: 'Cooking & ventilation',
        badgeIcon: 'kitchen',
        title: `Ventilate: ${plan.cookingAndVentilation.bestVentilationTime}`,
        description: plan.cookingAndVentilation.cookingTips,
        costLabel: 'Zero cost',
        timingOrDifficulty: plan.cookingAndVentilation.bestVentilationTime,
        impact: plan.cookingAndVentilation.impact,
        returnTab: 'dashboard',
      },
    },
  ];

  return (
    <>
      {cards.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => onSelectDetail(c.detail)}
          className="p-gutter-lg rounded-lg bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant flex items-start justify-between gap-gutter-md text-left hover:bg-light-surface-container-low dark:hover:bg-dark-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
        >
          <div className="flex flex-col gap-gutter-xs">
            <div className="flex items-center gap-gutter-sm">
              <span className={`material-symbols-outlined ${c.iconColor}`} aria-hidden="true">
                {c.icon}
              </span>
              <span className={`font-label text-label-md ${c.iconColor}`}>{c.badge}</span>
            </div>
            <h3 className="font-title text-title-lg">{c.title}</h3>
            <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
              {c.body}
            </p>
            <p className="font-label text-label-sm text-light-good dark:text-dark-good tabular-nums">
              {c.footer}
            </p>
          </div>
          <span
            className="material-symbols-outlined text-light-primary dark:text-dark-primary shrink-0 mt-gutter-xs"
            aria-hidden="true"
          >
            chevron_right
          </span>
        </button>
      ))}
    </>
  );
}
