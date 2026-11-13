'use client';

import { useEffect, useState, Suspense } from "react";
import { AppCard } from "@/components/app-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from 'next/dynamic';
import { 
  Cloud, 
  Plus, 
  Layers, 
  RefreshCw, 
  ShieldCheck, 
  IndianRupee, 
  AppWindow, 
  PieChart as PieIcon, 
  ExternalLink,
  Loader2
} from "lucide-react";

const VisxPieChart = dynamic(() => import('@/components/pie-Chart'), {
  ssr: false,
});

interface AppData {
  _id?: string;
  userId: string;
  subscriptionId: string;
  resourceGroup: string;
  appServiceName: string;

  name: string;
  budget: number;
  AppName?: string;

  cost?: number;
  autoStop?: boolean;
  hardLimit?: number;
  lastSynced?: string; 

  isDraft?: boolean;
  deployStatus?: string;
  planTier?: string;
  appType?: string;

  createdAt?: string; 
  updatedAt?: string; 
}

interface ResourceGroup {
  _id?: string;
  userId: string;
  subscriptionId: string;
  name: string;
  location?: string;
  budget: number;
  cost: number;
  autoStop: boolean;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

function DashboardContent() {
  const [apps, setApps] = useState<AppData[]>([]);
  const [resourceGroups, setResourceGroups] = useState<ResourceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [linked, setLinked] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const linkedParam = searchParams.get('linked');
    if (linkedParam === 'true') {
      toast.success("Your Azure account has been successfully linked!", {
        description: "You can now provision App Services and track live costs.",
      });
      setLinked(true);
      const params = new URLSearchParams(window.location.search);
      params.delete("linked");
      const newUrl = window.location.pathname + (params.toString() ? `?${params}` : "");
      router.replace(newUrl);
    }
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/auth/azure/sync', { method: 'POST' });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to sync with Azure');
      }
      
      toast.success('Successfully synced subscriptions, resource groups, and web apps!');
      
      // Refresh local data
      const [appsRes, rgRes] = await Promise.all([
        fetch("/api/apps"),
        fetch("/api/resourceGroup")
      ]);
      const appsJson = await appsRes.json();
      const rgJson = await rgRes.json();
      setApps(appsJson.data || []);
      setResourceGroups(rgJson.data || []);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error syncing with Azure');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/apps").then(r => r.json()),
      fetch("/api/resourceGroup").then(r => r.json())
    ]).then(([appsData, rgData]) => {
      setApps(appsData.data || []);
      setResourceGroups(rgData.data || []);
    }).catch(err => {
      console.error(err);
      toast.error("Failed to load dashboard data");
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className="text-sm font-mono text-muted-foreground animate-pulse">Initializing Azure FinOps Telemetry...</p>
      </div>
    );
  }

  // Group apps by resourceGroup
  const appsByGroup: { [key: string]: AppData[] } = apps.reduce((acc, app) => {
    const rg = app.resourceGroup || "Default";
    if (!acc[rg]) acc[rg] = [];
    acc[rg].push(app);
    return acc;
  }, {} as { [key: string]: AppData[] });

  // Calculate aggregated metrics
  const totalApps = apps.length;
  const totalBudget = apps.reduce((sum, app) => sum + (app.budget || 0), 0);
  const totalCost = apps.reduce((sum, app) => sum + (app.cost || 0), 0);
  const activeAutoStops = apps.filter(app => app.autoStop).length;

  const rgCoins = Object.entries(appsByGroup).map(([group, groupApps]) => {
    const totalBudget = groupApps.reduce((sum, app) => sum + (app.budget || 0), 0);
    const totalCost = groupApps.reduce((sum, app) => sum + (app.cost || 0), 0);
    return {
      name: group,
      budget: totalBudget,
      cost: totalCost
    };
  }).filter(rg => rg.budget > 0);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 animate-fadeIn">
      {/* TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            Cloud Workloads & FinOps
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time Azure cost monitoring, push-based deployments, and automated circuit breakers.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="border-border hover:bg-muted font-medium h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncing ? 'animate-spin text-cyan-400' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Azure'}
          </Button>

          <Link href="/resourceGroup">
            <Button variant="outline" size="sm" className="border-border hover:bg-muted font-medium h-9">
              <Layers className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
              New Resource Group
            </Button>
          </Link>

          <Link href="/dashboard/createApp">
            <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium shadow-[0_0_15px_rgba(6,182,212,0.3)] h-9">
              <Plus className="w-4 h-4 mr-1" />
              Create App
            </Button>
          </Link>

          {!linked && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.location.href = "/api/auth/azure"}
              className="bg-cyan-950/30 text-cyan-300 border border-cyan-800/60 hover:bg-cyan-900/40 h-9"
            >
              <Cloud className="w-3.5 h-3.5 mr-1.5" />
              Connect Azure
            </Button>
          )}
        </div>
      </div>

      {/* METRICS STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Stat 1: Total Apps */}
        <div className="p-4 rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Monitored Apps</span>
            <AppWindow className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">{totalApps}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Active App Services</p>
        </div>

        {/* Stat 2: Consumed Cost */}
        <div className="p-4 rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Month-to-Date Spend</span>
            <IndianRupee className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">₹{totalCost.toFixed(2)}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Live telemetry meter</p>
        </div>

        {/* Stat 3: Total Budget */}
        <div className="p-4 rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Budget Ceiling</span>
            <PieIcon className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">₹{totalBudget.toFixed(2)}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Allocated limits</p>
        </div>

        {/* Stat 4: Circuit Breakers */}
        <div className="p-4 rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Auto-Stop Guardrails</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{activeAutoStops} Armed</div>
          <p className="text-[11px] text-muted-foreground mt-1">Circuit breakers active</p>
        </div>
      </div>

      {/* MAIN WORKLOADS & PIE CHART */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left: Visx Pie Chart if budget exists */}
        {rgCoins.length > 0 && (
          <div className="lg:col-span-4 p-5 rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm space-y-4">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-cyan-400" />
              Budget Allocation by Resource Group
            </h3>
            <div className="flex justify-center py-2">
              <VisxPieChart coins={rgCoins as any} />
            </div>
          </div>
        )}

        {/* Right: Grouped Apps List */}
        <div className={rgCoins.length > 0 ? "lg:col-span-8 space-y-6" : "lg:col-span-12 space-y-6"}>
          {Object.keys(appsByGroup).length === 0 ? (
            <div className="text-center py-16 px-4 border border-dashed border-border rounded-2xl bg-card/20 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                <Cloud className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No applications deployed yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Connect your Azure account, create a resource group, and deploy your first React or Node.js application.
              </p>
              <Link href="/dashboard/createApp">
                <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium mt-2">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Deploy Your First App
                </Button>
              </Link>
            </div>
          ) : (
            Object.entries(appsByGroup).map(([group, groupApps]) => {
              const rgData = resourceGroups.find(rg => rg.name === group) as any;
              const isDeleting = rgData?.status === "Deleting";

              return (
                <div
                  key={group}
                  className={`border border-border/70 rounded-2xl p-6 bg-card/30 backdrop-blur-sm space-y-5 transition-all ${
                    isDeleting ? "opacity-60 bg-muted/20 pointer-events-none grayscale" : "hover:border-cyan-500/30"
                  }`}
                >
                  {/* Group Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          {isDeleting ? (
                            <h2 className="text-lg font-bold text-muted-foreground">{group}</h2>
                          ) : (
                            <Link href={`/resourceGroup/${group}`}>
                              <h2 className="text-lg font-bold text-foreground hover:text-cyan-400 transition-colors flex items-center gap-1.5 group">
                                {group}
                                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-cyan-400 transition-colors opacity-0 group-hover:opacity-100" />
                              </h2>
                            </Link>
                          )}
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-mono text-muted-foreground border border-border">
                            {groupApps.length} {groupApps.length === 1 ? 'app' : 'apps'}
                          </span>
                        </div>
                        {rgData?.location && (
                          <p className="text-xs font-mono text-muted-foreground mt-0.5">
                            Region: {rgData.location}
                          </p>
                        )}
                      </div>
                    </div>

                    {isDeleting && (
                      <span className="flex items-center gap-1.5 text-xs font-medium bg-red-950/40 text-red-400 px-3 py-1 rounded-full border border-red-800/60 animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Deleting from Azure...
                      </span>
                    )}
                  </div>

                  {/* Apps Grid */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {groupApps.map(app => {
                      const appLink = app.AppName
                        ? `/dashboard/monitor/${app._id}`
                        : app.isDraft
                        ? `/dashboard/deploy/${app._id}`
                        : `/dashboard/deploy/${app._id}/prepare`;

                      return (
                        <Link href={appLink} key={app._id} className="block">
                          <AppCard app={app} />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-sm font-mono text-muted-foreground">Loading dashboard...</p>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
