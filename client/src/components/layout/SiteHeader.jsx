import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Logo from "./Logo";

const landingLinks = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#doctors", label: "For doctors" },
];
const patientLinks = [
  { to: "/query", label: "Find help" },
  { to: "/appointments", label: "Appointments" },
  { to: "/nurse", label: "Nurse at home" },
];
const doctorLinks = [{ to: "/doctor", label: "Dashboard" }];

export default function SiteHeader() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const appLinks = user?.role === "DOCTOR" ? doctorLinks : user ? patientLinks : [];
  const showAnchors = !user && pathname === "/";

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  const name = user?.profile?.name?.split(" ")[0];

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-8 text-[15px] text-ink-soft md:flex">
          {showAnchors &&
            landingLinks.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-ink">
                {l.label}
              </a>
            ))}
          {appLinks.map((l) => (
            <Link key={l.to} to={l.to} className="hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          {user ? (
            <>
              {name && <span className="hidden px-2 text-[15px] text-ink-soft sm:inline">Hi, {name}</span>}
              <button
                onClick={handleLogout}
                className="rounded-full border border-line px-4 py-2 text-[15px] font-medium hover:border-ink"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-3 py-2 text-[15px] font-medium hover:text-teal-deep">
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-ink px-4 py-2 text-[15px] font-medium text-white hover:bg-teal-deep"
              >
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}