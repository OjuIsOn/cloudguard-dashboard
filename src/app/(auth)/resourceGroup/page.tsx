'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Cloud, Layers, Plus, Globe, ArrowRight, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const resourceGroupSchema = z.object({
  location: z.string().min(1, 'Location is required'),
  resourceGroup: z.string().min(1, 'Resource name is required'),
});

type ResourceGroupForm = z.infer<typeof resourceGroupSchema>;

export default function ResourceGroupPage() {
  const [existingNames, setExistingNames] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<ResourceGroupForm>({
    resolver: zodResolver(resourceGroupSchema),
    defaultValues: {
      location: 'indiasouthcentral',
    },
  });

  const resourceName = watch('resourceGroup');

  useEffect(() => {
    if (resourceName && existingNames.includes(resourceName)) {
      setError('resourceGroup', {
        message: 'Resource group name already exists',
      });
    } else {
      clearErrors('resourceGroup');
    }
  }, [resourceName, existingNames, setError, clearErrors]);

  useEffect(() => {
    fetch('/api/resourceGroup')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.resourceGroups)) {
          setExistingNames(data.resourceGroups);
        }
      })
      .catch(() => {
        toast.error('Failed to fetch existing resource groups');
      });
  }, []);

  const onSubmit = async (data: ResourceGroupForm) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/resourceGroup', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const json = await res.json();

      if (json.success) {
        toast.success(`Resource Group "${data.resourceGroup}" created successfully on Azure!`);
        router.push('/dashboard');
      } else {
        toast.error(json.error || json.message || 'Failed to create resource group');
      }
    } catch {
      toast.error('Something went wrong creating resource group');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <Cloud className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">Create Azure Resource Group</h3>
          <p className="text-xs text-slate-400">
            Provision a logical boundary for workloads, budgets, and access control
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-mono uppercase tracking-wider text-slate-300">
            Resource Group Name
          </label>
          <Input
            {...register('resourceGroup')}
            placeholder="e.g. rg-production-india"
            className="bg-slate-950 border-slate-800 focus:border-cyan-500 text-slate-100 placeholder:text-slate-600 rounded-lg text-sm h-10 font-mono"
          />
          {errors.resourceGroup && (
            <p className="text-xs text-rose-400 font-mono">{errors.resourceGroup.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            Azure Region Location
          </label>
          <select
            {...register('location')}
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg p-2.5 text-slate-200 text-xs font-mono outline-none transition-all"
          >
            <option value="indiasouthcentral">South Central India (indiasouthcentral)</option>
            <option value="centralindia">Central India (centralindia)</option>
            <option value="southindia">South India (southindia)</option>
            <option value="eastus">East US (eastus)</option>
            <option value="westus">West US (westus)</option>
            <option value="westeurope">West Europe (westeurope)</option>
            <option value="southeastasia">Southeast Asia (southeastasia)</option>
          </select>
          {errors.location && (
            <p className="text-xs text-rose-400 font-mono">{errors.location.message}</p>
          )}
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs h-10 shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                <span>Creating on Azure...</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Create Resource Group</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
