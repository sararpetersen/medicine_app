import { useCallback, useEffect, useRef, useState } from "react";
import type { ContextFields, ContextLog, DoseLog, EffectLog, EffectType, Medication } from "../lib/db";
import {
  createDoseLog,
  createEffectLogs,
  deleteDoseLog,
  deleteEffectLog,
  getContextForDay,
  listDoseLogsForDay,
  listEffectLogsForDay,
  listEffectTypes,
  listMedications,
  localDateString,
  saveContextForDay,
} from "../lib/db";
import { usePrefs } from "../lib/prefs";

const SEVERITIES = [
  { value: 1, label: "Barely" },
  { value: 2, label: "Annoying" },
  { value: 3, label: "Rough" },
];

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function todayAt(hm: string): Date {
  const [h, m] = hm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function DoseCard({ med, logs, onChanged }: { med: Medication; logs: DoseLog[]; onChanged: () => Promise<void> }) {
  const [pickingTime, setPickingTime] = useState(false);
  const [loggingExtra, setLoggingExtra] = useState(false);
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const taken = logs.filter((l) => !l.skipped);
  const skipped = logs.some((l) => l.skipped);
  const scheduled = Math.max(med.schedule_times.length, 1);
  const allLogged = taken.length >= scheduled;

  const dose = med.dose_amount != null ? ` ${med.dose_amount} ${med.dose_unit ?? ""}` : "";

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="font-bold">
          {med.name}
          <span className="font-normal text-ink-soft">{dose}</span>
        </p>
        {taken.length > 0 && (
          <span className="rounded-full bg-good-soft px-3 py-1 text-sm text-good">
            {scheduled > 1 ? `${Math.min(taken.length, scheduled)} of ${scheduled} taken` : "taken"}
          </span>
        )}
        {skipped && taken.length === 0 && <span className="rounded-full bg-canvas px-3 py-1 text-sm text-ink-faint">skipped</span>}
      </div>

      {taken.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {taken.map((log) => (
            <span key={log.id} className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 text-sm text-ink-soft">
              {fmtTime(log.taken_at)}
              <button
                onClick={async () => {
                  await deleteDoseLog(log.id);
                  await onChanged();
                }}
                aria-label={`Remove dose logged at ${fmtTime(log.taken_at)}`}
                className="-my-2 ml-0.5 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-ink-faint hover:bg-canvas hover:text-ink"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {pickingTime ? (
        <div className="mt-3 flex gap-2">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            aria-label="Time the dose was taken"
            className="flex-1 rounded-xl border border-line bg-surface px-4 py-2 outline-none focus:border-accent"
          />
          <button
            onClick={async () => {
              await createDoseLog({
                medication_id: med.id,
                taken_at: todayAt(time).toISOString(),
              });
              setPickingTime(false);
              await onChanged();
            }}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-on-accent hover:bg-accent-deep"
          >
            Save
          </button>
          <button
            onClick={() => setPickingTime(false)}
            className="rounded-xl border border-line px-3 py-2 text-sm text-ink-soft hover:border-line-strong hover:bg-canvas"
          >
            Cancel
          </button>
        </div>
      ) : allLogged && !loggingExtra ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-sm text-good">All doses logged for today.</p>
          <button
            onClick={() => setLoggingExtra(true)}
            className="shrink-0 text-sm text-ink-faint hover:underline"
          >
            Log an extra dose
          </button>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            onClick={async () => {
              await createDoseLog({ medication_id: med.id });
              setLoggingExtra(false);
              await onChanged();
            }}
            className="flex-1 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-on-accent hover:bg-accent-deep"
          >
            Taken now
          </button>
          <button
            onClick={() => {
              setTime(new Date().toTimeString().slice(0, 5));
              setPickingTime(true);
            }}
            className="rounded-xl border border-line px-4 py-2 text-sm text-ink-soft hover:border-line-strong hover:bg-canvas"
          >
            Earlier…
          </button>
          {logs.length === 0 && (
            <button
              onClick={async () => {
                await createDoseLog({ medication_id: med.id, skipped: true });
                await onChanged();
              }}
              className="rounded-xl border border-line px-4 py-2 text-sm text-ink-faint hover:border-line-strong hover:bg-canvas"
            >
              Skipped
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function QuickLog({ types, simplified, onLogged }: { types: EffectType[]; simplified: boolean; onLogged: () => Promise<void> }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [severity, setSeverity] = useState<number | null>(null);
  const [earlier, setEarlier] = useState(false);
  const [date, setDate] = useState(() => localDateString());
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const active = types.filter((t) => t.active);
  const hasBadSelection = selected.some((id) => !types.find((t) => t.id === id)?.is_good);

  function toggle(id: string) {
    setConfirmed(false);
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function logIt() {
    setBusy(true);
    try {
      const when = earlier ? new Date(`${date}T${time}`) : new Date();
      await createEffectLogs(
        selected.map((id) => ({
          effect_type_id: id,
          occurred_at: when.toISOString(),
          severity: types.find((t) => t.id === id)?.is_good ? null : severity,
        })),
      );
      setSelected([]);
      setSeverity(null);
      setEarlier(false);
      setConfirmed(true);
      clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirmed(false), 4000);
      await onLogged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8">
      <h2 className="font-bold">How's it feeling right now?</h2>
      <p className="mt-1 text-sm text-ink-faint">Tap anything that fits — or nothing at all.</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {active.map((t) => {
          const on = selected.includes(t.id);
          return (
            <button
              key={t.id}
              onClick={() => toggle(t.id)}
              aria-pressed={on}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                on
                  ? "border-accent bg-accent-soft font-bold text-accent hover:border-accent-deep"
                  : "border-line bg-surface text-ink-soft hover:border-line-strong hover:bg-canvas"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {hasBadSelection && !simplified && (
        <div className="mt-4">
          <p className="text-sm text-ink-soft">
            How much is it bothering you? <span className="text-ink-faint">(optional)</span>
          </p>
          <div className="mt-2 flex gap-2">
            {SEVERITIES.map((s) => (
              <button
                key={s.value}
                onClick={() => setSeverity(severity === s.value ? null : s.value)}
                aria-pressed={severity === s.value}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm transition-colors ${
                  severity === s.value
                    ? "border-accent bg-accent-soft font-bold text-accent"
                    : "border-line bg-surface text-ink-soft hover:border-line-strong hover:bg-canvas"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {selected.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-ink-faint">When?</span>
            <button
              onClick={() => setEarlier(false)}
              aria-pressed={!earlier}
              className={earlier ? "text-ink-faint hover:underline" : "font-bold text-accent"}
            >
              Now
            </button>
            <button
              onClick={() => setEarlier(true)}
              aria-pressed={earlier}
              className={earlier ? "font-bold text-accent" : "text-ink-faint hover:underline"}
            >
              Earlier
            </button>
            {earlier && (
              <>
                <input
                  type="date"
                  value={date}
                  max={localDateString()}
                  onChange={(e) => setDate(e.target.value)}
                  aria-label="Which day it happened"
                  className="rounded-lg border border-line bg-surface px-2 py-1 outline-none focus:border-accent"
                />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  aria-label="What time it happened"
                  className="rounded-lg border border-line bg-surface px-2 py-1 outline-none focus:border-accent"
                />
              </>
            )}
          </div>
          <button
            onClick={logIt}
            disabled={busy}
            className="w-full rounded-xl bg-accent px-4 py-3 font-bold text-on-accent hover:bg-accent-deep disabled:opacity-60"
          >
            {busy ? "Logging…" : "Log it"}
          </button>
        </div>
      )}

      <div role="status" aria-live="polite" className="mt-3 min-h-10">
        {confirmed && (
          <div className="flex items-center gap-2">
            <img src="/bivi/bivi-celebrating.webp" alt="" className="h-10 w-10" />
            <p className="text-sm text-good">Logged. That's all – you're done.</p>
          </div>
        )}
      </div>
    </section>
  );
}

const CONTEXT_TOGGLES: {
  key: keyof ContextFields;
  label: string;
  onValue: number | boolean;
}[] = [
  { key: "sleep_quality", label: "Slept badly", onValue: 1 },
  { key: "ate_breakfast", label: "Ate breakfast", onValue: true },
  { key: "caffeine", label: "Caffeine", onValue: true },
  { key: "stress", label: "Stressful day", onValue: 3 },
];

function ContextCard({ context, onChanged }: { context: ContextLog | null; onChanged: () => Promise<void> }) {
  const fields: ContextFields = {
    sleep_quality: context?.sleep_quality ?? null,
    ate_breakfast: context?.ate_breakfast ?? null,
    caffeine: context?.caffeine ?? null,
    stress: context?.stress ?? null,
  };

  async function toggle(key: keyof ContextFields, onValue: number | boolean) {
    const next = { ...fields, [key]: fields[key] == null ? onValue : null };
    await saveContextForDay(localDateString(), next, context?.id ?? null);
    await onChanged();
  }

  return (
    <section className="mt-8">
      <h2 className="font-bold">
        Today's context <span className="font-normal text-ink-faint">(optional)</span>
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {CONTEXT_TOGGLES.map(({ key, label, onValue }) => {
          const on = fields[key] != null;
          return (
            <button
              key={key}
              onClick={() => toggle(key, onValue)}
              aria-pressed={on}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                on ? "border-good bg-good-soft font-bold text-good" : "border-line bg-surface text-ink-soft hover:border-line-strong hover:bg-canvas"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function Today() {
  const { prefs } = usePrefs();
  const [meds, setMeds] = useState<Medication[]>([]);
  const [types, setTypes] = useState<EffectType[]>([]);
  const [doseLogs, setDoseLogs] = useState<DoseLog[]>([]);
  const [effectLogs, setEffectLogs] = useState<EffectLog[]>([]);
  const [context, setContext] = useState<ContextLog | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const today = new Date();
    const [m, t, d, e, c] = await Promise.all([
      listMedications(),
      listEffectTypes(),
      listDoseLogsForDay(today),
      listEffectLogsForDay(today),
      getContextForDay(localDateString(today)),
    ]);
    setMeds(m.filter((x) => x.active));
    setTypes(t);
    setDoseLogs(d);
    setEffectLogs(e);
    setContext(c);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const heading = new Date().toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  if (!loaded) {
    return <p className="pt-10 text-center text-ink-faint">One moment…</p>;
  }

  return (
    <div className="pt-8">
      <p className="text-sm text-ink-faint">{heading}</p>
      <h1 className="mt-1 text-2xl font-bold">Today</h1>

      <div className="mt-4 space-y-3">
        {meds.map((med) => (
          <DoseCard key={med.id} med={med} logs={doseLogs.filter((l) => l.medication_id === med.id)} onChanged={refresh} />
        ))}
      </div>

      <QuickLog types={types} simplified={prefs.simplified} onLogged={refresh} />

      {effectLogs.length > 0 && (
        <section className="mt-8">
          <h2 className="font-bold">Logged today</h2>
          <ul className="mt-2 space-y-2">
            {effectLogs.map((log) => (
              <li key={log.id} className="flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-2">
                <span>
                  <span className="text-sm text-ink-faint">{fmtTime(log.occurred_at)}</span>{" "}
                  <span className={log.is_good ? "text-good" : ""}>{log.label}</span>
                  {log.severity != null && (
                    <span className="text-sm text-ink-soft"> · {SEVERITIES.find((s) => s.value === log.severity)?.label.toLowerCase()}</span>
                  )}
                </span>
                <button
                  onClick={async () => {
                    await deleteEffectLog(log.id);
                    await refresh();
                  }}
                  aria-label={`Delete ${log.label} logged at ${fmtTime(log.occurred_at)}`}
                  className="-m-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-ink-faint hover:bg-canvas hover:text-ink"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!prefs.simplified && <ContextCard context={context} onChanged={refresh} />}
    </div>
  );
}
