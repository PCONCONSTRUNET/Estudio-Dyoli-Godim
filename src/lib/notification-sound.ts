// Plays a short "ding-dong" notification sound using the Web Audio API.
// No asset needed; works on desktop and mobile (after first user gesture).

let audioCtx: AudioContext | null = null;
let unlocked = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  return audioCtx;
}

/** Call once from a user gesture (click/tap) to unlock audio on iOS/Safari. */
export function unlockNotificationAudio() {
  if (unlocked) return;
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  // Play a silent buffer to unlock
  try {
    const buffer = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start(0);
    unlocked = true;
  } catch {
    // ignore
  }
}

function beep(ctx: AudioContext, freq: number, startAt: number, duration: number, gain = 0.25) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, startAt);
  g.gain.exponentialRampToValueAtTime(gain, startAt + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
}

/** Plays a pleasant two-tone "ding-dong" alert. */
export function playNotificationSound() {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    beep(ctx, 880, now, 0.18);          // high tone
    beep(ctx, 1320, now + 0.18, 0.28);  // higher tone
  } catch (e) {
    // silent fail
  }
}
