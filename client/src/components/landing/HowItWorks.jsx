const STEPS = [
  {
    title: "Say what’s wrong",
    text: "Speak or type in Hindi or English. Fix any word the microphone got wrong.",
  },
  {
    title: "Check what we understood",
    text: "We list your symptoms and how long you’ve had them. You edit anything that’s off, then confirm.",
  },
  {
    title: "See who can help",
    text: "Doctors are ranked by specialty, language, how soon they’re free, city and fee. Each one shows why.",
  },
  {
    title: "Book your way",
    text: "Choose a video visit, a clinic visit, or a nurse at home for a short task. You get a WhatsApp confirmation and reminders.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl lg:sticky lg:top-24 lg:self-start">
          From “something’s wrong” to a booked visit in four steps
        </h2>
        <ol className="divide-y divide-line border-y border-line">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-6 py-7">
              <span className="font-display text-4xl font-bold leading-none text-teal" aria-hidden="true">
                {i + 1}
              </span>
              <div>
                <h3 className="font-display text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 max-w-prose text-[17px] leading-relaxed text-ink-soft">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}