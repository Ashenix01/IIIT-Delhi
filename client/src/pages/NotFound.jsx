import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-5 py-24">
      <h1 className="font-display text-4xl font-bold tracking-tight">We can’t find that page</h1>
      <p className="mt-4 text-lg text-ink-soft">The link may be old, or the page may not exist yet.</p>
      <Link to="/" className="mt-8 inline-block rounded-full bg-teal px-6 py-3 font-medium text-white hover:bg-teal-deep">
        Go to the home page
      </Link>
    </div>
  );
}