import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SchoolBridge — Sync ClassDojo to Your Calendar",
  description:
    "Automatically extract events from ClassDojo, approve them in Discord, and sync to Nextcloud, Home Assistant, Google Calendar, and more.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
