import type { Translations } from '../i18n/translations';
import type { ImpactExplainer as ImpactExplainerData } from '../shared/schemas/plan.schema';

interface ImpactExplainerProps {
  impact: ImpactExplainerData;
  t: Translations;
}

/**
 * Renders transparent impact justification (Why, Estimated Effect, Confidence)
 * using Stitch contrast-safe surface and typography tokens.
 */
export function ImpactExplainer({ impact, t }: ImpactExplainerProps) {
  const confidenceText =
    impact.confidence === 'high'
      ? 'High confidence'
      : impact.confidence === 'medium'
        ? 'Medium confidence'
        : 'Low confidence';

  return (
    <div className="mt-gutter-sm space-y-1.5 border-t border-light-outline-variant dark:border-dark-outline-variant pt-gutter-sm text-label-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
      <dl className="space-y-1.5">
        <div>
          <dt className="inline font-label text-light-on-surface dark:text-dark-on-surface">
            {t.whyLabel}:{' '}
          </dt>
          <dd className="inline font-body">{impact.why}</dd>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <dt className="inline font-label text-light-good dark:text-dark-good">
            {t.effectLabel}:{' '}
          </dt>
          <dd className="inline font-label text-light-good dark:text-dark-good tabular-nums">
            {impact.estimatedEffect}
          </dd>
          <dt className="inline font-label text-light-on-surface dark:text-dark-on-surface">
            · {t.confidenceLabel}:{' '}
          </dt>
          <dd className="inline font-label">{confidenceText}</dd>
        </div>
      </dl>
      <p className="text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
        {impact.isEstimateDisclaimer}
      </p>
    </div>
  );
}
