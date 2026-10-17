import { useEffect, useRef, useState } from "react";

const SAMPLES = {
  hi: { label: "हिन्दी", text: "मुझे तीन दिन से सिर में दर्द और हल्का बुखार है।" },
  en: { label: "English", text: "I've had a bad headache and a mild fever for three days." },
};

function MicIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

export default function VoiceDemo() {
  const [lang, setLang] = useState("hi");
  const [phase, setPhase] = useState("idle"); // idle | listening | transcribing | done
  const [shown, setShown] = useState(0);
  const timers = useRef([]);

  const words = SAMPLES[lang].text.split(" ");
  const busy = phase === "listening" || phase === "transcribing";

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  function changeLang(next) {
    clearTimers();
    setPhase("idle");
    setShown(0);
    setLang(next);
  }

  function play() {
    clearTimers();
    setShown(0);
    setPhase("listening");
    timers.current.push(
      setTimeout(() => {
        setPhase("transcribing");
        words.forEach((_, i) => {
          timers.current.push(setTimeout(() => setShown(i + 1), i * 170));
        });
        timers.current.push(setTimeout(() => setPhase("done"), words.length * 170 + 500));
      }, 1100)
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-paper shadow-[0_18px_40px_-26px_rgba(20,48,58,0.4)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <p className="text-sm font-medium text-ink-soft">Play a sample sentence</p>
        <div role="group" aria-label="Sample language" className="flex rounded-full bg-mist p-0.5 text-sm">
          {Object.entries(SAMPLES).map(([key, s]) => (
            <button
              key={key}
              onClick={() => changeLang(key)}
              aria-pressed={lang === key}
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                lang === key ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-4 px-5 py-5">
        <button
          onClick={play}
          disabled={busy}
          aria-label="Play sample"
          className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-teal text-paper transition-colors hover:bg-teal-deep disabled:cursor-default"
        >
          {phase === "listening" && (
            <span className="absolute inset-0 animate-ping rounded-full bg-teal/40 motion-reduce:hidden" />
          )}
          <MicIcon />
        </button>

        <div className="min-h-14 flex-1" aria-live="polite">
          {phase === "idle" && (
            <p className="pt-1 text-ink-soft">
              Press the microphone to play a sample. This is a demo, nothing is recorded.
            </p>
          )}
          {phase === "listening" && <p className="pt-1 text-ink-soft">Listening...</p>}
          {(phase === "transcribing" || phase === "done") && (
            <p lang={lang} className="pt-0.5 text-xl font-medium leading-snug">
              {words.slice(0, shown).join(" ")}
            </p>
          )}
        </div>
      </div>

      {phase === "done" && (
        <div className="space-y-5 border-t border-line px-5 py-5">
          <div>
            <p className="text-sm font-medium text-ink-soft">What we understood. You confirm or edit this.</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {["Headache", "Fever", "3 days"].map((c) => (
                <li key={c} className="rounded-full border border-line bg-mist px-3 py-1 text-sm">
                  {c}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-ink-soft">We would still ask: how severe is the headache?</p>
          </div>

          <div>
            <p className="text-sm font-medium text-ink-soft">Specialties that could help</p>
            <p className="mt-1 font-display text-lg font-semibold">General Medicine, Neurology</p>
          </div>

          <div className="rounded-xl border border-line bg-mist/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg font-semibold">Aarav Mehta</p>
                <p className="text-sm text-ink-soft">General Medicine, 12 years, Delhi</p>
              </div>
              <span className="shrink-0 rounded-full bg-blue/10 px-2.5 py-1 text-xs font-medium text-blue">
                Demo profile
              </span>
            </div>
            <p className="mt-3 text-sm">
              <span className="font-medium">Why this match:</span> speaks Hindi, first slot is tomorrow at 10:00, online
              visit available.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}