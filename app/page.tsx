"use client";
import { useEffect, useMemo, useState } from "react";
import segmentsData from "@/lib/segments.json";
import questionsData from "@/lib/questions.json";
import { PracticePanel } from "@/components/PracticePanel";
import { loadProgress, saveProgress, type Progress } from "@/lib/progress";
import { fmt } from "@/lib/useRecorder";

type Segment = { id: number; title: string; budget: number; script: string; anchors: string[] };
const segments = segmentsData as Segment[];
const questions = questionsData as string[];
const TARGET = 12 * 60;

export default function Home() {
  const [tab, setTab] = useState<"speech" | "qa">("speech");
  const [activeId, setActiveId] = useState(1);
  const [progress, setProgress] = useState<Progress>({});
  const [hideScript, setHideScript] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [qIndex, setQIndex] = useState<number | null>(null);
  const [qDraw, setQDraw] = useState(0);

  useEffect(() => setProgress(loadProgress()), []);

  const update = (id: number, patch: Partial<Progress[number]>) =>
    setProgress((prev) => {
      const cur = prev[id] ?? { practiced: false, attempts: 0 };
      const next = { ...prev, [id]: { ...cur, ...patch } };
      saveProgress(next);
      return next;
    });

  const seg = segments.find((s) => s.id === activeId)!;
  const total = useMemo(
    () => segments.reduce((sum, s) => sum + (progress[s.id]?.lastSeconds ?? 0), 0),
    [progress]
  );
  const doneCount = segments.filter((s) => progress[s.id]?.practiced).length;

  function drawQuestion() {
    let i = Math.floor(Math.random() * questions.length);
    if (questions.length > 1 && i === qIndex) i = (i + 1) % questions.length;
    setQIndex(i);
    setQDraw((d) => d + 1);
  }

  function resetProgress() {
    if (!window.confirm("Reset all segment progress and times?")) return;
    setProgress({});
    saveProgress({});
  }

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="logo" aria-hidden>●</span>
          <div>
            <h1>Rehearsal Time</h1>
            <p className="sub">SRNT-E 2026 · 12-minute talk + Q&amp;A</p>
          </div>
        </div>
        <div className={`total ${total > TARGET ? "over" : ""}`} title="Sum of your latest recorded time per segment">
          <span className="total-label">Total</span>
          <span className="total-value">
            {fmt(total)} <span className="budget">/ 12:00</span>
          </span>
          <div className="bar"><div style={{ width: `${Math.min(100, (total / TARGET) * 100)}%` }} /></div>
        </div>
      </header>

      <nav className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "speech"} onClick={() => setTab("speech")}>Full Speech</button>
        <button role="tab" aria-selected={tab === "qa"} onClick={() => setTab("qa")}>Q&amp;A Practice</button>
      </nav>

      {tab === "speech" ? (
        <div className="speech">
          <aside className={`sidebar ${navOpen ? "open" : ""}`}>
            <button className="nav-toggle" onClick={() => setNavOpen((o) => !o)} aria-expanded={navOpen}>
              <span>{seg.id}. {seg.title}</span>
              <span className="muted">{doneCount}/17 ▾</span>
            </button>
            <ol className="seg-list">
              {segments.map((s) => {
                const p = progress[s.id];
                return (
                  <li key={s.id}>
                    <button
                      className={`seg ${s.id === activeId ? "active" : ""}`}
                      onClick={() => { setActiveId(s.id); setNavOpen(false); }}
                    >
                      <span className={`check ${p?.practiced ? "on" : ""}`} aria-label={p?.practiced ? "practiced" : "not practiced"}>
                        {p?.practiced ? "✓" : s.id}
                      </span>
                      <span className="seg-title">{s.title}</span>
                      <span className="seg-time">{p?.lastSeconds ? fmt(p.lastSeconds) : fmt(s.budget)}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="side-foot">
              <span className="muted">{doneCount} of 17 practiced</span>
              <button className="link" onClick={resetProgress}>Reset</button>
            </div>
          </aside>

          <main className="card main-card">
            <div className="card-head">
              <div>
                <p className="eyebrow">Segment {seg.id} of 17 · budget {fmt(seg.budget)}</p>
                <h2>{seg.title}</h2>
              </div>
              <label className="switch">
                <input type="checkbox" checked={hideScript} onChange={(e) => setHideScript(e.target.checked)} />
                Hide script
              </label>
            </div>

            <div className="chips">
              {seg.anchors.map((a) => <span key={a} className="chip">{a}</span>)}
            </div>

            {!hideScript && <p className="script">{seg.script}</p>}

            <PracticePanel
              mode="script"
              reference={seg.script}
              title={seg.title}
              anchors={seg.anchors}
              budgetSeconds={seg.budget}
              resetKey={seg.id}
              onRecorded={(secs) => update(seg.id, { practiced: true, lastSeconds: Math.round(secs), attempts: (progress[seg.id]?.attempts ?? 0) + 1 })}
              onFeedback={() => update(seg.id, { practiced: true })}
            />

            <div className="pager">
              <button disabled={seg.id === 1} onClick={() => setActiveId(seg.id - 1)}>← Previous</button>
              <button disabled={seg.id === 17} onClick={() => setActiveId(seg.id + 1)}>Next →</button>
            </div>
          </main>
        </div>
      ) : (
        <main className="card qa-card">
          <div className="card-head">
            <div>
              <p className="eyebrow">Acknowledge → Explain with a precise figure → Open on a limit or next step</p>
              <h2>Q&amp;A Practice</h2>
            </div>
            <button className="primary" onClick={drawQuestion}>{qIndex === null ? "Draw a question" : "Draw another"}</button>
          </div>
          {qIndex === null ? (
            <p className="muted empty">Draw a question, take a breath, then answer out loud. Aim for 30–75 seconds.</p>
          ) : (
            <>
              <blockquote className="question">{questions[qIndex]}</blockquote>
              <PracticePanel mode="qa" reference={questions[qIndex]} resetKey={`q${qDraw}`} />
            </>
          )}
        </main>
      )}
    </div>
  );
}
