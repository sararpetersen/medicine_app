import { useCallback, useEffect, useRef, useState } from "react";
import { useEntranceAnimations } from "../hooks/useEntranceAnimations";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { ContextLog, DoseLog, EffectLog } from "../lib/db";
import { listContextLogsBetween, listDoseLogsBetween, listEffectLogsBetween, localDateString } from "../lib/db";
import { contextInsights, summarizeEffects, timingHistogram } from "../lib/stats";

const DAYS = 30;

export default function Patterns() {
  const entranceRef = useRef<HTMLDivElement>(null);
  const [doses, setDoses] = useState<DoseLog[]>([]);
  const [effects, setEffects] = useState<EffectLog[]>([]);
  const [contexts, setContexts] = useState<ContextLog[]>([]);
  const [focus, setFocus] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 1);
    const start = new Date(end);
    start.setDate(start.getDate() - DAYS);
    const [d, e, c] = await Promise.all([
      listDoseLogsBetween(start, end),
      listEffectLogsBetween(start, end),
      listContextLogsBetween(localDateString(start), localDateString()),
    ]);
    setDoses(d);
    setEffects(e);
    setContexts(c);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEntranceAnimations(entranceRef, [loaded]);

  if (!loaded) {
    return <p className="pt-10 text-center text-ink-faint">One moment…</p>;
  }

  if (effects.length === 0) {
    return (
      <div ref={entranceRef} className="pt-8">
        <h1 className="text-2xl font-bold">Patterns</h1>
        <div className="mt-6 rounded-2xl bg-accent-soft p-5 text-center">
          <img src="/bivi/bivi-thinking.webp" alt="" className="mx-auto mb-3 h-24 w-24" />
          <p className="text-sm text-accent">
            Patterns show up here once you've logged for a little while – even a few days is enough to start. No pressure, no deadline.
          </p>
        </div>
      </div>
    );
  }

  const summaries = summarizeEffects(effects, doses);
  const bad = summaries.filter((s) => !s.is_good);
  const good = summaries.find((s) => s.is_good);
  const frequency = bad.slice(0, 8).map((s) => ({
    label: s.label,
    count: s.count,
  }));
  const timing = timingHistogram(effects, doses, focus);
  const insights = contextInsights(effects, contexts, DAYS);
  const badLabels = bad.map((s) => s.label);

  const chip = (on: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm transition-colors ${
      on ? "border-accent bg-accent-soft font-bold text-accent" : "border-line bg-surface text-ink-soft hover:border-line-strong hover:bg-canvas"
    }`;

  return (
    <div ref={entranceRef} className="pt-8">
      <h1 className="text-2xl font-bold">Patterns</h1>
      <p className="mt-1 text-sm text-ink-faint">Last {DAYS} days.</p>

      {frequency.length > 0 && (
        <section className="mt-6">
          <h2 className="font-bold">How often</h2>
          <div className="mt-3 rounded-2xl border border-line bg-surface p-4">
            <ResponsiveContainer width="100%" height={frequency.length * 40 + 30}>
              <BarChart data={frequency} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 0 }}>
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: "var(--color-ink-faint)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={120}
                  tick={{ fill: "var(--color-ink-soft)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Bar dataKey="count" fill="var(--color-accent)" radius={[0, 6, 6, 0]} barSize={18} animationDuration={2200} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {good && (
            <p className="mt-2 text-sm text-good">
              "{good.label}" logged {good.count} {good.count === 1 ? "time" : "times"} — good days count too.
            </p>
          )}
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-bold">When after a dose</h2>
        <p className="mt-1 text-sm text-ink-soft">How long after taking your medication each effect tends to show up.</p>
        <div data-entrance-stagger className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => setFocus(null)} className={chip(focus === null)}>
            All
          </button>
          {badLabels.map((label) => (
            <button key={label} onClick={() => setFocus(label)} className={chip(focus === label)}>
              {label}
            </button>
          ))}
        </div>
        <div className="mt-3 rounded-2xl border border-line bg-surface p-4">
          {timing.linked < 3 ? (
            <p className="text-sm text-ink-faint">
              Not enough dose-linked logs for this yet – it needs a few days where both a dose and an effect were logged.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={timing.data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
                <XAxis dataKey="bucket" tick={{ fill: "var(--color-ink-faint)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "var(--color-ink-faint)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Bar dataKey="count" fill="var(--color-accent)" radius={[6, 6, 0, 0]} barSize={22} animationDuration={2200} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-bold">Context clues</h2>
        {insights.length === 0 ? (
          <p className="mt-2 text-sm text-ink-faint">
            Keep tapping the daily context chips on 'Today' – clues appear once there are a few days of each kind to compare.
          </p>
        ) : (
          <ul data-entrance-stagger className="mt-2 space-y-2">
            {insights.map((insight) => (
              <li key={insight.label} className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm">
                On {insight.label} you logged <span className="font-bold">{insight.rateWith.toFixed(1)}</span> effects per day, vs{" "}
                <span className="font-bold">{insight.rateWithout.toFixed(1)}</span> on other days ({insight.daysWith} such days tracked).
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 text-sm text-ink-faint">Small numbers wobble – patterns get more trustworthy as the weeks add up.</p>
    </div>
  );
}
