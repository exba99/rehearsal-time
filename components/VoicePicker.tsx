"use client";
import { useEffect, useState } from "react";
import { englishFemaleVoices, getSavedVoiceName, loadVoices, saveVoiceName, speak, speechSupported } from "@/lib/speech";

export function VoicePicker() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!speechSupported()) return;
    loadVoices().then((all) => {
      const list = englishFemaleVoices(all);
      setVoices(list);
      setValue(getSavedVoiceName() ?? list[0]?.name ?? "");
    });
  }, []);

  if (voices.length < 2) return null;
  return (
    <label className="voice-picker">
      <span>Voice</span>
      <select
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          saveVoiceName(e.target.value);
          speak("Childhood sexual violence and smoking in the Constances cohort.");
        }}
      >
        {voices.map((v) => (
          <option key={v.name} value={v.name}>{v.name.replace(/^Microsoft /, "")} · {v.lang}</option>
        ))}
      </select>
    </label>
  );
}
