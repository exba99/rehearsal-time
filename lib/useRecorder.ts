"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderState = "idle" | "requesting" | "recording" | "done";

// Safari first tries mp4; Chrome/Firefox use webm/opus.
const CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"];

function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return undefined;
  return CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t));
}

export type RecordingResult = { blob: Blob; seconds: number; peak: number };

/** Why recording can't work in this context, or null if it can. */
export function recordingBlocker(): string | null {
  if (typeof window === "undefined") return null;
  if (!window.isSecureContext)
    return "The microphone only works over HTTPS (or on localhost). On your phone, open the https://…ts.net address from Tailscale.";
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined")
    return "Recording isn't supported in this browser. Type your text below instead.";
  return null;
}

export function useRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0); // 0..1, live input level
  const [error, setError] = useState<string | null>(null);
  const [audio, setAudio] = useState<{ url: string; seconds: number; silent: boolean } | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");

  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startRef = useRef(0);
  const peakRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const onDoneRef = useRef<((r: RecordingResult) => void) | null>(null);

  const refreshDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((d) => d.kind === "audioinput" && d.deviceId));
    } catch {
      /* ignore */
    }
  }, []);

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    setLevel(0);
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const start = useCallback(
    async (onDone: (r: RecordingResult) => void) => {
      setError(null);
      const blocker = recordingBlocker();
      if (blocker) {
        setError(blocker);
        return;
      }
      onDoneRef.current = onDone;
      setState("requesting");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
            channelCount: 1,
            // Raw-ish voice: aggressive processing can erase speech on some Macs.
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: true,
          },
        });
        streamRef.current = stream;
        refreshDevices(); // labels are only available after permission

        // Live level meter + silence detection.
        peakRef.current = 0;
        try {
          const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const ctx = new AC();
          ctxRef.current = ctx;
          if (ctx.state === "suspended") await ctx.resume();
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 1024;
          ctx.createMediaStreamSource(stream).connect(analyser);
          const buf = new Float32Array(analyser.fftSize);
          const loop = () => {
            analyser.getFloatTimeDomainData(buf);
            let sum = 0;
            for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
            const rms = Math.sqrt(sum / buf.length);
            peakRef.current = Math.max(peakRef.current, rms);
            setLevel(Math.min(1, rms * 8));
            setElapsed((performance.now() - startRef.current) / 1000);
            rafRef.current = requestAnimationFrame(loop);
          };
          rafRef.current = requestAnimationFrame(loop);
        } catch {
          peakRef.current = 1; // can't measure: don't block
          const tick = () => {
            setElapsed((performance.now() - startRef.current) / 1000);
            rafRef.current = requestAnimationFrame(tick);
          };
          rafRef.current = requestAnimationFrame(tick);
        }

        const mimeType = pickMime();
        const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        chunksRef.current = [];
        rec.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };
        rec.onstop = () => {
          const seconds = (performance.now() - startRef.current) / 1000;
          const type = rec.mimeType || mimeType || "audio/webm";
          const blob = new Blob(chunksRef.current, { type });
          const peak = peakRef.current;
          cleanup();
          setElapsed(seconds);
          setAudio((prev) => {
            if (prev) URL.revokeObjectURL(prev.url);
            return { url: URL.createObjectURL(blob), seconds, silent: peak < 0.01 };
          });
          setState("done");
          onDoneRef.current?.({ blob, seconds, peak });
        };
        recRef.current = rec;
        // No timeslice: one clean file on stop (timeslices can corrupt audio on Safari).
        rec.start();
        startRef.current = performance.now();
        setElapsed(0);
        setState("recording");
      } catch (e) {
        cleanup();
        setState("idle");
        const name = e instanceof DOMException ? e.name : "";
        setError(
          name === "NotAllowedError"
            ? "Microphone access was denied. Allow it in your browser settings, or type your text below."
            : name === "NotFoundError" || name === "OverconstrainedError"
              ? "That microphone isn't available. Pick another one in the list."
              : `Couldn't start the microphone${name ? ` (${name})` : ""}. You can type your text below instead.`
        );
      }
    },
    [cleanup, deviceId, refreshDevices]
  );

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }, []);

  const reset = useCallback(() => {
    const rec = recRef.current;
    if (rec && rec.state !== "inactive") {
      rec.onstop = null;
      rec.stop();
    }
    cleanup();
    setAudio((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    setElapsed(0);
    setError(null);
    setState("idle");
  }, [cleanup]);

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.mediaDevices) refreshDevices();
  }, [refreshDevices]);

  return { state, elapsed, level, error, audio, devices, deviceId, setDeviceId, start, stop, reset };
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
