import { useEffect, useRef, useState } from "react";

// Minimal ambient typings for the Web Speech API (not in lib.dom.d.ts).
interface SpeechRecognitionResultEvent extends Event {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onresult: ((e: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export function useVoiceInput(onResult: (text: string) => void) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("");
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      setStatus("❌ Voice support नाही");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsRecording(true);
      setStatus("🎤 बोला...");
    };

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript.trim();
      onResult(text);
      setStatus("✅ झाले");
    };

    recognition.onerror = (event) => {
      setStatus(event.error === "not-allowed" ? "🚫 Mic permission द्या" : "❌ पुन्हा प्रयत्न करा");
    };

    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    // onResult intentionally excluded — recreating the recognizer per keystroke would
    // interrupt an in-progress recording.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle() {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch {
        // recognition already running / start() called too soon after stop()
      }
    }
  }

  function cancel() {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
    setStatus("");
  }

  return { toggle, cancel, isRecording, status, supported };
}
