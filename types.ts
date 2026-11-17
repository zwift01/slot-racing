export type ColorId = "red" | "blue" | "yellow" | "green" | "black" | "white";

export interface ColorDef {
  id: ColorId;
  label: string;
  /** Anzeigefarbe für Chips / Buttons */
  css: string;
  /** Farbe für Erkennungs-Rahmen im Overlay (gut sichtbar) */
  overlay: string;
  /** Helle Schrift auf der Farbe? */
  dark: boolean;
}

export const COLOR_DEFS: ColorDef[] = [
  { id: "red", label: "Rot", css: "#fb4d5e", overlay: "#ff4d5e", dark: true },
  { id: "blue", label: "Blau", css: "#4f8dff", overlay: "#4f8dff", dark: true },
  { id: "yellow", label: "Gelb", css: "#ffd23f", overlay: "#ffd23f", dark: false },
  { id: "green", label: "Grün", css: "#3ddc6b", overlay: "#3ddc6b", dark: false },
  { id: "black", label: "Schwarz", css: "#2b3542", overlay: "#aeb9c6", dark: true },
  { id: "white", label: "Weiß", css: "#eef3fa", overlay: "#ffffff", dark: false },
];

export interface HsvRef {
  h: number; // 0..360
  s: number; // 0..255
  v: number; // 0..255
}

export type Calibration = Partial<Record<ColorId, HsvRef>>;

export interface CarStats {
  id: ColorId;
  laps: number;
  lastLap: number | null; // ms
  lapTimes: (number | null)[]; // Einzelzeiten je gezählter Runde (ms)
  bestLap: number | null; // ms
  total: number; // Summe aller gezählten Rundenzeiten
  lastCross: number | null; // Rennuhr-Zeitpunkt (ms) der letzten Linen-Überquerung
}

export interface Detection {
  x: number;
  y: number;
  w: number;
  h: number; // normierte Bounding-Box (0..1)
  cx: number;
  cy: number; // normierter Schwerpunkt
  area: number;
  at: number; // performance.now()
}

export type RaceState = "idle" | "running" | "paused" | "finished";

export interface Notice {
  tone: "info" | "ok" | "warn";
  text: string;
}

export function freshStats(): Record<ColorId, CarStats> {
  const out = {} as Record<ColorId, CarStats>;
  for (const c of COLOR_DEFS) {
    out[c.id] = { id: c.id, laps: 0, lastLap: null, lapTimes: [], bestLap: null, total: 0, lastCross: null };
  }
  return out;
}

export const colorDef = (id: ColorId): ColorDef => COLOR_DEFS.find((c) => c.id === id)!;
