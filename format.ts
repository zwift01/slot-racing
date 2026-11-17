/** Rundenzeit: 8423 ms → "8,42 s" */
export function formatLap(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "–";
  return (ms / 1000).toFixed(2).replace(".", ",") + " s";
}

/** Rennuhr: 83420 ms → "1:23,4" */
export function formatRace(ms: number): string {
  const t = Math.max(0, ms);
  const m = Math.floor(t / 60000);
  const s = Math.floor((t % 60000) / 1000);
  const d = Math.floor((t % 1000) / 100);
  return `${m}:${String(s).padStart(2, "0")},${d}`;
}
