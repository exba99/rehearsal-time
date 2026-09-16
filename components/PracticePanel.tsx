"use client";
import { useEffect, useState } from "react";
import { fileNameFor, fmt, recordingBlocker, useRecorder, type RecordingResult } from "@/lib/useRecorder";
import { Feedback } from "./Feedback";

type Props = {
  mode: "script" | "qa";
  reference: string;
  title?: string;
  anchors?: string[];
  budgetSeconds?: number;
  /** changes whenever the segment/question changes, to reset the panel */
  resetKey: string | number;
  onRecorded?: (seconds: number) => void;
};

export function PracticePanel({ mode, reference, title, anchors, budgetSeconds, resetKey, onRecorded }: Props) {
  const rec = useRecorder();
  const [transcript, setTranscript] = useState("");
  const [seconds, setSeconds] = useState<number | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [blocker, setBlocker] = useState<string | null>(null);

  useEffect(() => setBlocker(recordingBlocker()), []);

  useEffect(() => {
    rec.reset();
    setTranscript("");
    setSeconds(null);
    setFeedback("");
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  async function transcribe({ blob, seconds: secs, peak }: RecordingResult) {
    setSeconds(secs);
    onRecorded?.(secs);
    if (peak < 0.01) {
      setError("Your recording is silent — the microphone isn't picking up your voice. Check the selected microphone and your system input volume, then record again.");
      return;
    }
    if (secs < 1) {
      setError("Recording too short. Hold on a bit longer before pressing Stop.");
      return;
    }
    setTranscribing(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("audio", blob, fileNameFor(blob.type));
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transcription failed.");
      setTranscript(data.text || "");
      if (!data.text) setError("No speech detected. Try again closer to the mic, or type your text.");
    } catch (e) {
      setError(`${e instanceof Error ? e.message : "Transcription failed."} You can still type or paste your text below.`);
    } finally {
      setTranscribing(false);
    }
  }

  async function getFeedback() {
    setLoading(true);
    setError(null);
    setFeedback("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, reference, transcript, elapsedSeconds: seconds, budgetSeconds: budgetSeconds ?? null, anchors, title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error([data.error, data.detail].filter(Boolean).join(" — ") || "Feedback failed.");
      setFeedback(data.feedback);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Feedback failed.");
    } finally {
      setLoading(false);
    }
  }

  const recording = rec.state === "recording";
  const shown = recording ? rec.elapsed : seconds ?? 0;
  const over = budgetSeconds ? shown > budgetSeconds : false;

  return (
    <div className="practice">
      {blocker && <p className="notice">{blocker}</p>}
      <div className="recorder">
        <button
          type="button"
          className={`rec-btn ${recording ? "is-recording" : ""}`}
          onClick={() => (recording ? rec.stop() : rec.start(transcribe))}
          disabled={rec.state === "requesting" || transcribing || !!blocker}
          aria-pressed={recording}
        >
          <span className="dot" aria-hidden />
          {recording ? "Stop" : rec.state === "requesting" ? "Allow mic…" : seconds !== null ? "Record again" : "Record"}
        </button>
        <div className={`clock ${over ? "over" : ""}`}>
          {fmt(shown)}
          {budgetSeconds ? <span className="budget"> / {fmt(budgetSeconds)}</span> : null}
        </div>
        {recording && (
          <div className="meter" aria-label="Microphone level">
            <div style={{ width: `${Math.round(rec.level * 100)}%` }} />
          </div>
        )}
      </div>

      {rec.devices.length > 1 && !recording && (
        <label className="mic-select">
          <span>Microphone</span>
          <select value={rec.deviceId} onChange={(e) => rec.setDeviceId(e.target.value)}>
            <option value="">System default</option>
            {rec.devices.map((d, i) => (
              <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${i + 1}`}</option>
            ))}
          </select>
        </label>
      )}

      {rec.audio && !recording && (
        <div className="playback-row">
          <audio controls playsInline src={rec.audio.url} className="playback" />
        </div>
      )}
      {rec.error && <p className="error">{rec.error}</p>}

      <label className="field-label" htmlFor={`t-${mode}`}>
        {transcribing ? "Transcribing…" : "Transcript — edit, or type / paste your text"}
      </label>
      <textarea
        id={`t-${mode}`}
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        placeholder={transcribing ? "Transcribing your recording…" : "Your spoken version appears here after recording. You can also type it."}
        rows={5}
        disabled={transcribing}
      />

      <div className="actions">
        <button type="button" className="primary" onClick={getFeedback} disabled={!transcript.trim() || loading || transcribing || recording}>
          {loading ? "Thinking…" : "Get feedback"}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {feedback && <Feedback text={feedback} />}
    </div>
  );
}
