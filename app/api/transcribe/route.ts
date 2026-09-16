import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vocabulaire du talk, pour aider Whisper sur les noms propres et termes techniques.
const VOCAB_PROMPT =
  "Scientific talk in English about childhood sexual violence and smoking. Terms: Constances cohort, Santé publique France, CIIVISE, adverse childhood experiences, ACE, multinomial model, cross-sectional, Sorbonne.";

export async function POST(req: Request) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "GROQ_API_KEY is not configured on the server." }, { status: 500 });
  }

  let incoming: FormData;
  try {
    incoming = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 400 });
  }
  const file = incoming.get("audio");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "No audio received." }, { status: 400 });
  }

  const name = (file as File).name || extFor(file.type);
  const form = new FormData();
  form.append("file", file, name);
  form.append("model", "whisper-large-v3-turbo");
  form.append("language", "en");
  form.append("response_format", "json");
  form.append("temperature", "0");
  form.append("prompt", VOCAB_PROMPT);

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json({ error: `Transcription failed (${res.status}).`, detail: detail.slice(0, 500) }, { status: 502 });
  }
  const data = (await res.json()) as { text?: string };
  return NextResponse.json({ text: (data.text ?? "").trim() });
}

function extFor(mime: string) {
  if (mime.includes("mp4") || mime.includes("m4a") || mime.includes("aac")) return "recording.mp4";
  if (mime.includes("ogg")) return "recording.ogg";
  if (mime.includes("wav")) return "recording.wav";
  return "recording.webm";
}
