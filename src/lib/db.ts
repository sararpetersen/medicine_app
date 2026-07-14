import { requireSupabase } from "./supabase";

export interface ScheduleSlot {
  time: string;
  dose_amount: number | null;
}

export interface Medication {
  id: string;
  name: string;
  dose_unit: string | null;
  schedule_times: ScheduleSlot[];
  active: boolean;
}

export interface MedicationInput {
  name: string;
  dose_unit: string | null;
  schedule_times: ScheduleSlot[];
}

export interface EffectType {
  id: string;
  label: string;
  is_good: boolean;
  sort_order: number;
  active: boolean;
}

// Postgres time columns come back as "08:00:00"; inputs want "08:00".
export function toHm(time: string): string {
  return time.slice(0, 5);
}

export function describeSchedule(med: Pick<Medication, "dose_unit" | "schedule_times">): string {
  const slots = med.schedule_times;
  if (slots.length === 0) return "";
  const unitSuffix = med.dose_unit ? ` ${med.dose_unit}` : "";
  const amounts = slots.map((s) => s.dose_amount);
  const sameAmount = amounts.every((a) => a === amounts[0]);

  if (sameAmount) {
    const times = slots.map((s) => toHm(s.time)).join(", ");
    return amounts[0] != null ? `${amounts[0]}${unitSuffix} at ${times}` : times;
  }
  return slots.map((s) => (s.dose_amount != null ? `${s.dose_amount}${unitSuffix} at ${toHm(s.time)}` : toHm(s.time))).join(", ");
}

export interface Profile {
  username: string;
  profilePhoto: string | null;
}

export async function getProfile(): Promise<Profile> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("sidekick_profiles")
    .select("username,profile_photo")
    .maybeSingle();
  if (error) throw error;
  return { username: data?.username ?? "", profilePhoto: data?.profile_photo ?? null };
}

export async function saveProfile(userId: string, profile: Profile): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("sidekick_profiles").upsert({
    user_id: userId,
    username: profile.username,
    profile_photo: profile.profilePhoto,
  });
  if (error) throw error;
}

export async function listMedications(): Promise<Medication[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("sidekick_medications")
    .select("id,name,dose_unit,schedule_times,active")
    .order("created_at");
  if (error) throw error;
  return data;
}

export async function createMedication(input: MedicationInput): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("sidekick_medications").insert(input);
  if (error) throw error;
}

export async function updateMedication(id: string, patch: Partial<MedicationInput> & { active?: boolean }): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("sidekick_medications").update(patch).eq("id", id);
  if (error) throw error;
}

export async function listEffectTypes(): Promise<EffectType[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("sidekick_effect_types")
    .select("id,label,is_good,sort_order,active")
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return data;
}

export async function createEffectTypes(inputs: { label: string; is_good?: boolean; sort_order?: number }[]): Promise<void> {
  const supabase = requireSupabase();
  // Bulk inserts must have uniform keys per row, or Postgres receives
  // explicit nulls instead of column defaults.
  const rows = inputs.map((input, i) => ({
    label: input.label,
    is_good: input.is_good ?? false,
    sort_order: input.sort_order ?? i,
  }));
  const { error } = await supabase.from("sidekick_effect_types").insert(rows);
  if (error) throw error;
}

export interface DoseLog {
  id: string;
  medication_id: string;
  taken_at: string;
  skipped: boolean;
}

export interface EffectLog {
  id: string;
  occurred_at: string;
  severity: number | null;
  label: string;
  is_good: boolean;
}

export interface ContextLog {
  id: string;
  date: string;
  sleep_quality: number | null;
  ate_breakfast: boolean | null;
  caffeine: boolean | null;
  stress: number | null;
  other: boolean | null;
  other_text: string | null;
}

export type ContextFields = Omit<ContextLog, "id" | "date">;

export function localDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dayRange(date: Date): [string, string] {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return [start.toISOString(), end.toISOString()];
}

export async function listDoseLogsBetween(start: Date, end: Date): Promise<DoseLog[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("sidekick_dose_logs")
    .select("id,medication_id,taken_at,skipped")
    .gte("taken_at", start.toISOString())
    .lt("taken_at", end.toISOString())
    .order("taken_at");
  if (error) throw error;
  return data;
}

export async function listDoseLogsForDay(date: Date): Promise<DoseLog[]> {
  const [start, end] = dayRange(date);
  return listDoseLogsBetween(new Date(start), new Date(end));
}

export async function createDoseLog(input: { medication_id: string; taken_at?: string; skipped?: boolean }): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("sidekick_dose_logs").insert({
    medication_id: input.medication_id,
    taken_at: input.taken_at ?? new Date().toISOString(),
    skipped: input.skipped ?? false,
  });
  if (error) throw error;
}

export async function deleteDoseLog(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("sidekick_dose_logs").delete().eq("id", id);
  if (error) throw error;
}

export async function listEffectLogsBetween(start: Date, end: Date): Promise<EffectLog[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("sidekick_effect_logs")
    .select("id,occurred_at,severity,sidekick_effect_types(label,is_good)")
    .gte("occurred_at", start.toISOString())
    .lt("occurred_at", end.toISOString())
    .order("occurred_at");
  if (error) throw error;
  return data.map((row) => {
    const type = row.sidekick_effect_types as unknown as {
      label: string;
      is_good: boolean;
    };
    return {
      id: row.id,
      occurred_at: row.occurred_at,
      severity: row.severity,
      label: type.label,
      is_good: type.is_good,
    };
  });
}

export async function listEffectLogsForDay(date: Date): Promise<EffectLog[]> {
  const [start, end] = dayRange(date);
  return listEffectLogsBetween(new Date(start), new Date(end));
}

export async function listContextLogsBetween(startDate: string, endDate: string): Promise<ContextLog[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("sidekick_context_logs")
    .select("id,date,sleep_quality,ate_breakfast,caffeine,stress,other,other_text")
    .gte("date", startDate)
    .lte("date", endDate);
  if (error) throw error;
  return data;
}

export async function createEffectLogs(
  rows: {
    effect_type_id: string;
    occurred_at: string;
    severity: number | null;
  }[],
): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("sidekick_effect_logs").insert(
    rows.map((row) => ({
      effect_type_id: row.effect_type_id,
      occurred_at: row.occurred_at,
      severity: row.severity,
    })),
  );
  if (error) throw error;
}

export async function deleteEffectLog(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("sidekick_effect_logs").delete().eq("id", id);
  if (error) throw error;
}

export async function getContextForDay(dateStr: string): Promise<ContextLog | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("sidekick_context_logs")
    .select("id,date,sleep_quality,ate_breakfast,caffeine,stress,other,other_text")
    .eq("date", dateStr)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveContextForDay(dateStr: string, fields: ContextFields, existingId: string | null): Promise<void> {
  const supabase = requireSupabase();
  const { error } = existingId
    ? await supabase.from("sidekick_context_logs").update(fields).eq("id", existingId)
    : await supabase.from("sidekick_context_logs").insert({ date: dateStr, ...fields });
  if (error) throw error;
}

export async function updateEffectType(id: string, patch: { label?: string; active?: boolean }): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("sidekick_effect_types").update(patch).eq("id", id);
  if (error) throw error;
}
