import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, errorMessage } from "../api/client";
import useApi from "../hooks/useApi";
import SlotPicker from "../components/SlotPicker";
import { Alert, Badge, Button, Check, DemoBadge, Loading, PageShell, Textarea } from "../components/ui";
import { formatDateTime, initials, MODE_LABEL, rupees } from "../lib/format";

const LANG_NAME = { en: "English", hi: "Hindi" };

export default function DoctorProfile() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryId = params.get("query") ?? "";

  const { data, error, loading, reload } = useApi(`/doctors/${id}`);
  const [slotId, setSlotId] = useState(params.get("slot") ?? "");
  const [reason, setReason] = useState("");
  const [share, setShare] = useState(false);
  const [bookError, setBookError] = useState("");
  const [busy, setBusy] = useState(false);

  // Drop a preselected slot that is no longer open.
  useEffect(() => {
    if (data && slotId && !data.slots.some((s) => s.id === slotId)) setSlotId("");
  }, [data, slotId]);

  if (loading) return <PageShell title="Doctor"><Loading /></PageShell>;
  if (error || !data) {
    return (
      <PageShell title="Doctor">
        <Alert>{error || "We couldn’t load this doctor."}</Alert>
      </PageShell>
    );
  }

  const { doctor: d, slots } = data;
  const slot = slots.find((s) => s.id === slotId);

  async function book() {
    setBookError("");
    setBusy(true);
    try {
      const { data: res } = await api.post("/appointments", {
        slotId,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
        ...(queryId ? { healthQueryId: queryId, shareSummaryWithDoctor: share } : {}),
      });
      navigate(`/appointments/${res.appointment.id}`, { state: { booked: true } });
    } catch (err) {
      setBookError(errorMessage(err));
      setSlotId("");
      reload(); // the slot may have just been taken
      setBusy(false);
    }
  }

  return (
    <PageShell title={d.name} subtitle={`${d.specialization} · ${d.yearsOfExperience} years of experience`}>
      <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-10">
          <section className="flex items-start gap-5">
            <div aria-hidden="true" className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-teal/10 font-display text-2xl font-bold text-teal-deep">
              {initials(d.name)}
            </div>
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="ok">Verified</Badge>
                {d.isDemo && <DemoBadge />}
                {d.consultationModes.map((m) => (
                  <Badge key={m} tone="teal">{MODE_LABEL[m]}</Badge>
                ))}
              </div>
              {d.bio && <p className="mt-3 max-w-prose text-[17px] leading-relaxed text-ink-soft">{d.bio}</p>}
            </div>
          </section>

          <dl className="grid gap-x-8 gap-y-5 border-y border-line py-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-ink-soft">Consultation fee</dt>
              <dd className="font-display text-xl font-semibold">{rupees(d.consultationFee)}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-soft">Languages</dt>
              <dd className="font-medium">{d.languages.map((l) => LANG_NAME[l] ?? l).join(", ")}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm text-ink-soft">Clinic</dt>
              <dd className="font-medium">
                {d.clinicName ? `${d.clinicName}, ` : ""}
                {d.address}, {d.city}
              </dd>
            </div>
            {d.subSpecializations.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-sm text-ink-soft">Focus areas</dt>
                <dd className="font-medium">{d.subSpecializations.join(", ")}</dd>
              </div>
            )}
            {d.qualifications.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-sm text-ink-soft">Qualifications</dt>
                <dd className="font-medium">
                  {d.qualifications.map((q) => `${q.degree}, ${q.institution}${q.year ? ` (${q.year})` : ""}`).join(" · ")}
                </dd>
              </div>
            )}
          </dl>

          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold">Pick a time</h2>
            <SlotPicker slots={slots} value={slotId} onChange={setSlotId} />
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-5 rounded-2xl border border-line p-6 shadow-[0_14px_34px_-24px_rgba(15,42,51,0.4)]">
            <h2 className="font-display text-xl font-semibold">Your appointment</h2>

            {slot ? (
              <div className="rounded-xl bg-wash p-4">
                <p className="font-medium">{formatDateTime(slot.startsAt)}</p>
                <p className="text-[15px] text-ink-soft">
                  {MODE_LABEL[slot.mode] ?? slot.mode} with {d.name} · {rupees(d.consultationFee)}
                </p>
              </div>
            ) : (
              <p className="text-ink-soft">Choose a time on the left to continue.</p>
            )}

            <Alert>{bookError}</Alert>

            <Textarea
              label="Reason for the visit (optional)"
              rows={3}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              hint="The doctor sees this."
            />

            {queryId && (
              <Check checked={share} onChange={(e) => setShare(e.target.checked)}>
                Share my symptom summary with {d.name}. It’s labelled as AI-prepared and you can leave this off.
              </Check>
            )}

            <Button onClick={book} loading={busy} disabled={!slot} className="w-full">
              Confirm appointment
            </Button>
            <p className="text-sm text-ink-soft">
              You can change or cancel up to 2 hours before the start.
              {slot?.mode === "ONLINE" && " Your video room opens 10 minutes before."}
            </p>
          </div>
          <Link to={queryId ? `/results/${queryId}` : "/query"} className="mt-4 inline-block text-[15px] text-ink-soft underline underline-offset-4 hover:text-ink">
            Back to doctors
          </Link>
        </aside>
      </div>
    </PageShell>
  );
}