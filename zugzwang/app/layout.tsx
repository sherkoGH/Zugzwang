import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

export const metadata: Metadata = {
  title: "Zugzwang — Checkers Reimagined",
  description:
    "Premium online checkers — three variants, daily puzzles, AI bots, and city leaderboards.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-obsidian text-ivory antialiased">
        <Sidebar />
        <div className="pl-[68px] lg:pl-[220px] min-h-screen flex flex-col">
          <TopBar />
          <main className="flex-1 px-4 pb-16 pt-4 sm:px-6 lg:px-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
