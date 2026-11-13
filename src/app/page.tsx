import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap, Layers, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden flex flex-col justify-between">
      {/* Calm ambient background halos */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-500/5 blur-[140px] pointer-events-none -z-10 animate-float-slow" />
      <div className="absolute top-1/3 -right-24 w-80 h-80 bg-blue-600/5 blur-[120px] pointer-events-none -z-10 animate-pulse-slow" />

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 pt-24 pb-20 flex flex-col items-center text-center">
        {/* Release Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.08] bg-slate-900/60 text-slate-300 text-xs font-mono tracking-wide mb-8 animate-fadeIn">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse-slow" />
          <span>AZORA • SERVERLESS AZURE FINOPS ENGINE</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight max-w-3xl leading-[1.1] mb-6">
          Deploy to Azure with{" "}
          <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            confidence.
          </span>
        </h1>

        {/* Subhead */}
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mb-10 leading-relaxed font-normal">
          An internal developer console for zero-config Linux App Service deployments, zip normalization, and autonomous two-tier FinOps circuit breakers.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3.5 items-center mb-16">
          <Link href="/dashboard">
            <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold px-7 h-11 transition-all group shadow-sm">
              Launch Console
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="border-white/[0.1] hover:bg-white/[0.04] text-slate-300 h-11 px-7 text-xs font-mono">
              Sign In
            </Button>
          </Link>
        </div>

        {/* Minimal Terminal Visualizer */}
        <div className="w-full max-w-3xl bg-slate-950/70 border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden text-left mb-20">
          <div className="bg-slate-900/50 px-4 py-2.5 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              <span className="text-[11px] font-mono text-slate-400 ml-2">azora-kudu-pipeline</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400/80">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse-slow" />
              ARM Connected
            </div>
          </div>
          <div className="p-5 font-mono text-xs text-slate-300 space-y-2 overflow-x-auto">
            <p className="text-slate-500"># Deploying workload via Upstash QStash & Kudu REST Engine</p>
            <p><span className="text-cyan-400">$</span> azora deploy --app=production-api --runtime=react --region=indiasouthcentral</p>
            <p className="text-emerald-400/90 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>[Storage] Stored in Vercel Blob (Private Storage) • 0.8s</span>
            </p>
            <p className="text-emerald-400/90 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>[Normalizer] Stripped nested directory wrapper & OS metadata artifacts</span>
            </p>
            <p className="text-emerald-400/90 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>[Worker] Push queue verified via Upstash QStash (HMAC-SHA256)</span>
            </p>
            <p className="text-emerald-400/90 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>[Azure ARM] Provisioned Plan: plan-f1-indiasouthcentral • WebApp: production-api</span>
            </p>
            <p className="text-cyan-300 font-medium flex items-center gap-2 pt-2 border-t border-white/[0.06]">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>[FinOps Guardrail] Active Circuit-Breaker: Soft ₹500 (Email) | Hard ₹1000 (Auto-Stop)</span>
            </p>
          </div>
        </div>

        {/* Feature Cards Grid (Minimal & Calm) */}
        <div className="grid md:grid-cols-3 gap-5 w-full text-left">
          <div className="p-5 rounded-xl border border-white/[0.08] bg-slate-900/30 backdrop-blur-sm transition-all">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold mb-1 text-white">Push-Based Workers</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Decouples long-running Azure Kudu deployments from frontend HTTP requests using Upstash QStash and Vercel Blob.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-white/[0.08] bg-slate-900/30 backdrop-blur-sm transition-all">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold mb-1 text-white">Two-Tier FinOps Guardrails</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Microsoft Action Groups deliver email warnings, backed by Azora's active auto-stop circuit breaker to halt runaway compute.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-white/[0.08] bg-slate-900/30 backdrop-blur-sm transition-all">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold mb-1 text-white">Zip Normalization</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Flattens nested folder archives and purges OS metadata, guaranteeing seamless root deployments on Linux App Services.
            </p>
          </div>
        </div>
      </main>

      {/* Footer (Minimal) */}
      <footer className="border-t border-white/[0.06] py-6 px-6 text-center text-xs text-slate-500 font-mono">
        <p>Azora • Cloud FinOps & Serverless Deployment Platform for Microsoft Azure</p>
      </footer>
    </div>
  );
}
