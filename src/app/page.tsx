import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap, Layers, Terminal, Sparkles, Cloud, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-cyan-500/30 selection:text-cyan-300 relative overflow-hidden">
      {/* Background Glow Accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-cyan-500/10 via-blue-600/5 to-transparent blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-1/3 -left-48 w-96 h-96 bg-purple-500/5 blur-[100px] pointer-events-none -z-10" />

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 pt-24 pb-20 flex flex-col items-center text-center">
        {/* Release / Tech Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 text-xs font-mono tracking-wide mb-8 shadow-[0_0_15px_rgba(6,182,212,0.15)] animate-fadeIn">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>AZORA 2.0 • SERVERLESS AZURE FINOPS & DEPLOYMENT</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight max-w-4xl leading-[1.1] mb-6">
          Deploy to Azure with{" "}
          <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500 bg-clip-text text-transparent">
            Zero Fear.
          </span>
        </h1>

        {/* Subhead */}
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed font-normal">
          The developer-first internal portal designed for effortless cloud workloads.
          Automate App Service deployments, normalize complex code builds, and guard your budget with active automated circuit breakers.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 items-center mb-16">
          <Link href="/dashboard">
            <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold px-8 h-12 shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all duration-300 group">
              Launch Console
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="border-border hover:bg-muted/50 h-12 px-8 font-medium">
              Sign In to Your Workspace
            </Button>
          </Link>
        </div>

        {/* High-Tech Terminal Visualizer */}
        <div className="w-full max-w-4xl bg-black/80 border border-cyan-500/20 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden text-left mb-24">
          <div className="bg-gray-950/80 px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="text-xs font-mono text-gray-400 ml-2">azora-deployment-engine — bash</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400/80">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Azure ARM: Connected
            </div>
          </div>
          <div className="p-6 font-mono text-xs sm:text-sm text-gray-300 space-y-3 overflow-x-auto">
            <p className="text-gray-500"># Deploying production service via Azora Serverless Worker</p>
            <p><span className="text-cyan-400">$</span> azora deploy --app=notYourType --runtime=react --region=indiasouthcentral</p>
            <p className="text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>[Storage] Stored in Vercel Blob (Private Storage) • 1.2s</span>
            </p>
            <p className="text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>[Normalizer] Stripped 1 nested directory wrapper & OS metadata artifacts</span>
            </p>
            <p className="text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>[Worker] Push-queue dispatched via Upstash QStash (HMAC verified)</span>
            </p>
            <p className="text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>[Azure ARM] Provisioned Plan: plan-f1-indiasouthcentral • WebApp: notYourType</span>
            </p>
            <p className="text-cyan-300 font-semibold flex items-center gap-2 pt-2 border-t border-gray-800">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>[FinOps Guardrail] Active Circuit-Breaker: Soft ₹500 (Azure Email) | Hard ₹1000 (Auto-Stop)</span>
            </p>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid md:grid-cols-3 gap-6 w-full text-left">
          <div className="p-6 rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm hover:border-cyan-500/40 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] transition-all group">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Push-Based Serverless Workers</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Decouples long-running Azure Kudu deployments from frontend requests using Upstash QStash and Vercel Blob, completely eliminating execution timeouts.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm hover:border-cyan-500/40 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] transition-all group">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Two-Tier FinOps Guardrail</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Native Microsoft Action Groups deliver proactive 90% budget warning emails, paired with Azora's active auto-stop circuit breaker to halt runaway compute.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm hover:border-cyan-500/40 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] transition-all group">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold mb-2">In-Memory Zip Normalization</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Automatically inspects and flattens nested folder archives and purges OS metadata, guaranteeing seamless root deployments on Linux App Services.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 px-6 text-center text-xs text-muted-foreground">
        <p>Azora • Internal Developer Platform & FinOps Telemetry Engine for Microsoft Azure</p>
      </footer>
    </div>
  );
}
