'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from "@hookform/resolvers/zod"
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const resourceGroupSchema = z.object({
  location: z.string().min(1, "Location is required"),
  resourceGroup: z.string().min(1, "Resource name is required"),
})

type ResourceGroupForm = z.infer<typeof resourceGroupSchema>

type Props = {
  existingNames: string[]
  onCreateSuccess: (newRG: string) => void
}

export default function CreateResourceGroup({ existingNames, onCreateSuccess }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    formState: { errors }
  } = useForm<ResourceGroupForm>({
    resolver: zodResolver(resourceGroupSchema),
    defaultValues: {
      location: "eastus"
    }
  })

  const resourceName = watch("resourceGroup")

  useEffect(() => {
    if (resourceName && existingNames.includes(resourceName)) {
      setError("resourceGroup", {
        message: "Resource group name already exists"
      })
    } else {
      clearErrors("resourceGroup")
    }
  }, [resourceName, existingNames, setError, clearErrors])

  const onSubmit = async (data: ResourceGroupForm) => {
    try {
      const res = await fetch("/api/resourceGroup", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json"
        }
      })
      const json = await res.json()

      if (json.success) {
        onCreateSuccess(data.resourceGroup)
      } else {
        toast.error(json.message || "Failed to create resource group")
      }
    } catch (error) {
      toast.error("Something went wrong")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6 border p-4 rounded-md shadow">
      <h3 className="text-lg font-medium">Create Resource Group</h3>

      <div>
        <label className="block text-sm mb-1">Resource Group Name</label>
        <Input {...register("resourceGroup")} placeholder="e.g., my-rg" />
        {errors.resourceGroup && (
          <p className="text-sm text-red-500">{errors.resourceGroup.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm mb-1">Location</label>
        <select {...register("location")} className="w-full border rounded p-2">
          <option value="eastus">East US</option>
          <option value="centralindia">Central India</option>
          <option value="westus">West US</option>
          <option value="eastasia">East Asia</option>
        </select>
        {errors.location && (
          <p className="text-sm text-red-500">{errors.location.message}</p>
        )}
      </div>

      <Button type="submit">Create Resource Group</Button>
    </form>
  )
}
