import { useCallback, useEffect, useState } from "react";
import type { ContextLog, DoseLog, EffectLog, Medication } from "../lib/db";
import {
  deleteDoseLog,
  deleteEffectLog,
  listContextLogsBetween,
  listDoseLogsBetween,
  listEffectLogsBetween,
  listMedications,
  localDateString,
} from "../lib/db";

const SEVERITY_WORDS: Record<number, string> = {
  1: "barely",
  2: "annoying",
  3: "rough",
};

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dayTitle(dateStr: string): string {
  const today = localDateString();
  const yesterday = localDateString(new Date(Date.now() - 86400000));
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  return new Date(`${dateStr}T12:00`).toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function contextChips(ctx: ContextLog): string[] {
  const chips: string[] = [];
  if (ctx.sleep_quality != null) chips.push("slept badly");
  if (ctx.ate_breakfast) chips.push("breakfast");
  if (ctx.caffeine) chips.push("caffeine");
  if (ctx.stress != null) chips.push("stressful day");
  return chips;
}

interface DayGroup {
  date: string;
  doses: DoseLog[];
  effects: EffectLog[];
  context: ContextLog | null;
}

export default function History() {
  const [daysBack, setDaysBack] = useState(14);
  const [meds, setMeds] = useState<Medication[]>([]);
  const [days, setDays] = useState<DayGroup[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 1);
    const start = new Date(end);
    start.setDate(start.getDate() - daysBack);

    const [m, doses, effects, contexts] = await Promise.all([
      listMedications(),
      listDoseLogsBetween(start, end),
      listEffectLogsBetween(start, end),
      listContextLogsBetween(localDateString(start), localDateString()),
    ]);

    const groups = new Map<string, DayGroup>();
    const group = (date: string) => {
      if (!groups.has(date)) {
        groups.set(date, { date, doses: [], effects: [], context: null });
      }
      return groups.get(date)!;
    };
    doses.forEach((d) => group(localDateString(new Date(d.taken_at))).doses.push(d));
    effects.forEach((e) => group(localDateString(new Date(e.occurred_at))).effects.push(e));
    contexts.forEach((c) => {
      const g = group(c.date);
      if (contextChips(c).length > 0) g.context = c;
    });
    for (const g of groups.values()) {
      if (g.doses.length === 0 && g.effects.length === 0 && !g.context) {
        groups.delete(g.date);
      }
    }

    setMeds(m);
    setDays([...groups.values()].sort((a, b) => b.date.localeCompare(a.date)));
    setLoaded(true);
  }, [daysBack]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const medName = (id: string) => meds.find((m) => m.id === id)?.name ?? "Medication";

  if (!loaded) {
    return <p className="pt-10 text-center text-ink-faint">One moment…</p>;
  }

  return (
    <div className="pt-8">
      <h1 className="text-2xl font-bold">History</h1>

      {days.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-accent-soft p-5 text-center">
          <img src="/bivi/bivi-writing.webp" alt="" className="mx-auto mb-3 h-24 w-24" />
          <p className="text-sm text-accent">Nothing here yet. Once you log on the 'Today' screen, your timeline grows on its own.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-6">
          {days.map((day) => (
            <section key={day.date}>
              <h2 className="font-bold">{dayTitle(day.date)}</h2>
              <div className="mt-2 space-y-2">
                {day.doses.map((dose) => (
                  <div key={dose.id} className="flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-2">
                    <span>
                      <span className="text-sm text-ink-faint">{fmtTime(dose.taken_at)}</span> {medName(dose.medication_id)}
                      {dose.skipped && <span className="text-sm text-ink-faint"> · skipped</span>}
                    </span>
                    <button
                      onClick={async () => {
                        await deleteDoseLog(dose.id);
                        await refresh();
                      }}
                      aria-label={`Delete ${medName(dose.medication_id)} dose at ${fmtTime(dose.taken_at)}`}
                      className="text-ink-faint hover:text-ink"
                    >
                      ×
                    </button>
                  </div>
                ))}

                {day.effects.map((log) => (
                  <div key={log.id} className="flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-2">
                    <span>
                      <span className="text-sm text-ink-faint">{fmtTime(log.occurred_at)}</span>{" "}
                      <span className={log.is_good ? "text-good" : ""}>{log.label}</span>
                      {log.severity != null && <span className="text-sm text-ink-soft"> · {SEVERITY_WORDS[log.severity]}</span>}
                    </span>
                    <button
                      onClick={async () => {
                        await deleteEffectLog(log.id);
                        await refresh();
                      }}
                      aria-label={`Delete ${log.label} at ${fmtTime(log.occurred_at)}`}
                      className="text-ink-faint hover:text-ink"
                    >
                      ×
                    </button>
                  </div>
                ))}

                {day.context && <p className="px-1 text-sm text-ink-faint">Context: {contextChips(day.context).join(" · ")}</p>}
              </div>
            </section>
          ))}

          <button
            onClick={() => setDaysBack((d) => d + 14)}
            className="w-full rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-ink-soft hover:border-line-strong hover:bg-surface"
          >
            Show earlier days
          </button>
        </div>
      )}
    </div>
  );
}
