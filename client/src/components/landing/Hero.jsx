import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useSpeechRecognition from "../../hooks/useSpeechRecognition";

const LANGS = {
  en: {
    label: "English",
    speech: "en-IN",
    placeholder: "For example: I’ve had a headache and a mild fever for 3 days",
    chips: ["Fever and headache for 3 days", "Back pain when I bend", "My child has a cough", "Itchy skin rash"],
  },
  hi: {
    label: "हिन्दी",
    speech: "hi-IN",
    placeholder: "उदाहरण: मुझे तीन दिन से सिर दर्द और हल्का बुखार है",
    chips: ["तीन दिन से बुखार और सिर दर्द", "झुकने पर कमर में दर्द", "बच्चे को खांसी है", "त्वचा पर खुजली वाले दाने"],
  },
};

const iconProps = {
  width: 26,
  height: 26,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

const DOORS = [
  {
    to: "/query?mode=ONLINE",
    title: "Book a video visit",
    text: "Describe the problem, then see doctors who offer online visits.",
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="6" width="12" height="12" rx="2" />
        <path d="M15 10l6-3v10l-6-3z" />
      </svg>
    ),
  },
  {
    to: "/query?mode=IN_PERSON",
    title: "See a doctor in person",
    text: "Find doctors near you with the earliest free slots.",
    icon: (
      <svg {...iconProps}>
        <path d="M4 20V8l8-4 8 4v12" />
        <path d="M9 20v-6h6v6" />
      </svg>
    ),
  },
  {
    to: "/nurse",
    title: "Nurse at home",
    text: "Injections, dressings, blood pressure and sugar checks at your door.",
    icon: (
      <svg {...iconProps}>
        <path d="M3 11l9-7 9 7v9H3z" />
        <path d="M12 12v5M9.5 14.5h5" />
      </svg>
    ),
  },
];

function MicIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

export default function Hero() {
  const navigate = useNavigate();
  const [lang, setLang] = useState("en");
  const [text, setText] = useState("");
  const [usedVoice, setUsedVoice] = useState(false);
  const speech = useSpeechRecognition({ lang: LANGS[lang].speech, onText: setText });

  function toggleMic() {
    if (speech.listening) {
      speech.stop();
      return;
    }
    setUsedVoice(true);
    speech.start(text);
  }

  function changeLang(next) {
    speech.stop();
    setLang(next);
  }

  function submit(e) {
    e.preventDefault();
    speech.stop();
    navigate("/query", {
      state: { text: text.trim(), language: lang, inputMode: usedVoice ? "VOICE" : "TEXT" },
    });
  }

  const status = speech.error ? (
    <span className="text-alert">{speech.error}</span>
  ) : speech.listening ? (
    "Listening. Speak now."
  ) : !speech.supported ? (
    "Voice input isn’t available in this browser. You can type instead."
  ) : null;

  return (
    <section className="mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-12 lg:grid-cols-[1.45fr_1fr] lg:gap-16 lg:pt-20">
      <div>
        <h1 className="font-display text-[clamp(2.5rem,5.6vw,4.4rem)] font-bold leading-[1.02] tracking-tight">
          Not sure which doctor to see? Just say what’s wrong.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
          Speak or type in Hindi or English. We turn it into a short summary you can check, then show you doctors, a video
          visit, or a nurse at home.
        </p>

        <form
          onSubmit={submit}
          className="mt-8 rounded-2xl border border-line bg-white p-4 shadow-[0_14px_34px_-22px_rgba(15,42,51,0.4)] sm:p-5"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <label htmlFor="hero-query" className="text-[15px] font-medium">
              What’s bothering you?
            </label>
            <div role="group" aria-label="Language" className="flex rounded-full bg-wash p-0.5 text-sm">
              {Object.entries(LANGS).map(([key, l]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => changeLang(key)}
                  aria-pressed={lang === key}
                  className={`rounded-full px-3 py-1 font-medium transition-colors ${
                    lang === key ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <textarea
              id="hero-query"
              rows={3}
              maxLength={4000}
              lang={lang}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={LANGS[lang].placeholder}
              className="min-h-[5.5rem] flex-1 resize-none rounded-xl border border-line bg-white px-4 py-3 text-lg leading-snug placeholder:text-ink-soft/70 focus:border-teal"
            />
            <button
              type="button"
              onClick={toggleMic}
              disabled={!speech.supported}
              aria-pressed={speech.listening}
              aria-label={speech.listening ? "Stop recording" : "Start speaking"}
              className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-teal text-white transition-colors hover:bg-teal-deep disabled:cursor-not-allowed disabled:bg-line disabled:text-ink-soft"
            >
              {speech.listening && (
                <span className="absolute inset-0 animate-ping rounded-full bg-teal/40 motion-reduce:hidden" />
              )}
              <MicIcon />
            </button>
          </div>

          <p aria-live="polite" className="mt-2 min-h-5 text-sm text-ink-soft">
            {status}
          </p>

          <div className="mt-2 flex flex-wrap gap-2">
            {LANGS[lang].chips.map((c) => (
              <button
                key={c}
                type="button"
                lang={lang}
                onClick={() => setText(c)}
                className="rounded-full border border-line px-3 py-1 text-sm text-ink-soft hover:border-teal hover:text-ink"
              >
                {c}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <p className="text-sm font-medium text-alert">In an emergency, call 112.</p>
            <button
              type="submit"
              disabled={text.trim().length < 5}
              className="rounded-full bg-teal px-6 py-2.5 font-medium text-white hover:bg-teal-deep disabled:cursor-not-allowed disabled:bg-line disabled:text-ink-soft"
            >
              Continue
            </button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-soft">
            Your browser turns speech into text. HealthBridge never receives or stores audio.
          </p>
        </form>
      </div>

      <aside className="lg:pt-6">
        <h2 className="font-display text-xl font-semibold">Or go straight to</h2>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {DOORS.map((d) => (
            <li key={d.to}>
              <Link to={d.to} className="group flex items-start gap-4 py-5">
                <span className="mt-0.5 text-teal">{d.icon}</span>
                <span>
                  <span className="block font-display text-lg font-semibold group-hover:text-teal-deep">{d.title}</span>
                  <span className="mt-1 block text-[15px] leading-snug text-ink-soft">{d.text}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </section>
  );
}