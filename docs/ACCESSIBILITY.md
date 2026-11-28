# CleanBreath Accessibility Compliance (WCAG 2.2 AA)

CleanBreath is built for **WCAG 2.2 Level AA** across light/dark themes and English/Hindi (`lang="en"` / `lang="hi"`).

## Automated Verification & CI Gates

| Check | Command | Scope |
| :--- | :--- | :--- |
| Automated Contrast Verification | `npm run contrast-check` | Verifies all 44 light & dark theme foreground/background text pairs (`>= 4.5:1`) and UI/D3 gauge tokens (`>= 3.0:1`) parsed directly from `src/index.css` |
| Static JSX Accessibility Lint | `npm run lint` (`eslint-plugin-jsx-a11y` flat recommended) | Enforces semantic controls, associated `<label htmlFor>`, keyboard parity, and valid ARIA attributes across `src/` |
| DOM Accessibility Suite (`axe-core`) | `npm run test:coverage` (`tests/a11y/components.a11y.test.tsx`) | Runs `axe-core` against all 7 views in light/dark themes and EN/HI locales |
| Behavioral & Landmark Tests | `npm run test:coverage` (`tests/a11y/frontendBehavior.test.tsx`) | Verifies single `<main id="main-content">` & single `<h1>` per active view, focus movement, live regions, and EN/HI switching |

## WCAG 2.2 AA Criteria Mapping

| Criterion | Implementation | Source Files & Tests |
| :--- | :--- | :--- |
| **1.1.1 Non-text Content** | Decorative Material Symbols use `aria-hidden="true"`; D3 AQI gauge SVG exposes `role="img"` and full `aria-label` in English/Hindi (`<figure>` + `<figcaption>`). | `src/components/AqiGauge.tsx`, `tests/unit/aqiGauge.test.tsx` |
| **1.3.1 Info and Relationships** | Single `<main id="main-content">` and single `<h1>` per active view; onboarding step progress uses semantic `<ol>` with `aria-current="step"`; forecast strip uses semantic `<ul>`; inputs paired via `htmlFor`/`id`. | `src/App.tsx`, `src/components/OnboardingWizard.tsx`, `src/components/dashboard/ForecastStrip.tsx`, `src/components/SettingsView.tsx` |
| **1.4.1 Use of Color** | AQI severity combines color with text category labels (`Good` through `Severe`), US AQI numbers, active bracket border stroke, and icon cues (`check_circle`, `warning`). | `src/components/AqiGauge.tsx`, `src/components/dashboard/AqiHeroCard.tsx` |
| **1.4.3 Contrast (Minimum)** & **1.4.11 Non-text Contrast** | Custom Atkinson Hyperlegible + Hedvig Letters Sans palette audited automatically for `>= 4.5:1` text and `>= 3.0:1` UI/gauge ratios in both light and dark modes. | `src/index.css`, `scripts/contrast-check.ts` |
| **1.4.10 Reflow (320px / 200% Zoom)** | Single-column mobile-first `max-w-3xl` container, `grid-cols-1` mobile breakdowns, wrapping controls, and fluid `w-full max-w-[272px]` D3 gauge SVG prevent horizontal scrolling. | `src/components/StitchShell.tsx`, `src/components/AqiGauge.tsx` |
| **1.4.12 Text Spacing / Scaling** | Rem-based font tokens + in-app Base Text Size selector (`14px` / `16px` / `18px` / `20px`) updating `document.documentElement.style.fontSize`. | `src/index.css`, `src/components/SettingsView.tsx`, `src/App.tsx` |
| **2.1.1 Keyboard & 2.4.1 Bypass Blocks** | Skip link (`<a href="#main-content" class="skip-link">`) jumps past header navigation; every interactive control is a native `<button>`, `<input>`, `<select>`, or `<a>`. | `src/App.tsx`, `src/index.css` |
| **2.4.3 Focus Order & 2.4.7 Focus Visible** | Route transitions move keyboard focus cleanly to the active view `<h1>` (fallback `#main-content`) and announce the route via `aria-live="polite"`; consistent `focus-visible:ring-2`. | `src/App.tsx`, `src/components/*` |
| **2.5.8 Target Size (Minimum)** | Interactive buttons, nav tabs, toggles, and form controls enforce `min-h-12` (`48px` >= WCAG `24px` AA minimum and Material `48dp` target). | `src/components/*` |
| **2.3.3 / Motion Safety** | Honors OS `prefers-reduced-motion: reduce`, provides an in-app **Reduce Motion** toggle synced to `<MotionConfig reducedMotion>`, and skips D3 needle animation transitions when reduced motion is active. | `src/index.css`, `src/App.tsx`, `src/components/AqiGauge.tsx` |

## Contrast Audit Summary (`npm run contrast-check`)

All **44** audited light and dark pairs pass (`0 failures`):

- **Light text (`>= 4.5:1`)**: Primary `#191c1c` on `#f8faf9` (`16.36:1`), Secondary `#3f4949` on `#f8faf9` (`8.86:1`), Primary `#004345` on `#ffffff` (`11.12:1`), Good `#0f766e` on `#f8faf9` (`5.22:1`), Caution `#b45309` on `#ffffff` (`5.02:1`), Error `#ba1a1a` on `#f2f4f3` (`5.85:1`).
- **Dark text (`>= 4.5:1`)**: Primary `#e1e3e2` on `#111414` (`14.36:1`), Secondary `#bfc8c8` on `#191c1c` (`10.06:1`), Primary `#90d2d4` on `#191c1c` (`10.09:1`), Good `#5eead4` on `#191c1c` (`11.60:1`), Caution `#fbbf24` on `#191c1c` (`10.28:1`), Error `#ffb4ab` on `#191c1c` (`10.10:1`).
- **UI & D3 Gauge (`>= 3.0:1`)**: Input outlines `#576060` (`6.17:1` light) / `#899392` (`5.43:1` dark); all 6 US-EPA gauge arc bands score `5.02:1–8.31:1` (light) and `6.20:1–10.28:1` (dark).

## Manual Screen-Reader, Keyboard & Lighthouse Checklist

1. **Keyboard-only walkthrough**: Press `Tab` from page load -> activate `Skip to main content` -> navigate bottom tabs and cards using `Tab` / `Shift+Tab` / `Enter` / `Space`; confirm visible focus ring and focus shift to each view's `<h1>`.
2. **Screen reader (NVDA / VoiceOver)**: Switch language (`हिन्दी` / `EN`) -> verify `<html lang>` announcement, D3 gauge `aria-label`, `aria-live="polite"` route/chat announcements, and `aria-current="step"` inside the onboarding stepper.
3. **200% Zoom / 320px Mobile Reflow**: Resize browser to `320px` width or zoom `200%` -> confirm zero horizontal scrollbar across Dashboard, Onboarding, Hacks, Chat, Community, and Settings.
4. **Lighthouse Accessibility Audit**: Run Chrome DevTools Lighthouse on production build (`npm run build && npm start`) targeting Accessibility score **>= 95**.
