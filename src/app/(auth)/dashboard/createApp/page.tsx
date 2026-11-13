'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { appSchema } from '@/lib/validation';
import {
  Layers,
  ShieldAlert,
  ArrowLeft,
  Sparkles,
  Server,
  Cloud,
  Cpu,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export default function CreateAppPage() {
  const [isClient, setIsClient] = useState(false);
  const [resourceGroups, setResourceGroups] = useState<string[]>([]);
  const [subscriptions, setSubscriptions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.infer<typeof appSchema>>({
    defaultValues: {
      autoStop: false,
      cost: 0,
      budget: 500,
    },
  });

  const router = useRouter();
  const autoStopActive = watch('autoStop');
  const watchedName = watch('name');

  useEffect(() => {
    setIsClient(true);

    const fetchSubsAndRG = async () => {
      try {
        const [subsRes, rgRes] = await Promise.all([
          fetch('/api/subscription'),
          fetch('/api/resourceGroup'),
        ]);
        const subsData = await subsRes.json();
        const rgData = await rgRes.json();

        if (subsData.success && Array.isArray(subsData.data)) {
          setSubscriptions(subsData.data.map((s: any) => s.subscriptionId));
          if (subsData.data.length > 0) {
            setValue('subscriptionId', subsData.data[0].subscriptionId);
          }
        }

        if (rgData.success && Array.isArray(rgData.data)) {
          const uniqueRGs = Array.from(new Set<string>(rgData.data.map((rg: any) => rg.name)));
          setResourceGroups(uniqueRGs);
          if (uniqueRGs.length > 0) {
            setValue('resourceGroup', uniqueRGs[0]);
          }
        }
      } catch (err) {
        toast.error('Failed to query Azure subscriptions or resource groups');
      }
    };

    fetchSubsAndRG();
  }, [setValue]);

  const onSubmitHandle = async (data: z.infer<typeof appSchema>) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/apps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          cost: Number(data.cost) || 0,
          budget: Number(data.budget) || 500,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Creation Failed!');
      }

      toast.success(`App "${data.name}" provisioned in local catalog!`);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err?.message || 'App creation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isClient) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-cyan-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute top-10 right-10 w-[300px] h-[200px] bg-blue-600/10 blur-[90px] rounded-full pointer-events-none" />

      <div className="max-w-2xl mx-auto space-y-6 relative z-10">
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
            FINOPS PROVISIONER
          </div>
        </div>

        {/* Card Header */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Initialize Workload
                </h1>
                <p className="text-sm text-slate-400">
                  Register a new cloud service with automated FinOps cost guardrails
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmitHandle)} className="space-y-6">
            {/* SECTION 1: IDENTITY */}
            <div className="space-y-4">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Server className="w-3.5 h-3.5 text-cyan-400" /> Workload Identity
              </h3>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-medium text-slate-300">
                    App Display Name
                  </Label>
                  <Input
                    {...register('name')}
                    id="name"
                    placeholder="e.g. production-api"
                    className="bg-slate-950 border-slate-800 focus:border-cyan-500 text-slate-100 placeholder:text-slate-600 rounded-lg text-sm h-10"
                    required
                  />
                  {errors.name && (
                    <p className="text-xs text-rose-400">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appServiceName" className="text-xs font-medium text-slate-300">
                    Target App Service Name
                  </Label>
                  <Input
                    {...register('appServiceName')}
                    id="appServiceName"
                    placeholder="e.g. prod-api-west"
                    className="bg-slate-950 border-slate-800 focus:border-cyan-500 text-slate-100 placeholder:text-slate-600 rounded-lg text-sm h-10"
                    required
                  />
                  {errors.appServiceName && (
                    <p className="text-xs text-rose-400">{errors.appServiceName.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 2: AZURE SCOPE */}
            <div className="space-y-4 pt-2 border-t border-slate-800/80">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Cloud className="w-3.5 h-3.5 text-blue-400" /> Azure Subscription & Group
              </h3>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-300">
                    Azure Subscription
                  </Label>
                  <Controller
                    name="subscriptionId"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200 h-10 rounded-lg text-xs font-mono">
                          <SelectValue placeholder="Select Subscription" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                          {subscriptions.length > 0 ? (
                            subscriptions.map((sub) => (
                              <SelectItem key={sub} value={sub} className="text-xs font-mono">
                                {sub}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="manual" disabled className="text-xs">
                              No Subscriptions Synced
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.subscriptionId && (
                    <p className="text-xs text-rose-400">{errors.subscriptionId.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resourceGroup" className="text-xs font-medium text-slate-300">
                    Resource Group
                  </Label>
                  <Input
                    {...register('resourceGroup')}
                    id="resourceGroup"
                    placeholder="e.g. rg-production-india"
                    className="bg-slate-950 border-slate-800 focus:border-cyan-500 text-slate-100 placeholder:text-slate-600 rounded-lg text-sm h-10"
                    required
                  />
                  {errors.resourceGroup && (
                    <p className="text-xs text-rose-400">{errors.resourceGroup.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 3: FINOPS GUARDRAILS */}
            <div className="space-y-4 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> FinOps Budget & Circuit Breaker
                </h3>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-2 py-0.5 rounded">
                  Two-Tier FinOps
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget" className="text-xs font-medium text-slate-300">
                    Soft Alert Budget (₹ INR)
                  </Label>
                  <Input
                    type="number"
                    {...register('budget', { valueAsNumber: true })}
                    id="budget"
                    defaultValue={500}
                    placeholder="500"
                    className="bg-slate-950 border-slate-800 focus:border-cyan-500 text-slate-100 placeholder:text-slate-600 rounded-lg text-sm h-10 font-mono"
                    required
                  />
                  <p className="text-[11px] text-slate-500">
                    Triggers email & dashboard alert without taking down the service.
                  </p>
                  {errors.budget && (
                    <p className="text-xs text-rose-400">{errors.budget.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost" className="text-xs font-medium text-slate-300">
                    Initial Baseline Spend (₹ INR)
                  </Label>
                  <Input
                    type="number"
                    {...register('cost', { valueAsNumber: true })}
                    id="cost"
                    defaultValue={0}
                    placeholder="0"
                    className="bg-slate-950 border-slate-800 focus:border-cyan-500 text-slate-100 placeholder:text-slate-600 rounded-lg text-sm h-10 font-mono"
                  />
                  <p className="text-[11px] text-slate-500">
                    Current spend tracker initialized to 0.
                  </p>
                </div>
              </div>

              {/* Auto-Stop Circuit Breaker Toggle */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 hover:border-slate-700 transition-colors">
                <Controller
                  name="autoStop"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-cyan-400" />
                          <Label htmlFor="autoStop" className="text-sm font-semibold text-slate-200 cursor-pointer">
                            Enable FinOps Circuit Breaker (Auto-Shutdown)
                          </Label>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          When spend approaches or hits your hard threshold, Azora will autonomously stop the Azure App Service container to protect against runaway billing.
                        </p>
                      </div>
                      <Checkbox
                        id="autoStop"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-1 border-slate-700 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                      />
                    </div>
                  )}
                />
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-4 flex items-center justify-between gap-4">
              <Link href="/dashboard" className="w-1/3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-slate-800 hover:bg-slate-800/60 text-slate-300 text-sm h-11"
                >
                  Cancel
                </Button>
              </Link>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-2/3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm h-11 shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Provisioning Workload...</span>
                  </>
                ) : (
                  <>
                    <span>Register Workload</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
