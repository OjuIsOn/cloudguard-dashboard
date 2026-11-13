'use client';

import React, { useState } from 'react';
import JSZip from 'jszip';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  UploadCloud,
  FileCode,
  Server,
  Layers,
  CheckCircle2,
  AlertCircle,
  FileArchive,
  Terminal,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrepareAndDeployPage() {
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [fileList, setFileList] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [successUrl, setSuccessUrl] = useState('');
  const [appType, setAppType] = useState<'react' | 'nodejs'>('react');

  const [envInput, setEnvInput] = useState('');
  const [envError, setEnvError] = useState<string | null>(null);

  const params = useParams();
  const appId = params.appId as string;
  const router = useRouter();

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
      setEnvError('Invalid JSON format (must be key-value pairs)');
    }
  };

  const validateZip = async (file: File) => {
    try {
      const zip = await JSZip.loadAsync(file);
      const entries = Object.keys(zip.files);
      setFileList(entries);

      const newErrors: string[] = [];

      if (appType === 'react') {
        if (!entries.some((name) => name.endsWith('index.html'))) {
          newErrors.push('Missing index.html. Ensure you zipped the build output folder (e.g. dist/ or build/), not the source repository.');
        }
        if (entries.some((name) => name.includes('package.json'))) {
          newErrors.push('Detected package.json inside React bundle. Please upload only your pre-built static directory (dist/ or build/).');
        }
      } else if (appType === 'nodejs') {
        if (!entries.some((name) => name.endsWith('package.json'))) {
          newErrors.push('Missing package.json (Required for Node.js dependency resolution on Azure).');
        }
        if (!entries.some((name) => name.endsWith('index.js') || name.endsWith('app.js') || name.endsWith('server.js'))) {
          newErrors.push('Missing entry point file (Expected index.js, app.js, or server.js at root).');
        }
      }

      setErrors(newErrors);
      return newErrors.length === 0;
    } catch (e) {
      setErrors(['Corrupt or unreadable .zip archive.']);
      return false;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.zip')) {
      setZipFile(file);
      await validateZip(file);
    } else {
      setErrors(['Please upload a valid .zip archive']);
    }
  };

  const handleDeploy = async () => {
    if (!zipFile || envError || errors.length > 0) return;

    setIsDeploying(true);
    setSuccessUrl('');
    const formData = new FormData();
    formData.append('zip', zipFile);
    formData.append('appType', appType);
    formData.append('appId', appId);

    if (envInput.trim()) {
      formData.append('envVars', envInput);
    }

    try {
      const res = await fetch(`/api/deploy/upload-and-deploy`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setTimeout(() => {
          setIsDeploying(false);
          setSuccessUrl(data.message || 'Queued to Serverless Worker pipeline via QStash!');
        }, 2200);
      } else {
        setIsDeploying(false);
        setErrors([data.message || 'Deployment dispatch failed']);
      }
    } catch {
      setIsDeploying(false);
      setErrors(['Network error connecting to deployment pipeline']);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-cyan-500/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-12 right-12 w-[350px] h-[250px] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-2xl mx-auto space-y-6 relative z-10">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href={`/dashboard/deploy/${appId}`}
            className="inline-flex items-center text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            BACK TO SERVICE CONFIG
          </Link>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400/80 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            STAGE 2: ARTIFACT INGESTION
          </div>
        </div>

        {/* Main Panel */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Upload & Deploy Artifact
                </h1>
                <p className="text-sm text-slate-400">
                  Normalize archive contents and dispatch to asynchronous QStash worker
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* 1. APP TYPE SELECTOR */}
            <div className="space-y-3">
              <label className="text-xs font-mono uppercase tracking-wider text-slate-300">
                Target Runtime Framework
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setAppType('react');
                    setErrors([]);
                    setFileList([]);
                    setZipFile(null);
                  }}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    appType === 'react'
                      ? 'border-cyan-500 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <FileCode className={`w-5 h-5 ${appType === 'react' ? 'text-cyan-400' : 'text-slate-400'}`} />
                    {appType === 'react' && <span className="w-2 h-2 rounded-full bg-cyan-400" />}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-white">React SPA</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Static build (dist/ or build/) with index.html
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAppType('nodejs');
                    setErrors([]);
                    setFileList([]);
                    setZipFile(null);
                  }}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    appType === 'nodejs'
                      ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Server className={`w-5 h-5 ${appType === 'nodejs' ? 'text-blue-400' : 'text-slate-400'}`} />
                    {appType === 'nodejs' && <span className="w-2 h-2 rounded-full bg-blue-400" />}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-white">Node.js Server</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Backend app with package.json & server entry
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. FILE UPLOADER */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-slate-300">
                Application Archive (.zip)
              </label>

              <label className="relative border-2 border-dashed border-slate-800 hover:border-cyan-500/60 rounded-xl p-6 bg-slate-950/50 flex flex-col items-center justify-center cursor-pointer transition-all group">
                <input
                  type="file"
                  accept=".zip"
                  onChange={handleFileChange}
                  className="sr-only"
                />
                <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 group-hover:border-cyan-500/50 transition-colors mb-3">
                  <FileArchive className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <span className="text-sm font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">
                    {zipFile ? zipFile.name : 'Click to select or drag and drop .zip'}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    {zipFile ? `${(zipFile.size / 1024 / 1024).toFixed(2)} MB archive selected` : 'Maximum file size: 50MB'}
                  </p>
                </div>
              </label>

              {/* File list preview */}
              {fileList.length > 0 && errors.length === 0 && (
                <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                    <span className="flex items-center gap-1.5 text-cyan-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Archive Verified ({fileList.length} files detected)
                    </span>
                  </div>
                  <div className="max-h-28 overflow-y-auto font-mono text-[11px] text-slate-400 space-y-0.5 pl-2 border-l border-slate-800">
                    {fileList.slice(0, 15).map((f) => (
                      <div key={f} className="truncate">{f}</div>
                    ))}
                    {fileList.length > 15 && (
                      <div className="text-slate-500">...and {fileList.length - 15} more files</div>
                    )}
                  </div>
                </div>
              )}

              {/* Validation errors */}
              {errors.length > 0 && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Archive Structure Warning
                  </div>
                  <ul className="text-xs text-rose-300 list-disc list-inside space-y-0.5">
                    {errors.map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 3. ENVIRONMENT VARIABLES */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  Environment Variables (Optional JSON)
                </label>
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
                rows={3}
                placeholder='{"PORT": "8080", "NODE_ENV": "production"}'
                value={envInput}
                onChange={handleEnvChange}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 text-slate-200 placeholder:text-slate-600 rounded-lg p-3 text-xs font-mono outline-none transition-all resize-none"
              />
              {envError && <p className="text-xs text-rose-400 font-mono">{envError}</p>}
            </div>

            {/* 4. DEPLOY BUTTON */}
            <div className="pt-2">
              {isDeploying ? (
                <div className="p-6 rounded-xl border border-cyan-500/30 bg-cyan-950/20 flex flex-col items-center justify-center gap-3">
                  <div className="relative w-12 h-12 animate-spin">
                    <div className="absolute inset-0 rounded-full border-t-2 border-cyan-400"></div>
                    <div className="absolute inset-2 rounded-full border-r-2 border-blue-500 animate-pulse"></div>
                  </div>
                  <p className="text-cyan-400 text-xs font-mono tracking-widest uppercase animate-pulse">
                    DISPATCHING TO QSTASH WORKER PROTOCOL...
                  </p>
                </div>
              ) : (
                <Button
                  onClick={handleDeploy}
                  disabled={!zipFile || errors.length > 0 || !!envError}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm h-12 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Deploy to Azure via Serverless Pipeline</span>
                </Button>
              )}
            </div>

            {/* SUCCESS BANNER */}
            {successUrl && (
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Deployment Dispatched to Queue!</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Your archive has been safely stored in Vercel Blob and a background execution task has been queued with Upstash QStash. The worker is now normalizing and pushing your build to Azure Kudu.
                </p>
                <div className="pt-1">
                  <Link href={`/dashboard/monitor/${appId}`}>
                    <Button
                      variant="outline"
                      className="w-full border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20 text-xs font-mono h-10 flex items-center justify-center gap-2"
                    >
                      <span>Watch Live Azure Deployment & Logs</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
