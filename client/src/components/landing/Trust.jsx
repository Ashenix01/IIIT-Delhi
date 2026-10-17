const POINTS = [
  {
    title: "What the AI does",
    text: "It listens to how you describe things and lists your symptoms and how long you’ve had them. You check and edit that list.",
  },
  {
    title: "What follows fixed rules",
    text: "Which specialty fits, which doctors appear, and how they’re ranked come from a fixed set of rules. Every match explains itself.",
  },
  {
    title: "What we never do",
    text: "We don’t diagnose, prescribe, or promise the best doctor. Warning signs show emergency steps before anything else.",
  },
];

export default function Trust() {
  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="max-w-3xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
          The AI reads your words. It doesn’t choose your doctor.
        </h2>

        <div className="mt-10 grid gap-10 md:grid-cols-3">
          {POINTS.map((p) => (
            <div key={p.title} className="border-t-2 border-teal pt-5">
              <h3 className="font-display text-xl font-semibold">{p.title}</h3>
              <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">{p.text}</p>
            </div>
          ))}
        </div>

        <p className="mt-12 rounded-xl bg-alert-wash px-5 py-4 text-[17px] text-alert">
          <strong className="font-semibold">Chest pain, trouble breathing, heavy bleeding?</strong> Call 112 now. Don’t
          wait for an appointment.
        </p>
      </div>
    </section>
  );
}