import { useEffect, useMemo, useRef } from 'react';
import { arc as d3Arc, interpolateNumber, scaleLinear, select } from 'd3';
import type { AqiCategory } from '../shared/schemas/aqi.schema';
import type { Language } from '../shared/schemas/profile.schema';

export interface AqiGaugeProps {
  aqi: number;
  category: AqiCategory;
  categoryLabel: string;
  language?: Language;
}

interface GaugeBand {
  category: AqiCategory;
  min: number;
  max: number;
  rangeText: string;
  shortEn: string;
  shortHi: string;
  colorVar: string;
}

const GAUGE_BANDS: readonly GaugeBand[] = [
  {
    category: 'good',
    min: 0,
    max: 50,
    rangeText: '0–50',
    shortEn: 'Good',
    shortHi: 'अच्छा',
    colorVar: 'var(--gauge-good)',
  },
  {
    category: 'moderate',
    min: 50,
    max: 100,
    rangeText: '51–100',
    shortEn: 'Mod',
    shortHi: 'सामान्य',
    colorVar: 'var(--gauge-moderate)',
  },
  {
    category: 'sensitive',
    min: 100,
    max: 150,
    rangeText: '101–150',
    shortEn: 'Sens',
    shortHi: 'संवेदनशील',
    colorVar: 'var(--gauge-sensitive)',
  },
  {
    category: 'unhealthy',
    min: 150,
    max: 200,
    rangeText: '151–200',
    shortEn: 'Poor',
    shortHi: 'अस्वस्थ',
    colorVar: 'var(--gauge-unhealthy)',
  },
  {
    category: 'very_unhealthy',
    min: 200,
    max: 300,
    rangeText: '201–300',
    shortEn: 'V. Poor',
    shortHi: 'बेहद अस्वस्थ',
    colorVar: 'var(--gauge-very-unhealthy)',
  },
  {
    category: 'severe',
    min: 300,
    max: 500,
    rangeText: '301–500',
    shortEn: 'Severe',
    shortHi: 'गंभीर',
    colorVar: 'var(--gauge-severe)',
  },
] as const;

const GAUGE_TICKS = [0, 50, 100, 150, 200, 300, 500] as const;

const VIEW_WIDTH = 280;
const VIEW_HEIGHT = 174;
const CENTER_X = VIEW_WIDTH / 2;
const CENTER_Y = 140;
const BASE_INNER_RADIUS = 76;
const BASE_OUTER_RADIUS = 98;
const ACTIVE_INNER_RADIUS = 71;
const ACTIVE_OUTER_RADIUS = 104;
const NEEDLE_LENGTH = 66;

// Piecewise D3 linear scale mapping each EPA severity bracket to an equal 30-degree arc sector.
const angleScale = scaleLinear<number, number>()
  .domain([0, 50, 100, 150, 200, 300, 500])
  .range([-Math.PI / 2, -Math.PI / 3, -Math.PI / 6, 0, Math.PI / 6, Math.PI / 3, Math.PI / 2])
  .clamp(true);

function isReducedMotionPreferred(): boolean {
  if (
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('reduce-motion')
  ) {
    return true;
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
}

/**
 * Semi-circular D3.js AQI gauge showing color-coded US-EPA severity bands,
 * active bracket highlight, animated needle indicator, and tabular readout.
 */
export function AqiGauge({ aqi, category, categoryLabel, language = 'en' }: AqiGaugeProps) {
  const clampedAqi = Math.max(0, Math.min(500, Math.round(aqi)));
  const targetAngleDeg = (angleScale(clampedAqi) * 180) / Math.PI;

  const needleRef = useRef<SVGGElement | null>(null);
  const prevAngleDegRef = useRef<number>(targetAngleDeg);

  const segments = useMemo(() => {
    const baseArcGen = d3Arc<unknown>()
      .innerRadius(BASE_INNER_RADIUS)
      .outerRadius(BASE_OUTER_RADIUS)
      .padAngle(0.028)
      .cornerRadius(3);

    const activeArcGen = d3Arc<unknown>()
      .innerRadius(ACTIVE_INNER_RADIUS)
      .outerRadius(ACTIVE_OUTER_RADIUS)
      .padAngle(0.028)
      .cornerRadius(4);

    return GAUGE_BANDS.map((band) => {
      const startAngle = angleScale(band.min);
      const endAngle = angleScale(band.max);
      const isActive = band.category === category;
      const pathData =
        (isActive
          ? activeArcGen({ startAngle, endAngle } as never)
          : baseArcGen({ startAngle, endAngle } as never)) ?? '';

      return {
        ...band,
        isActive,
        pathData,
      };
    });
  }, [category]);

  const tickPositions = useMemo(() => {
    const labelRadius = ACTIVE_OUTER_RADIUS + 14;
    const tickInner = BASE_INNER_RADIUS - 4;
    const tickOuter = BASE_INNER_RADIUS - 1;

    return GAUGE_TICKS.map((value) => {
      const rad = angleScale(value);
      const sin = Math.sin(rad);
      const cos = Math.cos(rad);
      return {
        value,
        x1: sin * tickInner,
        y1: -cos * tickInner,
        x2: sin * tickOuter,
        y2: -cos * tickOuter,
        labelX: sin * labelRadius,
        labelY: -cos * labelRadius + 3,
      };
    });
  }, []);

  useEffect(() => {
    const el = needleRef.current;
    if (!el) return;

    const startDeg = prevAngleDegRef.current;
    prevAngleDegRef.current = targetAngleDeg;

    if (isReducedMotionPreferred() || startDeg === targetAngleDeg) {
      select(el).attr('transform', `rotate(${targetAngleDeg.toFixed(2)})`);
      return;
    }

    const selection = select(el);
    selection
      .interrupt()
      .transition()
      .duration(420)
      .attrTween('transform', () => {
        const interp = interpolateNumber(startDeg, targetAngleDeg);
        return (t) => `rotate(${interp(t).toFixed(2)})`;
      });
  }, [targetAngleDeg]);

  const activeBand = GAUGE_BANDS.find((b) => b.category === category) ?? GAUGE_BANDS[0];
  const ariaLabel =
    language === 'hi'
      ? `वायु गुणवत्ता सूचकांक गेज: ${clampedAqi} (0 से 500 स्केल पर), श्रेणी ${categoryLabel}`
      : `Air Quality Index gauge: ${clampedAqi} on 0 to 500 scale, ${categoryLabel}`;

  return (
    <figure className="flex flex-col items-center gap-gutter-xs shrink-0 m-0">
      <svg
        role="img"
        aria-label={ariaLabel}
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="w-[248px] sm:w-[272px] h-auto overflow-visible"
      >
        <g transform={`translate(${CENTER_X}, ${CENTER_Y})`}>
          {segments.map((seg) => (
            <path
              key={seg.category}
              d={seg.pathData}
              fill={seg.colorVar}
              fillOpacity={seg.isActive ? 1 : 0.3}
              stroke={seg.isActive ? 'var(--gauge-needle)' : 'none'}
              strokeWidth={seg.isActive ? 1.5 : 0}
              data-aqi-band={seg.category}
              data-active={seg.isActive ? 'true' : 'false'}
            />
          ))}

          {tickPositions.map((tick) => (
            <g key={tick.value}>
              <line
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
                stroke="var(--gauge-tick)"
                strokeWidth={1.25}
                strokeLinecap="round"
              />
              <text
                x={tick.labelX}
                y={tick.labelY}
                textAnchor="middle"
                fill="var(--gauge-tick)"
                className="font-mono tabular-nums text-[10px] font-semibold"
              >
                {tick.value}
              </text>
            </g>
          ))}

          <g ref={needleRef} transform={`rotate(${targetAngleDeg.toFixed(2)})`}>
            <polygon points={`-3.5,0 0,-${NEEDLE_LENGTH} 3.5,0`} fill="var(--gauge-needle)" />
            <circle cx={0} cy={0} r={7} fill="var(--gauge-needle)" />
            <circle cx={0} cy={0} r={3} fill="var(--gauge-hub-inner)" />
          </g>

          <text
            x={0}
            y={24}
            textAnchor="middle"
            fill="var(--gauge-needle)"
            className="font-mono tabular-nums text-[15px] font-bold"
          >
            AQI {clampedAqi}
          </text>
        </g>
      </svg>

      <figcaption className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 font-label text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant text-center">
        <svg width="10" height="10" viewBox="0 0 10 10" className="shrink-0" aria-hidden="true">
          <rect width="10" height="10" rx="2" fill={activeBand.colorVar} />
        </svg>
        <span className="font-medium text-light-on-surface dark:text-dark-on-surface">
          {language === 'hi' ? activeBand.shortHi : activeBand.shortEn}
        </span>
        <span aria-hidden="true">·</span>
        <span className="font-mono tabular-nums">{activeBand.rangeText} US AQI</span>
      </figcaption>
    </figure>
  );
}
