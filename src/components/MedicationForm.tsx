import { useState } from "react";
import type { Medication, MedicationInput, ScheduleSlot } from "../lib/db";
import { toHm } from "../lib/db";

export default function MedicationForm({
  initial,
  submitLabel,
  onSave,
  onCancel,
}: {
  initial?: Medication;
  submitLabel: string;
  onSave: (input: MedicationInput) => Promise<void>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [doseUnit, setDoseUnit] = useState(initial?.dose_unit ?? "mg");
  const [slots, setSlots] = useState<{ time: string; doseAmount: string }[]>(
    initial
      ? initial.schedule_times.map((s) => ({ time: toHm(s.time), doseAmount: s.dose_amount?.toString() ?? "" }))
      : [{ time: "08:00", doseAmount: "" }],
  );

  const TIME_SUGGESTIONS = ["08:00", "14:00", "18:00", "21:00"];
  function setDosesPerDay(count: number) {
    setSlots((prev) =>
      count <= prev.length
        ? prev.slice(0, count)
        : [...prev, ...TIME_SUGGESTIONS.slice(prev.length, count).map((time) => ({ time, doseAmount: prev[0]?.doseAmount ?? "" }))],
    );
  }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  // Two rows sharing the same time (e.g. two pills taken together) merge into
  // one slot with a combined amount, rather than saving as duplicate times.
  function mergedSlots(): ScheduleSlot[] {
    const merged: ScheduleSlot[] = [];
    for (const s of slots) {
      const time = s.time.length === 5 ? `${s.time}:00` : s.time;
      const amount = s.doseAmount ? Number(s.doseAmount) : null;
      const existing = merged.find((m) => m.time === time);
      if (existing) {
        if (existing.dose_amount != null || amount != null) {
          existing.dose_amount = (existing.dose_amount ?? 0) + (amount ?? 0);
        }
      } else {
        merged.push({ time, dose_amount: amount });
      }
    }
    return merged;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      const schedule_times = mergedSlots();
      await onSave({
        name: name.trim(),
        dose_unit: schedule_times.some((s) => s.dose_amount != null) ? doseUnit.trim() || null : null,
        schedule_times,
      });
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  const inputClass =
    "rounded-xl border border-line bg-surface px-4 py-3 outline-none focus:border-accent";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="med-name" className="mb-1 block text-sm text-ink-soft">
          Medication name
        </label>
        <input
          id="med-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Elvanse, Ritalin, …"
          className={`${inputClass} w-full`}
        />
      </div>

      <div>
        <p className="mb-1 block text-sm text-ink-soft">
          How many separate times of day do you take it?
        </p>
        <p className="mb-2 text-xs text-ink-faint">
          If you take more than one pill at the same time, put that count in the amount field below — don't add another row for it.
        </p>
        <div className="flex gap-2" role="group" aria-label="Times per day">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setDosesPerDay(n)}
              aria-pressed={slots.length === n}
              className={`flex-1 rounded-xl border px-3 py-2 text-sm transition-colors ${
                slots.length === n
                  ? "border-accent bg-accent-soft font-bold text-accent"
                  : "border-line bg-surface text-ink-soft hover:border-line-strong hover:bg-canvas"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          {slots.map((slot, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-sm text-ink-faint">
                {slots.length === 1 ? "Time" : `Dose ${i + 1}`}
              </span>
              <input
                type="time"
                required
                aria-label={`Dose time ${i + 1}`}
                value={slot.time}
                onChange={(e) =>
                  setSlots(slots.map((s, j) => (j === i ? { ...s, time: e.target.value } : s)))
                }
                className={`${inputClass} min-w-0 flex-1`}
              />
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={slot.doseAmount}
                onChange={(e) =>
                  setSlots(slots.map((s, j) => (j === i ? { ...s, doseAmount: e.target.value } : s)))
                }
                placeholder="Amount"
                aria-label={`Dose amount at ${slot.time || "this time"}`}
                className={`${inputClass} w-24`}
              />
            </div>
          ))}
        </div>
        {slots.some((s) => s.doseAmount) && (
          <div className="mt-3 flex items-center gap-2">
            <label htmlFor="med-dose-unit" className="text-sm text-ink-soft">
              Unit
            </label>
            <input
              id="med-dose-unit"
              value={doseUnit}
              onChange={(e) => setDoseUnit(e.target.value)}
              className={`${inputClass} w-24`}
            />
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          Couldn't save that. Check your connection and try again.
        </p>
      )}

      <div className="flex gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-line px-4 py-3 text-ink-soft hover:border-line-strong hover:bg-canvas"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={busy}
          className="flex-1 rounded-xl bg-accent px-4 py-3 font-bold text-on-accent hover:bg-accent-deep disabled:opacity-60"
        >
          {busy ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
