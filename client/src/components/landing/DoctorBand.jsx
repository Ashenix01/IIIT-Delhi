import { Link } from "react-router-dom";

export default function DoctorBand() {
  return (
    <section id="doctors" className="border-t border-line">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-8 rounded-2xl border border-line p-8 sm:p-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Are you a doctor?</h2>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-soft">
              Register, get verified, and patients who need your specialty can find and book you. Run your appointments
              and video visits from one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link
              to="/doctor/register"
              className="rounded-full bg-ink px-6 py-3 font-medium text-white hover:bg-teal-deep"
            >
              Register as a doctor
            </Link>
            <Link to="/login" className="rounded-full border border-line px-6 py-3 font-medium hover:border-ink">
              Doctor log in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}