'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModeToggle } from "@/components/theme-change";
import { Cloud, Shield, Zap, Plus, Layers, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] group-hover:scale-105 transition-transform">
              <Cloud className="w-5 h-5 fill-white/20" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text">
                AZORA
              </span>
              <span className="text-[10px] font-mono text-cyan-400 -mt-1 tracking-wider uppercase">
                Cloud FinOps
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link
              href="/dashboard"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                pathname === "/dashboard"
                  ? "bg-accent text-accent-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-cyan-400" />
              Dashboard
            </Link>
            <Link
              href="/resourceGroup"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                pathname.startsWith("/resourceGroup")
                  ? "bg-accent text-accent-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Layers className="w-4 h-4 text-blue-400" />
              Resource Groups
            </Link>
          </nav>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Cloud Status Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-950/20 text-emerald-400 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Azure ARM: Active</span>
          </div>

          <Link href="/dashboard/createApp">
            <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium shadow-[0_0_15px_rgba(6,182,212,0.3)] h-9 px-3">
              <Plus className="w-4 h-4 mr-1" />
              New App
            </Button>
          </Link>

          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
