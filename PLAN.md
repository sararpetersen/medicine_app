# Sidekick — v1 plan

*Sidekick*: a neurodivergent-friendly app for logging medication side effects, spotting patterns, and turning them into something useful to bring to your doctor. The name is a double meaning — it tracks side effects, and it's a friendly companion in your pocket.

## Design principles (the non-negotiables)

1. **The 10-second log.** Open app → tap chips → done. No required fields, no forms, no free text unless wanted.
2. **No guilt.** No streaks, no red badges, no "you missed 3 days!" Coming back after a gap is a non-event.
3. **Recognition over recall.** You pick from *your own* pre-defined side-effect chips, in your own words. Never a blank "how do you feel?" box.
4. **The data has a purpose.** Everything logged builds toward the doctor report. Logging feels worth it.
5. **Sensory-calm.** Muted colors, minimal motion, at most one gentle reminder per day.

## v1 scope

**In:** dose check-in, side-effect quick log with severity, optional context one-taps, history, patterns, doctor report (printable).

**Out (v2+ ideas):** push reminders, offline queue/local-first sync, multiple users/sharing, wind-down/regulation corner, native app stores, wearable data.

## Screens

### 1. Today (home)
- Dose check-in per active medication: "Taken" (one tap, records time) / "Skipped" / adjust time retroactively ("actually this morning").
- Quick-log: your personal side-effect chips, multi-select. Includes an "Actually fine" chip.
- Severity picker (3 levels: barely / annoying / rough) — only shown when a chip is selected.
- Optional context one-taps: slept badly, ate breakfast, caffeine, stressful day.
- Small pattern insight card once enough data exists.

### 2. History
- Reverse-chronological timeline of logs grouped by day.
- Tap an entry to edit or delete. Retroactive logging supported (add an entry for yesterday).

### 3. Patterns
- Side-effect frequency over time (per effect).
- Time-since-dose distribution: when after a dose does each effect tend to appear?
- Context correlations: effect frequency on low-sleep days vs. normal, with/without breakfast, etc.
- Honest about small data: shows "need a bit more data" instead of fake confidence.

### 4. Doctor report
- One-page summary for an appointment: date range picker, med + dose, effect frequency table, severity trends, timing patterns, notable context correlations.
- v1 export = print-friendly stylesheet (browser print → PDF). Proper PDF generation later.

### 5. Setup / settings
- Medications: name, dose, unit, schedule time(s).
- Chip palette editor: add/rename/retire your side-effect chips.
- Reminder time (v1: none or a simple daily local notification if feasible; full push is v2).

## Data model (Supabase Postgres, RLS on user_id everywhere)

```
medications
  id, user_id, name, dose_amount, dose_unit, schedule_times[], active, created_at

dose_logs
  id, user_id, medication_id, taken_at, skipped (bool), note, created_at

side_effect_types            -- the user's custom chip palette
  id, user_id, label, sort_order, active, created_at

side_effect_logs
  id, user_id, effect_type_id, occurred_at, severity (1–3, null for "actually fine"), note, created_at

context_logs                 -- one row per day, all fields optional
  id, user_id, date, sleep_quality, ate_breakfast, caffeine, stress, created_at
```

Notes:
- `occurred_at` is separate from `created_at` → retroactive logging is native, not a hack.
- "Actually fine" is a built-in effect type so good days are data too.
- Patterns are computed client-side from raw logs in v1 — no server jobs needed.

## Stack

- **Vite + React + TypeScript**, installable **PWA** (works on phone home screen, no app store).
- **Tailwind CSS** for styling.
- **Supabase**: email magic-link auth, Postgres with row-level security.
- **Recharts** for the patterns screen.
- Mobile-first layout (design at ~390px, works on desktop too).

## Build order

1. **Scaffold**: Vite + React + TS + Tailwind + PWA manifest, Supabase project + auth, deploy pipeline (Vercel/Netlify).
2. **Setup flow**: add medication(s), define chip palette. Seed a sensible default chip list to edit.
3. **Today screen**: dose check-in + quick log. → *From this point the app is genuinely usable daily on your phone.*
4. **History**: timeline, edit/delete, retroactive entries.
5. **Patterns**: charts (needs ~1–2 weeks of real data to be interesting anyway).
6. **Doctor report**: summary + print stylesheet.
7. **Polish**: insight card on Today, reminder, small delights.

Milestone 3 is the point of the whole project — everything before it should be as thin as possible to get there fast.

## Launch checklist (only matters if Sidekick ever goes public)

- **Rename the app** — "Sidekick" conflicts with Sidekick Health (same industry); pick a distinctive coined name and do a quick trademark search first.
- **Privacy policy** — required before any public onboarding page; the app handles health data, so this is non-negotiable (GDPR applies).
- **Health-app integration** (Apple Health etc.) needs a native wrapper (Capacitor) — a PWA cannot access HealthKit. Revisit if/when going native.
- Move off the shared Supabase project onto a dedicated one.
