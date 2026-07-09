import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

if (import.meta.env.DEV) {
  // Handy for driving the app from the browser console during development.
  (window as unknown as Record<string, unknown>).supabase = supabase;
}
