import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const missingVars = [
  !supabaseUrl && "VITE_SUPABASE_URL",
  !supabaseAnonKey && "VITE_SUPABASE_ANON_KEY",
].filter(Boolean);

export const supabaseConfigError =
  missingVars.length > 0
    ? `Missing Supabase environment variable${missingVars.length === 1 ? "" : "s"}: ${missingVars.join(", ")}`
    : null;

export const supabase = supabaseConfigError
  ? null
  : createClient(supabaseUrl, supabaseAnonKey);

export function requireSupabase() {
  if (!supabase) {
    throw new Error(supabaseConfigError ?? "Supabase is not configured.");
  }
  return supabase;
}

if (import.meta.env.DEV && supabase) {
  // Handy for driving the app from the browser console during development.
  (window as unknown as Record<string, unknown>).supabase = supabase;
}
