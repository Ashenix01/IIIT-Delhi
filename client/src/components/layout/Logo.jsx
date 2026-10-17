import { Link } from "react-router-dom";

export default function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
        <rect width="28" height="28" rx="8" fill="#0e7c86" />
        <path d="M5 19c3-8 15-8 18 0" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <path d="M5 19h18" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      HealthBridge
    </Link>
  );
}