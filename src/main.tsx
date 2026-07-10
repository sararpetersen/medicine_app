import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/opendyslexic/400.css";
import "@fontsource/opendyslexic/700.css";
import "./index.css";
import App from "./App";
import { PrefsProvider } from "./lib/prefs";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PrefsProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PrefsProvider>
  </StrictMode>,
);
