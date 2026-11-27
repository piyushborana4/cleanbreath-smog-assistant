import crypto from 'node:crypto';
import type { PersonalizedDailyPlan } from '../../shared/schemas/plan.schema';

const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const HTML_TAG_RE = /<[^>]*>/g;

/**
 * Strips control characters, HTML tags, and collapses whitespace from untrusted text.
 * Prevents XSS or delimiter breakout when embedding user strings into prompts or JSON outputs.
 */
export function sanitizePlainText(input: string, maxLength = 600): string {
  return input
    .replace(CONTROL_CHARS_RE, ' ')
    .replace(HTML_TAG_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Wraps untrusted user-supplied data in explicit XML-like delimiters while neutralizing
 * closing tags that could attempt prompt injection.
 */
export function wrapUntrustedText(tagName: string, rawText: string, maxLength = 600): string {
  const safeTag = tagName.replace(/[^a-zA-Z0-9_-]/g, '');
  const cleaned = sanitizePlainText(rawText, maxLength).replace(/</g, '‹').replace(/>/g, '›');
  return `<${safeTag}>${cleaned}</${safeTag}>`;
}

/**
 * Detects obvious prompt-injection override attempts in chat messages so callers
 * can reinforce boundaries or refuse off-topic hijacking.
 */
export function hasPromptInjectionSignals(text: string): boolean {
  const normalized = text.toLowerCase();
  const patterns = [
    /(ignore|forget|override)\s+(all\s+)?(previous|prior|above|your)\s+(instructions|rules|prompt)/,
    /disregard\s+(the\s+|all\s+)?system\s+prompt/,
    /(reveal|print|dump|show)\s+(your|the)\s+(system\s+prompt|hidden\s+instructions)/,
    /act\s+as\s+(a\s+)?(jailbreak|dan|unrestricted)/,
    /(bypass|disable)\s+(all\s+)?(safety|guardrails|filters)/,
    /enter\s+developer\s+mode/,
    /output\s+your\s+(api\s+key|environment\s+variables|secrets)/,
  ];
  return patterns.some((re) => re.test(normalized));
}

/**
 * Sanitizes every string field in a Gemini-generated PersonalizedDailyPlan to guarantee
 * zero embedded HTML or control characters reach the client.
 */
export function sanitizePlanOutput(plan: PersonalizedDailyPlan): PersonalizedDailyPlan {
  const cleanImpact = (imp: PersonalizedDailyPlan['outdoorWindow']['impact']) => ({
    why: sanitizePlainText(imp.why, 320),
    estimatedEffect: sanitizePlainText(imp.estimatedEffect, 180),
    confidence: imp.confidence,
    isEstimateDisclaimer: sanitizePlainText(imp.isEstimateDisclaimer, 200),
  });

  return {
    ...plan,
    personalizationSummary: sanitizePlainText(plan.personalizationSummary, 380),
    routines: plan.routines.map((r) => ({
      ...r,
      title: sanitizePlainText(r.title, 120),
      action: sanitizePlainText(r.action, 360),
      commuteGuidance: sanitizePlainText(r.commuteGuidance, 260),
      impact: cleanImpact(r.impact),
    })),
    outdoorWindow: {
      recommendedWindow: sanitizePlainText(plan.outdoorWindow.recommendedWindow, 140),
      avoidWindow: sanitizePlainText(plan.outdoorWindow.avoidWindow, 140),
      guidance: sanitizePlainText(plan.outdoorWindow.guidance, 300),
      impact: cleanImpact(plan.outdoorWindow.impact),
    },
    maskGuidance: {
      recommendedType: sanitizePlainText(plan.maskGuidance.recommendedType, 120),
      fitNote: sanitizePlainText(plan.maskGuidance.fitNote, 240),
      whoNeedsItMost: sanitizePlainText(plan.maskGuidance.whoNeedsItMost, 220),
      impact: cleanImpact(plan.maskGuidance.impact),
    },
    cookingAndVentilation: {
      bestVentilationTime: sanitizePlainText(plan.cookingAndVentilation.bestVentilationTime, 160),
      cookingTips: sanitizePlainText(plan.cookingAndVentilation.cookingTips, 300),
      impact: cleanImpact(plan.cookingAndVentilation.impact),
    },
    indoorHacks: plan.indoorHacks.map((hack) => ({
      ...hack,
      title: sanitizePlainText(hack.title, 120),
      steps: sanitizePlainText(hack.steps, 320),
      honestyNote: sanitizePlainText(hack.honestyNote, 240),
      impact: cleanImpact(hack.impact),
    })),
    sustainableAlternatives: plan.sustainableAlternatives.map((alt) => ({
      ...alt,
      title: sanitizePlainText(alt.title, 120),
      action: sanitizePlainText(alt.action, 300),
      impact: cleanImpact(alt.impact),
    })),
    safetyNotice: {
      medicalDisclaimer: sanitizePlainText(plan.safetyNotice.medicalDisclaimer, 320),
      severeSymptomEscalation: sanitizePlainText(plan.safetyNotice.severeSymptomEscalation, 320),
    },
  };
}

/**
 * Generates a deterministic SHA-256 cache key for structured objects.
 */
export function hashCacheKey(payload: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
