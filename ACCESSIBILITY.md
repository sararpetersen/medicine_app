# Bivi accessibility checklist

Distilled from Sara's collection of accessibility principles (Home Office
do/don't posters, WCAG checklist, neuro-inclusion infographics). Status
reflects the actual code — re-audit when screens change.

## Done ✓

- **Calm, muted palette; one restrained accent** (honey gold) — no neon,
  no bright contrasting colors
- **Readable typography**: Atkinson Hyperlegible, left-aligned text, no
  justified blocks, sentence-length copy
- **Text size setting** (S–XL) scaling the whole app
- **Dark mode** (system / light / dark)
- **Simplified logging mode** — reduces choices and visual clutter on demand
- **Reduced motion** respected via `prefers-reduced-motion`; no autoplay,
  no flashing content, no notifications at all
- **Plain language, no idioms**; descriptive buttons ("Log it", "Taken
  now" — never "Click here")
- **Predictable, consistent layouts**; bottom nav never changes order
- **No time limits, no rush, no guilt mechanics**; retroactive logging
- **Everything editable/deletable** — users can check and correct answers
- **Chips use `aria-pressed`**; delete buttons have descriptive
  `aria-label`s; log confirmation uses `role="status"` (aria-live)
- **Visible focus rings** (accent-colored, `:focus-visible`)
- **Form labels** programmatically associated (`htmlFor`/`id` or
  `aria-label` on every input)
- **Errors** announced with `role="alert"`, written as "what happened +
  what to do", never raw error strings
- **Body text contrast** ≥ 4.5:1 including hint text (`ink-faint`
  darkened 2026-07)
- **Per-route page titles** ("History — Bivi")
- **Skip-to-content link** for keyboard users
- **Semantic structure**: one h1 per screen, h2 sections, `main`/`nav`
  landmarks, `lang` attribute
- **Large touch targets** with space between them (Fitts's law); works
  mobile-first — enlarged hit areas on all "×" delete buttons (2026-07)
- **Font choice setting** (Settings → Accessibility): Atkinson
  Hyperlegible / OpenDyslexic / system — offering a choice beats any
  single font (2026-07)
- **Line spacing ≥ 1.5** for body and small text (2026-07)
- **Hint-text contrast re-verified** ≥ 4.5:1 on canvas in both themes
  (`ink-faint` #726f65 light / #999689 dark) (2026-07)

## To do

- [ ] **Focus management on route change** — move focus to the page
      heading when switching tabs (screen-reader navigation)
- [ ] **Review-before-save summary** in onboarding (anxiety poster: "let
      users check their answers before submitting")
- [ ] **Tooltips/explanations** if any medical or statistical jargon
      creeps into Patterns/Report
- [ ] **Keyboard walkthrough test** — tab through every flow once per
      milestone; keyboard focus must never be trapped
- [ ] **Real screen-reader pass** (VoiceOver on iPhone) once deployed
      usage settles
- [ ] Charts: add text alternatives for Patterns data (currently the
      Report table serves as the accessible equivalent)

## Principles to keep honoring (from the collection)

1. Sensory budget is real: every animation, popup, and choice spends it.
2. Recognition over recall; progressive disclosure over walls of text.
3. Give control to the user: theme, size, density are choices, not decrees.
4. Accessibility from day 1 is cheap; retrofitting is expensive.
5. Design for the full range of human experience, not the average user.
