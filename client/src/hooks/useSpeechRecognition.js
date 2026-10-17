import { useCallback, useEffect, useRef, useState } from "react";

const BLOCKED =
  "Microphone access is blocked. Allow it in your browser’s address bar, or type instead.";

const ERRORS = {
  "not-allowed": BLOCKED,
  "service-not-allowed": BLOCKED,
  "no-speech": "We didn’t hear anything. Press the microphone and try again.",
  "audio-capture": "No microphone was found. Check that one is connected, or type instead.",
  network: "Voice input needs an internet connection. Check it and try again, or type instead.",
};

export default function useSpeechRecognition({ lang = "en-IN", onText } = {}) {
  const Recognition =
    typeof window === "undefined" ? null : window.SpeechRecognition || window.webkitSpeechRecognition;

  const recRef = useRef(null);
  const onTextRef = useRef(onText);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

  useEffect(() => () => recRef.current?.abort(), []);

  // `base` is text already in the box. Spoken words are added after it.
  const start = useCallback(
    (base = "") => {
      if (!Recognition) return;
      recRef.current?.abort();
      setError("");

      const rec = new Recognition();
      rec.lang = lang;
      rec.interimResults = true;
      rec.continuous = true;

      let finalText = "";
      rec.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const piece = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalText += `${piece} `;
          else interim += piece;
        }
        onTextRef.current?.(`${base} ${finalText}${interim}`.replace(/\s+/g, " ").trim());
      };
      rec.onerror = (e) => {
        if (e.error === "aborted") return;
        setError(ERRORS[e.error] ?? "Voice input stopped working. Try again, or type instead.");
      };
      rec.onend = () => {
        if (recRef.current === rec) setListening(false);
      };

      recRef.current = rec;
      try {
        rec.start();
        setListening(true);
      } catch {
        setError("Voice input could not start. Try again, or type instead.");
      }
    },
    [Recognition, lang]
  );

  const stop = useCallback(() => recRef.current?.stop(), []);

  return { supported: Boolean(Recognition), listening, error, start, stop };
}