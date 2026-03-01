import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-warm">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 21h16" />
              <path d="M4 16h16" />
              <path d="M4 16c0-4 4-8 8-8s8 4 8 8" />
              <path d="M8 16V9" />
              <path d="M16 16V9" />
              <path d="M12 16V8" />
            </svg>
          </div>
          <span className="text-lg font-bold">SchoolBridge</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-9 items-center px-4 text-sm font-medium rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary-hover))] transition-all"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 text-center max-w-3xl mx-auto">
        <span className="inline-flex items-center text-xs font-medium px-3 py-1 rounded-full bg-[hsl(var(--primary-soft))] text-[hsl(var(--primary))] mb-6">
          Automate your school calendar
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[hsl(var(--foreground))] leading-tight">
          ClassDojo to your calendar,{" "}
          <span className="text-gradient-warm">automatically</span>
        </h1>
        <p className="mt-6 text-lg text-[hsl(var(--muted-foreground))] max-w-xl mx-auto">
          SchoolBridge reads your ClassDojo feed, extracts school events using
          NLP, and syncs them to your home calendar — with optional Discord
          approval before anything lands.
        </p>
        <div className="flex items-center justify-center gap-3 mt-8">
          <Link
            href="/signup"
            className="inline-flex h-12 items-center px-7 text-base font-semibold rounded-2xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary-hover))] shadow-[0_4px_6px_-1px_rgba(60,45,30,0.12)] hover:shadow-[0_8px_15px_-3px_rgba(60,45,30,0.15)] hover:-translate-y-px transition-all"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            icon="calendar"
            title="Calendar Sync"
            description="Extracted events sync to CalDAV (Nextcloud), Home Assistant, or any connected calendar."
          />
          <FeatureCard
            icon="shield"
            title="Discord Approval"
            description="Review events in Discord before they sync. Approve, edit, or skip with reaction emojis."
          />
          <FeatureCard
            icon="image"
            title="Photo Backup"
            description="ClassDojo photos automatically download and organize into monthly albums in Immich."
          />
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-16 max-w-3xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-8">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { step: "1", label: "Connect ClassDojo" },
            { step: "2", label: "NLP extracts events" },
            { step: "3", label: "Approve in Discord" },
            { step: "4", label: "Synced to calendar" },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-bold text-sm mb-2">
                {item.step}
              </div>
              <p className="text-sm font-medium">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[hsl(var(--border))] px-6 py-8 text-center">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          SchoolBridge &mdash; Open-source school integration platform
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 hover-lift">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--primary-soft))] text-[hsl(var(--primary))] mb-4">
        {icon === "calendar" && (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        )}
        {icon === "shield" && (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        )}
        {icon === "image" && (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        )}
      </div>
      <h3 className="text-base font-semibold mb-2">{title}</h3>
      <p className="text-sm text-[hsl(var(--muted-foreground))]">{description}</p>
    </div>
  );
}
