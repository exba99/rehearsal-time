"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderState = "idle" | "requesting" | "recording" | "done";

const CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/aac"];

function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return undefined;
  return CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t));
}

export function useRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audio, setAudio] = useState<{ blob: Blob; url: string; seconds: number } | null>(null);

  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startRef = useRef(0);
  const tickRef = useRef<number | null>(null);
  const onDoneRef = useRef<((blob: Blob, seconds: number) => void) | null>(null);

  const cleanup = useCallback(() => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const start = useCallback(
    async (onDone: (blob: Blob, seconds: number) => void) => {
      setError(null);
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        setError("Recording isn't supported in this browser. Type your text below instead.");
        return;
      }
      onDoneRef.current = onDone;
      setState("requesting");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        streamRef.current = stream;
        const mimeType = pickMime();
        const rec = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 64000 } : undefined);
        chunksRef.current = [];
        rec.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };
        rec.onstop = () => {
          const seconds = (performance.now() - startRef.current) / 1000;
          const type = rec.mimeType || mimeType || "audio/webm";
          const blob = new Blob(chunksRef.current, { type });
          cleanup();
          setElapsed(seconds);
          setAudio((prev) => {
            if (prev) URL.revokeObjectURL(prev.url);
            return { blob, url: URL.createObjectURL(blob), seconds };
          });
          setState("done");
          onDoneRef.current?.(blob, seconds);
        };
        recRef.current = rec;
        rec.start(1000); // chunks every second (Safari-safe)
        startRef.current = performance.now();
        setElapsed(0);
        setState("recording");
        tickRef.current = window.setInterval(() => setElapsed((performance.now() - startRef.current) / 1000), 200);
      } catch (e) {
        cleanup();
        setState("idle");
        const name = e instanceof DOMException ? e.name : "";
        setError(
          name === "NotAllowedError"
            ? "Microphone access was denied. Allow it in your browser settings, or type your text below."
            : "Couldn't start the microphone. You can type your text below instead."
        );
      }
    },
    [cleanup]
  );

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }, []);

  const reset = useCallback(() => {
    stop();
    cleanup();
    setAudio((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    setElapsed(0);
    setError(null);
    setState("idle");
  }, [cleanup, stop]);

  return { state, elapsed, error, audio, start, stop, reset };
}

export function fileNameFor(mime: string) {
  if (mime.includes("mp4") || mime.includes("aac")) return "recording.mp4";
  if (mime.includes("ogg")) return "recording.ogg";
  return "recording.webm";
}

export function fmt(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
