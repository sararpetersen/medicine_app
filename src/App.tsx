import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useSession } from "./hooks/useSession";
import { listMedications } from "./lib/db";
import { usePrefs } from "./lib/prefs";
import { supabaseConfigError } from "./lib/supabase";
import Login from "./pages/Login";
import History from "./pages/History";
import Onboarding from "./pages/Onboarding";
import Patterns from "./pages/Patterns";
import Report from "./pages/Report";
import Settings from "./pages/Settings";
import Today from "./pages/Today";
import { useEntranceAnimations } from "./hooks/useEntranceAnimations";

const tabs = [
  { to: "/", label: "Today" },
  { to: "/history", label: "History" },
  { to: "/patterns", label: "Patterns" },
  { to: "/report", label: "Report" },
  { to: "/settings", label: "Settings" },
];

function TitleUpdater() {
  const { pathname } = useLocation();
  useEffect(() => {
    const tab = tabs.find((t) => (t.to === "/" ? pathname === "/" : pathname.startsWith(t.to)));
    document.title = tab && tab.to !== "/" ? `${tab.label} — Bivi` : "Bivi";
  }, [pathname]);
  return null;
}

function Shell() {
  const { prefs } = usePrefs();
  const navRef = useRef<HTMLElement>(null);
  useEntranceAnimations(navRef);

  return (
    <div className="mx-auto min-h-dvh max-w-md">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-xl focus:bg-surface focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <TitleUpdater />
      {!prefs.simplified && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 bottom-20 z-0 flex justify-center">
          <img src="/bivi/bivi-homescreen.webp" alt="" className="w-92 max-w-[70vw] opacity-[0.06]" />
        </div>
      )}
      <main id="main" className="relative z-10 px-5 pb-28">
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/history" element={<History />} />
          <Route path="/patterns" element={<Patterns />} />
          <Route path="/report" element={<Report />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <nav ref={navRef} className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
        <div data-entrance-stagger className="mx-auto flex max-w-md">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === "/"}
              className={({ isActive }) =>
                `flex-1 px-1 py-4 text-center text-xs ${isActive ? "font-bold text-accent" : "text-ink-faint hover:text-ink-soft"}`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

function Splash({ children }: { children: React.ReactNode }) {
  const entranceRef = useRef<HTMLDivElement>(null);
  useEntranceAnimations(entranceRef);
  return (
    <div ref={entranceRef} className="flex min-h-dvh items-center justify-center px-6 text-center text-ink-faint">
      {children}
    </div>
  );
}

function SetupGate() {
  const [medCount, setMedCount] = useState<number | "error" | undefined>();

  const check = useCallback(() => {
    setMedCount(undefined);
    listMedications()
      .then((meds) => setMedCount(meds.length))
      .catch(() => setMedCount("error"));
  }, []);

  useEffect(check, [check]);

  if (medCount === undefined) {
    return (
      <Splash>
        <div>
          <img src="/bivi/bivi-sleeping.webp" alt="" className="mx-auto mb-2 h-24 w-24" />
          <p>Bivi is waking up…</p>
        </div>
      </Splash>
    );
  }
  if (medCount === "error") {
    return (
      <Splash>
        <div>
          <p>Couldn't reach your data.</p>
          <button onClick={check} className="mt-3 text-accent">
            Try again
          </button>
        </div>
      </Splash>
    );
  }
  if (medCount === 0) return <Onboarding onDone={check} />;
  return <Shell />;
}

export default function App() {
  const session = useSession();

  if (supabaseConfigError) {
    return (
      <Splash>
        <div className="max-w-sm">
          <h1 className="text-xl font-bold text-ink">Bivi needs setup</h1>
          <p className="mt-2">{supabaseConfigError}</p>
          <p className="mt-2 text-sm">Add these variables in Netlify, then redeploy the site.</p>
        </div>
      </Splash>
    );
  }

  if (session === undefined) {
    return (
      <Splash>
        <div>
          <img src="/bivi/bivi-sleeping.webp" alt="" className="mx-auto mb-2 h-24 w-24" />
          <p>Bivi is waking up…</p>
        </div>
      </Splash>
    );
  }
  if (!session) return <Login />;
  return <SetupGate />;
}
