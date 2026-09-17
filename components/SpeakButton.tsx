"use client";
import { useEffect, useState } from "react";
import { speak, speechSupported, stopSpeaking } from "@/lib/speech";

type Props = { text: string; label?: string; rate?: number; className?: string };

let activeSetter: ((v: boolean) => void) | null = null;

export function SpeakButton({ text, label, rate, className = "" }: Props) {
  const [playing, setPlaying] = useState(false);
  const [supported, setSupported] = useState(false);
  useEffect(() => setSupported(speechSupported()), []);
  useEffect(() => () => {
    if (activeSetter === setPlaying) stopSpeaking();
  }, []);
  if (!supported) return null;

  function toggle() {
    if (playing) {
      stopSpeaking();
      setPlaying(false);
      return;
    }
    activeSetter?.(false);
    activeSetter = setPlaying;
    setPlaying(true);
    speak(text, { rate, onEnd: () => setPlaying(false) });
  }

  return (
    <button
      type="button"
      className={`speak-btn ${label ? "with-label" : ""} ${playing ? "playing" : ""} ${className}`}
      onClick={toggle}
      aria-label={playing ? "Stop" : `Listen: ${text}`}
      title={playing ? "Stop" : "Listen"}
    >
      <span aria-hidden>{playing ? "■" : "🔊"}</span>
      {label && <span>{playing ? "Stop" : label}</span>}
    </button>
  );
}
