import { useCallback, useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useSession } from "./hooks/useSession";
import { listMedications } from "./lib/db";
import Login from "./pages/Login";
import History from "./pages/History";
import Onboarding from "./pages/Onboarding";
import Settings from "./pages/Settings";
import Today from "./pages/Today";
import Placeholder from "./components/Placeholder";

const tabs = [
  { to: "/", label: "Today" },
  { to: "/history", label: "History" },
  { to: "/patterns", label: "Patterns" },
  { to: "/report", label: "Report" },
  { to: "/settings", label: "Settings" },
];

function Shell() {
  return (
    <div className="mx-auto min-h-dvh max-w-md">
      <main className="px-5 pb-28">
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/history" element={<History />} />
          <Route
            path="/patterns"
            element={
              <Placeholder
                title="Patterns"
                description="Once there's a little data, Sidekick shows when effects appear and what they correlate with."
              />
            }
          />
          <Route
            path="/report"
            element={
              <Placeholder
                title="Doctor report"
                description="A one-page printable summary to bring to your next appointment."
              />
            }
          />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-md">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === "/"}
              className={({ isActive }) =>
                `flex-1 px-1 py-4 text-center text-xs ${
                  isActive
                    ? "font-bold text-accent"
                    : "text-ink-faint hover:text-ink-soft"
                }`
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
  return (
    <div className="flex min-h-dvh items-center justify-center px-6 text-center text-ink-faint">
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

  if (medCount === undefined) return <Splash>Sidekick is waking up…</Splash>;
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

  if (session === undefined) return <Splash>Sidekick is waking up…</Splash>;
  if (!session) return <Login />;
  return <SetupGate />;
}
