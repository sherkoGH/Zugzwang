// lib/sfx.ts — Native HTML5 AudioContext sound synthesizer.
// Zero assets — every cue is generated procedurally with oscillators + envelopes.
// Lazy singleton; first user interaction creates the context (browsers require user gesture).

type Voice = "move" | "capture" | "promote" | "win" | "lose" | "click";

let ctx: AudioContext | null = null;
let muted = false;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  } catch {
    return null;
  }
  return ctx;
}

/** Mute / unmute globally. Persists via the calling store. */
export function setSfxMuted(m: boolean) {
  muted = m;
}

export function isSfxMuted(): boolean {
  return muted;
}

/** Schedule a quick ADSR-shaped tone. All times in seconds, frequencies in Hz. */
function tone(
  freq: number,
  durationMs: number,
  type: OscillatorType = "sine",
  startGain = 0.18,
  detune = 0
) {
  const ac = ensureCtx();
  if (!ac || muted) return;
  const now = ac.currentTime;
  const dur = durationMs / 1000;

  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  if (detune) osc.detune.value = detune;

  const gain = ac.createGain();
  // Fast attack, exponential decay — crisp "click" feel.
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(startGain, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

/** Play a recognizable acoustic cue. Safe to call before user gesture (will no-op). */
export function playSfx(voice: Voice): void {
  switch (voice) {
    case "move":
      // Wood-tap: short low square pulse.
      tone(220, 80, "triangle", 0.18);
      break;
    case "capture":
      // Snap: bright dyad, second tone slightly delayed.
      tone(440, 100, "square", 0.2);
      setTimeout(() => tone(330, 90, "square", 0.16), 30);
      break;
    case "promote":
      // Bell: rising perfect-fifth.
      tone(523.25, 140, "sine", 0.22);
      setTimeout(() => tone(783.99, 200, "sine", 0.2), 80);
      break;
    case "win":
      // Victory arpeggio: C–E–G.
      tone(523.25, 140, "triangle", 0.22);
      setTimeout(() => tone(659.25, 140, "triangle", 0.22), 120);
      setTimeout(() => tone(783.99, 280, "triangle", 0.24), 240);
      break;
    case "lose":
      // Descending minor third — gentle, not punishing.
      tone(329.63, 200, "sine", 0.18);
      setTimeout(() => tone(261.63, 320, "sine", 0.16), 180);
      break;
    case "click":
      tone(880, 40, "sine", 0.1);
      break;
  }
}

/** Some browsers suspend the context until a gesture. Call this from any onClick. */
export function resumeSfx(): void {
  const ac = ensureCtx();
  if (ac && ac.state === "suspended") {
    ac.resume().catch(() => undefined);
  }
}
