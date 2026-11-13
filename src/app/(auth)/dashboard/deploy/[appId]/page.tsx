'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppType } from '@/models/app';
import {
  ArrowLeft,
  Cloud,
  Cpu,
  Globe,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Sparkles,
  Server,
} from 'lucide-react';

const AZURE_DEPLOY_PHASES = [
  'Authorizing Azure Resource Manager credentials...',
  'Allocating Linux App Service Plan container...',
  'Configuring container runtime environment...',
  'Registering global DNS subdomain on Microsoft backbone...',
  'Synchronizing initial FinOps monitor telemetry...',
];

export default function DeployStepOnePage() {
  const params = useParams();
  const appId = Array.isArray(params.appId) ? params.appId[0] : params.appId;
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appData, setAppData] = useState<AppType | null>(null);

  const [webAppName, setWebAppName] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('indiasouthcentral');
  const [selectedPlan, setSelectedPlan] = useState('F1');
  const [status, setStatus] = useState<'idle' | 'checking' | 'taken' | 'unique' | 'error'>('idle');
  const [hostedURL, setHostedURL] = useState('');
  const [appCreateLoading, setAppCreateLoading] = useState(false);

  // Slow steady phase ticker for Azure provision
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(15);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (appCreateLoading) {
      interval = setInterval(() => {
        setPhaseIndex((prev) => (prev < AZURE_DEPLOY_PHASES.length - 1 ? prev + 1 : prev));
        setProgressPercent((prev) => (prev < 90 ? prev + 18 : prev));
      }, 4500);
    } else {
      setPhaseIndex(0);
      setProgressPercent(15);
    }
    return () => clearInterval(interval);
  }, [appCreateLoading]);

  // App data fetcher
  useEffect(() => {
    if (!appId) return;

    setLoading(true);
    const fill = async () => {
      try {
        const res = await fetch(`/api/apps/${appId}`);
        const data = await res.json();
        if (!data || !data.data) throw new Error('No data returned from API');
        setAppData(data.data);
        if (data.data.location) {
          setSelectedLocation(data.data.location);
        }
        if (data.data.appServiceName && !webAppName) {
          setWebAppName(data.data.appServiceName);
        }
      } catch (err) {
        toast.error('Failed to load app metadata');
      } finally {
        setLoading(false);
      }
    };
    fill();
  }, [appId]);

  // Live Azure Name Availability Checker
  useEffect(() => {
    const check = setTimeout(async () => {
      if (webAppName.trim().length >= 3) {
        setStatus('checking');
        try {
          const response = await fetch(
            `/api/auth/azure/check?name=${webAppName.trim()}&subscriptionId=${appData?.subscriptionId}`
          );
          const data = await response.json();

          if (data.success === true && data.message === true) {
            setStatus('unique');
          } else {
            setStatus(
              data.message === false &&
              data.fullMessage ===
                'Site names only allow alphanumeric characters and hyphens, cannot start or end in a hyphen, and must be less than 64 chars.'
                ? 'error'
                : 'taken'
            );
          }
        } catch {
          setStatus('error');
        }
      } else {
        setStatus('idle');
      }
    }, 450);

    return () => clearTimeout(check);
  }, [webAppName, appData?.subscriptionId]);

  const handleSubmit = async () => {
    try {
      setAppCreateLoading(true);
      setError(null);
      const res = await fetch('/api/auth/azure/create-web-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...appData,
          Appname: webAppName.trim(),
          location: selectedLocation,
          plan: selectedPlan,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Web app creation failed');

      setHostedURL(data.hostedUrl);
      setProgressPercent(100);

      toast.success('Azure App Service created successfully!');
      setTimeout(() => {
        router.push(`/dashboard/deploy/${appId}/prepare`);
      }, 1200);
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toast.error(msg || "Couldn't create Azure Web App");
    } finally {
      setAppCreateLoading(false);
    }
  };

  if (!appId) return <div className="p-8 text-center text-rose-400 font-mono">Invalid Workload ID</div>;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border border-cyan-400/40 border-t-cyan-400 animate-spin" />
        <span className="text-xs font-mono text-slate-400 tracking-wider">
          Connecting to Azure Workload...
        </span>
      </div>
    );
  }

  if (!appData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
        <p className="text-rose-400 font-mono text-sm mb-4">Workload configuration not found</p>
        <Link href="/dashboard">
          <Button variant="outline" className="border-slate-800 text-slate-300">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Calm ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none animate-pulse-slow" />

      <div className="max-w-2xl mx-auto space-y-6 relative z-10">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            BACK TO DASHBOARD
          </Link>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400/80 bg-cyan-950/30 border border-cyan-500/20 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse-slow" />
            STEP 1 • PROVISION COMPUTE
          </div>
        </div>

        {/* Main Panel */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">
              Provision Azure Compute
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Select compute region, plan tier, and DNS host for <span className="text-cyan-400 font-medium">"{appData.name}"</span>
            </p>
          </div>

          {/* Target Metadata HUD (Minimal) */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-white/[0.06] bg-slate-950/40 text-xs font-mono">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Resource Group</span>
              <span className="text-slate-200">{appData.resourceGroup}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Subscription</span>
              <span className="text-slate-300 truncate block">
                {appData.subscriptionId ? `${appData.subscriptionId.slice(0, 14)}...` : 'Connected'}
              </span>
            </div>
          </div>

          <div className="space-y-5">
            {/* AZURE REGION SELECTOR */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                Azure Deployment Region
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full bg-slate-950 border border-white/[0.08] focus:border-cyan-500/60 rounded-lg p-2.5 text-slate-200 text-xs font-mono outline-none transition-colors"
              >
                <option value="indiasouthcentral">South Central India (indiasouthcentral) — Recommended</option>
                <option value="centralindia">Central India (centralindia - Pune)</option>
                <option value="southindia">South India (southindia - Chennai)</option>
                <option value="eastus">East US (eastus — Highest Quota)</option>
                <option value="westus">West US (westus)</option>
                <option value="westeurope">West Europe (westeurope)</option>
                <option value="southeastasia">Southeast Asia (southeastasia)</option>
              </select>
            </div>

            {/* COMPUTE TIER SELECTOR */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                Compute Tier (App Service Plan)
              </label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="w-full bg-slate-950 border border-white/[0.08] focus:border-cyan-500/60 rounded-lg p-2.5 text-slate-200 text-xs font-mono outline-none transition-colors"
              >
                <option value="F1">F1 Free ($0/mo) — 60 CPU min/day, 1GB RAM (Shared Sandbox)</option>
                <option value="B1">B1 Basic (~$13/mo) — Dedicated 1 vCPU, 1.75GB RAM, Custom Domain</option>
                <option value="B2">B2 Basic (~$26/mo) — Dedicated 2 vCPU, 3.5GB RAM</option>
                <option value="S1">S1 Standard (~$70/mo) — Dedicated 1 vCPU, Auto-Scale & Staging</option>
              </select>
            </div>

            {/* LIVE DOMAIN SCANNER */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Global Azure Subdomain
              </label>

              <div className="relative">
                <Input
                  value={webAppName}
                  onChange={(e) => setWebAppName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="e.g. cloudguard-api"
                  className="bg-slate-950 border-white/[0.08] focus:border-cyan-500/60 text-slate-100 placeholder:text-slate-600 rounded-lg text-xs h-10 pr-44 font-mono"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 pointer-events-none">
                  .azurewebsites.net
                </div>
              </div>

              {/* Status Visualizer */}
              <div className="min-h-[22px] flex items-center">
                {status === 'idle' && (
                  <p className="text-[11px] text-slate-500 font-mono">
                    Enter a globally unique subdomain name...
                  </p>
                )}
                {status === 'checking' && (
                  <div className="flex items-center gap-2 text-[11px] font-mono text-cyan-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Scanning Azure global DNS...</span>
                  </div>
                )}
                {status === 'taken' && (
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-rose-400">
                    <XCircle className="w-3 h-3" />
                    <span>Domain name is already taken. Try another name.</span>
                  </div>
                )}
                {status === 'error' && (
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-400">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Only lowercase letters, numbers, and hyphens allowed.</span>
                  </div>
                )}
                {status === 'unique' && (
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Domain available on Azure global DNS!</span>
                  </div>
                )}
              </div>
            </div>

            {/* Creation Action */}
            <div className="pt-2">
              <Button
                onClick={handleSubmit}
                disabled={status !== 'unique' || appCreateLoading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-xs h-11 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
              >
                {appCreateLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Provisioning on Azure...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Create Azure Service & Proceed</span>
                  </>
                )}
              </Button>
            </div>

            {error && (
              <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs font-mono">
                <strong>Azure ARM Error:</strong> {error}
              </div>
            )}

            {/* SLOW STEADY PROGRESSION RADAR (Active during Azure provision) */}
            {appCreateLoading && (
              <div className="p-6 rounded-2xl border border-cyan-500/20 bg-slate-950/70 space-y-5 animate-fadeIn">
                {/* Dual Concentric Slow Orbit Animation */}
                <div className="flex items-center justify-center py-4">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    {/* Outer slow orbit ring */}
                    <div className="absolute inset-0 rounded-full border border-dashed border-cyan-400/40 animate-spin-slow" />
                    {/* Inner reverse slow orbit ring */}
                    <div className="absolute inset-2.5 rounded-full border border-cyan-500/20 border-t-cyan-400 animate-spin-reverse-slow" />
                    {/* Center breathing core */}
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 animate-pulse-slow">
                      <Cloud className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Phased Status Label */}
                <div className="text-center space-y-1.5">
                  <div className="text-xs font-mono text-cyan-300 flex items-center justify-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse-slow" />
                    <span className="transition-all duration-500">{AZURE_DEPLOY_PHASES[phaseIndex]}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Azure ARM is allocating compute in {selectedLocation}. Usually completes in 15-25 seconds.
                  </p>
                </div>

                {/* Slow Steady Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-white/[0.06]">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-1000 ease-out rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>Phase {phaseIndex + 1} of {AZURE_DEPLOY_PHASES.length}</span>
                    <span>{progressPercent}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
