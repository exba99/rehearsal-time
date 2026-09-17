"use client";

/** Text-to-speech with the browser's built-in voices (free, works on Safari iOS/macOS, Chrome, Edge). */

const VOICE_KEY = "rehearsal-time:voice";

// Clear, natural female English voices, best first (Apple, then Microsoft, then Google).
const PREFERRED = [
  "Ava (Premium)", "Ava (Enhanced)", "Samantha (Enhanced)", "Allison (Enhanced)", "Susan (Enhanced)", "Zoe (Enhanced)",
  "Serena (Enhanced)", "Kate (Enhanced)", "Karen (Enhanced)",
  "Microsoft Ava Online (Natural)", "Microsoft Jenny Online (Natural)", "Microsoft Aria Online (Natural)", "Microsoft Libby Online (Natural)",
  "Ava", "Samantha", "Allison", "Susan", "Zoe", "Serena", "Kate", "Karen", "Moira", "Tessa", "Victoria",
  "Google US English", "Google UK English Female", "Microsoft Zira",
];
const FEMALE_HINT = /ava|samantha|allison|susan|zoe|serena|kate|karen|moira|tessa|victoria|fiona|jenny|aria|libby|sonia|zira|female|woman/i;

export function speechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!speechSupported()) return Promise.resolve([]);
  const now = window.speechSynthesis.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 1500);
  });
}

export function englishFemaleVoices(all: SpeechSynthesisVoice[]) {
  const en = all.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const rank = (v: SpeechSynthesisVoice) => {
    const i = PREFERRED.findIndex((p) => v.name === p || v.name.startsWith(p));
    return i === -1 ? (FEMALE_HINT.test(v.name) ? 500 : 1000) : i;
  };
  return en.filter((v) => rank(v) < 1000).sort((a, b) => rank(a) - rank(b));
}

export function getSavedVoiceName(): string | null {
  try {
    return window.localStorage.getItem(VOICE_KEY);
  } catch {
    return null;
  }
}

export function saveVoiceName(name: string) {
  try {
    window.localStorage.setItem(VOICE_KEY, name);
  } catch {
    /* ignore */
  }
}

async function resolveVoice(): Promise<SpeechSynthesisVoice | undefined> {
  const all = await loadVoices();
  const saved = getSavedVoiceName();
  const fromSaved = saved ? all.find((v) => v.name === saved) : undefined;
  return fromSaved ?? englishFemaleVoices(all)[0] ?? all.find((v) => v.lang.toLowerCase().startsWith("en-us"));
}

let currentToken = 0;

/** Speak text; long text is split into sentences (Chrome cuts long utterances). */
export async function speak(text: string, opts: { rate?: number; onEnd?: () => void } = {}) {
  if (!speechSupported()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const token = ++currentToken;
  const voice = await resolveVoice();
  const parts = text.replace(/\s+/g, " ").match(/[^.!?;:]+[.!?;:]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
  parts.forEach((part, i) => {
    const u = new SpeechSynthesisUtterance(part);
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else {
      u.lang = "en-US";
    }
    u.rate = opts.rate ?? 0.9;
    u.pitch = 1;
    if (i === parts.length - 1) u.onend = () => token === currentToken && opts.onEnd?.();
    u.onerror = () => token === currentToken && opts.onEnd?.();
    synth.speak(u);
  });
}

export function stopSpeaking() {
  currentToken++;
  if (speechSupported()) window.speechSynthesis.cancel();
}
