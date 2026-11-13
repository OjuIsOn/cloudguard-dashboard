'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppType } from '@/models/app';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import Lottie from 'lottie-react';
import loader from "../../../../../../public/animations/loader.json";

export default function Page() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | string | null>(null);

  // ✅ Corrected appId handling
  const params = useParams();
  const appId = Array.isArray(params.appId) ? params.appId[0] : params.appId;

  const [appData, setAppData] = useState<AppType | null>(null);
  const [webAppName, setWebAppName] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('indiasouthcentral');
  const [selectedPlan, setSelectedPlan] = useState('F1');
  const [status, setStatus] = useState<'idle' | 'checking' | 'taken' | 'unique' | 'error' | string>('idle');
  const [hostedURL, setHostedURL] = useState('');
  const [appCreateLoading, setAppCreateLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const check = setTimeout(async () => {
      if (webAppName.length > 2) {
        setStatus('checking');
        try {
          const response = await fetch(`/api/auth/azure/check?name=${webAppName}&subscriptionId=${appData?.subscriptionId}`);
          const data = await response.json();

          if (data.success === true && data.message === true) {
            setStatus('unique');
          } else {
            setStatus(
              data.message === false &&
              data.fullMessage === 'Site names only allow alphanumeric characters and hyphens, cannot start or end in a hyphen, and must be less than 64 chars.'
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
    }, 500);

    return () => clearTimeout(check);
  }, [webAppName]);

  // ✅ App data fetcher
  useEffect(() => {
    if (!appId) return;

    setLoading(true);
    const fill = async () => {
      await fetch(`/api/apps/${appId}`)
        .then(res => res.json())
        .then(data => {
          if (!data || !data.data) throw new Error('No data returned from API');
          setAppData(data.data);
          if (data.data.location) {
            setSelectedLocation(data.data.location);
          }
        })
        .catch((err) => {
          toast.error("Failed to load app");
          console.error(err);
        })
        .finally(() => setLoading(false));
    };
    fill();
  }, [appId]);

  const handleSubmit = async () => {
    try {
      setAppCreateLoading(true);
      const res = await fetch('/api/auth/azure/create-web-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...appData,
          Appname: webAppName,
          location: selectedLocation,
          plan: selectedPlan,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Web app creation failed");

      setHostedURL(data.hostedUrl);

      toast(
        <div className="flex flex-col gap-2">
          <span>✅ New Web App Service has been created successfully!</span>
          <button
            onClick={() => window.open(`${data.hostedUrl}`, "_blank")}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm w-fit"
          >
            Visit Web App
          </button>
        </div>,
        { duration: 6000 }
      );

      router.push(`/dashboard/deploy/${appId}/prepare`);
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toast.error(msg || "Couldn't create web app service");
    } finally {
      setAppCreateLoading(false);
    }
  };

  if (!appId) return <div>Invalid app ID</div>;
  if (loading) return <div>Loading...</div>;
  if (!appData) return <p className="p-4 text-red-500">App not found</p>;

  return (
    <div className="p-6 space-y-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Deploy "{appData.name}"</h1>

      <div className="border p-4 rounded-md shadow space-y-1">
        <p><strong>Subscription:</strong> {appData.subscriptionId}</p>
        <p><strong>Resource Group:</strong> {appData.resourceGroup}</p>
        <p><strong>App Service Name:</strong> {appData.appServiceName}</p>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">Azure Deployment Region</label>
        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="w-full border rounded-md p-2 bg-background text-foreground"
        >
          <option value="indiasouthcentral">South Central India (indiasouthcentral)</option>
          <option value="centralindia">Central India (centralindia)</option>
          <option value="southindia">South India (southindia)</option>
          <option value="eastus">East US (eastus - Most reliable for Free Tier)</option>
          <option value="westus">West US (westus)</option>
          <option value="centralus">Central US (centralus)</option>
          <option value="westeurope">West Europe (westeurope)</option>
          <option value="southeastasia">Southeast Asia (southeastasia)</option>
        </select>
        <p className="text-xs text-muted-foreground">
          Note: Azure Free (F1) Linux tier availability varies by subscription. If Central India has 0 quota, select South Central India or East US.
        </p>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">App Service Pricing Tier (Plan)</label>
        <select
          value={selectedPlan}
          onChange={(e) => setSelectedPlan(e.target.value)}
          className="w-full border rounded-md p-2 bg-background text-foreground"
        >
          <option value="F1">F1 Free ($0/mo) — 60 CPU min/day, 1GB RAM (Shared)</option>
          <option value="B1">B1 Basic (~$13/mo) — Dedicated 1 vCPU, 1.75GB RAM, Custom Domain / SSL</option>
          <option value="B2">B2 Basic (~$26/mo) — Dedicated 2 vCPU, 3.5GB RAM</option>
          <option value="S1">S1 Standard (~$70/mo) — Dedicated 1 vCPU, Auto-scaling & Staging Slots</option>
        </select>
        {selectedPlan !== 'F1' ? (
          <p className="text-xs text-amber-500 font-medium">
            ⚡ Paid Compute Tier Selected: Azure will bill your connected account. Ensure you set auto-stop limits in the monitor tab!
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Default: Free sandbox tier for development and zero-cost testing.
          </p>
        )}
      </div>

      <Input
        placeholder="Enter name of your web app service"
        onChange={(event) => setWebAppName(event.target.value)}
      />

      {status === 'idle' && (
        <p className="text-gray-400 animate-fadeIn glow-subtle">Start typing a name...</p>
      )}
      {status === 'checking' && (
        <p className="text-yellow-300 pulse-glow scanline">Scanning availability...</p>
      )}
      {status === 'taken' && (
        <p className="text-red-500 glow-red animate-fadeIn scanline">Name is already taken</p>
      )}
      {status === 'error' && (
        <p className="text-red-400 animate-flicker scanline">
          System glitch detected!<br />
          Site names only allow alphanumeric characters and hyphens, cannot start or end in a hyphen, and must be less than 64 chars.
        </p>
      )}
      {status === 'unique' && (
        <p className="text-green-400 glow-green animate-fadeIn scanline">Nice!</p>
      )}

      <Button onClick={handleSubmit} disabled={status !== 'unique'}>
        Create Web Service + Prepare Build
      </Button>

      {error && <p className="text-red-600 mt-2">Error: {typeof error === 'string' ? error : error.message}</p>}

      {hostedURL && (
        <p className="text-green-400 glow-green animate-fadeIn scanline">
          Web app service created: {hostedURL}
        </p>
      )}

      {appCreateLoading && (
        <div className="flex flex-col items-center justify-center gap-4 p-4">
          <Lottie
            animationData={loader}
            loop
            className="w-200 h-auto sm:w-40 sm:h-40 md:w-52 md:h-52 drop-shadow-[0_0_15px_#00ffff]"
          />
          <p className="text-blue-400 text-lg font-medium animate-pulse scanline">
            Your App Service is getting created...
          </p>
        </div>
      )}
    </div>
  );
}
