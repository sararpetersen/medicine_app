import { useState } from "react";
import type { Medication, MedicationInput } from "../lib/db";
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
  const [doseAmount, setDoseAmount] = useState(
    initial?.dose_amount?.toString() ?? "",
  );
  const [doseUnit, setDoseUnit] = useState(initial?.dose_unit ?? "mg");
  const [times, setTimes] = useState<string[]>(
    initial ? initial.schedule_times.map(toHm) : ["08:00"],
  );

  const TIME_SUGGESTIONS = ["08:00", "14:00", "18:00", "21:00"];
  function setDosesPerDay(count: number) {
    setTimes((prev) =>
      count <= prev.length
        ? prev.slice(0, count)
        : [...prev, ...TIME_SUGGESTIONS.slice(prev.length, count)],
    );
  }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      await onSave({
        name: name.trim(),
        dose_amount: doseAmount ? Number(doseAmount) : null,
        dose_unit: doseAmount ? doseUnit.trim() || null : null,
        schedule_times: times,
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
        <label htmlFor="med-dose" className="mb-1 block text-sm text-ink-soft">
          Dose (optional)
        </label>
        <div className="flex gap-2">
          <input
            id="med-dose"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={doseAmount}
            onChange={(e) => setDoseAmount(e.target.value)}
            placeholder="50"
            className={`${inputClass} min-w-0 flex-1`}
          />
          <input
            value={doseUnit}
            onChange={(e) => setDoseUnit(e.target.value)}
            className={`${inputClass} w-24`}
            aria-label="Dose unit"
          />
        </div>
      </div>

      <div>
        <p className="mb-1 block text-sm text-ink-soft">
          How many times a day do you take it?
        </p>
        <div className="flex gap-2" role="group" aria-label="Times per day">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setDosesPerDay(n)}
              aria-pressed={times.length === n}
              className={`flex-1 rounded-xl border px-3 py-2 text-sm transition-colors ${
                times.length === n
                  ? "border-accent bg-accent-soft font-bold text-accent"
                  : "border-line bg-surface text-ink-soft hover:border-line-strong hover:bg-canvas"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          {times.map((time, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-sm text-ink-faint">
                {times.length === 1 ? "Time" : `Dose ${i + 1}`}
              </span>
              <input
                type="time"
                required
                aria-label={`Dose time ${i + 1}`}
                value={time}
                onChange={(e) =>
                  setTimes(times.map((t, j) => (j === i ? e.target.value : t)))
                }
                className={`${inputClass} min-w-0 flex-1`}
              />
            </div>
          ))}
        </div>
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
