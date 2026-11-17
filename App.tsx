import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Flag, Radio, Sparkles } from "lucide-react";
import CameraPanel from "./components/CameraPanel";
import CalibrationPanel from "./components/CalibrationPanel";
import LinePanel from "./components/LinePanel";
import RacePanel from "./components/RacePanel";
import SoundPanel from "./components/SoundPanel";
import Leaderboard from "./components/Leaderboard";\nimport LapHistory from "./components/LapHistory";
import type { Calibration, CarStats, ColorId, HsvRef, Notice, RaceState } from "./types";
import { COLOR_DEFS, colorDef, freshStats } from "./types";
import { sound } from "./lib/sounds";
import { loadPersisted, savePersisted } from "./lib/storage";
import { formatLap } from "./lib/format";

const persisted = loadPersisted();

export default function App() {
  // ---- Einstellungen (werden lokal gespeichert) ----
  const [calibration, setCalibration] = useState<Calibration>(persisted.calibration);
  const [tolerance, setTolerance] = useState(persisted.tolerance);
  const [linePos, setLinePos] = useState(persisted.linePos);
  const [lineVertical, setLineVertical] = useState(persisted.lineVertical);
  const [volume, setVolume] = useState(persisted.volume);
  const [soundOn, setSoundOn] = useState(persisted.soundOn);
  const [minLapMs, setMinLapMs] = useState(persisted.minLapMs);
  const [lapTarget, setLapTarget] = useState(persisted.lapTarget);
  const [names, setNames] = useState(persisted.names);

  // ---- Kontrollzustand ----
  const [selectedColor, setSelectedColor] = useState<ColorId>("red");
  const [lastCalib, setLastCalib] = useState<{ id: ColorId; hsv: HsvRef } | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [live, setLive] = useState<ColorId[]>([]);
  const [notice, setNotice] = useState<Notice>({
    tone: "info",
    text: "Kamera starten, dann Farben kalibrieren und das Rennen beginnen.",
  });

  // ---- Rennen ----
  const raceRef = useRef<{ state: RaceState; base: number; startTs: number }>({
    state: "idle",
    base: 0,
    startTs: 0,
  });
  const [raceState, setRaceState] = useState<RaceState>("idle");
  const statsRef = useRef<Record<ColorId, CarStats>>(freshStats());
  const [stats, setStats] = useState<Record<ColorId, CarStats>>(statsRef.current);
  const raceFlag = useRef({ running: false });

  const getClock = useCallback(() => {
    const r = raceRef.current;
    return r.state === "running" ? r.base + (performance.now() - r.startTs) : r.base;
  }, []);

  const commit = useCallback(() => setStats({ ...statsRef.current }), []);

  const setRS = useCallback((s: RaceState) => {
    raceRef.current.state = s;
    raceFlag.current = { running: s === "running" };
    setRaceState(s);
  }, []);

  // ---- Sound-Einstellungen anwenden ----
  useEffect(() => {
    sound.setVolume(volume / 100);
  }, [volume]);
  useEffect(() => {
    sound.setEnabled(soundOn);
  }, [soundOn]);

  // ---- Alles lokal speichern ----
  useEffect(() => {
    savePersisted({
      calibration,
      tolerance,
      linePos,
      lineVertical,
      volume,
      soundOn,
      minLapMs,
      lapTarget,
      names,
    });
  }, [calibration, tolerance, linePos, lineVertical, volume, soundOn, minLapMs, lapTarget, names]);

  const getName = useCallback((id: ColorId) => names[id]?.trim() || colorDef(id).label, [names]);
  const getLaps = useCallback((id: ColorId) => statsRef.current[id].laps, []);

  const calibratedIds = useMemo(
    () => COLOR_DEFS.filter((d) => calibration[d.id]).map((d) => d.id),
    [calibration]
  );

  // ---- Rennaktionen ----
  const finishRace = useCallback(() => {
    const r = raceRef.current;
    if (r.state !== "running" && r.state !== "paused") return;
    r.base = getClock();
    setRS("finished");
    sound.play("finish");
    const list = calibratedIds
      .map((id) => statsRef.current[id])
      .filter((s) => s.laps > 0)
      .sort((a, b) => b.laps - a.laps || a.total / a.laps - b.total / b.laps);
    setNotice(
      list.length
        ? { tone: "ok", text: `Rennen beendet – Sieger: ${getName(list[0].id)} mit ${list[0].laps} Runden.` }
        : { tone: "info", text: "Rennen beendet – es wurden keine Runden gezählt." }
    );
  }, [calibratedIds, getClock, getName, setRS]);

  const startRace = useCallback(() => {
    if (!cameraOn) {
      setNotice({ tone: "warn", text: "Bitte zuerst die Kamera starten." });
      return;
    }
    if (calibratedIds.length === 0) {
      setNotice({ tone: "warn", text: "Bitte zuerst mindestens eine Fahrzeugfarbe kalibrieren." });
      return;
    }
    if (!detecting) {
      setNotice({ tone: "warn", text: "Bitte zuerst die Farberkennung starten (Schritt 1)." });
      return;
    }
    sound.unlock(); // Audio-Kontext per Benutzeraktion freischalten
    const fresh = freshStats();
    for (const id of calibratedIds) fresh[id].lastCross = 0; // Start direkt an der Linie
    statsRef.current = fresh;
    commit();
    raceRef.current.base = 0;
    raceRef.current.startTs = performance.now();
    setRS("running");
    setNotice({
      tone: "ok",
      text: "Rennen gestartet – jede Überquerung der Linie zählt ab jetzt eine Runde.",
    });
  }, [cameraOn, calibratedIds, detecting, commit, setRS]);

  const togglePause = useCallback(() => {
    const r = raceRef.current;
    if (r.state === "running") {
      r.base = getClock();
      setRS("paused");
      setNotice({ tone: "info", text: "Rennen pausiert." });
    } else if (r.state === "paused") {
      r.startTs = performance.now();
      setRS("running");
      setNotice({ tone: "ok", text: "Rennen geht weiter – viel Erfolg!" });
    }
  }, [getClock, setRS]);

  const resetRace = useCallback(() => {
    setRS("idle");
    raceRef.current.base = 0;
    statsRef.current = freshStats();
    commit();
    setNotice({ tone: "info", text: "Zurückgesetzt – bereit für den nächsten Start." });
  }, [commit, setRS]);

  // ---- Linien-Überquerung aus der Kamera → Runde zählen ----
  const onCrossing = useCallback(
    (id: ColorId) => {
      const r = raceRef.current;
      if (r.state !== "running") return;
      const t = getClock();
      const s = statsRef.current[id];
      if (s.lastCross != null && t - s.lastCross < minLapMs * 0.98) return; // Doppelzählung blocken
      const lapMs = s.lastCross == null ? null : t - s.lastCross;
      s.lastCross = t;
      s.laps += 1;
      s.lapTimes.push(lapMs);
      let isBest = false;
      if (lapMs != null) {
        s.lastLap = lapMs;
        s.total += lapMs;
        if (s.bestLap == null || lapMs < s.bestLap) {
          s.bestLap = lapMs;
          isBest = true;
        }
      }
      commit();
      sound.play("lap"); // „Dit!" bei jeder gültigen Runde
      const celebrate = isBest && s.laps >= 2;
      if (celebrate) window.setTimeout(() => sound.play("best"), 160); // Erfolgsmelodie
      setNotice(
        celebrate
          ? { tone: "ok", text: `Neue persönliche Bestzeit für ${getName(id)}: ${formatLap(lapMs)}!` }
          : {
              tone: "info",
              text: `Runde ${s.laps} für ${getName(id)}${lapMs != null ? ` – ${formatLap(lapMs)}` : ""}.`,
            }
      );
      if (lapTarget > 0 && s.laps >= lapTarget) finishRace();
    },
    [minLapMs, lapTarget, getClock, commit, getName, finishRace]
  );

  // ---- Kalibrierung ----
  const onCalibrate = useCallback((id: ColorId, hsv: HsvRef) => {
    setCalibration((c) => ({ ...c, [id]: hsv }));
    setLastCalib({ id, hsv });
    setNotice({
      tone: "ok",
      text: `Kalibriert: ${colorDef(id).label} · H ${Math.round(hsv.h)}° · S ${hsv.s} · V ${hsv.v}. Wähle die nächste Farbe.`,
    });
  }, []);

  const onClearSelected = useCallback(() => {
    setCalibration((c) => {
      const next = { ...c };
      delete next[selectedColor];
      return next;
    });
    setNotice({ tone: "info", text: `Kalibrierung für ${colorDef(selectedColor).label} gelöscht.` });
  }, [selectedColor]);

  const onToggleDetect = useCallback(() => {
    setDetecting((d) => {
      const next = !d;
      setNotice(
        next
          ? { tone: "ok", text: "Farberkennung aktiv – erkannte Markierungen werden eingerahmt." }
          : { tone: "info", text: "Farberkennung gestoppt." }
      );
      return next;
    });
  }, []);

  const onLive = useCallback((ids: ColorId[]) => setLive(ids), []);
  const onName = useCallback(
    (id: ColorId, v: string) => setNames((n) => ({ ...n, [id]: v })),
    []
  );

  // ---- Sieger (nach Rennende) ----
  const winner = useMemo(() => {
    if (raceState !== "finished") return null;
    const list = calibratedIds
      .map((id) => stats[id])
      .filter((s) => s.laps > 0)
      .sort((a, b) => b.laps - a.laps || a.total / a.laps - b.total / b.laps);
    const s = list[0];
    if (!s) return null;
    return {
      id: s.id,
      laps: s.laps,
      bestLap: s.bestLap,
      avgLap: s.laps > 0 ? s.total / s.laps : null,
    };
  }, [raceState, stats, calibratedIds]);

  return (
    <div className="min-h-screen bg-[#0b1117] text-slate-200">
      {/* Kopfzeile */}
      <header className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 pt-5 pb-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-sky-600 shadow-lg shadow-cyan-500/25">
          <Flag size={22} className="text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-black tracking-tight text-slate-50 sm:text-2xl">
            Slot Racing <span className="font-semibold text-slate-500">· Kamera-Zeitmessung</span>
          </h1>
          <p className="truncate text-[12px] text-slate-400">
            Farberkennung über Kamera · bis zu sechs Fahrzeuge · Rundenzeiten in Echtzeit
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-slate-700 bg-[#121a24] px-3 py-1.5 text-[11px] font-semibold text-slate-300 sm:flex">
            <Radio size={12} className="text-cyan-300" /> PWA
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1.5 text-[11px] font-bold text-cyan-200">
            <Sparkles size={12} /> Version 0.4
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 pb-8">
        <div className="grid items-start gap-4 lg:grid-cols-5">
          {/* Linke Spalte: Kamera */}
          <div className="lg:col-span-3">
            <CameraPanel
              calibration={calibration}
              tolerance={tolerance}
              detecting={detecting}
              selectedColor={selectedColor}
              linePos={linePos}
              lineVertical={lineVertical}
              raceFlag={raceFlag}
              notice={notice}
              onCrossing={onCrossing}
              onCalibrate={onCalibrate}
              onLive={onLive}
              onNotice={setNotice}
              onCameraChange={setCameraOn}
              getLaps={getLaps}
              getName={getName}
            />
          </div>

          {/* Rechte Spalte: Steuerung */}
          <div className="flex flex-col gap-4 lg:col-span-2">
            <CalibrationPanel
              selected={selectedColor}
              onSelect={setSelectedColor}
              calibration={calibration}
              lastCalib={lastCalib}
              detecting={detecting}
              onToggleDetect={onToggleDetect}
              onClearSelected={onClearSelected}
              tolerance={tolerance}
              onTolerance={setTolerance}
            />
            <LinePanel
              linePos={linePos}
              onLinePos={setLinePos}
              lineVertical={lineVertical}
              onLineVertical={setLineVertical}
            />
            <RacePanel
              state={raceState}
              getClock={getClock}
              onStart={startRace}
              onTogglePause={togglePause}
              onFinish={finishRace}
              onReset={resetRace}
              minLapMs={minLapMs}
              onMinLap={setMinLapMs}
              lapTarget={lapTarget}
              onLapTarget={setLapTarget}
              winner={winner}
              getName={getName}
            />
            <SoundPanel
              enabled={soundOn}
              onToggle={setSoundOn}
              volume={volume}
              onVolume={setVolume}
            />
          </div>
        </div>

        {/* Rangliste über volle Breite */}
        <div className="mt-4">
          <Leaderboard
            order={calibratedIds}
            stats={stats}
            names={names}
            onName={onName}
            live={new Set(live)}
            raceState={raceState}
            winnerId={winner?.id ?? null}
          />
        </div>

        <div className="mt-4">
          <LapHistory order={calibratedIds} stats={stats} names={names} />
        </div>
      </main>

      <footer className="mx-auto max-w-[1400px] px-4 pb-8 text-[12px] leading-relaxed text-slate-500">
        <p>
          Installation auf dem Tablet: Seite im Browser öffnen → Menü →{" "}
          <b className="text-slate-400">„Zum Startbildschirm hinzufügen“</b>. Danach läuft die App
          auch offline. Kamera benötigt HTTPS (bei GitHub Pages automatisch gegeben).
        </p>
        <p className="mt-1">
          Version 0.4 · Sounds per Web Audio API · Alle Daten (Kalibrierung, Namen, Einstellungen)
          bleiben lokal auf dem Gerät.
        </p>
      </footer>
    </div>
  );
}
