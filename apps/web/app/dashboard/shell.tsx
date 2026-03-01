"use client";

import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarLogo,
  SidebarContent,
  SidebarSection,
  SidebarNavItem,
  SidebarFooter,
  SidebarToggle,
  SidebarMobileTrigger,
} from "@schoolbridge/ui";

const NAV_ITEMS = [
  {
    section: "Dashboard",
    items: [
      { label: "Overview", href: "/dashboard/overview", icon: OverviewIcon },
      { label: "Events", href: "/dashboard/events", icon: EventsIcon },
      { label: "Photos", href: "/dashboard/photos", icon: PhotosIcon },
    ],
  },
  {
    section: "Configuration",
    items: [
      { label: "Source", href: "/dashboard/source", icon: SourceIcon },
      { label: "Connections", href: "/dashboard/connections", icon: ConnectionsIcon },
      { label: "Settings", href: "/dashboard/settings", icon: SettingsIcon },
    ],
  },
];

export function DashboardShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar>
          <SidebarHeader>
            <SidebarLogo
              icon={<BridgeIcon />}
              name="SchoolBridge"
              subtitle={user.email ?? "Dashboard"}
            />
          </SidebarHeader>

          <SidebarContent>
            {NAV_ITEMS.map((section) => (
              <SidebarSection key={section.section} label={section.section}>
                {section.items.map((item) => (
                  <SidebarNavItem
                    key={item.href}
                    icon={<item.icon />}
                    label={item.label}
                    active={pathname === item.href}
                    onClick={() => router.push(item.href)}
                  />
                ))}
              </SidebarSection>
            ))}
          </SidebarContent>

          <SidebarFooter>
            <SidebarToggle />
          </SidebarFooter>
        </Sidebar>

        {/* Main content area */}
        <main className="flex-1 lg:pl-[280px] transition-all duration-300">
          {/* Top bar */}
          <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))/0.95] backdrop-blur px-6">
            <SidebarMobileTrigger />
            <div className="flex-1" />
            <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
              {user.email}
            </div>
          </header>

          {/* Page content */}
          <div className="p-6 page-transition">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}

/* ── Inline SVG Icons ──────────────────────────────────────────── */

function BridgeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 21h16" />
      <path d="M4 16h16" />
      <path d="M4 16c0-4 4-8 8-8s8 4 8 8" />
      <path d="M8 16V9" />
      <path d="M16 16V9" />
      <path d="M12 16V8" />
    </svg>
  );
}

function OverviewIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function EventsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function PhotosIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function SourceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function ConnectionsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
