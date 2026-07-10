import { useState } from "react";
import { requireSupabase } from "../lib/supabase";

type Status = "idle" | "sending" | "sent" | "error";

export default function Login() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const { error } = await requireSupabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setStatus(error ? "error" : "sent");
  }

  return (
    <div className="fade-in-up flex min-h-dvh flex-col items-center justify-center px-6">
      <img src="/bivi/bivi-logo.webp" alt="" className="mb-3 h-28 w-28" />
      <h1 className="text-2xl font-bold">Bivi</h1>
      <p className="mt-1 mb-8 text-center text-ink-soft">Your little side-effect sidekick</p>

      {status === "sent" ? (
        <div className="w-full max-w-sm rounded-2xl bg-good-soft p-5 text-center">
          <p className="font-bold text-good">Check your email</p>
          <p className="mt-1 text-sm text-ink-soft">A sign-in link is on its way to {email}. You can close this tab.</p>
        </div>
      ) : (
        <form onSubmit={sendLink} className="w-full max-w-sm space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email address"
            placeholder="you@example.com"
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full rounded-xl bg-accent px-4 py-3 font-bold text-on-accent hover:bg-accent-deep disabled:opacity-60"
          >
            {status === "sending" ? "Sending…" : "Email me a sign-in link"}
          </button>
          <p className="text-center text-sm text-ink-faint">No password to remember – just click the link.</p>
          {status === "error" && <p role="alert" className="text-center text-sm text-red-700">That didn't work. Check the address and try again.</p>}
        </form>
      )}
    </div>
  );
}
