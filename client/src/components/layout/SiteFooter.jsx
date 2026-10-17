import Logo from "./Logo";

export default function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 md:flex-row md:justify-between">
        <div className="max-w-md">
          <Logo />
          <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
            HealthBridge helps you find care. It doesn’t diagnose or prescribe. Doctor and nurse profiles in this demo are
            sample data. In an emergency, call 112.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-2 text-[15px] text-ink-soft">
          <a href="/#how" className="hover:text-ink">How it works</a>
          <a href="/#features" className="hover:text-ink">Features</a>
          <a href="/#doctors" className="hover:text-ink">For doctors</a>
          <a href="/login" className="hover:text-ink">Log in</a>
        </nav>
      </div>
    </footer>
  );
}