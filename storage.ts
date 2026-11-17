import type { Calibration, ColorId } from "../types";

const KEY = "slotracing.v04";

export interface Persisted {
  calibration: Calibration;
  tolerance: number;
  linePos: number; // 0..1
  lineVertical: boolean;
  volume: number; // 0..100
  soundOn: boolean;
  minLapMs: number;
  lapTarget: number; // 0 = aus
  names: Partial<Record<ColorId, string>>;
}

export const DEFAULTS: Persisted = {
  calibration: {},
  tolerance: 12,
  linePos: 0.5,
  lineVertical: false,
  volume: 70,
  soundOn: true,
  minLapMs: 3000,
  lapTarget: 0,
  names: {},
};

export function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const p = JSON.parse(raw) as Partial<Persisted>;
    return {
      ...DEFAULTS,
      ...p,
      calibration: (p.calibration as Calibration) ?? {},
      names: (p.names as Persisted["names"]) ?? {},
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePersisted(p: Persisted) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* Speicher nicht verfügbar – ignorieren */
  }
}
