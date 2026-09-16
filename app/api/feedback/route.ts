import { NextResponse } from "next/server";
import { QA_SYSTEM, SCRIPT_SYSTEM } from "@/lib/prompts";
import { generateFeedback } from "@/lib/claude";

export const runtime = "nodejs";
export const maxDuration = 120;

type Body = {
  mode: "script" | "qa";
  reference: string;
  transcript: string;
  elapsedSeconds?: number | null;
  budgetSeconds?: number | null;
  anchors?: string[];
  title?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const { mode, reference, transcript } = body;
  if ((mode !== "script" && mode !== "qa") || !reference?.trim() || !transcript?.trim()) {
    return NextResponse.json({ error: "mode, reference and transcript are required." }, { status: 400 });
  }
  if (transcript.length > 8000 || reference.length > 8000) {
    return NextResponse.json({ error: "Text too long." }, { status: 413 });
  }

  const words = transcript.trim().split(/\s+/).length;
  const elapsed = typeof body.elapsedSeconds === "number" && body.elapsedSeconds > 0 ? Math.round(body.elapsedSeconds) : null;
  const pace = elapsed ? `${Math.round((words / elapsed) * 60)} words per minute` : "unknown (typed text, no recording)";
  const timeLine = elapsed ? `${elapsed} s` : "not recorded (typed text)";

  const userContent =
    mode === "script"
      ? `SEGMENT: ${body.title ?? ""}\n\nREFERENCE:\n${reference}\n\nANCHORS: ${(body.anchors ?? []).join(" | ")}\n\nTRANSCRIPT:\n${transcript}\n\nELAPSED TIME: ${timeLine}\nBUDGET: ${body.budgetSeconds ?? "?"} s\nWORDS SPOKEN: ${words} — PACE: ${pace}`
      : `QUESTION:\n${reference}\n\nTRANSCRIPT OF HER ANSWER:\n${transcript}\n\nELAPSED TIME: ${timeLine}\nWORDS SPOKEN: ${words} — PACE: ${pace}`;

  try {
    const text = await generateFeedback(mode === "script" ? SCRIPT_SYSTEM : QA_SYSTEM, userContent);
    return NextResponse.json({ feedback: text });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: "Feedback failed.", detail: message.slice(0, 500) }, { status: 502 });
  }
}
