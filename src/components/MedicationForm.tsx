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
          When do you usually take it?
        </p>
        <div className="space-y-2">
          {times.map((time, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="time"
                required
                aria-label={`Dose time ${i + 1}`}
                value={time}
                onChange={(e) =>
                  setTimes(times.map((t, j) => (j === i ? e.target.value : t)))
                }
                className={`${inputClass} flex-1`}
              />
              {times.length > 1 && (
                <button
                  type="button"
                  onClick={() => setTimes(times.filter((_, j) => j !== i))}
                  className="rounded-xl border border-line px-3 py-3 text-sm text-ink-faint hover:border-line-strong hover:bg-canvas"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setTimes([...times, "14:00"])}
          className="mt-2 text-sm text-accent hover:underline"
        >
          + Add another time
        </button>
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
