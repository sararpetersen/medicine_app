import { supabase } from "../lib/supabase";
import { useSession } from "../hooks/useSession";

export default function Settings() {
  const session = useSession();

  return (
    <div className="pt-8">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-2 text-ink-soft">
        Medications and your chip palette will be managed here.
      </p>
      <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <p className="text-sm text-ink-faint">Signed in as</p>
        <p className="font-bold">{session?.user.email}</p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="mt-4 rounded-xl border border-line px-4 py-2 text-sm text-ink-soft"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
