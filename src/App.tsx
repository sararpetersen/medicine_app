import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useSession } from "./hooks/useSession";
import Login from "./pages/Login";
import Settings from "./pages/Settings";
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
          <Route
            path="/"
            element={
              <Placeholder
                title="Today"
                description="Your dose check-in and quick side-effect log will live here — the 10-second loop."
              />
            }
          />
          <Route
            path="/history"
            element={
              <Placeholder
                title="History"
                description="A calm timeline of everything you've logged, editable and retroactive-friendly."
              />
            }
          />
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
        <div className="mx-auto flex max-w-md justify-around">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === "/"}
              className={({ isActive }) =>
                `px-3 py-4 text-sm ${
                  isActive ? "font-bold text-accent" : "text-ink-faint"
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

export default function App() {
  const session = useSession();

  if (session === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-ink-faint">
        Sidekick is waking up…
      </div>
    );
  }
  if (!session) return <Login />;
  return <Shell />;
}
