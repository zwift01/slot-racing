# Slot Racing PWA – Version 0.4.0

Kamerabasierte Slotcar-Rennzeitmessung als installierbare Progressive Web App.

## Lokal starten

Voraussetzung: Node.js 22 oder neuer.

```bash
npm ci
npm run dev
```

## Produktionsversion bauen

```bash
npm run build
npm run preview
```

Vite erstellt die fertige Anwendung im Ordner `dist/`. `dist/` wird nicht ins Repository eingecheckt, sondern von GitHub Actions automatisch gebaut.

## GitHub Pages

1. Den vollständigen Projektinhalt (ohne `node_modules/` und `dist/`) in das Repository hochladen.
2. Das Repository muss den Branch `main` verwenden.
3. In GitHub unter **Settings → Pages** als Quelle **GitHub Actions** auswählen.
4. Den Workflow **Build and deploy Slot Racing PWA** ausführen lassen (automatisch bei jedem Push auf `main`).
5. Nach erfolgreichem Workflow zeigt GitHub die Pages-Adresse im Bereich **Settings → Pages**.

Die Vite-Konfiguration verwendet `base: "./"`, damit relative Assets auch unter einer GitHub-Pages-Projektadresse funktionieren.

## Installation auf Android

Die GitHub-Pages-Adresse in Chrome öffnen und über das Browsermenü **Installieren** oder **Zum Startbildschirm hinzufügen** wählen. Für Kamerazugriff ist HTTPS erforderlich; GitHub Pages stellt HTTPS bereit.

## Version 0.4.0

- Soundeffekte über die Web Audio API
- Rundenzeiten pro Fahrer in einer gemeinsamen Vergleichstabelle
- Schnellste persönliche Runde mit ★ markiert
- GitHub-Actions-Build und Pages-Deployment
