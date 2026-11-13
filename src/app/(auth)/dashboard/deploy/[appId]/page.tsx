'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import Lottie from 'lottie-react';
import loader from '../../../../../../public/animations/loader.json';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppType } from '@/models/app';
import {
  ArrowLeft,
  Cloud,
  Cpu,
  Globe,
  Layers,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

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

      toast.success('Azure App Service created successfully!');
      router.push(`/dashboard/deploy/${appId}/prepare`);
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
        <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
        <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
          Querying Azure Workload Metadata...
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
      {/* Background glow effects */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-cyan-500/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-12 left-12 w-[350px] h-[250px] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-3xl mx-auto space-y-6 relative z-10">
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
            STAGE 1: AZURE PROVISIONING
          </div>
        </div>

        {/* Main Panel */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Deploy "{appData.name}"
                </h1>
                <p className="text-sm text-slate-400">
                  Provision your dedicated Azure Linux container instance and configure compute tier
                </p>
              </div>
            </div>
          </div>

          {/* Target Metadata HUD */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl border border-slate-800 bg-slate-950/60 font-mono text-xs">
            <div>
              <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Workload Target</span>
              <span className="text-slate-200 font-semibold">{appData.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Resource Group</span>
              <span className="text-cyan-400 font-semibold">{appData.resourceGroup}</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Subscription ID</span>
              <span className="text-slate-300 truncate block" title={appData.subscriptionId}>
                {appData.subscriptionId ? `${appData.subscriptionId.slice(0, 14)}...` : 'Connected'}
              </span>
            </div>
          </div>

          <div className="space-y-6">
            {/* AZURE REGION SELECTOR */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                Target Azure Region
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg p-3 text-slate-200 text-sm font-mono outline-none transition-all"
              >
                <option value="indiasouthcentral">South Central India (indiasouthcentral) — Recommended</option>
                <option value="centralindia">Central India (centralindia - Pune)</option>
                <option value="southindia">South India (southindia - Chennai)</option>
                <option value="eastus">East US (eastus — Highest Free Tier Quota)</option>
                <option value="westus">West US (westus)</option>
                <option value="centralus">Central US (centralus)</option>
                <option value="westeurope">West Europe (westeurope)</option>
                <option value="southeastasia">Southeast Asia (southeastasia - Singapore)</option>
              </select>
              <p className="text-[11px] text-slate-500">
                Tip: If Central India has 0 quota for Linux Free App Service plans, South Central India or East US are completely open.
              </p>
            </div>

            {/* COMPUTE TIER SELECTOR */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                App Service Plan (Compute Tier)
              </label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg p-3 text-slate-200 text-sm font-mono outline-none transition-all"
              >
                <option value="F1">F1 Free ($0/mo) — 60 CPU min/day, 1GB RAM (Shared Infrastructure)</option>
                <option value="B1">B1 Basic (~$13/mo) — Dedicated 1 vCPU, 1.75GB RAM, Custom Domain & SSL</option>
                <option value="B2">B2 Basic (~$26/mo) — Dedicated 2 vCPU, 3.5GB RAM</option>
                <option value="S1">S1 Standard (~$70/mo) — Dedicated 1 vCPU, Auto-Scale & Staging Slots</option>
              </select>
              {selectedPlan !== 'F1' ? (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Paid Compute Plan Selected: Azure will bill your subscription. Ensure FinOps auto-shutdown is enabled to prevent unexpected costs.
                  </span>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">
                  Default: Zero-cost sandbox tier ideal for portfolio demonstrations and technical interviews.
                </p>
              )}
            </div>

            {/* LIVE DOMAIN SCANNER */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                Global Azure DNS Subdomain
              </label>

              <div className="relative">
                <Input
                  value={webAppName}
                  onChange={(e) => setWebAppName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="e.g. cloudguard-api"
                  className="bg-slate-950 border-slate-800 focus:border-cyan-500 text-slate-100 placeholder:text-slate-600 rounded-lg text-sm h-11 pr-48 font-mono"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 pointer-events-none">
                  .azurewebsites.net
                </div>
              </div>

              {/* Status Visualizer */}
              <div className="min-h-[28px] flex items-center">
                {status === 'idle' && (
                  <p className="text-xs text-slate-500 font-mono">
                    Type a globally unique Azure name (3-60 alphanumeric characters)...
                  </p>
                )}
                {status === 'checking' && (
                  <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Querying Azure DNS availability across all global regions...</span>
                  </div>
                )}
                {status === 'taken' && (
                  <div className="flex items-center gap-2 text-xs font-mono text-rose-400">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Domain name is already taken by another Azure tenant. Try a different name.</span>
                  </div>
                )}
                {status === 'error' && (
                  <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Name can only contain lowercase letters, numbers, and hyphens.</span>
                  </div>
                )}
                {status === 'unique' && (
                  <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Name is available! Azure will bind https://{webAppName}.azurewebsites.net</span>
                  </div>
                )}
              </div>
            </div>

            {/* Creation Action */}
            <div className="pt-4">
              <Button
                onClick={handleSubmit}
                disabled={status !== 'unique' || appCreateLoading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm h-12 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {appCreateLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Provisioning Azure Web App Service...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Create Azure Service & Proceed to Build Upload</span>
                  </>
                )}
              </Button>
            </div>

            {error && (
              <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs font-mono">
                <strong>Azure ARM Deployment Error:</strong> {error}
              </div>
            )}

            {hostedURL && (
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-mono flex items-center justify-between">
                <span>Web App Provisioned: {hostedURL}</span>
                <a
                  href={hostedURL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-cyan-400 underline hover:text-cyan-300"
                >
                  Visit <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {appCreateLoading && (
              <div className="flex flex-col items-center justify-center gap-4 p-6 bg-slate-950/70 border border-slate-800 rounded-xl">
                <Lottie
                  animationData={loader}
                  loop
                  className="w-36 h-36 drop-shadow-[0_0_20px_#06b6d4]"
                />
                <div className="text-center space-y-1">
                  <p className="text-cyan-400 text-sm font-semibold tracking-wide font-mono animate-pulse">
                    CREATING AZURE APP SERVICE PLAN & CONTAINER...
                  </p>
                  <p className="text-xs text-slate-500">
                    Communicating with Microsoft Azure Resource Manager in {selectedLocation}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
