'use client'

import { Button } from '@/components/ui/button'
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardAction,
    CardContent,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { appSchema } from '@/lib/validation'
import { Label } from '@radix-ui/react-label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import CreateResourceGroup from '../../resourceGroup/page'
import { toast } from 'sonner'

export default function CreateAppPage() {
    const [isClient, setIsClient] = useState(false)
    const [showCreateRG, setShowCreateRG] = useState(false)
    const [resourceGroups, setResourceGroups] = useState<string[]>([])
    const [subscriptions, setSubscriptions] = useState<string[]>([])

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
        },
    })

    const router = useRouter()

    useEffect(() => {
        setIsClient(true)

        const fetchSubsAndRG = async () => {
            try {
                const [subsRes, rgRes] = await Promise.all([
                    fetch('/api/subscription'),
                    fetch('/api/resourceGroup'),
                ])
                const subsData = await subsRes.json()
                const rgData = await rgRes.json()

                if (subsData.success) {
                    setSubscriptions(subsData.data.map((s: any) => s.subscriptionId))
                }

                if (rgData.success) {
                    setResourceGroups(rgData.data.map((rg: any) => rg.name))
                }
            } catch (err) {
                toast.error('Failed to fetch resources')
            }
        }

        fetchSubsAndRG()
    }, [])

    const onSubmitHandle = async (data: z.infer<typeof appSchema>) => {
        try {
            const response = await fetch('/api/apps', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
                credentials: 'include',
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.message || 'Creation Failed!')
            }

            router.push('/dashboard')
        } catch {
            toast.error('App creation failed')
        }
    }

    const handleRGCreate = (newRG: string) => {
        setResourceGroups((prev) => [...prev, newRG])
        setValue('resourceGroup', newRG)
        setShowCreateRG(false)
        toast.success('Resource group created and selected!')
    }

    if (!isClient) return <div>Loading...</div>

    return (
        <div className='flex justify-center items-center h-screen '>
            <div className='w-full max-w-md'>
                <Card className="w-full max-w-sm">
                    <CardHeader>
                        <CardTitle>Create new app</CardTitle>
                        <CardDescription>Enter details below for the app</CardDescription>
                        <CardAction>
                            <Link href="/register">
                                <Button variant="link">Sign Up</Button>
                            </Link>
                        </CardAction>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmitHandle)}>
                            <div className="flex flex-col gap-6">

                                {/* App Name */}
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input {...register('name')} id="name" placeholder="mynewapp" required />
                                    {errors.name && <p className="text-red-700">{errors.name.message}</p>}
                                </div>

                                {/* Subscription Dropdown */}
                                <div className="grid gap-2">
                                    <Label>Subscription</Label>
                                    <Controller
                                        name="subscriptionId"
                                        control={control}
                                        render={({ field }) => (
                                            <Select value={field.value} onValueChange={field.onChange}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a subscription" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {subscriptions.map((sub) => (
                                                        <SelectItem key={sub} value={sub}>
                                                            {sub}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    {errors.subscriptionId && (
                                        <p className="text-red-700">{errors.subscriptionId.message}</p>
                                    )}
                                </div>

                                {/* Resource Group Dropdown */}
                                <div className="grid gap-2">
                                    <Label>Resource Group</Label>
                                    <Controller
                                        name="resourceGroup"
                                        control={control}
                                        render={({ field }) => (
                                            <Select value={field.value} onValueChange={field.onChange}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a resource group" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {resourceGroups.map((rg) => (
                                                        <SelectItem key={rg} value={rg}>
                                                            {rg}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    {errors.resourceGroup && (
                                        <p className="text-red-700">{errors.resourceGroup.message}</p>
                                    )}
                                    <button
                                        type="button"
                                        className="text-sm text-blue-600 underline mt-1"
                                        onClick={() => setShowCreateRG(!showCreateRG)}
                                    >
                                        {showCreateRG ? 'Cancel' : 'Create new resource group'}
                                    </button>
                                </div>

                                {/* App Service Name */}
                                <div className="grid gap-2">
                                    <Label htmlFor="appServiceName">App Service Name</Label>
                                    <Input {...register('appServiceName')} id="appServiceName" required />
                                    {errors.appServiceName && (
                                        <p className="text-red-700">{errors.appServiceName.message}</p>
                                    )}
                                </div>

                                {/* Cost */}
                                <div className="grid gap-2">
                                    <Label htmlFor="cost">Cost</Label>
                                    <Input {...register('cost')} id="cost" required />
                                    {errors.cost && <p className="text-red-700">{errors.cost.message}</p>}
                                </div>

                                {/* Budget */}
                                <div className="grid gap-2">
                                    <Label htmlFor="budget">Budget</Label>
                                    <Input type="number" {...register('budget')} id="budget" required />
                                    {errors.budget && <p className="text-red-700">{errors.budget.message}</p>}
                                </div>

                                {/* Auto Stop */}
                                <div className="grid gap-2">
                                    <Controller
                                        name="autoStop"
                                        control={control}
                                        render={({ field }) => (
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="autoStop"
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                                <Label htmlFor="autoStop">Track cost</Label>
                                            </div>
                                        )}
                                    />
                                    {errors.autoStop && (
                                        <p className="text-sm text-red-500">{errors.autoStop.message}</p>
                                    )}
                                </div>

                                {/* Submit */}
                                <Button type="submit" className="w-full">
                                    Create
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

            </div>
            <div>

                {showCreateRG
                    && (
                        <Card className="w-full max-w-sm">
                            <CardHeader>
                                <CardTitle>Create new Resource group</CardTitle>
                                <CardDescription>
                                    Enter the details for creating new Resource group
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <CreateResourceGroup
                                    existingNames={resourceGroups}
                                    onCreateSuccess={handleRGCreate}
                                />
                            </CardContent>

                        </Card>
                    )}

            </div>
        </div>
    )
}
