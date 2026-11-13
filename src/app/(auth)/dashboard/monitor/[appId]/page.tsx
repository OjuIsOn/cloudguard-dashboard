'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import BudgetPie from '@/components/each-app-pie';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Loader2,
  Play,
  Square,
  Trash2,
  XCircle,
  TerminalSquare,
  ExternalLink,
  ShieldCheck,
  Zap,
  RefreshCw,
  Server,
  Layers,
  Copy,
  AlertTriangle,
} from 'lucide-react';

export default function MonitorPage() {
  const { appId } = useParams() as { appId: string };
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [cost, setCost] = useState(0);
  const [budget, setBudget] = useState(0);
  const [hardLimit, setHardLimit] = useState(0);
  const [autoShut, setAutoShut] = useState(false);
  const [env, setEnv] = useState<Record<string, string>>({});
  const [envInput, setEnvInput] = useState('');
  const [envError, setEnvError] = useState<string | null>(null);
  const [action, setAction] = useState<'stop' | 'restart' | 'delete' | ''>('');

  // Deployment Tracking
  const [hostedUrl, setHostedUrl] = useState('');
  const [deployStatus, setDeployStatus] = useState<'idle' | 'queued' | 'deploying' | 'live' | 'failed'>('idle');
  const [deployMessage, setDeployMessage] = useState('');
  const [appType, setAppType] = useState('');
  const [appName, setAppName] = useState('');
  const [planTier, setPlanTier] = useState('');

  // Live Logs
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<string>('');
  const logsEndRef = useRef<HTMLPreElement>(null);

  const fetchAppData = async () => {
    try {
      const [res, monitorRes] = await Promise.all([
        fetch(`/api/apps/${appId}`),
        fetch(`/api/monitor/${appId}`),
      ]);
      const { success, data } = await res.json();
      const monitorData = await monitorRes.json().catch(() => ({}));

      if (success && data) {
        const liveCost = monitorData?.success ? monitorData.cost : data.cost || 0;
        setCost(liveCost);
        setBudget(data.budget || 0);
        setHardLimit(data.hardLimit || 0);
        setAutoShut(data.autoStop || false);
        setHostedUrl(data.AppName ? `https://${data.AppName}.azurewebsites.net` : '');
        setDeployStatus(data.deployStatus || 'idle');
        setDeployMessage(data.deployMessage || '');
        setAppType(data.appType || '');
        setAppName(data.name || '');
        setPlanTier(data.planTier || 'F1');

        if (monitorData?.stoppedByCircuitBreaker) {
          toast.error(
            `🚨 Circuit Breaker Triggered: Spend ₹${liveCost} exceeded Hard Limit ₹${data.hardLimit}. App stopped on Azure.`
          );
        }

        if (data.envVars) {
          try {
            setEnvInput((prev) => prev || data.envVars);
            setEnv(JSON.parse(data.envVars));
          } catch (e) {
            console.error('Failed to parse envVars from DB', e);
          }
        }

        if (data.budget && data.cost > data.budget) {
          toast.error(`FinOps Alert: Spend ₹${data.cost} exceeded Soft Budget ₹${data.budget}`);
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  const fetchLogs = async () => {
    if (!showLogs) return;
    try {
      const res = await fetch(`/api/apps/${appId}/logs`);
      const { success, logs: newLogs } = await res.json();
      if (success) {
        setLogs(newLogs);
      }
    } catch (err) {
      console.error('Logs fetch error:', err);
    }
  };

  useEffect(() => {
    fetchAppData();
    const intervalTime = deployStatus === 'queued' || deployStatus === 'deploying' ? 3000 : 5 * 60 * 1000;
    const interval = setInterval(fetchAppData, intervalTime);
    return () => clearInterval(interval);
  }, [appId, deployStatus]);

  useEffect(() => {
    if (showLogs) {
      fetchLogs();
      const interval = setInterval(fetchLogs, 3000);
      return () => clearInterval(interval);
    }
  }, [appId, showLogs]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollTop = logsEndRef.current.scrollHeight;
    }
  }, [logs]);

  const handleEnvChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const input = e.target.value;
    setEnvInput(input);
    if (!input.trim()) {
      setEnvError(null);
      setEnv({});
      return;
    }
    try {
      setEnv(JSON.parse(input));
      setEnvError(null);
    } catch {
      setEnvError('Invalid JSON format (Must be valid key-value pairs)');
    }
  };

  const handleAction = async () => {
    if (!action) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/monitor/${appId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const result = await res.json();
      result.success ? toast.success(result.message) : toast.error(result.message || 'Action failed');

      if (action === 'delete' && result.success) {
        router.push('/dashboard');
      }
    } catch (err) {
      toast.error('Something went wrong executing action');
    } finally {
      setLoading(false);
      setAction('');
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/monitor/${appId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget, hardLimit, autoShut, ...(envError ? {} : { env }) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        toast.error(data.message || 'Failed to save settings');
      } else {
        toast.success(data.message || 'Configuration synchronized to Azure!');
        fetchAppData();
      }
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (deployStatus) {
      case 'live':
        return (
          <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            RUNNING LIVE
          </span>
        );
      case 'deploying':
        return (
          <span className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/80 px-2.5 py-1 rounded-full">
            <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
            PROVISIONING
          </span>
        );
      case 'queued':
        return (
          <span className="flex items-center gap-1.5 text-xs font-mono text-blue-400 bg-blue-950/60 border border-blue-800/80 px-2.5 py-1 rounded-full">
            <Clock className="w-3 h-3 text-blue-400" />
            QUEUED IN QSTASH
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1.5 text-xs font-mono text-rose-400 bg-rose-950/60 border border-rose-800/80 px-2.5 py-1 rounded-full">
            <XCircle className="w-3 h-3 text-rose-400" />
            FAILED
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-full">
            IDLE
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-cyan-500/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-12 right-12 w-[350px] h-[250px] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
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
            LIVE FINOPS COCKPIT
          </div>
        </div>

        {/* HEADER HERO */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Server className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  {appName || 'Workload Console'}
                </h1>
                {getStatusBadge()}
                {appType && (
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700 uppercase">
                    {appType}
                  </span>
                )}
                {planTier && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      planTier === 'F1'
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80'
                        : 'bg-amber-950/60 text-amber-400 border-amber-800/80'
                    }`}
                  >
                    Tier: {planTier}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                {hostedUrl ? (
                  <a
                    href={hostedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1"
                  >
                    {hostedUrl}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-slate-500 italic">No endpoint assigned</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hostedUrl && deployStatus === 'live' && (
              <Button
                onClick={() => window.open(hostedUrl, '_blank')}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs h-10 px-4 shadow-lg shadow-cyan-500/20"
              >
                <Play className="w-3.5 h-3.5 mr-1.5 fill-current" /> Visit App
              </Button>
            )}
            <Button
              onClick={() => router.push(`/dashboard/deploy/${appId}/prepare`)}
              variant="outline"
              className="border-slate-800 hover:bg-slate-800/60 text-slate-300 text-xs font-mono h-10"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Redeploy
            </Button>
          </div>
        </div>

        {/* DEPLOYMENT PIPELINE STEPPER (Minimal & Calm) */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> Serverless Deployment Lifecycle
            </h3>
            <span className="text-[10px] font-mono text-slate-500">
              QStash → Vercel Blob → Kudu REST
            </span>
          </div>

          <div className="relative py-4 px-2">
            {/* Background connection bar */}
            <div className="absolute left-6 right-6 top-8 h-0.5 bg-slate-800/80 -z-0" />
            <div
              className={`absolute left-6 top-8 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-1000 ease-out -z-0 ${
                deployStatus === 'queued' || deployStatus === 'deploying' ? 'animate-shimmer' : ''
              }`}
              style={{
                width:
                  deployStatus === 'queued'
                    ? '30%'
                    : deployStatus === 'deploying'
                    ? '65%'
                    : deployStatus === 'live'
                    ? 'calc(100% - 3rem)'
                    : '0%',
              }}
            />

            <div className="grid grid-cols-4 gap-2 text-center relative z-10">
              {/* Step 1: Uploaded */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                    deployStatus !== 'idle'
                      ? 'border-cyan-400/80 bg-cyan-950/80 text-cyan-300'
                      : 'border-white/[0.08] bg-slate-900 text-slate-600'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-mono text-slate-300">Blob Stored</span>
              </div>

              {/* Step 2: Queued */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                    deployStatus === 'queued'
                      ? 'border-blue-400 bg-blue-950 text-blue-300 animate-pulse-slow'
                      : deployStatus === 'deploying' || deployStatus === 'live'
                      ? 'border-cyan-400/80 bg-cyan-950/80 text-cyan-300'
                      : 'border-white/[0.08] bg-slate-900 text-slate-600'
                  }`}
                >
                  {deployStatus === 'queued' ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                </div>
                <span className="text-xs font-mono text-slate-300">QStash Queue</span>
              </div>

              {/* Step 3: Provisioning */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                    deployStatus === 'deploying'
                      ? 'border-cyan-400 bg-cyan-950 text-cyan-300 animate-pulse-slow'
                      : deployStatus === 'live'
                      ? 'border-cyan-400/80 bg-cyan-950/80 text-cyan-300'
                      : deployStatus === 'failed'
                      ? 'border-rose-500 bg-rose-950 text-rose-400'
                      : 'border-white/[0.08] bg-slate-900 text-slate-600'
                  }`}
                >
                  {deployStatus === 'deploying' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : deployStatus === 'failed' ? (
                    <XCircle className="w-3.5 h-3.5" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5" />
                  )}
                </div>
                <span className="text-xs font-mono text-slate-300">Kudu Push</span>
              </div>

              {/* Step 4: Live */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                    deployStatus === 'live'
                      ? 'border-emerald-400 bg-emerald-950 text-emerald-300'
                      : deployStatus === 'failed'
                      ? 'border-rose-500 bg-rose-950 text-rose-400'
                      : 'border-white/[0.08] bg-slate-900 text-slate-600'
                  }`}
                >
                  {deployStatus === 'failed' ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                </div>
                <span className="text-xs font-mono text-slate-300">Live</span>
              </div>
            </div>
          </div>

          {deployMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-mono border ${
                deployStatus === 'failed'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              {deployMessage}
            </div>
          )}

          {/* Azure Logs Terminal Dropdown */}
          <div className="pt-2">
            <Button
              onClick={() => setShowLogs(!showLogs)}
              variant="outline"
              size="sm"
              className="w-full border-slate-800 hover:bg-slate-800/60 text-slate-300 text-xs font-mono flex items-center justify-center gap-2"
            >
              <TerminalSquare className="w-4 h-4 text-cyan-400" />
              <span>{showLogs ? 'Hide Live Azure Kudu Logs' : 'Stream Live Azure Kudu Logs'}</span>
            </Button>
          </div>

          {showLogs && (
            <div className="space-y-2 animate-in fade-in duration-300">
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                <div className="bg-slate-900/80 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                    <span className="ml-2 text-slate-300">kudu-docker-stream.log</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[10px] text-emerald-400 uppercase tracking-wider">Live Tail</span>
                  </div>
                </div>
                <pre
                  ref={logsEndRef}
                  className="p-4 font-mono text-xs text-emerald-400 h-64 overflow-y-auto whitespace-pre-wrap bg-black/80"
                >
                  {logs || 'Connecting to Azure Kudu log stream...'}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* FINOPS CONTROLS & PIE CHART */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Card 1: Cost & Circuit Breaker */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-mono uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" /> FinOps Budget Policies
                </h3>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-2 py-0.5 rounded">
                  Autonomous Protection
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Prevent runaway consumption billing with automated circuit breakers
              </p>
            </div>

            <div className="space-y-4">
              {/* Current Cost */}
              <div className="flex justify-between items-center p-4 bg-slate-950/70 rounded-xl border border-slate-800">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Current Azure Billing
                </span>
                <span className="text-2xl font-extrabold text-white font-mono">
                  ₹{cost.toFixed(2)}
                </span>
              </div>

              {/* Soft Budget */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                  <span>Soft Budget (Action Group & Email Alert)</span>
                  <span className="text-[11px] text-cyan-400 font-mono">Alert Threshold</span>
                </label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg p-3 text-slate-100 text-sm font-mono outline-none transition-all"
                  placeholder="e.g. 500"
                />
              </div>

              {/* Auto-Shutdown Toggle */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 flex items-center justify-between">
                <div>
                  <span className="block text-sm font-semibold text-slate-200">
                    Hard Stop Circuit Breaker
                  </span>
                  <span className="text-xs text-slate-500">
                    Automatically shut down container if hard limit is breached
                  </span>
                </div>
                <div className="relative inline-block h-6 w-11">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={autoShut}
                    onChange={(e) => setAutoShut(e.target.checked)}
                    id="autoShutMonitorToggle"
                  />
                  <label
                    htmlFor="autoShutMonitorToggle"
                    className="block h-6 w-11 rounded-full bg-slate-800 peer-checked:bg-cyan-500 transition-colors cursor-pointer"
                  />
                  <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5 shadow-sm pointer-events-none" />
                </div>
              </div>

              {/* Hard Limit Input */}
              {autoShut && (
                <div className="space-y-2 p-4 bg-rose-950/20 border border-rose-900/50 rounded-xl animate-in fade-in duration-300">
                  <label className="text-xs font-semibold text-rose-300 flex items-center justify-between">
                    <span>Hard Limit Spending Ceiling (₹ INR)</span>
                    <span className="text-[10px] font-mono text-rose-400">HARD STOP</span>
                  </label>
                  <input
                    type="number"
                    value={hardLimit}
                    onChange={(e) => setHardLimit(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-rose-900/60 focus:border-rose-500 rounded-lg p-3 text-rose-200 text-sm font-mono outline-none transition-all"
                    placeholder="e.g. 1000"
                  />
                  <p className="text-[11px] text-rose-400/80">
                    Azora will forcefully stop the Azure App Service container once this threshold is breached.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Budget Utilization Pie */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center">
            <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-4">
              Real-Time FinOps Utilization
            </h3>
            <BudgetPie budget={budget} cost={cost} size={240} />
          </div>
        </div>

        {/* SETTINGS & ACTIONS */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Environment Variables Studio */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-mono uppercase tracking-wider text-slate-200">
                  Azure App Settings (Env Vars)
                </h3>
                <p className="text-xs text-slate-400">
                  Injected directly into Azure container environment
                </p>
              </div>
              {envInput && (
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    !envError ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {!envError ? 'VALID JSON' : 'SYNTAX ERROR'}
                </span>
              )}
            </div>

            <textarea
              rows={5}
              value={envInput}
              onChange={handleEnvChange}
              placeholder='{\n  "PORT": "8080",\n  "NODE_ENV": "production"\n}'
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl p-3 font-mono text-xs text-cyan-300 outline-none transition-all resize-none"
            />

            <div className="flex justify-end">
              <Button
                onClick={handleSaveSettings}
                disabled={!!envError || loading}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs h-10 px-5 shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                    <span>Syncing Azure Settings...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Save Configuration & Sync Azure</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-sm font-mono uppercase tracking-wider text-slate-200">
                Container Lifecycle Controls
              </h3>
              <p className="text-xs text-slate-400">
                Execute direct operations on your Azure Web App Service
              </p>
            </div>

            <div className="space-y-2.5">
              <Button
                onClick={() => setAction('stop')}
                variant="outline"
                className="w-full justify-start border-slate-800 hover:bg-slate-800/60 text-amber-300 hover:text-amber-200 text-xs font-mono h-11"
              >
                <Square className="w-4 h-4 mr-2.5 text-amber-400" /> Stop Container Service
              </Button>
              <Button
                onClick={() => setAction('restart')}
                variant="outline"
                className="w-full justify-start border-slate-800 hover:bg-slate-800/60 text-blue-300 hover:text-blue-200 text-xs font-mono h-11"
              >
                <Play className="w-4 h-4 mr-2.5 text-blue-400" /> Restart Web App
              </Button>
              <Button
                onClick={() => setAction('delete')}
                variant="outline"
                className="w-full justify-start border-rose-900/40 hover:bg-rose-900/20 text-rose-400 hover:text-rose-300 text-xs font-mono h-11"
              >
                <Trash2 className="w-4 h-4 mr-2.5" /> Permanently Delete Workload
              </Button>
            </div>
          </div>
        </div>

        {/* CONFIRMATION MODAL */}
        {action && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-white">
                <AlertTriangle className={`w-5 h-5 ${action === 'delete' ? 'text-rose-500' : 'text-amber-400'}`} />
                <h3 className="text-lg font-bold capitalize">Confirm {action}</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Are you sure you want to {action} this Azure container?{' '}
                {action === 'delete' && 'This action is irreversible and deletes the cloud resources permanently.'}
              </p>
              <div className="flex gap-3 justify-end pt-2">
                <Button
                  onClick={() => setAction('')}
                  variant="ghost"
                  className="text-xs font-mono text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAction}
                  disabled={loading}
                  className={`text-xs font-mono font-bold ${
                    action === 'delete'
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950'
                  }`}
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm Operation'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
