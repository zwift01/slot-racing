import type { Calibration, ColorId, HsvRef } from "../types";
import { COLOR_DEFS } from "../types";

/** RGB (0..255) → HSV (h: 0..360, s/v: 0..255) */
export function rgbToHsv(r: number, g: number, b: number): HsvRef {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s: Math.round(s * 255), v: Math.round(max * 255) };
}

/**
 * Baut eine Lookup-Tabelle: quantisiertes RGB (15 Bit) → Bitmaske der passenden Farben.
 * Bit i gehört zur Farbe COLOR_DEFS[i]. Aufbau ist schnell, Abfrage pro Pixel dann O(1).
 */
export function buildLut(calibration: Calibration, tolerance: number): Uint8Array {
  const lut = new Uint8Array(1 << 15);
  const hueTol = tolerance * 1.6; // Grad
  const sTol = tolerance * 4.5; // Sättigung (0..255)
  const vTol = tolerance * 7; // Helligkeit (0..255) – großzügiger wegen Schatten
  const active: (HsvRef & { bit: number; neutral: boolean })[] = [];
  COLOR_DEFS.forEach((def, i) => {
    const c = calibration[def.id];
    if (c) {
      // Unbunte Referenzen (Weiß/Grau/Schwarz): der Farbton ist dort bedeutungslos
      // und würde zuverlässige Treffer verhindern → nur Sättigung + Helligkeit prüfen.
      active.push({ ...c, bit: 1 << i, neutral: c.s < 40 });
    }
  });
  if (active.length === 0) return lut;
  for (let q = 0; q < 32768; q++) {
    const r5 = (q >> 10) & 31;
    const g5 = (q >> 5) & 31;
    const b5 = q & 31;
    const { h, s, v } = rgbToHsv((r5 * 255) / 31, (g5 * 255) / 31, (b5 * 255) / 31);
    let mask = 0;
    for (let a = 0; a < active.length; a++) {
      const c = active[a];
      let dh = Math.abs(h - c.h);
      if (dh > 180) dh = 360 - dh;
      const hueOk = c.neutral || dh <= hueTol;
      if (hueOk && Math.abs(s - c.s) <= sTol && Math.abs(v - c.v) <= vTol) {
        mask |= c.bit;
      }
    }
    lut[q] = mask;
  }
  return lut;
}

/** Mittelt den HSV-Wert in einem kleinen Quadrat um (cx, cy) im Bild (Pixel-Koordinaten). */
export function sampleAvgHsv(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  cx: number,
  cy: number,
  radius = 6
): HsvRef {
  const x0 = Math.max(0, Math.floor(cx - radius));
  const x1 = Math.min(w - 1, Math.ceil(cx + radius));
  const y0 = Math.max(0, Math.floor(cy - radius));
  const y1 = Math.min(h - 1, Math.ceil(cy + radius));
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let n = 0;
  for (let y = y0; y <= y1; y++) {
    let i = (y * w + x0) * 4;
    for (let x = x0; x <= x1; x++) {
      sr += data[i];
      sg += data[i + 1];
      sb += data[i + 2];
      i += 4;
      n++;
    }
  }
  if (n === 0) return { h: 0, s: 0, v: 0 };
  return rgbToHsv(sr / n, sg / n, sb / n);
}

/** Reihenfolge der Farben (Index = Bit in der LUT) */
export const COLOR_INDEX: ColorId[] = COLOR_DEFS.map((c) => c.id);
