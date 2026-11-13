import { ShieldCheck, ShieldAlert, Play, ArrowUpRight, Cloud, Layers, Terminal } from "lucide-react";

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
    <div className="relative group overflow-hidden rounded-xl border border-border/70 bg-card/60 backdrop-blur-md p-5 transition-all duration-300 hover:border-cyan-500/50 hover:shadow-[0_0_25px_rgba(6,182,212,0.12)] hover:-translate-y-0.5 flex flex-col justify-between gap-4">
      {/* Subtle top edge glow */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-foreground tracking-tight group-hover:text-cyan-400 transition-colors">
              {app.name}
            </h3>
            {app.appType && (
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                {app.appType}
              </span>
            )}
          </div>

          {/* Status Indicator */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isLive ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live
              </span>
            ) : isDeploying ? (
              <span className="flex items-center gap-1.5 text-xs text-amber-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                Provisioning
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                {app.isDraft ? "Draft" : "Ready"}
              </span>
            )}
          </div>
        </div>

        {/* Subtitle / Service Name */}
        <p className="text-xs font-mono text-muted-foreground truncate">
          {app.AppName ? `${app.AppName}.azurewebsites.net` : app.appServiceName || "No host allocated"}
        </p>
      </div>

      {/* FinOps Spending Visualizer */}
      <div className="space-y-2 py-2 border-y border-border/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Budget Usage</span>
          <span className="font-mono font-medium text-foreground">
            ₹{cost.toFixed(2)} <span className="text-muted-foreground">/ ₹{budget}</span>
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              percentUsed > 90
                ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                : percentUsed > 60
                ? "bg-amber-400"
                : "bg-gradient-to-r from-cyan-500 to-blue-500"
            }`}
            style={{ width: `${percentUsed}%` }}
          />
        </div>

        {/* Circuit Breaker Status */}
        <div className="flex items-center justify-between text-[11px] pt-1">
          <span className="flex items-center gap-1 text-muted-foreground">
            {app.autoStop ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Auto-Stop (₹{hardLimit || budget})
              </span>
            ) : (
              <span className="text-muted-foreground flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> Soft Alert Only
              </span>
            )}
          </span>
          <span className="font-mono text-muted-foreground">{percentUsed}%</span>
        </div>
      </div>

      {/* Bottom Metadata & CTA */}
      <div className="flex items-center justify-between text-xs pt-1">
        <span className="inline-flex items-center gap-1 text-muted-foreground truncate max-w-[150px]">
          <Layers className="w-3 h-3 text-cyan-400/80" />
          <span className="truncate">{app.resourceGroup}</span>
        </span>

        <span className="text-cyan-400 group-hover:text-cyan-300 font-medium flex items-center gap-0.5 text-xs transition-colors">
          Manage
          <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </span>
      </div>
    </div>
  );
}
