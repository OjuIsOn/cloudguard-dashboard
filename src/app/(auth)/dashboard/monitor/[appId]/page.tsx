'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import BudgetPie from '@/components/each-app-pie';
import { CheckCircle, Clock, Loader2, Play, Square, Trash2, XCircle, TerminalSquare } from 'lucide-react';

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

  // Live Logs
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<string>('');
  const logsEndRef = useRef<HTMLPreElement>(null);

  const fetchAppData = async () => {
    try {
      const res = await fetch(`/api/apps/${appId}`);
      const { success, data } = await res.json();
      if (success && data) {
        setCost(data.cost || 0);
        setBudget(data.budget || 0);
        setHardLimit(data.hardLimit || 0);
        setAutoShut(data.autoStop || false);
        setHostedUrl(data.AppName ? `https://${data.AppName}.azurewebsites.net` : '');
        setDeployStatus(data.deployStatus || 'idle');
        setDeployMessage(data.deployMessage || '');
        setAppType(data.appType || '');
        setAppName(data.name || '');

        if (data.envVars) {
          try {
            // Only update if envInput is empty to prevent overwriting user typing
            setEnvInput(prev => prev || data.envVars);
            setEnv(JSON.parse(data.envVars));
          } catch (e) {
            console.error('Failed to parse envVars from DB', e);
          }
        }

        if (data.budget && data.cost > data.budget) {
          toast.error(`App cost ₹${data.cost} exceeded the alert budget ₹${data.budget}`);
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

  // Poll for app data every 3 seconds if deploying/queued, otherwise every 5 mins
  useEffect(() => {
    fetchAppData();
    const intervalTime = (deployStatus === 'queued' || deployStatus === 'deploying') ? 3000 : 5 * 60 * 1000;
    const interval = setInterval(fetchAppData, intervalTime);
    return () => clearInterval(interval);
  }, [appId, deployStatus]);

  // Poll for logs every 3 seconds when logs panel is open
  useEffect(() => {
    if (showLogs) {
      fetchLogs();
      const interval = setInterval(fetchLogs, 3000);
      return () => clearInterval(interval);
    }
  }, [appId, showLogs]);

  // Auto scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollTop = logsEndRef.current.scrollHeight;
    }
  }, [logs]);

  const handleEnvChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const input = e.target.value;
    setEnvInput(input);
    try {
      setEnv(JSON.parse(input));
      setEnvError(null);
    } catch {
      setEnvError('Invalid JSON format');
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
      toast.error('Something went wrong');
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
      if (!res.ok) toast.error('Failed to save settings');
      else {
        toast.success('Settings saved');
        fetchAppData();
      }
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    switch (deployStatus) {
      case 'live': return 'bg-green-500 shadow-[0_0_10px_#22c55e]';
      case 'failed': return 'bg-red-500 shadow-[0_0_10px_#ef4444]';
      case 'deploying': return 'bg-yellow-400 animate-pulse shadow-[0_0_10px_#facc15]';
      case 'queued': return 'bg-blue-400 animate-pulse shadow-[0_0_10px_#60a5fa]';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl p-6 space-y-8 animate-fadeIn">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-900/50 p-6 rounded-xl border border-gray-800">
        <div className="flex items-center gap-4">
          <div className={`w-4 h-4 rounded-full ${getStatusColor()}`} />
          <div>
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              {appName || 'Loading App...'}
              {appType && (
                <span className="text-xs px-2 py-1 bg-gray-800 text-gray-300 rounded uppercase tracking-wider border border-gray-700">
                  {appType}
                </span>
              )}
            </h2>
            <div className="text-gray-400 mt-1 flex items-center gap-2">
              <span className="capitalize">{deployStatus} Status</span>
              <span>•</span>
              {hostedUrl ? (
                <a href={hostedUrl} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">
                  {hostedUrl}
                </a>
              ) : (
                <span className="text-gray-500 italic">No URL</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          {hostedUrl && deployStatus === 'live' && (
            <Button onClick={() => window.open(hostedUrl, "_blank")} className="bg-cyan-600 hover:bg-cyan-500 text-white">
              <Play className="w-4 h-4 mr-2" /> Visit App
            </Button>
          )}
          <Button onClick={() => router.push(`/dashboard/deploy/${appId}/prepare`)} variant="outline" className="border-gray-700 hover:bg-gray-800">
            Redeploy
          </Button>
        </div>
      </div>

      {/* DEPLOYMENT TRACKER */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <Loader2 className={`w-5 h-5 ${deployStatus === 'queued' || deployStatus === 'deploying' ? 'animate-spin text-cyan-400' : 'hidden'}`} />
          Deployment Pipeline
        </h3>
          
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-800 -z-10" />
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-cyan-500 transition-all duration-1000 -z-10`} 
                 style={{ width: deployStatus === 'queued' ? '15%' : deployStatus === 'deploying' ? '50%' : deployStatus === 'live' ? '100%' : deployStatus === 'failed' ? '50%' : '0%' }} />

            {/* Step 1: Uploaded */}
            <div className="flex flex-col items-center gap-2 bg-gray-900 px-2 z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${deployStatus !== 'idle' ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)]' : 'border-yellow-500/50 bg-yellow-500/10 text-yellow-500/70 shadow-[0_0_10px_rgba(250,204,21,0.2)]'}`}>
                <CheckCircle className="w-4 h-4" />
              </div>
              <span className="text-xs text-gray-400">Uploaded</span>
            </div>

            {/* Step 2: Queued */}
            <div className="flex flex-col items-center gap-2 bg-gray-900 px-2 z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${(deployStatus === 'deploying' || deployStatus === 'live' || deployStatus === 'failed') ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)]' : deployStatus === 'queued' ? 'border-blue-400 bg-blue-400/20 text-blue-400 animate-pulse shadow-[0_0_15px_rgba(96,165,250,0.6)]' : 'border-yellow-500/50 bg-yellow-500/10 text-yellow-500/70 shadow-[0_0_10px_rgba(250,204,21,0.2)]'}`}>
                {deployStatus === 'queued' ? <Clock className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
              </div>
              <span className="text-xs text-gray-400">Queued</span>
            </div>

            {/* Step 3: Deploying */}
            <div className="flex flex-col items-center gap-2 bg-gray-900 px-2 z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${deployStatus === 'live' ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)]' : deployStatus === 'failed' ? 'border-red-500 bg-red-500/20 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]' : deployStatus === 'deploying' ? 'border-blue-400 bg-blue-400/20 text-blue-400 animate-pulse shadow-[0_0_15px_rgba(96,165,250,0.6)]' : 'border-yellow-500/50 bg-yellow-500/10 text-yellow-500/70 shadow-[0_0_10px_rgba(250,204,21,0.2)]'}`}>
                {deployStatus === 'failed' ? <XCircle className="w-4 h-4" /> : deployStatus === 'deploying' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              </div>
              <span className="text-xs text-gray-400">Provisioning</span>
            </div>

            {/* Step 4: Live */}
            <div className="flex flex-col items-center gap-2 bg-gray-900 px-2 z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${deployStatus === 'live' ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.8)]' : deployStatus === 'failed' ? 'border-red-500 bg-red-500/20 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]' : 'border-yellow-500/50 bg-yellow-500/10 text-yellow-500/70 shadow-[0_0_10px_rgba(250,204,21,0.2)]'}`}>
                {deployStatus === 'failed' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
              </div>
              <span className="text-xs text-gray-400">Live</span>
            </div>
          </div>
          
          {deployMessage && (
            <div className={`mt-6 p-4 rounded-lg text-sm border ${deployStatus === 'failed' ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'bg-gray-800/50 border-gray-700 text-gray-300'}`}>
              <span className="font-mono">{deployMessage}</span>
            </div>
          )}

          <div className="mt-4">
            <Button onClick={() => setShowLogs(!showLogs)} variant="secondary" size="sm" className="w-full bg-gray-800 hover:bg-gray-700 border-gray-700">
              <TerminalSquare className="w-4 h-4 mr-2" /> {showLogs ? 'Hide Live Azure Logs' : 'Show Live Azure Logs'}
            </Button>
          </div>

          {showLogs && (
            <div className="mt-4">
              <div className="mb-2 p-3 bg-yellow-500/10 border border-yellow-500/50 rounded-lg text-xs text-yellow-400">
                <strong className="font-semibold block mb-1">⚠️ Azure Token Required</strong>
                Live logs fetch directly from Azure. If your Azure session has expired, you may need to re-authenticate on the dashboard.
              </div>
              <div className="bg-[#0c0c0c] border border-gray-700 rounded-lg p-4 h-64 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-[#0c0c0c] to-transparent pointer-events-none z-10" />
                <pre ref={logsEndRef} className="font-mono text-xs text-green-400 h-full overflow-y-auto whitespace-pre-wrap pb-8 pt-4">
                  {logs || "Waiting for container logs..."}
                </pre>
                <div className="absolute bottom-2 right-4 flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-[10px] text-green-500 font-mono uppercase tracking-widest">Streaming</span>
                </div>
              </div>
            </div>
          )}
        </div>

      {/* COST & BUDGET */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-semibold mb-4">Cost Controls</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <span className="text-gray-400">Current Cost</span>
                <span className="text-2xl font-bold text-white">₹{cost.toFixed(2)}</span>
              </div>
              
              <label className="block space-y-2">
                <span className="text-sm text-gray-400">Soft Budget (UI Alert Only) ₹</span>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g. 500"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700 cursor-pointer group">
                <div>
                  <span className="block font-medium text-white group-hover:text-cyan-400 transition-colors">Auto Shutdown</span>
                  <span className="text-xs text-gray-500">Stop app if hard limit is exceeded</span>
                </div>
                <div className="relative inline-block h-6 w-11">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={autoShut}
                    onChange={(e) => setAutoShut(e.target.checked)}
                  />
                  <div className="h-6 w-11 rounded-full bg-gray-700 transition peer-checked:bg-cyan-500" />
                  <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5 shadow-sm" />
                </div>
              </label>

              {autoShut && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block space-y-2 p-4 bg-red-950/20 border border-red-900/50 rounded-lg">
                    <span className="text-sm text-red-400 font-semibold">Hard Limit (Auto Stop App) ₹</span>
                    <input
                      type="number"
                      value={hardLimit}
                      onChange={(e) => setHardLimit(Number(e.target.value))}
                      className="w-full bg-gray-900 border border-red-900/50 rounded-lg p-3 text-red-100 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                      placeholder="e.g. 1000"
                    />
                    <p className="text-xs text-red-500/70">The app will forcefully shut down if this amount is exceeded.</p>
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col items-center justify-center min-h-[300px]">
          <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-4">Budget Utilization</h3>
          <BudgetPie budget={budget} cost={cost} size={250} />
        </div>
      </div>

      {/* SETTINGS & ACTIONS */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Environment Variables</h3>
            {envInput && (
              <span className={`text-xs px-2 py-1 rounded ${!envError ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {!envError ? 'Valid JSON' : 'Invalid JSON'}
              </span>
            )}
          </div>
          <textarea
            rows={6}
            value={envInput}
            onChange={handleEnvChange}
            placeholder='{&#10;  "PORT": "8080",&#10;  "NODE_ENV": "production"&#10;}'
            className="w-full bg-[#0c0c0c] border border-gray-700 rounded-lg p-4 font-mono text-sm text-cyan-300 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none resize-none"
          />
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSaveSettings} disabled={!!envError || loading} className="bg-white text-black hover:bg-gray-200">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Configuration'}
            </Button>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Danger Zone</h3>
          <div className="space-y-3">
            <Button onClick={() => setAction("stop")} variant="outline" className="w-full justify-start border-gray-700 hover:bg-gray-800 text-gray-300">
              <Square className="w-4 h-4 mr-3 text-yellow-500" /> Stop Server
            </Button>
            <Button onClick={() => setAction("restart")} variant="outline" className="w-full justify-start border-gray-700 hover:bg-gray-800 text-gray-300">
              <Play className="w-4 h-4 mr-3 text-blue-500" /> Restart Server
            </Button>
            <Button onClick={() => setAction("delete")} variant="outline" className="w-full justify-start border-red-900/50 hover:bg-red-900/20 text-red-400 hover:text-red-300">
              <Trash2 className="w-4 h-4 mr-3" /> Delete Application
            </Button>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {action && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-2 capitalize text-white">Confirm {action}</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to {action} this application? {action === 'delete' && 'This cannot be undone.'}
            </p>
            <div className="flex gap-3 justify-end">
              <Button onClick={() => setAction('')} variant="ghost" className="text-gray-400 hover:text-white">Cancel</Button>
              <Button onClick={handleAction} disabled={loading} className={action === 'delete' ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-white text-black hover:bg-gray-200'}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
