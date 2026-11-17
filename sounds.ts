/**
 * SoundEngine – alle Signale werden zur Laufzeit mit der Web Audio API
 * erzeugt, es werden keine Audiodateien benötigt.
 *
 *  - "lap"    : kurzes, dezentes „Dit!" bei jeder gültigen Runde
 *  - "best"   : mehrstufige Erfolgsmelodie bei neuer persönlicher Bestzeit
 *  - "finish" : kurze Siegesmelodie beim Rennende
 */

export type SoundKind = "lap" | "best" | "finish";

const NOTE = {
  A5: 880,
  C5: 523.25,
  E5: 659.25,
  G5: 783.99,
  B5: 987.77,
  C6: 1046.5,
  E6: 1318.51,
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  /** 0..1 */
  volume = 0.7;
  enabled = true;

  /** Muss einmal aus einer Benutzeraktion heraus aufgerufen werden (Autoplay-Sperre). */
  unlock() {
    this.ensure();
  }

  private ensure(): boolean {
    if (typeof window === "undefined") return false;
    const AC: typeof AudioContext | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return false;
    if (!this.ctx) {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.applyMaster();
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return true;
  }

  private applyMaster() {
    if (!this.master || !this.ctx) return;
    const target = this.enabled ? Math.pow(this.volume, 1.5) : 0;
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.015);
  }

  setVolume(v01: number) {
    this.volume = Math.min(1, Math.max(0, v01));
    this.ensure();
    this.applyMaster();
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    this.ensure();
    this.applyMaster();
  }

  private tone(o: {
    freq: number;
    at: number;
    dur: number;
    type?: OscillatorType;
    peak?: number;
  }) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + 0.01 + o.at;
    const osc = this.ctx.createOscillator();
    osc.type = o.type ?? "sine";
    osc.frequency.setValueAtTime(o.freq, t);
    const g = this.ctx.createGain();
    const peak = o.peak ?? 0.4;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.03, o.dur));
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + o.dur + 0.08);
  }

  play(kind: SoundKind) {
    if (!this.enabled) return;
    if (!this.ensure()) return;
    this.applyMaster();

    if (kind === "lap") {
      // kurzes, dezentes „Dit!"
      this.tone({ freq: NOTE.A5, at: 0, dur: 0.09, type: "sine", peak: 0.5 });
      this.tone({ freq: NOTE.A5 * 2, at: 0.004, dur: 0.045, type: "sine", peak: 0.12 });
    } else if (kind === "best") {
      // aufsteigende, mehrstufige Erfolgsmelodie
      const seq = [NOTE.E5, NOTE.G5, NOTE.B5, NOTE.E6];
      seq.forEach((f, i) =>
        this.tone({ freq: f, at: i * 0.095, dur: 0.24, type: "triangle", peak: 0.42 })
      );
      this.tone({ freq: NOTE.E6 * 2, at: 0.29, dur: 0.4, type: "sine", peak: 0.07 });
    } else {
      // kurze Siegesmelodie
      this.tone({ freq: NOTE.C5, at: 0, dur: 0.13, type: "square", peak: 0.2 });
      this.tone({ freq: NOTE.E5, at: 0.15, dur: 0.13, type: "square", peak: 0.2 });
      this.tone({ freq: NOTE.G5, at: 0.3, dur: 0.14, type: "square", peak: 0.2 });
      this.tone({ freq: NOTE.C6, at: 0.46, dur: 0.55, type: "triangle", peak: 0.5 });
      this.tone({ freq: NOTE.G5, at: 0.46, dur: 0.55, type: "triangle", peak: 0.16 });
      this.tone({ freq: NOTE.E6, at: 0.62, dur: 0.5, type: "sine", peak: 0.14 });
      this.tone({ freq: NOTE.C5 / 2, at: 0.46, dur: 0.6, type: "triangle", peak: 0.12 });
    }
  }
}

export const sound = new SoundEngine();
