import { useRef, useState } from "react";
import { useEntranceAnimations } from "../hooks/useEntranceAnimations";
import type { MedicationInput } from "../lib/db";
import { createEffectTypes, createMedication } from "../lib/db";
import MedicationForm from "../components/MedicationForm";

const SUGGESTED_CHIPS = [
  "No appetite",
  "Restless/jittery",
  "Headache",
  "Dry mouth",
  "Heart racing",
  "Trouble sleeping",
  "Overstimulated",
  "Low mood/crashing",
  "Nausea",
  "Irritable",
  "Anxious or nervous",
  "Dizzy/lightheaded",
  "Tired/fatigued",
  "Other",
];

type Step = "welcome" | "medication" | "chips";

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const entranceRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<Step>("welcome");
  const [medication, setMedication] = useState<MedicationInput | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [customChips, setCustomChips] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEntranceAnimations(entranceRef, [step]);

  function toggle(label: string) {
    setSelected((prev) => (prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]));
  }

  function addCustom() {
    const label = draft.trim();
    if (!label) return;
    if (!customChips.includes(label)) setCustomChips([...customChips, label]);
    if (!selected.includes(label)) setSelected([...selected, label]);
    setDraft("");
  }

  async function finish() {
    if (!medication) return;
    setBusy(true);
    setError(false);
    try {
      await createMedication(medication);
      const ordered = [...SUGGESTED_CHIPS, ...customChips].filter((label) => selected.includes(label));
      await createEffectTypes([
        ...ordered.map((label, i) => ({ label, sort_order: i })),
        { label: "Actually fine", is_good: true, sort_order: ordered.length },
      ]);
      onDone();
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  const chipBase = "rounded-full border px-4 py-2 text-sm transition-colors";

  return (
    <div ref={entranceRef} className="mx-auto min-h-dvh max-w-md px-5 pb-12">
      {step === "welcome" && (
        <div className="flex min-h-dvh flex-col items-center justify-center text-center">
          <img data-entrance-item src="/bivi/bivi-waving.webp" alt="" className="mb-3 h-32 w-32" />
          <h1 data-entrance-item className="text-2xl font-bold">
            Hi, I'm Bivi!
          </h1>
          <p data-entrance-item className="mt-3 text-ink-soft">
            Setup takes about two minutes, and there are only two things to tell me: which medication you take, and your own words for how it
            sometimes feels.
          </p>
          <p data-entrance-item className="mt-2 text-sm text-ink-faint">
            Everything can be changed later in settings.
          </p>
          <button
            data-entrance-item
            onClick={() => setStep("medication")}
            className="mt-8 w-full rounded-xl bg-accent px-4 py-3 font-bold text-on-accent hover:bg-accent-deep"
          >
            Let's set up
          </button>
        </div>
      )}

      {step === "medication" && (
        <div className="pt-10">
          <p data-entrance-item className="text-sm text-ink-faint">
            Step 1 of 2
          </p>
          <h1 data-entrance-item className="mt-1 text-2xl font-bold">
            Your medication
          </h1>
          <p data-entrance-item className="mt-2 mb-6 text-ink-soft">
            More medications can be added later in settings.
          </p>
          <div data-entrance-item>
            <MedicationForm
              submitLabel="Next"
              onSave={async (input) => {
                setMedication(input);
                setStep("chips");
              }}
            />
          </div>
        </div>
      )}

      {step === "chips" && (
        <div className="pt-10">
          <p data-entrance-item className="text-sm text-ink-faint">
            Step 2 of 2
          </p>
          <h1 data-entrance-item className="mt-1 text-2xl font-bold">
            Your words for it
          </h1>
          <p data-entrance-item className="mt-2 mb-6 text-ink-soft">
            Pick the side effects you sometimes notice – these become your one-tap chips. Rename or change them anytime in settings.
          </p>

          <div data-entrance-item className="flex flex-wrap gap-2">
            {[...SUGGESTED_CHIPS, ...customChips].map((label) => {
              const on = selected.includes(label);
              return (
                <button
                  key={label}
                  onClick={() => toggle(label)}
                  aria-pressed={on}
                  className={`${chipBase} ${
                    on
                      ? "border-accent bg-accent-soft font-bold text-accent hover:border-accent-deep"
                      : "border-line bg-surface text-ink-soft hover:border-line-strong hover:bg-canvas"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div data-entrance-item className="mt-4 flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              aria-label="Add your own side-effect word"
              placeholder="Add your own words…"
              className="flex-1 rounded-xl border border-line bg-surface px-4 py-3 outline-none focus:border-accent"
            />
            <button onClick={addCustom} className="rounded-xl border border-line px-4 py-3 text-ink-soft hover:border-line-strong hover:bg-surface">
              Add
            </button>
          </div>

          <p data-entrance-item className="mt-4 text-sm text-ink-faint">
            An <em>"Actually fine"</em> chip is included automatically – good days count too.
          </p>

          {error && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              Couldn't save your setup. Check your connection and try again.
            </p>
          )}

          <button
            data-entrance-item
            onClick={finish}
            disabled={busy}
            className="mt-6 w-full rounded-xl bg-accent px-4 py-3 font-bold text-on-accent hover:bg-accent-deep disabled:opacity-60"
          >
            {busy ? "Saving…" : "Finish setup"}
          </button>
        </div>
      )}
    </div>
  );
}
