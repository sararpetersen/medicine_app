import type { ContextLog, DoseLog, EffectLog } from "./db";
import { localDateString } from "./db";

export const SEVERITY_WORDS: Record<number, string> = {
  1: "barely",
  2: "annoying",
  3: "rough",
};

export function severityWord(avg: number): string {
  if (avg < 1.5) return "barely";
  if (avg < 2.5) return "annoying";
  return "rough";
}

export const HOUR_BUCKETS = [
  "0–2h",
  "2–4h",
  "4–6h",
  "6–8h",
  "8–10h",
  "10–12h",
  "12h+",
];

export function bucketLabel(hours: number): string {
  if (hours >= 12) return "12h+";
  return HOUR_BUCKETS[Math.floor(hours / 2)];
}

// Hours between an effect and the most recent non-skipped dose in the
// preceding 24h, or null when no dose can be linked.
export function hoursSinceDose(
  effectIso: string,
  doses: DoseLog[],
): number | null {
  const t = new Date(effectIso).getTime();
  let best: number | null = null;
  for (const dose of doses) {
    if (dose.skipped) continue;
    const dt = new Date(dose.taken_at).getTime();
    if (dt > t) continue;
    const hours = (t - dt) / 3_600_000;
    if (hours <= 24 && (best === null || hours < best)) best = hours;
  }
  return best;
}

export interface EffectSummary {
  label: string;
  is_good: boolean;
  count: number;
  avgSeverity: number | null;
  topBucket: string | null;
}

export function summarizeEffects(
  effects: EffectLog[],
  doses: DoseLog[],
): EffectSummary[] {
  const map = new Map<
    string,
    {
      is_good: boolean;
      count: number;
      sevSum: number;
      sevN: number;
      buckets: Map<string, number>;
    }
  >();
  for (const effect of effects) {
    let entry = map.get(effect.label);
    if (!entry) {
      entry = {
        is_good: effect.is_good,
        count: 0,
        sevSum: 0,
        sevN: 0,
        buckets: new Map(),
      };
      map.set(effect.label, entry);
    }
    entry.count++;
    if (effect.severity != null) {
      entry.sevSum += effect.severity;
      entry.sevN++;
    }
    const hours = hoursSinceDose(effect.occurred_at, doses);
    if (hours != null) {
      const bucket = bucketLabel(hours);
      entry.buckets.set(bucket, (entry.buckets.get(bucket) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([label, x]) => ({
      label,
      is_good: x.is_good,
      count: x.count,
      avgSeverity: x.sevN ? x.sevSum / x.sevN : null,
      topBucket:
        [...x.buckets.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    }))
    .sort((a, b) => b.count - a.count);
}

export function timingHistogram(
  effects: EffectLog[],
  doses: DoseLog[],
  label: string | null,
): { data: { bucket: string; count: number }[]; linked: number } {
  const counts = new Map(HOUR_BUCKETS.map((b) => [b, 0]));
  let linked = 0;
  for (const effect of effects) {
    if (effect.is_good) continue;
    if (label && effect.label !== label) continue;
    const hours = hoursSinceDose(effect.occurred_at, doses);
    if (hours == null) continue;
    const bucket = bucketLabel(hours);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
    linked++;
  }
  return {
    data: HOUR_BUCKETS.map((bucket) => ({
      bucket,
      count: counts.get(bucket) ?? 0,
    })),
    linked,
  };
}

export interface ContextInsight {
  label: string;
  daysWith: number;
  rateWith: number;
  rateWithout: number;
}

const CONTEXT_FLAGS: {
  label: string;
  test: (c: ContextLog) => boolean;
}[] = [
  { label: "low-sleep days", test: (c) => c.sleep_quality != null },
  { label: "caffeine days", test: (c) => c.caffeine === true },
  { label: "breakfast days", test: (c) => c.ate_breakfast === true },
  { label: "stressful days", test: (c) => c.stress != null },
];

export function contextInsights(
  effects: EffectLog[],
  contexts: ContextLog[],
  daysSpan: number,
): ContextInsight[] {
  const effectsPerDay = new Map<string, number>();
  let totalBad = 0;
  for (const effect of effects) {
    if (effect.is_good) continue;
    const day = localDateString(new Date(effect.occurred_at));
    effectsPerDay.set(day, (effectsPerDay.get(day) ?? 0) + 1);
    totalBad++;
  }

  const insights: ContextInsight[] = [];
  for (const flag of CONTEXT_FLAGS) {
    const flaggedDates = new Set(
      contexts.filter(flag.test).map((c) => c.date),
    );
    const daysWith = flaggedDates.size;
    const daysWithout = Math.max(daysSpan - daysWith, 0);
    if (daysWith < 3 || daysWithout < 3 || totalBad < 5) continue;
    let onFlagged = 0;
    for (const [day, count] of effectsPerDay) {
      if (flaggedDates.has(day)) onFlagged += count;
    }
    insights.push({
      label: flag.label,
      daysWith,
      rateWith: onFlagged / daysWith,
      rateWithout: (totalBad - onFlagged) / daysWithout,
    });
  }
  return insights.sort(
    (a, b) => b.rateWith - b.rateWithout - (a.rateWith - a.rateWithout),
  );
}
