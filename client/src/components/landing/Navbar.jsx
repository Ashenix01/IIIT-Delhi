import { Link } from "react-router-dom";

const links = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#doctors", label: "For doctors" },
];

function BridgeMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <rect width="28" height="28" rx="8" fill="#0e7c86" />
      <path d="M5 19c3-8 15-8 18 0" stroke="#f6f9f9" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M5 19h18" stroke="#f6f9f9" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export default function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-mist/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
          <BridgeMark />
          HealthBridge
        </Link>

        <nav className="hidden items-center gap-8 text-[15px] text-ink-soft md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-ink">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link to="/login" className="px-3 py-2 text-[15px] font-medium hover:text-teal-deep">
            Log in
          </Link>
          <Link
            to="/register"
            className="rounded-full bg-ink px-4 py-2 text-[15px] font-medium text-paper hover:bg-teal-deep"
          >
            Create account
          </Link>
        </div>
      </div>
    </header>
  );
}