import { useEffect, useState } from "react";
import { requireSupabase } from "../lib/supabase";
import { useSession } from "../hooks/useSession";
import type { EffectType, Medication } from "../lib/db";
import { createEffectTypes, createMedication, listEffectTypes, listMedications, toHm, updateEffectType, updateMedication } from "../lib/db";
import MedicationForm from "../components/MedicationForm";
import { usePrefs, type TextSize, type Theme } from "../lib/prefs";

function describeDose(med: Medication): string {
  const dose = med.dose_amount != null ? `${med.dose_amount} ${med.dose_unit ?? ""}` : "";
  const times = med.schedule_times.map(toHm).join(", ");
  return [dose.trim(), times].filter(Boolean).join(" · ");
}

function MedicationsSection() {
  const [meds, setMeds] = useState<Medication[]>([]);
  const [editing, setEditing] = useState<string | "new" | null>(null);

  const load = () =>
    listMedications()
      .then(setMeds)
      .catch(() => {});
  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="mt-6">
      <h2 className="font-bold">Medications</h2>
      <div className="mt-2 space-y-2">
        {meds.map((med) =>
          editing === med.id ? (
            <div key={med.id} className="rounded-2xl border border-line bg-surface p-4">
              <MedicationForm
                initial={med}
                submitLabel="Save"
                onCancel={() => setEditing(null)}
                onSave={async (input) => {
                  await updateMedication(med.id, input);
                  setEditing(null);
                  await load();
                }}
              />
            </div>
          ) : (
            <div
              key={med.id}
              className={`flex items-center justify-between rounded-2xl border border-line bg-surface p-4 ${med.active ? "" : "opacity-60"}`}
            >
              <div>
                <p className="font-bold">
                  {med.name}
                  {!med.active && <span className="ml-2 text-sm font-normal text-ink-faint">paused</span>}
                </p>
                <p className="text-sm text-ink-soft">{describeDose(med)}</p>
              </div>
              <div className="flex gap-3 text-sm">
                <button onClick={() => setEditing(med.id)} className="text-accent hover:underline">
                  Edit
                </button>
                <button
                  onClick={async () => {
                    await updateMedication(med.id, { active: !med.active });
                    await load();
                  }}
                  className="text-ink-faint hover:underline"
                >
                  {med.active ? "Pause" : "Resume"}
                </button>
              </div>
            </div>
          ),
        )}

        {editing === "new" ? (
          <div className="rounded-2xl border border-line bg-surface p-4">
            <MedicationForm
              submitLabel="Add"
              onCancel={() => setEditing(null)}
              onSave={async (input) => {
                await createMedication(input);
                setEditing(null);
                await load();
              }}
            />
          </div>
        ) : (
          <button
            onClick={() => setEditing("new")}
            className="w-full rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-ink-soft hover:border-line-strong hover:bg-surface"
          >
            + Add medication
          </button>
        )}
      </div>
    </section>
  );
}

function ChipRow({ chip, onChanged }: { chip: EffectType; onChanged: () => Promise<void> }) {
  const [label, setLabel] = useState(chip.label);

  async function commitRename() {
    const next = label.trim();
    if (!next || next === chip.label) {
      setLabel(chip.label);
      return;
    }
    await updateEffectType(chip.id, { label: next });
    await onChanged();
  }

  return (
    <div className={`flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-2 ${chip.active ? "" : "opacity-60"}`}>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={commitRename}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        aria-label={`Rename ${chip.label}`}
        className="min-w-0 flex-1 bg-transparent py-1 outline-none"
      />
      {chip.is_good ? (
        <span className="shrink-0 rounded-full bg-good-soft px-2 py-1 text-xs text-good">built-in</span>
      ) : (
        <button
          onClick={async () => {
            await updateEffectType(chip.id, { active: !chip.active });
            await onChanged();
          }}
          className="shrink-0 text-sm text-ink-faint hover:underline"
        >
          {chip.active ? "Retire" : "Restore"}
        </button>
      )}
    </div>
  );
}

function ChipsSection() {
  const [chips, setChips] = useState<EffectType[]>([]);
  const [draft, setDraft] = useState("");

  const load = () =>
    listEffectTypes()
      .then(setChips)
      .catch(() => {});
  useEffect(() => {
    void load();
  }, []);

  async function addChip() {
    const label = draft.trim();
    if (!label) return;
    const maxOrder = Math.max(0, ...chips.map((c) => c.sort_order));
    await createEffectTypes([{ label, sort_order: maxOrder + 1 }]);
    setDraft("");
    await load();
  }

  return (
    <section className="mt-8">
      <h2 className="font-bold">Your side-effect chips</h2>
      <p className="mt-1 text-sm text-ink-soft">Tap a name to rename it. Retired chips keep their old logs.</p>
      <div className="mt-2 space-y-2">
        {chips.map((chip) => (
          <ChipRow key={chip.id} chip={chip} onChanged={load} />
        ))}
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void addChip();
              }
            }}
            placeholder="Add a new chip…"
            className="flex-1 rounded-xl border border-line bg-surface px-4 py-2 outline-none focus:border-accent"
          />
          <button
            onClick={addChip}
            className="rounded-xl border border-line px-4 py-2 text-sm text-ink-soft hover:border-line-strong hover:bg-surface"
          >
            Add
          </button>
        </div>
      </div>
    </section>
  );
}

const TEXT_SIZES: { value: TextSize; label: string }[] = [
  { value: "s", label: "S" },
  { value: "m", label: "M" },
  { value: "l", label: "L" },
  { value: "xl", label: "XL" },
];

const THEMES: { value: Theme; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

function AccessibilitySection() {
  const { prefs, setPref } = usePrefs();

  const seg = (on: boolean) =>
    `flex-1 rounded-xl border px-3 py-2 text-sm transition-colors ${
      on ? "border-accent bg-accent-soft font-bold text-accent" : "border-line bg-surface text-ink-soft hover:border-line-strong hover:bg-canvas"
    }`;

  return (
    <section className="mt-8">
      <h2 className="font-bold">Accessibility</h2>
      <div className="mt-3 space-y-4">
        <div>
          <p className="text-sm text-ink-soft">Text size</p>
          <div className="mt-2 flex gap-2">
            {TEXT_SIZES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setPref("textSize", value)}
                aria-pressed={prefs.textSize === value}
                className={seg(prefs.textSize === value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm text-ink-soft">Theme</p>
          <div className="mt-2 flex gap-2">
            {THEMES.map(({ value, label }) => (
              <button key={value} onClick={() => setPref("theme", value)} aria-pressed={prefs.theme === value} className={seg(prefs.theme === value)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4">
          <div>
            <p className="font-bold">Simplified logging</p>
            <p className="text-sm text-ink-soft">Just the chips – hides severity and daily context on 'Today'.</p>
          </div>
          <button
            role="switch"
            aria-checked={prefs.simplified}
            onClick={() => setPref("simplified", !prefs.simplified)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-colors ${
              prefs.simplified
                ? "border-accent bg-accent-soft font-bold text-accent"
                : "border-line bg-surface text-ink-soft hover:border-line-strong hover:bg-canvas"
            }`}
          >
            {prefs.simplified ? "On" : "Off"}
          </button>
        </div>
      </div>
    </section>
  );
}

export default function Settings() {
  const session = useSession();

  return (
    <div className="pt-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      <MedicationsSection />
      <ChipsSection />
      <AccessibilitySection />

      <section className="mt-8 rounded-2xl border border-line bg-surface p-5">
        <p className="text-sm text-ink-faint">Signed in as</p>
        <p className="font-bold">{session?.user.email}</p>
        <button
          onClick={() => requireSupabase().auth.signOut()}
          className="mt-4 rounded-xl border border-line px-4 py-2 text-sm text-ink-soft hover:border-line-strong hover:bg-canvas"
        >
          Sign out
        </button>
      </section>
    </div>
  );
}
