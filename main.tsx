import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// ---- PWA: Manifest + Icons relativ zum Seitenpfad einbinden ----
// (funktioniert damit auch auf GitHub Pages in Unterverzeichnissen,
// z. B. https://name.github.io/slot-racing/)
function injectLink(rel: string, file: string) {
  const link = document.createElement("link");
  link.rel = rel;
  link.href = new URL(file, document.baseURI).href;
  document.head.appendChild(link);
}
injectLink("manifest", "manifest.webmanifest");
injectLink("icon", "icons/icon-192.png");
injectLink("apple-touch-icon", "icons/icon-192.png");

// ---- PWA: Service Worker registrieren (nur im Build, nicht in der Vorschau) ----
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const swUrl = new URL("sw.js", document.baseURI);
    navigator.serviceWorker.register(swUrl).catch(() => {
      /* Offline-Modus dann nicht verfügbar – App läuft trotzdem */
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
