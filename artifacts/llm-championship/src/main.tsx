import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Optionales Theme-Override via Vite-Env-Variablen.
// .env:  VITE_COLOR_BLACK=#1a1a2e  VITE_COLOR_WHITE=#e8e8e0
// Zur Laufzeit: document.documentElement.style.setProperty('--color-mac-black', '#f00')
const root = document.documentElement;
const envBlack = import.meta.env.VITE_COLOR_BLACK as string | undefined;
const envWhite = import.meta.env.VITE_COLOR_WHITE as string | undefined;
if (envBlack) root.style.setProperty("--color-mac-black", envBlack);
if (envWhite) root.style.setProperty("--color-mac-white", envWhite);

createRoot(document.getElementById("root")!).render(<App />);
