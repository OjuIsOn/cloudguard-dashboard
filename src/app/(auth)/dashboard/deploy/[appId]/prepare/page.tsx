'use client';

import React, { useState } from 'react';
import JSZip from 'jszip';
import { useParams } from 'next/navigation';

export default function DeployPage() {
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [fileList, setFileList] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [successUrl, setSuccessUrl] = useState('');
  const [appType, setAppType] = useState<'react' | 'nodejs'>('react');

  const [envInput, setEnvInput] = useState('');
  const [envError, setEnvError] = useState<string | null>(null);

  const handleEnvChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setEnvInput(val);
    if (!val.trim()) {
      setEnvError(null);
      return;
    }
    try {
      JSON.parse(val);
      setEnvError(null);
    } catch {
      setEnvError("Invalid JSON format");
    }
  };

  const params = useParams();
  const appId = params.appId as string;

  const validateZip = async (file: File) => {
    const zip = await JSZip.loadAsync(file);
    const entries = Object.keys(zip.files);
    setFileList(entries);

    const newErrors: string[] = [];

    if (appType === 'react') {
       if (!entries.some(name => name.endsWith('index.html'))) {
         newErrors.push("Missing index.html (likely not a built folder)");
       }
      if (entries.some(name => name.includes("package.json"))) {
        newErrors.push("Please upload only your built folder (e.g. dist/ or build/), not the entire project.");
       }
    } else if (appType === 'nodejs') {
      if (!entries.some(name => name.endsWith('package.json'))) {
        newErrors.push("Missing package.json (Node.js app needs it)");
      }
      if (!entries.some(name => name.endsWith('index.js') || name.endsWith('app.js'))) {
        newErrors.push("Missing entry point file (index.js or app.js)");
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.zip')) {
      setZipFile(file);
      await validateZip(file);
    } else {
      setErrors(["Please upload a .zip file"]);
    }
  };

  const handleDeploy = async () => {
    if (!zipFile || envError) return;

    setIsDeploying(true);
    setSuccessUrl('');
    const formData = new FormData();
    formData.append('zip', zipFile);
    formData.append('appType', appType); // 'react' or 'nodejs'
    formData.append('appId', appId);
    
    if (envInput.trim()) {
      formData.append('envVars', envInput);
    }
    
    const res = await fetch(`/api/deploy/upload-and-deploy`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    
    if (data.success) {
      // The API returns success instantly since it's queued.
      // We'll show a message instead of the raw hostedUrl, 
      // or we can simulate the loader for a few seconds for better UX
      setTimeout(() => {
         setIsDeploying(false);
         setSuccessUrl(data.message || "App deployed successfully!");
      }, 3000); // 3 second simulated queue time
    } else {
      setIsDeploying(false);
      setErrors([data.message || "Deployment failed"]);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold">Upload and Deploy</h2>

      {/* Dropdown for app type */}
      <label className="block font-medium mb-1">App Type:</label>
      <select
        className="border p-2 rounded w-full bg-gray-800 text-white"
        value={appType}
        onChange={(e) => {
          setAppType(e.target.value as 'react' | 'nodejs');
          setErrors([]); // reset errors on type change
          setFileList([]);
          setZipFile(null);
        }}
      >
        <option value="react">React (built folder)</option>
        <option value="nodejs">Node.js (entire project)</option>
      </select>

      {/* Env Vars input */}
      <label className="block space-y-1">
        <span className="font-medium">Environment Variables (JSON)</span>
        <textarea
          rows={4}
          placeholder='{"PORT": "8080", "API_KEY": "xyz"}'
          value={envInput}
          onChange={handleEnvChange}
          className="w-full rounded border p-2 font-mono text-sm bg-gray-800 text-white"
        />
      </label>
      {envError && <p className="text-sm text-red-500">{envError}</p>}

      {/* File input */}
      <input type="file" accept=".zip" onChange={handleFileChange} className="border p-2 mt-2 w-full" />

      {/* File list */}
      {fileList.length > 0 && (
        <div className="bg-gray-900 text-green-400 p-3 rounded">
          <h3 className="text-lg mb-2">Contents:</h3>
          <ul className="list-disc ml-4 max-h-48 overflow-y-auto text-sm">
            {fileList.map(name => <li key={name}>{name}</li>)}
          </ul>
        </div>
      )}

      {/* Error messages */}
      {errors.length > 0 && (
        <div className="bg-red-100 text-red-600 p-3 rounded">
          <h4 className="font-semibold mb-1">Issues found:</h4>
          <ul className="list-disc ml-4">
            {errors.map(err => <li key={err}>{err}</li>)}
          </ul>
        </div>
      )}

      {/* Deploy button & Animation */}
      <div className="flex flex-col items-center justify-center mt-6">
        {isDeploying ? (
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-16 h-16 animate-spin">
              <div className="absolute inset-0 rounded-full border-t-4 border-cyan-400 glow-cyan"></div>
              <div className="absolute inset-2 rounded-full border-r-4 border-blue-500 glow-blue animate-pulse"></div>
              <div className="absolute inset-4 rounded-full border-b-4 border-purple-500 glow-purple"></div>
            </div>
            <p className="text-cyan-400 animate-pulse scanline text-sm tracking-widest font-mono">
              INITIALIZING DEPLOYMENT PROTOCOL...
            </p>
          </div>
        ) : (
          <button
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold rounded shadow-lg shadow-cyan-500/30 transition-all disabled:opacity-50 disabled:shadow-none"
            onClick={handleDeploy}
            disabled={!zipFile || errors.length > 0 || !!envError}
          >
            Deploy to Azure
          </button>
        )}
      </div>

      {/* Success link */}
      {successUrl && (
        <div className="mt-4 p-4 border border-green-500/50 bg-green-500/10 rounded-lg text-center">
          <p className="text-green-400 font-semibold text-lg animate-fadeIn">
            ✅ {successUrl}
          </p>
          <p className="text-gray-400 text-sm mt-2">
            You can monitor its status or redeploy from the dashboard.
          </p>
        </div>
      )}
    </div>
  );
}
