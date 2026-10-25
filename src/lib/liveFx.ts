// Efè son live la (FX), fabrike dirèkteman nan navigatè a ak Web Audio: pa gen fichye pou telechaje
// (bon pou entènèt fèb). Atis la peze yon bouton; tout moun k ap gade a tande l.

export type FxId = "mesi" | "bravo" | "klaxon" | "tanbou" | "badum" | "wow" | "fet" | "kè";

export const FX: { id: FxId; emoji: string; label: string }[] = [
  { id: "mesi", emoji: "🙏", label: "Mèsi" },
  { id: "bravo", emoji: "👏", label: "Bravo" },
  { id: "klaxon", emoji: "📯", label: "Klaksonn" },
  { id: "tanbou", emoji: "🥁", label: "Tanbou" },
  { id: "fet", emoji: "🎉", label: "Fèt" },
  { id: "wow", emoji: "😮", label: "Wow" },
  { id: "badum", emoji: "🤣", label: "Ba-dum" },
  { id: "kè", emoji: "💓", label: "Kè" },
];

let ctx: AudioContext | null = null;
let noiseBuf: AudioBuffer | null = null;

function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

// Navigatè yo bloke son an jiskaske moun nan touche ekran an: nou debloke l nan premye tap la
export function unlockFx() {
  ac();
}

function noise(c: AudioContext) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  return s;
}

function master(c: AudioContext, vol = 0.7) {
  const g = c.createGain();
  g.gain.value = vol;
  const comp = c.createDynamicsCompressor();
  g.connect(comp).connect(c.destination);
  return g;
}

// Yon nòt ak anvlòp (atak / desant)
function tone(c: AudioContext, out: AudioNode, freq: number, t: number, dur: number, type: OscillatorType = "sine", vol = 0.3) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
}

// Yon kou bri (tanbou, men k ap bat, simbal)
function hit(c: AudioContext, out: AudioNode, t: number, dur: number, filter: BiquadFilterType, freq: number, vol: number, q = 1) {
  const n = noise(c);
  const f = c.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  n.connect(f).connect(g).connect(out);
  n.start(t, Math.random());
  n.stop(t + dur + 0.05);
}

function kick(c: AudioContext, out: AudioNode, t: number, vol = 0.9) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.18);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.35);
}

// Foul k ap bat bravo: anpil ti klak bri, chak ak pwòp ritm li
function applause(c: AudioContext, out: AudioNode, t: number, dur: number, vol = 0.22) {
  const claps = Math.floor(dur * 55);
  for (let i = 0; i < claps; i++) {
    const at = t + Math.random() * dur;
    const fade = 1 - Math.max(0, (at - t - dur * 0.6) / (dur * 0.4));
    hit(c, out, at, 0.05 + Math.random() * 0.04, "bandpass", 900 + Math.random() * 1800, vol * fade * (0.5 + Math.random()), 1.2);
  }
}

function whistle(c: AudioContext, out: AudioNode, t: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.setValueAtTime(1800, t);
  o.frequency.exponentialRampToValueAtTime(2900, t + 0.25);
  o.frequency.setValueAtTime(2900, t + 0.4);
  o.frequency.exponentialRampToValueAtTime(1600, t + 0.75);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.12, t + 0.05);
  g.gain.setValueAtTime(0.12, t + 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.85);
}

function airhorn(c: AudioContext, out: AudioNode, t: number, dur: number) {
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 2400;
  f.connect(out);
  for (const freq of [440, 554, 659, 880]) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(freq * 0.94, t);
    o.frequency.linearRampToValueAtTime(freq, t + 0.06);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.03);
    g.gain.setValueAtTime(0.09, t + dur - 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(f);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
}

// Gwo gwonde lyon an: bri grav + vibrasyon ki monte epi ki desann
function roar(c: AudioContext, out: AudioNode, t: number) {
  const dur = 2.1;
  const n = noise(c);
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(300, t);
  lp.frequency.linearRampToValueAtTime(1200, t + 0.5);
  lp.frequency.exponentialRampToValueAtTime(220, t + dur);
  lp.Q.value = 4;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(1.1, t + 0.35);
  g.gain.setValueAtTime(1.1, t + 0.9);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  // Grenn nan gòj la (tremolo rapid)
  const trem = c.createGain();
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.frequency.setValueAtTime(28, t);
  lfo.frequency.linearRampToValueAtTime(16, t + dur);
  lfoGain.gain.value = 0.5;
  trem.gain.value = 0.6;
  lfo.connect(lfoGain).connect(trem.gain);
  n.connect(lp).connect(trem).connect(g).connect(out);
  // Vwa grav la
  const o = c.createOscillator();
  const og = c.createGain();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(95, t);
  o.frequency.linearRampToValueAtTime(140, t + 0.5);
  o.frequency.exponentialRampToValueAtTime(60, t + dur);
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(0.35, t + 0.3);
  og.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const of = c.createBiquadFilter();
  of.type = "lowpass";
  of.frequency.value = 700;
  o.connect(of).connect(og).connect(g);
  n.start(t);
  n.stop(t + dur + 0.1);
  o.start(t);
  o.stop(t + dur + 0.1);
  lfo.start(t);
  lfo.stop(t + dur + 0.1);
  kick(c, out, t, 1);
}

// Bèl fanfa pou gwo kado yo (250+ goud)
function fanfare(c: AudioContext, out: AudioNode, t: number) {
  const notes = [523, 659, 784, 1047];
  notes.forEach((f, i) => tone(c, out, f, t + i * 0.12, 0.5, "triangle", 0.22));
  [523, 659, 784, 1047].forEach((f) => tone(c, out, f, t + 0.55, 1.2, "triangle", 0.12));
  hit(c, out, t + 0.55, 1.2, "highpass", 6000, 0.25);
  kick(c, out, t + 0.55);
}

export function playFx(id: FxId) {
  const c = ac();
  if (!c) return;
  const out = master(c);
  const t = c.currentTime + 0.02;
  switch (id) {
    case "mesi": // ti melodi dous + bravo lejè
      [784, 988, 1175, 1568].forEach((f, i) => tone(c, out, f, t + i * 0.11, 0.9, "sine", 0.22));
      applause(c, out, t + 0.3, 1.4, 0.12);
      break;
    case "bravo":
      applause(c, out, t, 2.6);
      whistle(c, out, t + 0.4);
      break;
    case "klaxon":
      airhorn(c, out, t, 0.32);
      airhorn(c, out, t + 0.4, 0.32);
      airhorn(c, out, t + 0.8, 0.8);
      break;
    case "tanbou": // woulman + simbal
      for (let i = 0; i < 26; i++) hit(c, out, t + i * 0.055, 0.08, "bandpass", 1800, 0.25 + (i / 26) * 0.35, 0.8);
      kick(c, out, t + 1.45);
      hit(c, out, t + 1.45, 1.4, "highpass", 5000, 0.5);
      break;
    case "badum":
      hit(c, out, t, 0.12, "bandpass", 1500, 0.6, 1);
      kick(c, out, t + 0.18, 0.8);
      hit(c, out, t + 0.42, 0.9, "highpass", 6000, 0.55);
      break;
    case "wow": {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(300, t);
      o.frequency.exponentialRampToValueAtTime(1400, t + 0.5);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.1);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.75);
      [1568, 2093, 2637].forEach((f, i) => tone(c, out, f, t + 0.45 + i * 0.07, 0.6, "sine", 0.12));
      break;
    }
    case "fet":
      hit(c, out, t, 0.1, "highpass", 2000, 0.9);
      fanfare(c, out, t + 0.1);
      applause(c, out, t + 0.5, 1.6, 0.14);
      break;
    case "kè":
      for (let i = 0; i < 4; i++) {
        kick(c, out, t + i * 0.7, 0.8);
        kick(c, out, t + i * 0.7 + 0.18, 0.55);
      }
      break;
  }
}

// Son kado yo: lyon an gwonde; lòt gwo kado yo gen fanfa
export function playGiftSound(giftId: string) {
  const c = ac();
  if (!c) return;
  const out = master(c, 0.8);
  const t = c.currentTime + 0.02;
  if (giftId === "lyon") roar(c, out, t + 1.0); // menm moman lyon an louvri bouch li sou ekran an
  else fanfare(c, out, t);
}
