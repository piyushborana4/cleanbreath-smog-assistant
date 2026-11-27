import type { AirQualitySnapshot } from '../schemas/aqi.schema';
import type { CommuteMode, HouseholdProfile } from '../schemas/profile.schema';
import type { PersonalizedDailyPlan } from '../schemas/plan.schema';
import type { CommunityChecklist, CommunityChecklistRequest } from '../schemas/community.schema';
import { getLocalizedAqiText } from './aqiCategories';

/**
 * Documented modeling assumptions underlying CleanBreath impact calculations.
 * Every estimate is directional environmental guidance and never a clinical guarantee.
 */
export const IMPACT_MODEL_ASSUMPTIONS = {
  transportEmissionFactorsGramsPerKm: {
    car_solo: 170,
    two_wheeler: 75,
    carpool: 65,
    public_transit: 35,
    walk_cycle: 0,
    work_from_home: 0,
  } as const,
  transportSource: 'DEFRA / IPCC average urban passenger-km tailpipe emission benchmarks',
  indoorFiltrationRange:
    '35–75% closed-room PM2.5 reduction assuming matched CADR and closed outer doors',
  biomassBurningFactor:
    '15–30 g direct PM2.5 avoided per kg of dry garden/municipal waste not open-burned',
} as const;

/**
 * Estimates round-trip CO2e saved (in grams) for an urban trip when shifting commute modes.
 * Values use conservative DEFRA/IPCC urban passenger averages documented in IMPACT_MODEL_ASSUMPTIONS.
 * @param fromMode Current commute mode.
 * @param toMode Lower-emission alternative mode.
 * @param distanceKm Round-trip distance in kilometers (clamped 1..200 km).
 * @returns Estimated grams of CO2e saved (non-negative integer).
 */
export function estimateCommuteCo2eSavedGrams(
  fromMode: CommuteMode,
  toMode: 'public_transit' | 'carpool' | 'walk_cycle' | 'work_from_home',
  distanceKm = 10,
): number {
  const emissionFactorGramsPerKm: Record<CommuteMode, number> = {
    car_solo: 170,
    two_wheeler: 75,
    carpool: 65,
    public_transit: 35,
    walk_cycle: 0,
    work_from_home: 0,
  };

  const safeDistance = Math.max(1, Math.min(200, distanceKm));
  const delta = emissionFactorGramsPerKm[fromMode] - emissionFactorGramsPerKm[toMode];
  return Math.max(0, Math.round(delta * safeDistance));
}

/**
 * Finds the lowest-AQI upcoming window from a forecast array.
 * @param forecast Array of forecast points.
 * @returns Best window label and worst window label.
 */
export function summarizeForecastWindows(forecast: AirQualitySnapshot['forecast']): {
  bestLabel: string;
  worstLabel: string;
} {
  if (forecast.length === 0) {
    return {
      bestLabel: '13:00–16:00 (typical afternoon mixing)',
      worstLabel: '06:00–09:30 & 19:00–22:00 (inversion peak)',
    };
  }
  const sorted = [...forecast].sort((a, b) => a.aqi - b.aqi);
  return {
    bestLabel: `${sorted[0].hourLabel} (AQI ~${sorted[0].aqi})`,
    worstLabel: `${sorted[sorted.length - 1].hourLabel} (AQI ~${sorted[sorted.length - 1].aqi})`,
  };
}

/**
 * Deterministic fallback daily plan used when Gemini API is unavailable or rate-limited.
 * Ensures graceful degradation while maintaining full ImpactExplainer transparency and safety notices.
 * @param profile Validated household profile.
 * @param aqi Live or fallback AQI snapshot.
 * @returns Complete PersonalizedDailyPlan marked with isFallback: true.
 */
export function buildFallbackDailyPlan(
  profile: HouseholdProfile,
  aqi: AirQualitySnapshot,
): PersonalizedDailyPlan {
  const isHi = profile.language === 'hi';
  const hasVulnerable =
    profile.household.hasChildren ||
    profile.household.hasElderly ||
    profile.household.hasRespiratorySensitivity;
  const { bestLabel, worstLabel } = summarizeForecastWindows(aqi.forecast);
  const { label: catLabel } = getLocalizedAqiText(aqi.category, profile.language);
  const savedGrams = estimateCommuteCo2eSavedGrams(
    profile.commuteMode === 'car_solo' ? 'car_solo' : 'two_wheeler',
    'public_transit',
    12,
  );

  const highSmog = aqi.aqi >= 151;
  const maskLabel = highSmog
    ? 'Fitted N95 / FFP2 respirator'
    : 'Surgical or KN95 mask in heavy traffic';

  return {
    isFallback: true,
    personalizationSummary: isHi
      ? `${profile.location.locality}, ${profile.location.city} (AQI ${aqi.aqi} · ${catLabel}) और आपके ${profile.household.householdSize}-सदस्यीय परिवार के लिए ऑफलाइन-सुरक्षित योजना तैयार की गई है।`
      : `Tailored for ${profile.location.locality}, ${profile.location.city} at AQI ${aqi.aqi} (${catLabel}) for a ${profile.household.householdSize}-person ${profile.homeType.replace(/_/g, ' ')} household.`,
    routines: [
      {
        period: 'morning',
        title: isHi ? 'सुबह का स्मॉग बचाव' : 'Morning Inversion Protection',
        action: highSmog
          ? 'Keep external windows closed until mid-morning; wipe dusty sills with a damp cloth instead of dry sweeping.'
          : 'Check local AQI before opening windows; use damp mopping to avoid resuspending settled dust.',
        commuteGuidance:
          profile.commuteMode === 'walk_cycle' || profile.commuteMode === 'two_wheeler'
            ? `Wear a ${maskLabel} during morning rush hour and pick side streets away from main diesel traffic.`
            : 'Prefer metro/bus or keep car AC on recirculate mode on congested corridors.',
        impact: {
          why: 'Winter temperature inversions trap fine PM2.5 near ground level before sunrise warming disperses it.',
          estimatedEffect: 'Approx. 25–45% lower peak morning PM2.5 inhalation',
          confidence: 'medium',
          isEstimateDisclaimer:
            'Directional estimate based on urban dispersion studies; not medical advice.',
        },
      },
      {
        period: 'afternoon',
        title: isHi ? 'दोपहर वेंटिलेशन विंडो' : 'Midday Air Exchange & Activity',
        action: `Use ${bestLabel} for brief 15–20 minute cross-ventilation if outdoor AQI is lower than indoors.`,
        commuteGuidance:
          'Combine errands into a single midday trip when thermal mixing lowers roadside NO2.',
        impact: {
          why: 'Afternoon sunlight increases mixing height, typically lowering ground-level particulate density compared to dawn.',
          estimatedEffect: 'Approx. 15–30% lower CO2 & VOC buildup indoors',
          confidence: 'medium',
          isEstimateDisclaimer:
            'Varies with local wind speed and proximity to construction or arterial roads.',
        },
      },
      {
        period: 'evening',
        title: isHi ? 'शाम का इनडोर सुरक्षा चरण' : 'Evening Indoor Seal & Filtration',
        action: profile.ownsAirPurifier
          ? 'Close outer doors before evening rush hour and run your HEPA purifier in the main living/sleeping room.'
          : 'Seal door/window gaps with rolled damp towels or weatherstripping and run a DIY box-fan MERV-13 filter.',
        commuteGuidance:
          'Avoid evening outdoor jogging near traffic junctions; shift stretching or play indoors.',
        impact: {
          why: 'Evening traffic and cooling air rapidly rebuild PM2.5 concentrations outdoors and indoors.',
          estimatedEffect: profile.ownsAirPurifier
            ? 'Approx. 50–75% lower bedroom PM2.5 with closed windows'
            : 'Approx. 35–55% lower indoor PM2.5 with a MERV-13 box-fan setup',
          confidence: 'high',
          isEstimateDisclaimer:
            'Actual reduction depends on room size, seal tightness, and filter condition.',
        },
      },
    ],
    outdoorWindow: {
      recommendedWindow: bestLabel,
      avoidWindow: worstLabel,
      guidance: hasVulnerable
        ? 'Keep vigorous outdoor play/walks brief and avoid peak traffic hours for children, older adults, or asthma-sensitive members.'
        : 'Schedule outdoor errands during the lowest forecast window and move intense cardio indoors when AQI exceeds 150.',
      impact: {
        why: 'Shifting outdoor exertion away from peak inversion hours reduces total inhaled particle dose.',
        estimatedEffect: 'Approx. 20–40% lower daily PM2.5 inhaled dose',
        confidence: 'medium',
        isEstimateDisclaimer:
          'Dose estimate assumes steady breathing rate and typical urban diurnal smog curves.',
      },
    },
    maskGuidance: {
      recommendedType: maskLabel,
      fitNote:
        'Pinch the nose bridge clip snugly and verify no air leaks around cheeks; replace when damp or soiled.',
      whoNeedsItMost: hasVulnerable
        ? 'Essential for adults commuting outdoors; consult a clinician before masking young children or severe respiratory patients.'
        : 'Recommended for anyone spending >15 minutes near busy roads when AQI > 150.',
      impact: {
        why: 'Electrostatic melt-blown filter layers capture sub-2.5 micron particles that cloth masks miss.',
        estimatedEffect: 'Approx. 80–95% particle filtration when properly fitted',
        confidence: 'high',
        isEstimateDisclaimer:
          'Filtration depends heavily on facial seal; beards and loose straps reduce effectiveness.',
      },
    },
    cookingAndVentilation: {
      bestVentilationTime: bestLabel,
      cookingTips:
        'Run the kitchen exhaust hood (or open a leeward window briefly) while frying/tadka, and cover pans to limit indoor ultrafine spikes.',
      impact: {
        why: 'High-heat oil frying and gas burners can push indoor PM2.5 and NO2 higher than outdoor smog.',
        estimatedEffect: 'Approx. 40–65% lower indoor cooking PM2.5 spikes',
        confidence: 'high',
        isEstimateDisclaimer:
          'Measured across typical residential kitchen exhaust setups; not a clinical claim.',
      },
    },
    indoorHacks: [
      {
        rank: 1,
        title: profile.ownsAirPurifier
          ? 'Single-Room Clean-Air Zone'
          : 'DIY Box-Fan + MERV-13 Filter',
        costTier: profile.ownsAirPurifier ? 'free' : 'low_cost',
        steps: profile.ownsAirPurifier
          ? 'Keep doors shut in the bedroom at night and run the purifier continuously on medium-low.'
          : 'Tape a 20x20 MERV-13 furnace filter securely to the intake side of a standard box fan.',
        honestyNote:
          'Houseplants alone remove negligible PM2.5 at home scale—mechanical filtration is far more effective.',
        impact: {
          why: 'Mechanical HEPA/MERV-13 media physically traps fine soot and dust particles circulating indoors.',
          estimatedEffect: 'Approx. 40–70% indoor PM2.5 reduction in a closed room',
          confidence: 'high',
          isEstimateDisclaimer:
            'Assumes room size matches fan/purifier airflow (CADR) and doors remain closed.',
        },
      },
      {
        rank: 2,
        title: 'Damp-Cloth Dusting & Door-Gap Sealing',
        costTier: 'free',
        steps:
          'Seal under-door gaps with a rolled towel during smog spikes and wipe floors with a damp mop.',
        honestyNote:
          'Dry brooming kicks settled PM10 back into breathing height; wet wiping captures it safely.',
        impact: {
          why: 'Reduces outdoor infiltration through drafts and stops re-suspension of settled soot indoors.',
          estimatedEffect: 'Approx. 10–25% lower indoor dust resuspension',
          confidence: 'medium',
          isEstimateDisclaimer: 'Estimate depends on building draftiness and cleaning frequency.',
        },
      },
      {
        rank: 3,
        title: 'Smog-Smart Cooking & Incense Swap',
        costTier: 'free',
        steps:
          'Pause indoor incense, dhoop, and scented candles on high-AQI days; use lids and exhaust when cooking.',
        honestyNote:
          'Even natural incense releases substantial fine particulates inside sealed winter rooms.',
        impact: {
          why: 'Eliminating indoor combustion sources stops PM2.5 from compounding trapped outdoor smog.',
          estimatedEffect: 'Approx. 30–50% fewer indoor particle peaks',
          confidence: 'high',
          isEstimateDisclaimer: 'Based on indoor combustion aerosol measurements; estimate only.',
        },
      },
    ],
    sustainableAlternatives: [
      {
        title: 'Shift One Daily Trip to Metro, Bus, or Carpool',
        category: 'transport',
        action:
          'Replace solo fuel vehicle trips with public transit or a 3-person neighbourhood carpool twice a week.',
        impact: {
          why: 'Tailpipe exhaust is a major source of urban NO2 and secondary PM2.5 right at street breathing height.',
          estimatedEffect: `Approx. ${savedGrams} g CO2e saved per 12 km round trip`,
          confidence: 'high',
          isEstimateDisclaimer: 'Calculated using average urban passenger emission factors.',
        },
      },
      {
        title: 'Zero Open Leaf or Waste Burning',
        category: 'waste',
        action:
          'Compost dry garden leaves or bag them for municipal collection instead of burning at street corners.',
        impact: {
          why: 'Low-temperature biomass burning releases dense smoke plumes rich in PM2.5 and toxic PAHs.',
          estimatedEffect: 'Prevents ~15–30 g of direct PM2.5 per kg of dry waste burned',
          confidence: 'medium',
          isEstimateDisclaimer:
            'Localized neighbourhood benefit; varies with waste moisture and volume.',
        },
      },
      {
        title: 'Electric Kettle / Induction for Quick Heating',
        category: 'cooking_energy',
        action:
          'Use an electric kettle or induction plate for tea, boiling water, and reheating instead of open flame.',
        impact: {
          why: 'Induction transfers heat directly to cookware without producing indoor NO2 or combustion moisture.',
          estimatedEffect: 'Approx. 50–80% lower kitchen NO2 during quick boils',
          confidence: 'high',
          isEstimateDisclaimer:
            'Grid lifecycle emissions vary by region, while indoor air benefit is immediate.',
        },
      },
    ],
    safetyNotice: {
      medicalDisclaimer:
        'CleanBreath provides general environmental planning estimates, not medical diagnosis or treatment advice. Discuss personal respiratory plans with a qualified healthcare professional.',
      severeSymptomEscalation:
        'Seek urgent medical care immediately if anyone experiences chest pain, severe wheezing, persistent shortness of breath, dizziness, or bluish lips.',
    },
  };
}

/**
 * Deterministic fallback community checklist for apartment societies or schools.
 * @param req Community checklist parameters.
 * @returns Structured CommunityChecklist with plain-text sharing summary.
 */
export function buildFallbackCommunityChecklist(
  req: CommunityChecklistRequest,
): CommunityChecklist {
  const isSchool = req.settingType === 'school';
  const items = isSchool
    ? [
        {
          id: 'school-1',
          audience: 'School Leadership & PE Staff',
          action:
            req.aqi >= 151
              ? 'Move morning assembly and physical education indoors until AQI drops below 150.'
              : 'Keep outdoor sports brief and schedule them during the midday lower-AQI window.',
          frequency: 'Daily 07:00 check',
          impact: {
            why: 'Children breathe faster per body weight during active play, increasing particle uptake.',
            estimatedEffect: 'Approx. 30–50% lower peak PM2.5 dose during school hours',
            confidence: 'high' as const,
            isEstimateDisclaimer:
              'Environmental exposure estimate; follow local education authority advisories.',
          },
        },
        {
          id: 'school-2',
          audience: 'Transport & Parents',
          action:
            'Enforce a strict "Engine Off" drop-off zone at the school gate and encourage bus/carpool.',
          frequency: 'Morning & afternoon pickup',
          impact: {
            why: 'Idling vehicles concentrate NO2 and soot right at child breathing height near gates.',
            estimatedEffect: 'Approx. 1,200 g CO2e saved per shared carpool + cleaner gate air',
            confidence: 'high' as const,
            isEstimateDisclaimer: 'Average urban gate-idling estimate; varies with fleet fuel mix.',
          },
        },
        {
          id: 'school-3',
          audience: 'Facility Staff',
          action:
            'Use damp mopping in classrooms instead of dry sweeping and service classroom filters.',
          frequency: 'Twice daily',
          impact: {
            why: 'Wet cleaning traps settled soot without kicking dust back into classroom air.',
            estimatedEffect: 'Approx. 15–25% lower indoor coarse dust resuspension',
            confidence: 'medium' as const,
            isEstimateDisclaimer: 'Estimate depends on classroom ventilation and occupancy.',
          },
        },
        {
          id: 'school-4',
          audience: 'Infirmary & Teachers',
          action: 'Keep an updated asthma action list and watch for persistent cough or wheezing.',
          frequency: 'Ongoing',
          impact: {
            why: 'Early recognition lets staff move sensitive students to cleaner rooms and alert parents quickly.',
            estimatedEffect: 'Faster symptom escalation response (safety safeguard)',
            confidence: 'high' as const,
            isEstimateDisclaimer: 'Operational preparedness measure, not a medical protocol.',
          },
        },
      ]
    : [
        {
          id: 'society-1',
          audience: 'Security & Maintenance',
          action:
            'Prohibit burning dry leaves, garden trimmings, or waste inside or beside the compound.',
          frequency: 'Zero tolerance daily',
          impact: {
            why: 'Smoldering biomass emits dense PM2.5 plumes that drift directly into ground-floor flats.',
            estimatedEffect: 'Prevents ~15–30 g PM2.5 per kg of unburned garden waste',
            confidence: 'high' as const,
            isEstimateDisclaimer: 'Localized compound air estimate; depends on wind dispersion.',
          },
        },
        {
          id: 'society-2',
          audience: 'Facility Management',
          action:
            'Pre-wet sweeping paths and cover construction or repair sand piles with tarpaulins.',
          frequency: 'Daily morning sweep',
          impact: {
            why: 'Light misting binds road dust so brooms do not create breathing-level particulate clouds.',
            estimatedEffect: 'Approx. 25–40% lower courtyard dust spikes',
            confidence: 'medium' as const,
            isEstimateDisclaimer:
              'Practical dust-suppression estimate; avoid wasting potable water.',
          },
        },
        {
          id: 'society-3',
          audience: 'Residents & Car Owners',
          action: 'Set up a society WhatsApp carpool sheet for shared office and school commutes.',
          frequency: 'Weekly coordination',
          impact: {
            why: 'Fewer cold-start tailpipes in the basement/driveway cut NO2 and carbon emissions.',
            estimatedEffect: 'Approx. 1,400–2,000 g CO2e saved per shared 12 km trip',
            confidence: 'high' as const,
            isEstimateDisclaimer: 'Based on standard urban passenger car emission factors.',
          },
        },
        {
          id: 'society-4',
          audience: 'DG Set / Backup Operators',
          action:
            'Inspect backup diesel generators for timely filter servicing and avoid unnecessary test idling.',
          frequency: 'Weekly maintenance check',
          impact: {
            why: 'Unmaintained diesel generators emit concentrated black carbon and sulfur/nitrogen oxides.',
            estimatedEffect: 'Approx. 15–30% lower localized exhaust soot during outages',
            confidence: 'medium' as const,
            isEstimateDisclaimer: 'Depends on generator age, load, and emission-control equipment.',
          },
        },
      ];

  const header = isSchool
    ? `CleanBreath School Smog Action Checklist — ${req.locality} (AQI ${req.aqi})`
    : `CleanBreath Neighbourhood / RWA Checklist — ${req.locality} (AQI ${req.aqi})`;

  const lines = [
    header,
    '',
    ...items.map(
      (item, idx) =>
        `${idx + 1}. [${item.audience}] ${item.action}\n   Why: ${item.impact.why}\n   Est. Impact: ${item.impact.estimatedEffect} (Confidence: ${item.impact.confidence})`,
    ),
    '',
    'Note: Estimates are directional environmental guidance, not medical advice. Seek urgent care for severe breathing symptoms.',
  ];

  return {
    settingType: req.settingType,
    locality: req.locality,
    aqi: req.aqi,
    category: req.category,
    items,
    shareableText: lines.join('\n'),
  };
}
