import { supabase } from "./supabase";

export interface Medication {
  id: string;
  name: string;
  dose_amount: number | null;
  dose_unit: string | null;
  schedule_times: string[];
  active: boolean;
}

export interface MedicationInput {
  name: string;
  dose_amount: number | null;
  dose_unit: string | null;
  schedule_times: string[];
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

export async function listMedications(): Promise<Medication[]> {
  const { data, error } = await supabase
    .from("sidekick_medications")
    .select("id,name,dose_amount,dose_unit,schedule_times,active")
    .order("created_at");
  if (error) throw error;
  return data;
}

export async function createMedication(input: MedicationInput): Promise<void> {
  const { error } = await supabase.from("sidekick_medications").insert(input);
  if (error) throw error;
}

export async function updateMedication(
  id: string,
  patch: Partial<MedicationInput> & { active?: boolean },
): Promise<void> {
  const { error } = await supabase
    .from("sidekick_medications")
    .update(patch)
    .eq("id", id);
  if (error) throw error;
}

export async function listEffectTypes(): Promise<EffectType[]> {
  const { data, error } = await supabase
    .from("sidekick_effect_types")
    .select("id,label,is_good,sort_order,active")
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return data;
}

export async function createEffectTypes(
  inputs: { label: string; is_good?: boolean; sort_order?: number }[],
): Promise<void> {
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

export async function updateEffectType(
  id: string,
  patch: { label?: string; active?: boolean },
): Promise<void> {
  const { error } = await supabase
    .from("sidekick_effect_types")
    .update(patch)
    .eq("id", id);
  if (error) throw error;
}
