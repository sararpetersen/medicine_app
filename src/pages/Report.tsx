import { useCallback, useEffect, useState } from "react";
import type { ContextLog, DoseLog, EffectLog, Medication } from "../lib/db";
import { describeSchedule, listContextLogsBetween, listDoseLogsBetween, listEffectLogsBetween, listMedications, localDateString } from "../lib/db";
import { contextInsights, severityWord, summarizeEffects } from "../lib/stats";

const RANGES = [14, 30, 90];

// Survives across route changes so switching tabs and coming back shows the
// last-known data instantly instead of a loading flash.
let cache: { days: number; meds: Medication[]; doses: DoseLog[]; effects: EffectLog[]; contexts: ContextLog[] } | null = null;

export default function Report() {
  const [days, setDays] = useState(cache?.days ?? 30);
  const [meds, setMeds] = useState<Medication[]>(cache?.meds ?? []);
  const [doses, setDoses] = useState<DoseLog[]>(cache?.doses ?? []);
  const [effects, setEffects] = useState<EffectLog[]>(cache?.effects ?? []);
  const [contexts, setContexts] = useState<ContextLog[]>(cache?.contexts ?? []);
  const [loaded, setLoaded] = useState(cache !== null);

  const refresh = useCallback(async () => {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 1);
    const start = new Date(end);
    start.setDate(start.getDate() - days);
    const [m, d, e, c] = await Promise.all([
      listMedications(),
      listDoseLogsBetween(start, end),
      listEffectLogsBetween(start, end),
      listContextLogsBetween(localDateString(start), localDateString()),
    ]);
    cache = { days, meds: m, doses: d, effects: e, contexts: c };
    setMeds(m);
    setDoses(d);
    setEffects(e);
    setContexts(c);
    setLoaded(true);
  }, [days]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!loaded) {
    return <p className="pt-10 text-center text-ink-faint">One moment…</p>;
  }

  const summaries = summarizeEffects(effects, doses);
  const insights = contextInsights(effects, contexts, days);
  const taken = doses.filter((d) => !d.skipped).length;
  const skippedCount = doses.filter((d) => d.skipped).length;
  const loggedDays = new Set([
    ...doses.map((d) => localDateString(new Date(d.taken_at))),
    ...effects.map((e) => localDateString(new Date(e.occurred_at))),
  ]).size;

  const rangeStart = new Date();
  rangeStart.setDate(rangeStart.getDate() - days);
  const rangeText = `${rangeStart.toLocaleDateString([], { day: "numeric", month: "short" })} – ${new Date().toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div className="pt-8">
      <div className="no-print">
        <h1 className="text-2xl font-bold">Doctor report</h1>
        <p className="mt-1 text-sm text-ink-soft">A one-page summary for your next appointment. Print it or save it as a PDF.</p>
        <div className="mt-3 flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setDays(r)}
              aria-pressed={days === r}
              className={`flex-1 rounded-xl border px-3 py-2 text-sm transition-colors ${
                days === r
                  ? "border-accent bg-accent-soft font-bold text-accent"
                  : "border-line bg-surface text-ink-soft hover:border-line-strong hover:bg-canvas"
              }`}
            >
              {r} days
            </button>
          ))}
        </div>
      </div>

      {effects.length === 0 && doses.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-accent-soft p-5 text-center">
          <img src="/bivi/bivi-caring.webp" alt="" className="mx-auto mb-3 h-24 w-24" />
          <p className="text-sm text-accent">
            The report builds itself from your logs – once there's data in this date range, it appears here ready to print.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 rounded-2xl border border-line bg-surface p-5 print:border-0 print:p-0">
            <h2 className="text-xl font-bold">Side-effect summary</h2>
            <p className="text-sm text-ink-soft">
              {rangeText} · {loggedDays} days with logs
            </p>

            <h3 className="mt-4 font-bold">Medication</h3>
            <div>
              {meds.filter((m) => m.active).map((m) => (
                <p key={m.id} className="text-sm">
                  {m.name}
                  {describeSchedule(m) && ` — ${describeSchedule(m)}`}
                </p>
              ))}
            </div>
            <p className="mt-1 text-sm text-ink-soft">
              Doses logged: {taken}
              {skippedCount > 0 && ` · skipped: ${skippedCount}`}
            </p>

            <h3 className="mt-4 font-bold">Reported effects</h3>
            <table className="mt-2 w-full text-left text-sm">
              <thead>
                <tr className="text-ink-soft">
                  <th className="py-1 pr-2 font-normal">Effect</th>
                  <th className="py-1 pr-2 font-normal">Times</th>
                  <th className="py-1 pr-2 font-normal">Usual severity</th>
                  <th className="py-1 font-normal">Usually appears</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((s) => (
                  <tr key={s.label} className="border-t border-line">
                    <td className="py-1.5 pr-2">
                      {s.label}
                      {s.is_good && " (good day)"}
                    </td>
                    <td className="py-1.5 pr-2">{s.count}</td>
                    <td className="py-1.5 pr-2">{s.avgSeverity != null ? severityWord(s.avgSeverity) : "—"}</td>
                    <td className="py-1.5">{s.topBucket ? `${s.topBucket} after dose` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {insights.length > 0 && (
              <>
                <h3 className="mt-4 font-bold">Context</h3>
                <ul className="mt-1 list-inside list-disc text-sm">
                  {insights.map((i) => (
                    <li key={i.label}>
                      {i.rateWith.toFixed(1)} effects/day on {i.label} vs {i.rateWithout.toFixed(1)} otherwise
                    </li>
                  ))}
                </ul>
              </>
            )}

            <p className="mt-4 text-xs text-ink-faint">Self-reported via Bivi. Severity scale: barely / annoying / rough.</p>
          </div>

          <button
            onClick={() => window.print()}
            className="no-print mt-4 w-full rounded-xl bg-accent px-4 py-3 font-bold text-on-accent hover:bg-accent-deep"
          >
            Print or save as PDF
          </button>
        </>
      )}
    </div>
  );
}
