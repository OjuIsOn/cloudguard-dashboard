'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import BudgetPie from '@/components/each-app-pie';


export default function MonitorPage() {
  const { appId } = useParams() as { appId: string };
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [cost, setCost] = useState(0);
  const [budget, setBudget] = useState(0);
  const [autoShut, setAutoShut] = useState(false);
  const [env, setEnv] = useState<Record<string, string>>({});
  const [envInput, setEnvInput] = useState('');
  const [envError, setEnvError] = useState<string | null>(null);
  const [action, setAction] = useState<'stop' | 'restart' | 'delete' | ''>('');
  const [hostedUrl, setHostedUrl] = useState('');

  const fetchAppData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/apps/${appId}`);
      // const res = await fetch(`/api/monitor/${appId}`);
      const { success, data } = await res.json();
      if (success && data) {
        setCost(data.cost || 0);
        setBudget(data.budget || 0);
        setAutoShut(data.autoStop || false);
        setHostedUrl(`https://${data.AppName}.azurewebsites.net`);
        const currentCost = data.cost;
        const currentBudget = data.budget ?? -1;
        console.log(data)
        if (currentBudget !== -1 && currentCost > currentBudget) {
          // Exceeded budget logic
          toast.error(`App cost ₹${currentCost} exceeded the budget ₹${currentBudget}`);
        }



      } else {
        console.error('Failed to fetch app data', data);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error('Unable to load app data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppData();
    const interval = setInterval(fetchAppData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [appId]);

  const handleEnvChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const input = e.target.value;
    setEnvInput(input);
    try {
      const parsed = JSON.parse(input);
      setEnv(parsed);
      setEnvError(null);
    } catch {
      setEnvError(' Invalid JSON format');
    }
  };

  useEffect(() => {
    if (!action) return;
    const perform = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/monitor/${appId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        const result = await res.json();
        result.success ? toast.success(result.message) : toast.error(result.message || 'Action failed');
      } catch (err) {
        console.error('Action error:', err);
        toast.error('Something went wrong');
      } finally {
        setLoading(false);
        setAction('');
      }
    };
    perform();
  }, [action, appId]);

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/monitor/${appId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget, autoShut, ...(envError ? {} : { env }) }),
      });
      if (!res.ok) console.error('Update failed', res.status);
      else {
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        console.log('Update:', data);
        fetchAppData();
      }
    } catch (err) {
      console.error('Update error:', err);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="mx-auto w-full max-w-5xl p-6 space-y-8">
    <h2 className="text-2xl font-bold">App Monitoring Dashboard</h2>

    {loading && <p className="text-blue-500">Loading…</p>}
    {hostedUrl && (
      <Button onClick={() => window.open(hostedUrl, "_blank")}>
        Visit your app
      </Button>
    )}

    <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
     
      <div className="flex-1 space-y-6 rounded-lg border p-6 shadow-sm">
        <div className="space-y-1">
          <p>
            <strong>Current Cost:</strong> ₹{cost.toFixed(2)}
          </p>
          <p>
            <strong>Budget Limit:</strong>{" "}
            {budget ? `₹${budget}` : "Not set"}
          </p>
        </div>

        <div className="space-y-4">
          <label className="flex flex-col gap-1 text-sm">
            <span>Update Budget (₹)</span>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="rounded border p-2"
            />
          </label>

          <label className="flex items-center justify-evenly text-shadow-cyan-400">
            <span>Auto Shutdown</span>
            <div className="relative inline-block h-6 w-11">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={autoShut}
                onChange={(e) => setAutoShut(e.target.checked)}
              />
              <div className="h-6 w-11 rounded-full bg-blue-300 transition peer-checked:bg-green-700" />
              <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
            </div>
          </label>
        </div>
      </div>

      <div className="flex justify-center md:w-80">
        <BudgetPie budget={budget} cost={cost} size={300} />
      </div>
    </div>

    <label className="block space-y-1">
      <span className="text-sm">Environment Variables (JSON)</span>
      <textarea
        rows={6}
        value={envInput}
        onChange={handleEnvChange}
        className="w-full rounded border p-2 font-mono text-sm"
      />
    </label>
    {envError && <p className="text-sm text-red-500">{envError}</p>}

    <Button onClick={handleSaveSettings} disabled={!!envError}>
      Save Settings
    </Button>

    <hr />
    <h3 className="text-xl font-semibold">Manage App</h3>
    <div className="flex flex-wrap gap-3">
      <Button onClick={() => setAction("stop")}>Stop</Button>
      <Button onClick={() => setAction("restart")}>Restart</Button>
      <Button onClick={() => setAction("delete")}>Delete</Button>
    </div>

    {action && (
      <div className="rounded bg-gray-50 p-4">
        <p className="mb-2 text-sm text-gray-600">
          Confirm <strong>{action}</strong>?
        </p>
        <button
          onClick={handleSaveSettings}
          className="rounded bg-black px-6 py-2 text-white"
        >
          Confirm
        </button>
      </div>
    )}
  </div>
);

}
