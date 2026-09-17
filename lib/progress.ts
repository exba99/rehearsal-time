"use client";

export type Progress = Record<number, { practiced: boolean; lastSeconds?: number; attempts: number }>;

const KEY = "rehearsal-time:progress:v3"; // v3: 18-segment script (ids changed)

export function loadProgress(): Progress {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Progress) : {};
  } catch {
    return {};
  }
}

export function saveProgress(p: Progress) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable: progress lives in memory only */
  }
}
