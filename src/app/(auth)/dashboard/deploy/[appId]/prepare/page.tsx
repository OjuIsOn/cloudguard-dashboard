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
    if (!zipFile) return;

    setIsDeploying(true);
    const formData = new FormData();
    formData.append('zip', zipFile);
    formData.append('appType', appType); // 'react' or 'nodejs'
    formData.append('appId', appId);
    const end=appType=='react'?"react-deploy":"upload-and-deploy"
    const res = await fetch(`/api/deploy/${end}`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    setIsDeploying(false);

    if (data.success) {
      setSuccessUrl(data.hostedUrl);
    } else {
      setErrors([data.message || "Deployment failed"]);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold">Upload and Deploy</h2>

      {/* Dropdown for app type */}
      <label className="block font-medium mb-1">App Type:</label>
      <select
        className="border p-2 rounded w-full"
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

      {/* File input */}
      <input type="file" accept=".zip" onChange={handleFileChange} className="border p-2 mt-2" />

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

      {/* Deploy button */}
      <button
        className="px-6 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        onClick={handleDeploy}
        disabled={!zipFile || errors.length > 0 || isDeploying}
      >
        {isDeploying ? "Deploying..." : "Deploy to Azure"}
      </button>

      {/* Success link */}
      {successUrl && (
        <p className="text-green-500 mt-4">
          ✅ App deployed! View it at: <a href={successUrl} target="_blank" className="underline">{successUrl}</a>
        </p>
      )}
    </div>
  );
}
