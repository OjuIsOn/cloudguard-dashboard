import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ShieldAlert, ArrowUpRight, Layers } from 'lucide-react';

export interface AppCardProps {
  app: {
    _id?: string;
    userId?: string;
    subscriptionId?: string;
    resourceGroup?: string;
    appServiceName?: string;

    name: string;
    budget: number;
    AppName?: string;

    cost?: number;
    autoStop?: boolean;
    hardLimit?: number;
    lastSynced?: string;

    deployStatus?: string;
    planTier?: string;
    appType?: string;

    isDraft?: boolean;
    createdAt?: string;
    updatedAt?: string;
  };
}

export function AppCard({ app }: AppCardProps) {
  const cost = app.cost || 0;
  const budget = app.budget || 0;
  const hardLimit = app.hardLimit || 0;
  const isLive = !!app.AppName && app.deployStatus === 'live';
  const isDeploying = app.deployStatus === 'deploying' || app.deployStatus === 'queued';
  const percentUsed = budget > 0 ? Math.min(100, Math.round((cost / budget) * 100)) : 0;

  return (
    <div className="relative group overflow-hidden rounded-xl border border-white/[0.08] bg-slate-900/40 backdrop-blur-md p-5 transition-all duration-300 hover:border-cyan-500/30 hover:bg-slate-900/60 flex flex-col justify-between gap-4">
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-white tracking-tight group-hover:text-cyan-400 transition-colors">
              {app.name}
            </h3>
            {app.appType && (
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-white/[0.06]">
                {app.appType}
              </span>
            )}
          </div>

          {/* Status Indicator (Slow Ambient Pulse) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isLive ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-slow shadow-[0_0_8px_#34d399]" />
                Live
              </span>
            ) : isDeploying ? (
              <span className="flex items-center gap-1.5 text-xs text-amber-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-slow" />
                Provisioning
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                {app.isDraft ? 'Draft' : 'Ready'}
              </span>
            )}
          </div>
        </div>

        {/* Subtitle / Hostname */}
        <p className="text-xs font-mono text-slate-400 truncate">
          {app.AppName ? `${app.AppName}.azurewebsites.net` : app.appServiceName || 'No host allocated'}
        </p>
      </div>

      {/* FinOps Spending Visualizer (Minimal) */}
      <div className="space-y-2 py-2 border-y border-white/[0.06]">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Month-to-Date</span>
          <span className="font-mono text-slate-200">
            ₹{cost.toFixed(2)} <span className="text-slate-500">/ ₹{budget}</span>
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden border border-white/[0.04]">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              percentUsed > 90
                ? 'bg-rose-500'
                : percentUsed > 60
                ? 'bg-amber-400'
                : 'bg-gradient-to-r from-cyan-400 to-blue-500'
            }`}
            style={{ width: `${percentUsed}%` }}
          />
        </div>

        {/* Circuit Breaker Status */}
        <div className="flex items-center justify-between text-[11px] pt-0.5">
          <span className="flex items-center gap-1 text-slate-400">
            {app.autoStop ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Auto-Stop (₹{hardLimit || budget})
              </span>
            ) : (
              <span className="text-slate-500 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> Soft Alert Only
              </span>
            )}
          </span>
          <span className="font-mono text-slate-500">{percentUsed}%</span>
        </div>
      </div>

      {/* Bottom Metadata & CTA */}
      <div className="flex items-center justify-between text-xs pt-0.5">
        <span className="inline-flex items-center gap-1 text-slate-500 truncate max-w-[140px] font-mono text-[11px]">
          <Layers className="w-3 h-3 text-cyan-400/70" />
          {app.resourceGroup || 'Default RG'}
        </span>

        <div className="flex items-center gap-2">
          {!app.AppName ? (
            <Link
              href={`/dashboard/deploy/${app._id}`}
              className="text-xs font-mono font-medium text-cyan-400 hover:text-cyan-300 hover:underline"
            >
              Deploy →
            </Link>
          ) : (
            <Link
              href={`/dashboard/monitor/${app._id}`}
              className="inline-flex items-center gap-0.5 text-xs font-mono text-slate-300 hover:text-cyan-400 transition-colors"
            >
              Monitor <ArrowUpRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
