import { useState } from "react";
import { Link } from "react-router-dom";
import { errorMessage, fieldErrors } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Alert, Button, Check, Input, PageShell, Select } from "../components/ui";

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  password: "",
  city: "",
  state: "",
  address: "",
  pincode: "",
  dateOfBirth: "",
  gender: "",
  preferredLanguage: "en",
  consentTerms: false,
  consentHealthData: false,
};

export default function Register() {
  const { registerPatient } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    setErrors({});
    if (!form.consentTerms || !form.consentHealthData) {
      setErrors({
        consentTerms: form.consentTerms ? "" : "Please accept the terms to continue",
        consentHealthData: form.consentHealthData ? "" : "We need your consent to handle health details",
      });
      return;
    }

    const payload = {
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
    };
    // Optional fields are left out when blank.
    ["state", "pincode", "dateOfBirth", "gender"].forEach((k) => {
      if (!payload[k]) delete payload[k];
    });

    setBusy(true);
    try {
      await registerPatient(payload); // RedirectIfAuthed moves us on
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <PageShell title="Create your account" subtitle="It takes a minute. You can book right after." narrow>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Alert>{error}</Alert>

        <Input label="Full name" autoComplete="name" value={form.name} onChange={set("name")} error={errors.name} required />
        <Input label="Email" type="email" autoComplete="email" value={form.email} onChange={set("email")} error={errors.email} required />
        <Input
          label="Mobile number"
          type="tel"
          autoComplete="tel"
          value={form.phone}
          onChange={set("phone")}
          error={errors.phone}
          hint="Used for WhatsApp confirmations and reminders. Add +91 if it isn’t an Indian number."
          required
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={set("password")}
          error={errors.password}
          hint="At least 8 characters."
          required
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="City" autoComplete="address-level2" value={form.city} onChange={set("city")} error={errors.city} required />
          <Input label="State (optional)" autoComplete="address-level1" value={form.state} onChange={set("state")} error={errors.state} />
        </div>
        <Input label="Address" autoComplete="street-address" value={form.address} onChange={set("address")} error={errors.address} required />
        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="Pincode (optional)" inputMode="numeric" value={form.pincode} onChange={set("pincode")} error={errors.pincode} />
          <Input label="Date of birth (optional)" type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} error={errors.dateOfBirth} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Select label="Gender (optional)" value={form.gender} onChange={set("gender")} error={errors.gender}>
            <option value="">Prefer not to say</option>
            <option value="FEMALE">Female</option>
            <option value="MALE">Male</option>
            <option value="OTHER">Other</option>
          </Select>
          <Select label="Preferred language" value={form.preferredLanguage} onChange={set("preferredLanguage")}>
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
          </Select>
        </div>

        <div className="space-y-3 rounded-2xl bg-wash p-5">
          <Check checked={form.consentTerms} onChange={set("consentTerms")} error={errors.consentTerms}>
            I agree to the terms of use. I understand HealthBridge helps me find care and doesn’t give diagnoses or
            prescriptions.
          </Check>
          <Check checked={form.consentHealthData} onChange={set("consentHealthData")} error={errors.consentHealthData}>
            I agree that HealthBridge may process the health details I enter, only to find doctors and nurses for me.
          </Check>
        </div>

        <Button type="submit" loading={busy} className="w-full">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-ink-soft">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-teal-deep underline underline-offset-4">
          Log in
        </Link>
        . Are you a doctor?{" "}
        <Link to="/doctor/register" className="font-medium text-teal-deep underline underline-offset-4">
          Register here
        </Link>
        .
      </p>
    </PageShell>
  );
}