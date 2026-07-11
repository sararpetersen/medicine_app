import { useEffect, useRef, useState } from "react";
import { useEntranceAnimations } from "../hooks/useEntranceAnimations";
import { requireSupabase } from "../lib/supabase";
import { useSession } from "../hooks/useSession";
import type { EffectType, Medication } from "../lib/db";
import { createEffectTypes, createMedication, listEffectTypes, listMedications, toHm, updateEffectType, updateMedication } from "../lib/db";
import MedicationForm from "../components/MedicationForm";
import { FONT_STACKS, usePrefs, type FontChoice, type TextSize, type Theme } from "../lib/prefs";

function ProfileSection() {
  const { prefs, setPref } = usePrefs();
  const [photoError, setPhotoError] = useState("");
  const photoInput = useRef<HTMLInputElement>(null);
  const initial = prefs.username.trim().charAt(0).toUpperCase() || "B";

  async function choosePhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("Choose an image file.");
      return;
    }

    setPhotoError("");
    try {
      const bitmap = await createImageBitmap(file);
      const size = 256;
      const scale = Math.max(size / bitmap.width, size / bitmap.height);
      const width = bitmap.width * scale;
      const height = bitmap.height * scale;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      canvas.getContext("2d")?.drawImage(bitmap, (size - width) / 2, (size - height) / 2, width, height);
      bitmap.close();
      setPref("profilePhoto", canvas.toDataURL("image/jpeg", 0.82));
    } catch {
      setPhotoError("That photo couldn't be processed. Try another image.");
    } finally {
      if (photoInput.current) photoInput.current.value = "";
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
      <h2 className="font-bold">Your profile</h2>
      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-soft text-2xl font-bold text-accent">
          {prefs.profilePhoto ? <img src={prefs.profilePhoto} alt="Your profile" className="h-full w-full object-cover" /> : initial}
        </div>
        <div data-entrance-stagger className="flex flex-wrap gap-2">
          <input
            ref={photoInput}
            type="file"
            accept="image/*"
            onChange={(event) => void choosePhoto(event.target.files?.[0])}
            className="sr-only"
            aria-label="Choose profile photo"
          />
          <button
            onClick={() => photoInput.current?.click()}
            className="rounded-xl border border-line px-3 py-2 text-sm text-ink-soft hover:border-line-strong hover:bg-canvas"
          >
            {prefs.profilePhoto ? "Change photo" : "Add photo"}
          </button>
          {prefs.profilePhoto && (
            <button
              onClick={() => setPref("profilePhoto", null)}
              className="rounded-xl px-3 py-2 text-sm text-ink-faint hover:bg-canvas hover:text-ink"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      {photoError && (
        <p role="alert" className="mt-2 text-sm text-ink-soft">
          {photoError}
        </p>
      )}
      <label htmlFor="profile-name" className="mt-4 block text-sm text-ink-soft">
        Name
      </label>
      <input
        id="profile-name"
        value={prefs.username}
        maxLength={40}
        placeholder="What should Bivi call you?"
        onChange={(event) => setPref("username", event.target.value)}
        className="mt-1 w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none focus:border-accent"
      />
      <p className="mt-2 text-sm text-ink-faint">Saved to your account.</p>
    </section>
  );
}

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
      <div data-entrance-stagger className="mt-2 space-y-2">
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
    try {
      await updateEffectType(chip.id, { label: next });
      await onChanged();
    } catch {
      setLabel(chip.label);
      alert("The rename wasn't saved. Check your connection and try again.");
    }
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
            try {
              await updateEffectType(chip.id, { active: !chip.active });
              await onChanged();
            } catch {
              alert("That change wasn't saved. Check your connection and try again.");
            }
          }}
          className="shrink-0 text-sm text-ink-faint hover:underline"
        >
          {chip.active ? "Delete" : "Restore"}
        </button>
      )}
    </div>
  );
}

function ChipsSection() {
  const [chips, setChips] = useState<EffectType[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
    try {
      const maxOrder = Math.max(0, ...chips.map((c) => c.sort_order));
      await createEffectTypes([{ label, sort_order: maxOrder + 1 }]);
      setDraft("");
      await load();
    } catch {
      setError(`"${label}" wasn't saved. Check your connection and try again.`);
    }
  }

  return (
    <section className="mt-8">
      <h2 className="font-bold">Your side-effect chips</h2>
      <p className="mt-1 text-sm text-ink-soft">Tap a name to rename it. Deleted chips keep their old logs.</p>
      <div data-entrance-stagger className="mt-4 space-y-2">
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
            aria-label="New chip name"
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
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
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

const FONTS: { value: FontChoice; label: string }[] = [
  { value: "hyperlegible", label: "Standard" },
  { value: "system", label: "System" },
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
      <div className="mt-1 space-y-4">
        <div>
          <p className="text-sm text-ink-soft">Text size</p>
          <div data-entrance-stagger className="mt-2 flex gap-2">
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
          <div data-entrance-stagger className="mt-2 flex gap-2">
            {THEMES.map(({ value, label }) => (
              <button key={value} onClick={() => setPref("theme", value)} aria-pressed={prefs.theme === value} className={seg(prefs.theme === value)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm text-ink-soft">Font</p>
          <div data-entrance-stagger className="mt-2 flex gap-2">
            {FONTS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setPref("font", value)}
                aria-pressed={prefs.font === value}
                style={{ fontFamily: FONT_STACKS[value] }}
                className={seg(prefs.font === value)}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-faint opacity-75">
            Standard uses Atkinson Hyperlegible, designed for clear and distinguishable letter shapes.
          </p>
        </div>

        <div className="mt-8 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4">
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
  const entranceRef = useRef<HTMLDivElement>(null);
  const session = useSession();
  useEntranceAnimations(entranceRef);

  return (
    <div ref={entranceRef} className="pt-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      <ProfileSection />
      <MedicationsSection />
      <ChipsSection />
      <AccessibilitySection />

      <section className="mt-8 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-bold">Your privacy</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Bivi stores only the information needed to provide the service. Your data is{" "}
          <strong>
            <em>not</em>
          </strong>{" "}
          sold or used for advertising, and nothing is sent to your doctor automatically.
        </p>
        <a
          href="https://web-bivi.netlify.app/privacy/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-accent hover:underline"
        >
          Read the full privacy policy
          <span aria-hidden="true" className="ml-1">
            ↗
          </span>
        </a>
      </section>

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
