import { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { api, errorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import useSpeechRecognition from "../hooks/useSpeechRecognition";
import ChipEditor from "../components/ChipEditor";
import { Alert, Button, PageShell, Select, Input, inputCls } from "../components/ui";

const LANGS = {
  en: { label: "English", speech: "en-IN", placeholder: "For example: I’ve had a headache and a mild fever for 3 days" },
  hi: { label: "हिन्दी", speech: "hi-IN", placeholder: "उदाहरण: मुझे तीन दिन से सिर दर्द और हल्का बुखार है" },
};

const SEVERITY = [
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "severe", label: "Severe" },
  { value: "unknown", label: "Not sure" },
];

const EMERGENCY_TEXT = {
  en: { title: "Please get urgent help now", call: "Call 112", back: "Start over" },
  hi: { title: "कृपया अभी तुरंत मदद लें", call: "112 पर कॉल करें", back: "फिर से शुरू करें" },
};

function MicIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

export default function Query() {
  const { state } = useLocation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const mode = ["ONLINE", "IN_PERSON"].includes(params.get("mode")) ? params.get("mode") : "";

  const [lang, setLang] = useState(state?.language ?? (user?.profile?.preferredLanguage === "hi" ? "hi" : "en"));
  const [text, setText] = useState(state?.text ?? "");
  const [usedVoice, setUsedVoice] = useState(state?.inputMode === "VOICE");
  const [phase, setPhase] = useState("input"); // input | review | emergency
  const [queryId, setQueryId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [disclaimer, setDisclaimer] = useState("");
  const [safety, setSafety] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const speech = useSpeechRecognition({ lang: LANGS[lang].speech, onText: setText });

  function toggleMic() {
    if (speech.listening) return speech.stop();
    setUsedVoice(true);
    speech.start(text);
  }

  function showEmergency(res) {
    setSafety(res.safety);
    setPhase("emergency");
  }

  async function understand(e) {
    e.preventDefault();
    speech.stop();
    setError("");
    setBusy(true);
    try {
      const { data } = await api.post("/queries/extract", {
        transcript: text.trim(),
        language: lang,
        inputMode: usedVoice ? "VOICE" : "TEXT",
      });
      setQueryId(data.queryId);
      if (data.emergency) return showEmergency(data);

      const x = data.extraction;
      setDraft({ ...x, duration: x.duration ?? "" });
      const d = data.disclaimer;
      setDisclaimer(typeof d === "string" ? d : (d?.[lang] ?? d?.en ?? ""));
      setPhase("review");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setError("");
    setBusy(true);
    try {
      const { data } = await api.post(`/queries/${queryId}/confirm`, {
        extraction: { ...draft, duration: draft.duration.trim() || null },
      });
      if (data.emergency) return showEmergency(data);
      navigate(`/results/${queryId}${mode ? `?mode=${mode}` : ""}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function startOver() {
    setPhase("input");
    setQueryId(null);
    setDraft(null);
    setSafety(null);
    setError("");
  }

  /* ---------- emergency ---------- */
  if (phase === "emergency") {
    const t = EMERGENCY_TEXT[lang] ?? EMERGENCY_TEXT.en;
    return (
      <PageShell title={t.title} narrow>
        <div role="alert" className="rounded-2xl bg-alert-wash p-6 text-alert">
          <p lang={lang} className="text-lg leading-relaxed">{safety?.message}</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="tel:112" className="rounded-full bg-alert px-6 py-3 font-medium text-white hover:opacity-90">
            {t.call}
          </a>
          <Button variant="outline" onClick={startOver}>
            {t.back}
          </Button>
        </div>
        <p className="mt-6 text-sm text-ink-soft">
          Booking is paused for this description. HealthBridge doesn’t diagnose; these steps are shown because of the
          warning signs you mentioned.
        </p>
      </PageShell>
    );
  }

  /* ---------- review ---------- */
  if (phase === "review" && draft) {
    const set = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));
    return (
      <PageShell
        title="Check what we understood"
        subtitle="This is a summary of what you said. Fix anything that’s wrong, then confirm. Nothing is used until you do."
      >
        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-8">
            <Alert>{error}</Alert>

            <ChipEditor
              label="Symptoms"
              items={draft.symptoms}
              onChange={set("symptoms")}
              placeholder="Add a symptom, for example cough"
              hint="Remove anything that isn’t right. Add anything we missed."
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="How long?"
                value={draft.duration}
                onChange={(e) => set("duration")(e.target.value)}
                placeholder="For example: 3 days"
                maxLength={100}
              />
              <Select label="How bad is it?" value={draft.severity} onChange={(e) => set("severity")(e.target.value)}>
                {SEVERITY.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </Select>
            </div>
            <ChipEditor
              label="Relevant health history (optional)"
              items={draft.relevantHistory ?? []}
              onChange={set("relevantHistory")}
              placeholder="For example: diabetes"
              max={10}
            />

            <div className="flex flex-wrap gap-3">
              <Button onClick={confirm} loading={busy} disabled={draft.symptoms.length === 0}>
                This is right. Find doctors
              </Button>
              <Button variant="outline" onClick={startOver} disabled={busy}>
                Change my description
              </Button>
            </div>
            {draft.symptoms.length === 0 && (
              <p className="text-sm text-ink-soft">Add at least one symptom to continue.</p>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-line p-5">
              <h2 className="font-display text-lg font-semibold">What you said</h2>
              <p lang={lang} className="mt-2 whitespace-pre-line text-[17px] leading-relaxed text-ink-soft">{text}</p>
            </div>

            {draft.missingInformation?.length > 0 && (
              <div className="rounded-2xl bg-wash p-5">
                <h2 className="font-display text-lg font-semibold">It would help to add</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[16px] text-ink-soft marker:text-teal">
                  {draft.missingInformation.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            )}

            {disclaimer && <p lang={lang} className="text-sm leading-relaxed text-ink-soft">{disclaimer}</p>}
          </aside>
        </div>
      </PageShell>
    );
  }

  /* ---------- input ---------- */
  const status = speech.error ? (
    <span className="text-alert">{speech.error}</span>
  ) : speech.listening ? (
    "Listening. Speak now."
  ) : !speech.supported ? (
    "Voice input isn’t available in this browser. You can type instead."
  ) : null;

  return (
    <PageShell
      title="What’s bothering you?"
      subtitle={
        mode === "ONLINE"
          ? "Tell us in your own words. We’ll look for doctors who offer video visits."
          : mode === "IN_PERSON"
            ? "Tell us in your own words. We’ll look for doctors you can visit."
            : "Tell us in your own words, in Hindi or English."
      }
      narrow
    >
      <form onSubmit={understand} className="space-y-4">
        <Alert>{error}</Alert>

        <div className="flex items-center justify-between gap-3">
          <label htmlFor="q-text" className="text-[15px] font-medium">Describe how you feel</label>
          <div role="group" aria-label="Language" className="flex rounded-full bg-wash p-0.5 text-sm">
            {Object.entries(LANGS).map(([key, l]) => (
              <button
                key={key}
                type="button"
                aria-pressed={lang === key}
                onClick={() => {
                  speech.stop();
                  setLang(key);
                }}
                className={`rounded-full px-3 py-1 font-medium transition-colors ${lang === key ? "bg-ink text-white" : "text-ink-soft hover:text-ink"}`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-3">
          <textarea
            id="q-text"
            rows={5}
            maxLength={4000}
            lang={lang}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={LANGS[lang].placeholder}
            className={`${inputCls} min-h-[8rem] flex-1 resize-y text-lg`}
          />
          <button
            type="button"
            onClick={toggleMic}
            disabled={!speech.supported}
            aria-pressed={speech.listening}
            aria-label={speech.listening ? "Stop recording" : "Start speaking"}
            className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-teal text-white transition-colors hover:bg-teal-deep disabled:cursor-not-allowed disabled:bg-line disabled:text-ink-soft"
          >
            {speech.listening && <span className="absolute inset-0 animate-ping rounded-full bg-teal/40 motion-reduce:hidden" />}
            <MicIcon />
          </button>
        </div>

        <p aria-live="polite" className="min-h-5 text-sm text-ink-soft">{status}</p>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-sm font-medium text-alert">In an emergency, call 112.</p>
          <Button type="submit" loading={busy} disabled={text.trim().length < 5}>
            Continue
          </Button>
        </div>
        <p className="text-xs leading-relaxed text-ink-soft">
          Your browser turns speech into text. HealthBridge never receives or stores audio. You’ll review the summary
          before anything is used.
        </p>
      </form>
    </PageShell>
  );
}