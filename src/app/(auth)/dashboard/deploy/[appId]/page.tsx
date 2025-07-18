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
  const [status, setStatus] = useState<'idle' | 'checking' | 'taken' | 'unique' | 'error' | string>('idle');
  const [hostedURL, setHostedURL] = useState('');
  const [appCreateLoading, setAppCreateLoading] = useState(false);
  const router = useRouter();

  // ✅ Web app name availability checker
  useEffect(() => {
    const check = setTimeout(async () => {
      if (webAppName.length > 2) {
        setStatus('checking');
        try {
          const response = await fetch(`/api/auth/azure/check?name=${webAppName}`);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      toast("Couldn't create web app service");
    }
  };

  if (!appId) return <div>Invalid app ID</div>;
  if (loading) return <div>Loading...</div>;
  if (!appData) return <p className="p-4 text-red-500">App not found</p>;

  return (
    <div className="p-6 space-y-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Deploy "{appData.name}"</h1>

      <div className="border p-4 rounded-md shadow">
        <p><strong>Subscription:</strong> {appData.subscriptionId}</p>
        <p><strong>Resource Group:</strong> {appData.resourceGroup}</p>
        <p><strong>App Service Name:</strong> {appData.appServiceName}</p>
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
