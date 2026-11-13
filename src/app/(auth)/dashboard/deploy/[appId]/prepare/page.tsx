'use client';

import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  UploadCloud,
  FileCode,
  Server,
  CheckCircle2,
  AlertCircle,
  FileArchive,
  Terminal,
  Zap,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const DEPLOY_STAGES = [
  'Verifying archive structure & folder normalization...',
  'Streaming payload to secure Vercel Blob store...',
  'Signing HMAC authorization token for Upstash QStash...',
  'Dispatching serverless background worker to Azure Kudu...',
];

export default function PrepareAndDeployPage() {
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [fileList, setFileList] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [successUrl, setSuccessUrl] = useState('');
  const [appType, setAppType] = useState<'react' | 'nodejs'>('react');

  const [envInput, setEnvInput] = useState('');
  const [envError, setEnvError] = useState<string | null>(null);

  // Slow steady stage ticker
  const [deployStageIndex, setDeployStageIndex] = useState(0);

  const params = useParams();
  const appId = params.appId as string;
  const router = useRouter();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isDeploying) {
      interval = setInterval(() => {
        setDeployStageIndex((prev) => (prev < DEPLOY_STAGES.length - 1 ? prev + 1 : prev));
      }, 1200);
    } else {
      setDeployStageIndex(0);
    }
    return () => clearInterval(interval);
  }, [isDeploying]);

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
      setEnvError('Invalid JSON format (Must be valid key-value pairs)');
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
          newErrors.push('Missing index.html. Ensure you zipped your build output folder (e.g. dist/ or build/), not the source files.');
        }
        if (entries.some((name) => name.includes('package.json'))) {
          newErrors.push('Detected package.json. Please upload only your pre-built static directory (dist/ or build/).');
        }
      } else if (appType === 'nodejs') {
        if (!entries.some((name) => name.endsWith('package.json'))) {
          newErrors.push('Missing package.json (Required for Node.js package resolution on Azure).');
        }
        if (!entries.some((name) => name.endsWith('index.js') || name.endsWith('app.js') || name.endsWith('server.js'))) {
          newErrors.push('Missing entry point file (Expected index.js, app.js, or server.js at root).');
        }
      }

      setErrors(newErrors);
      return newErrors.length === 0;
    } catch {
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
        // Allow slow progression animation to complete
        setTimeout(() => {
          setIsDeploying(false);
          setSuccessUrl(data.message || 'Queued to Serverless Worker pipeline via QStash!');
        }, 3600);
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
      {/* Calm ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none animate-pulse-slow" />

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
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400/80 bg-cyan-950/30 border border-cyan-500/20 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse-slow" />
            STEP 2 • UPLOAD ARTIFACT
          </div>
        </div>

        {/* Main Panel */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">
              Deploy Build Artifact
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Select runtime framework, upload pre-built zip, and dispatch serverless deployment
            </p>
          </div>

          <div className="space-y-5">
            {/* 1. APP TYPE SELECTOR (Minimal Cards) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Application Framework
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAppType('react');
                    setErrors([]);
                    setFileList([]);
                    setZipFile(null);
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    appType === 'react'
                      ? 'border-cyan-500/80 bg-cyan-950/20 text-white'
                      : 'border-white/[0.08] bg-slate-950/40 hover:border-white/[0.15]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-xs text-white">React SPA</span>
                    {appType === 'react' && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Built folder (dist/ or build/) with index.html
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAppType('nodejs');
                    setErrors([]);
                    setFileList([]);
                    setZipFile(null);
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    appType === 'nodejs'
                      ? 'border-blue-500/80 bg-blue-950/20 text-white'
                      : 'border-white/[0.08] bg-slate-950/40 hover:border-white/[0.15]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-xs text-white">Node.js Server</span>
                    {appType === 'nodejs' && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Backend with package.json & server entry
                  </p>
                </button>
              </div>
            </div>

            {/* 2. FILE UPLOADER */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Zip Archive (.zip)
              </label>

              <label className="relative border border-dashed border-white/[0.12] hover:border-cyan-500/50 rounded-xl p-5 bg-slate-950/40 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                <input
                  type="file"
                  accept=".zip"
                  onChange={handleFileChange}
                  className="sr-only"
                />
                <div className="w-10 h-10 rounded-full bg-slate-900 border border-white/[0.08] flex items-center justify-center text-slate-400 group-hover:text-cyan-400 transition-colors mb-2">
                  <FileArchive className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <span className="text-xs font-medium text-slate-200 group-hover:text-cyan-400 transition-colors">
                    {zipFile ? zipFile.name : 'Click to select or drag and drop .zip archive'}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {zipFile ? `${(zipFile.size / 1024 / 1024).toFixed(2)} MB archive selected` : 'Maximum archive size: 50MB'}
                  </p>
                </div>
              </label>

              {/* Archive verified badge */}
              {fileList.length > 0 && errors.length === 0 && (
                <div className="p-2.5 bg-slate-950/60 border border-white/[0.06] rounded-lg flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Archive Verified ({fileList.length} files detected)
                  </span>
                  <span className="text-[10px] text-slate-500">Ready to stream</span>
                </div>
              )}

              {/* Validation errors */}
              {errors.length > 0 && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5 text-rose-400 text-xs font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Archive Issue
                  </div>
                  <ul className="text-[11px] text-rose-300 list-disc list-inside space-y-0.5">
                    {errors.map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 3. ENVIRONMENT VARIABLES (Minimal) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  Environment Variables (JSON)
                </label>
                {envInput && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
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
                className="w-full bg-slate-950 border border-white/[0.08] focus:border-cyan-500/60 text-slate-200 placeholder:text-slate-600 rounded-lg p-2.5 text-xs font-mono outline-none transition-colors resize-none"
              />
              {envError && <p className="text-[11px] text-rose-400 font-mono">{envError}</p>}
            </div>

            {/* 4. DEPLOY BUTTON & SLOW STEADY ANIMATION */}
            <div className="pt-2">
              {isDeploying ? (
                <div className="p-5 rounded-xl border border-cyan-500/20 bg-slate-950/70 space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-center gap-3">
                    <div className="relative w-8 h-8 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border border-cyan-400/40 animate-spin-slow" />
                      <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse-slow" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-mono text-cyan-300">
                        {DEPLOY_STAGES[deployStageIndex]}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Upstash QStash push queue worker dispatch in progress...
                      </div>
                    </div>
                  </div>

                  {/* Flowing shimmer progress bar */}
                  <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden border border-white/[0.06]">
                    <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 w-full animate-shimmer" />
                  </div>
                </div>
              ) : (
                <Button
                  onClick={handleDeploy}
                  disabled={!zipFile || errors.length > 0 || !!envError}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-xs h-11 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Dispatch Serverless Deployment</span>
                </Button>
              )}
            </div>

            {/* SUCCESS BANNER */}
            {successUrl && (
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 space-y-3 animate-fadeIn">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Deployment Dispatched to Worker Pipeline</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Artifact ingested. The background worker is now pushing build files to Azure Kudu. You can follow live container status in the monitor.
                </p>
                <div>
                  <Link href={`/dashboard/monitor/${appId}`}>
                    <Button
                      variant="outline"
                      className="w-full border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20 text-xs font-mono h-9 flex items-center justify-center gap-2"
                    >
                      <span>Open Live Monitor & Logs</span>
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
