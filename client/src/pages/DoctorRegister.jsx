import { useState } from "react";
import { Link } from "react-router-dom";
import { errorMessage, fieldErrors } from "../api/client";
import { useAuth } from "../context/AuthContext";
import useApi from "../hooks/useApi";
import { Alert, Button, Check, Input, PageShell, Select, Textarea } from "../components/ui";

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  password: "",
  specializationId: "",
  subSpecializationIds: [],
  yearsOfExperience: "",
  clinicName: "",
  address: "",
  city: "",
  state: "",
  consultationFee: "",
  consultationModes: ["ONLINE", "IN_PERSON"],
  languages: ["en"],
  bio: "",
  registrationNumber: "",
  licensingAuthority: "",
};

const toggle = (list, value) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

function Section({ title, children }) {
  return (
    <fieldset className="space-y-5 border-t border-line pt-8">
      <legend className="mb-1 font-display text-xl font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

export default function DoctorRegister() {
  const { registerDoctor } = useAuth();
  const specs = useApi("/specializations");
  const [form, setForm] = useState(EMPTY);
  const [quals, setQuals] = useState([{ degree: "", institution: "", year: "" }]);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setQual = (i, key) => (e) =>
    setQuals((q) => q.map((row, idx) => (idx === i ? { ...row, [key]: e.target.value } : row)));

  const list = specs.data?.specializations ?? [];
  const chosen = list.find((s) => s.id === form.specializationId);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setErrors({});

    const qualifications = quals
      .filter((q) => q.degree.trim() && q.institution.trim())
      .map((q) => ({
        degree: q.degree.trim(),
        institution: q.institution.trim(),
        ...(q.year ? { year: Number(q.year) } : {}),
      }));
    if (qualifications.length === 0) {
      setError("Add at least one qualification, with the degree and the institution.");
      return;
    }

    const payload = {
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      qualifications,
    };
    ["clinicName", "state", "bio"].forEach((k) => {
      if (!payload[k]?.trim()) delete payload[k];
    });

    setBusy(true);
    try {
      await registerDoctor(payload); // RedirectIfAuthed moves us on
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <PageShell
      title="Register as a doctor"
      subtitle="Patients can find you once your registration has been verified."
      narrow
    >
      <form onSubmit={submit} className="space-y-8" noValidate>
        <Alert>{error}</Alert>

        <fieldset className="space-y-5">
          <legend className="mb-1 font-display text-xl font-semibold">Your account</legend>
          <Input label="Full name" value={form.name} onChange={set("name")} error={errors.name} required />
          <Input label="Email" type="email" autoComplete="email" value={form.email} onChange={set("email")} error={errors.email} required />
          <Input label="Mobile number" type="tel" value={form.phone} onChange={set("phone")} error={errors.phone} hint="Used for appointment notifications." required />
          <Input label="Password" type="password" autoComplete="new-password" value={form.password} onChange={set("password")} error={errors.password} hint="At least 8 characters." required />
        </fieldset>

        <Section title="Your practice">
          <Select
            label="Specialty"
            value={form.specializationId}
            onChange={(e) => setForm((f) => ({ ...f, specializationId: e.target.value, subSpecializationIds: [] }))}
            error={errors.specializationId}
            required
          >
            <option value="">{specs.loading ? "Loading..." : "Choose a specialty"}</option>
            {list.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
          {specs.error && <Alert>{specs.error}</Alert>}

          {chosen?.subSpecializations.length > 0 && (
            <div>
              <p className="mb-2 text-[15px] font-medium">Sub-specialties (optional)</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {chosen.subSpecializations.map((s) => (
                  <Check
                    key={s.id}
                    checked={form.subSpecializationIds.includes(s.id)}
                    onChange={() => setForm((f) => ({ ...f, subSpecializationIds: toggle(f.subSpecializationIds, s.id) }))}
                  >
                    {s.name}
                  </Check>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <Input label="Years of experience" type="number" min="0" max="70" value={form.yearsOfExperience} onChange={set("yearsOfExperience")} error={errors.yearsOfExperience} required />
            <Input label="Consultation fee (₹)" type="number" min="0" value={form.consultationFee} onChange={set("consultationFee")} error={errors.consultationFee} required />
          </div>

          <div>
            <p className="mb-2 text-[15px] font-medium">How do you see patients?</p>
            <div className="flex flex-wrap gap-x-8 gap-y-2">
              <Check checked={form.consultationModes.includes("ONLINE")} onChange={() => setForm((f) => ({ ...f, consultationModes: toggle(f.consultationModes, "ONLINE") }))}>
                Video visits
              </Check>
              <Check checked={form.consultationModes.includes("IN_PERSON")} onChange={() => setForm((f) => ({ ...f, consultationModes: toggle(f.consultationModes, "IN_PERSON") }))}>
                In person
              </Check>
            </div>
            {errors.consultationModes && <p className="mt-1.5 text-sm text-alert">{errors.consultationModes}</p>}
          </div>

          <div>
            <p className="mb-2 text-[15px] font-medium">Languages you consult in</p>
            <div className="flex flex-wrap gap-x-8 gap-y-2">
              <Check checked={form.languages.includes("en")} onChange={() => setForm((f) => ({ ...f, languages: toggle(f.languages, "en") }))}>
                English
              </Check>
              <Check checked={form.languages.includes("hi")} onChange={() => setForm((f) => ({ ...f, languages: toggle(f.languages, "hi") }))}>
                हिन्दी
              </Check>
            </div>
            {errors.languages && <p className="mt-1.5 text-sm text-alert">{errors.languages}</p>}
          </div>

          <Input label="Clinic name (optional)" value={form.clinicName} onChange={set("clinicName")} error={errors.clinicName} />
          <Input label="Clinic address" value={form.address} onChange={set("address")} error={errors.address} required />
          <div className="grid gap-5 sm:grid-cols-2">
            <Input label="City" value={form.city} onChange={set("city")} error={errors.city} required />
            <Input label="State (optional)" value={form.state} onChange={set("state")} error={errors.state} />
          </div>
          <Textarea label="About you (optional)" rows={3} maxLength={1000} value={form.bio} onChange={set("bio")} error={errors.bio} hint="One or two sentences patients will see." />
        </Section>

        <Section title="Credentials">
          <div className="grid gap-5 sm:grid-cols-2">
            <Input label="Registration number" value={form.registrationNumber} onChange={set("registrationNumber")} error={errors.registrationNumber} required />
            <Input label="Issuing council" value={form.licensingAuthority} onChange={set("licensingAuthority")} error={errors.licensingAuthority} hint="For example, a state medical council." required />
          </div>

          <div className="space-y-4">
            <p className="text-[15px] font-medium">Qualifications</p>
            {quals.map((q, i) => (
              <div key={i} className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-[1fr_1.4fr_6rem]">
                <Input label="Degree" value={q.degree} onChange={setQual(i, "degree")} placeholder="MBBS" />
                <Input label="Institution" value={q.institution} onChange={setQual(i, "institution")} />
                <Input label="Year" type="number" value={q.year} onChange={setQual(i, "year")} />
                {quals.length > 1 && (
                  <button type="button" onClick={() => setQuals((all) => all.filter((_, idx) => idx !== i))} className="text-left text-sm text-alert underline underline-offset-4 sm:col-span-3">
                    Remove this qualification
                  </button>
                )}
              </div>
            ))}
            <Button variant="outline" onClick={() => setQuals((q) => [...q, { degree: "", institution: "", year: "" }])}>
              Add another qualification
            </Button>
          </div>
        </Section>

        <Alert tone="info">
          After you register, your profile stays hidden from patients until your registration is verified.
        </Alert>

        <Button type="submit" loading={busy} className="w-full">
          Create doctor account
        </Button>
      </form>

      <p className="mt-6 text-ink-soft">
        Already registered?{" "}
        <Link to="/login" className="font-medium text-teal-deep underline underline-offset-4">
          Log in
        </Link>
        .
      </p>
    </PageShell>
  );
}