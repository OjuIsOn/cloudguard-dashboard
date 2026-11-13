'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Cloud,
  Layers,
  ShieldAlert,
  Server,
  Zap,
  Trash2,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  Loader2,
  DollarSign,
  Cpu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ResourceGroupData {
  name: string;
  subscriptionId: string;
  location: string;
  cost: number;
  budget: number;
  autoStop: boolean;
}

export default function ResourceBudgetPage() {
  const { group } = useParams();
  const groupName = Array.isArray(group) ? group[0] : (group as string);
  const router = useRouter();

  const [budgetData, setBudgetData] = useState<ResourceGroupData | null>(null);
  const [amount, setAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [autoShut, setAutoShut] = useState(false);
  const [azureResources, setAzureResources] = useState<any[]>([]);
  const [dbApps, setDbApps] = useState<any[]>([]);
  const [tenantId, setTenantId] = useState<string>('');

  const fetchData = async () => {
    if (!groupName) return;
    setLoading(true);
    try {
      const [res, resourcesRes] = await Promise.all([
        fetch(`/api/resourceGroup/budget/${groupName}`),
        fetch(`/api/resourceGroup/${groupName}/resources`),
      ]);

      const data = await res.json();
      if (res.ok && data.data) {
        setBudgetData(data.data);
        setAmount(data.data.budget || 0);
        setAutoShut(data.data.autoStop ?? data.data.autoShut ?? false);
      }

      const resourcesData = await resourcesRes.json();
      if (resourcesRes.ok && resourcesData.success) {
        setAzureResources(resourcesData.resources || []);
        setDbApps(resourcesData.dbApps || []);
        setTenantId(resourcesData.tenantId || '');
      }
    } catch (err) {
      toast.error('Failed to load resource group details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [groupName]);

  const handleResourceClick = (resource: any) => {
    const app = dbApps.find((a) => a.AppName === resource.name);
    if (app) {
      router.push(`/dashboard/monitor/${app._id}`);
      return;
    }

    const portalUrl = `https://portal.azure.com/#@${tenantId}/resource${resource.id}`;
    window.open(portalUrl, '_blank');
  };

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/resourceGroup/budget/${groupName}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, autoShut }),
      });

      const result = await res.json();
      if (res.ok) {
        toast.success('Resource Group FinOps budget synchronized with Azure!');
        fetchData();
      } else {
        toast.error(`Update failed: ${result.error || 'Unknown error'}`);
      }
    } catch {
      toast.error('Error synchronizing budget');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    const confirmDelete = window.confirm(
      `⚠️ IRREVERSIBLE ACTION:\nAre you sure you want to delete Resource Group "${groupName}" and all associated Azure resources?`
    );
    if (!confirmDelete) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/resourceGroup/budget/${groupName}`, { method: 'DELETE' });
      const result = await res.json();
      if (res.ok) {
        toast.success('Resource group deletion initiated on Azure');
        router.push('/dashboard');
      } else {
        toast.error(`Delete failed: ${result.error || result.message || 'Unknown error'}`);
      }
    } catch {
      toast.error('Error deleting resource group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-cyan-500/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-12 right-12 w-[350px] h-[250px] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-6 relative z-10">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            BACK TO DASHBOARD
          </Link>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400/80 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            RESOURCE GROUP SCOPE
          </div>
        </div>

        {/* Header HUD */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white">{groupName}</h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {budgetData?.location || 'Azure RG'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Subscription Scope: {budgetData?.subscriptionId ? `${budgetData.subscriptionId.slice(0, 16)}...` : 'Default'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={fetchData}
              variant="outline"
              size="sm"
              className="border-slate-800 hover:bg-slate-800/60 text-slate-300 text-xs font-mono"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Sync Azure
            </Button>
            <Button
              onClick={handleDelete}
              variant="outline"
              size="sm"
              className="border-rose-900/50 hover:bg-rose-900/20 text-rose-400 hover:text-rose-300 text-xs font-mono"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete RG
            </Button>
          </div>
        </div>

        {/* FINOPS SPEND & BUDGET MANAGER */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Card 1: Live Spend */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Resource Group Spend
              </span>
              <div className="text-3xl font-extrabold text-white font-mono">
                ₹{(budgetData?.cost || 0).toFixed(2)}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4">
              Aggregated spend across all Azure resources under this group.
            </p>
          </div>

          {/* Card 2: Allocated Budget */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Active Azure Budget
              </span>
              <div className="text-3xl font-extrabold text-cyan-400 font-mono">
                ₹{(budgetData?.budget || 0).toFixed(2)}
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(
                      100,
                      budgetData?.budget ? Math.round(((budgetData.cost || 0) / budgetData.budget) * 100) : 0
                    )}%`,
                  }}
                />
              </div>
              <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                {budgetData?.budget
                  ? `${Math.round(((budgetData.cost || 0) / budgetData.budget) * 100)}% threshold reached`
                  : 'No limit set'}
              </span>
            </div>
          </div>

          {/* Card 3: Circuit Breaker Status */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Circuit Breaker Policy
              </span>
              <div className="text-xl font-bold font-mono flex items-center gap-2 mt-1">
                {autoShut ? (
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> AUTO-STOP ARMED
                  </span>
                ) : (
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-400" /> ALERT ONLY
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4">
              Autonomous shutoff prevents runaway container runtime billing.
            </p>
          </div>
        </div>

        {/* UPDATE BUDGET FORM */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-mono uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" /> Adjust Resource Group Budget Limits
            </h3>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-2 py-0.5 rounded">
              Microsoft.Consumption/budgets
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">
                Budget Limit (₹ INR)
              </label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="bg-slate-950 border-slate-800 focus:border-cyan-500 text-slate-100 placeholder:text-slate-600 rounded-lg text-sm h-11 font-mono"
                placeholder="e.g. 1000"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/50 h-11">
              <span className="text-xs font-medium text-slate-300">Auto Shutdown on Ceiling</span>
              <div className="relative inline-block h-6 w-11">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={autoShut}
                  onChange={(e) => setAutoShut(e.target.checked)}
                  id="autoShutToggle"
                />
                <label
                  htmlFor="autoShutToggle"
                  className="block h-6 w-11 rounded-full bg-slate-800 peer-checked:bg-cyan-500 transition-colors cursor-pointer"
                />
                <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5 shadow-sm pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleUpdate}
              disabled={updating}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs h-10 px-6 shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
            >
              {updating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                  <span>Syncing with Azure ARM...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Apply & Provision Azure Budget</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* AZURE RESOURCES INVENTORY */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              Live Azure Resource Inventory ({azureResources.length})
            </h2>
            <span className="text-[10px] font-mono text-slate-400">
              Live ARM Query
            </span>
          </div>

          {azureResources.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 font-mono text-xs">
              No active Azure resources provisioned under "{groupName}".
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {azureResources.map((res) => {
                const isWebApp = dbApps.some((a) => a.AppName === res.name);
                return (
                  <div
                    key={res.id}
                    onClick={() => handleResourceClick(res)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between group ${
                      isWebApp
                        ? 'border-cyan-500/40 bg-cyan-950/20 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                        : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors">
                          {res.name}
                        </span>
                        {isWebApp ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            Azora Workload
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1 group-hover:text-slate-300">
                            Azure <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 truncate" title={res.type}>
                        {res.type}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-500">
                      <span>{res.location}</span>
                      <span className="text-[10px] text-cyan-400/80 group-hover:underline">
                        {isWebApp ? 'Open Monitor →' : 'View in Azure Portal →'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
