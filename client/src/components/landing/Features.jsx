const PATIENTS = [
  {
    title: "Speak or type, in Hindi or English",
    text: "Describe how you feel the way you would to a friend. Your browser turns speech into text, and you can fix any word before it goes anywhere.",
  },
  {
    title: "You confirm before anything is used",
    text: "We list the symptoms and how long you’ve had them. You edit the list, then confirm it.",
  },
  {
    title: "Warning signs come first",
    text: "If you mention things like chest pain or trouble breathing, you see urgent-care steps instead of booking options.",
  },
  {
    title: "Doctors ranked by clear rules",
    text: "Specialty, language, how soon they’re free, city, fee and experience. Every doctor shows why they were picked.",
  },
  {
    title: "Video or clinic visits",
    text: "Online visits get a private video room that opens 10 minutes before your appointment. Change or cancel up to 2 hours before.",
  },
  {
    title: "A nurse at your door",
    text: "For short tasks like injections, dressing changes, and blood pressure or sugar checks. Pick a time and we assign a registered nurse in your city.",
  },
  {
    title: "WhatsApp confirmations and reminders",
    text: "A message when you book, and reminders 24 hours and 1 hour before.",
  },
];

const DOCTORS = [
  {
    title: "Verified before you’re listed",
    text: "Patients only see doctors whose registration has been checked.",
  },
  {
    title: "Your appointments in one place",
    text: "See upcoming and past visits, join video consultations, and mark visits complete.",
  },
  {
    title: "Summaries only with consent",
    text: "You see a patient’s AI-prepared summary and their own words only if they chose to share them. It’s labelled as AI-generated.",
  },
  {
    title: "No double bookings",
    text: "A slot can only be booked once, even when two patients try at the same moment.",
  },
];

function Group({ title, items }) {
  return (
    <div className="mt-14">
      <h3 className="font-display text-2xl font-semibold">{title}</h3>
      <dl className="mt-5 divide-y divide-line border-y border-line">
        {items.map((it) => (
          <div key={it.title} className="grid gap-2 py-6 md:grid-cols-[2fr_3fr] md:gap-10">
            <dt className="font-display text-lg font-semibold">{it.title}</dt>
            <dd className="max-w-prose text-[17px] leading-relaxed text-ink-soft">{it.text}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function Features() {
  return (
    <section id="features" className="border-t border-line">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Everything between “I feel unwell” and “I’ve seen someone”
        </h2>
        <Group title="For patients" items={PATIENTS} />
        <Group title="For doctors" items={DOCTORS} />
      </div>
    </section>
  );
}