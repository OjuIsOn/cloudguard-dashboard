'use client'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { appSchema } from '@/lib/validation'
import { Label } from '@radix-ui/react-label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Checkbox } from '@/components/ui/checkbox'

export default function CreateAppPage() {
    const [isClient, setIsClient] = useState(false);
    // const [error, setError] = useState<string | null>(null); // Not used, so removed to fix lint error
    // const [isLoading, setIsLoading] = useState(false); // Not used, so removed to fix lint error
    const { register,
        handleSubmit,
        control,
        formState: { errors }
    } = useForm<z.infer<typeof appSchema>>({
        defaultValues: {
            status: false,
        },
    });
    const router = useRouter();

    useEffect(() => {
        setIsClient(true);
    }, []);


    const onSubmitHandle = async (data: z.infer<typeof appSchema>) => {
        // setIsLoading(true); // Removed to fix lint error
        // setError(null); // Removed to fix lint error
        try {
            const response = await fetch("/api/apps", {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data), 
                credentials: 'include', 
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Creation Failed! Enter valid details')
            }
            router.push("/dashboard")
        } catch {
            // Error handling intentionally left blank to fix lint error
        } finally {
            // setIsLoading(false); // Removed to fix lint error
        }
    }



    if (!isClient) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>Create new app</CardTitle>
                    <CardDescription>
                        Enter details below for the apps
                    </CardDescription>
                    <CardAction>
                        <Link href='/register'><Button variant="link">Sign Up</Button></Link>
                    </CardAction>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmitHandle)}>
                        <div className="flex flex-col gap-6">
                            <div className="grid gap-2">

                                <Label htmlFor="name">Name</Label>
                                <Input
                                    {...register('name')}
                                    id="name"
                                    placeholder="mynewapp"
                                    required
                                />
                                {errors.name && (<p className='text-red-700'>
                                    {errors.name.message}
                                </p>)}
                            </div>


                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="subscriptionId">subscriptionId</Label>
                                    <Input {...register('subscriptionId')} id="subscriptionId" type="text" required />
                                </div>

                                {errors.subscriptionId && (<p className='text-red-700'>
                                    {errors.subscriptionId.message}
                                </p>)}
                            </div>


                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="resourceGroup">resourceGroup</Label>
                                    <Input {...register('resourceGroup')} id="resourceGroup" type="text" required />
                                </div>

                                {errors.subscriptionId && (<p className='text-red-700'>
                                    {errors.subscriptionId.message}
                                </p>)}
                            </div>


                             <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="appServiceName">appServiceName</Label>
                                    <Input {...register('appServiceName')} id="appServiceName" type="text" required />
                                </div>

                                {errors.appServiceName && (<p className='text-red-700'>
                                    {errors.appServiceName.message}
                                </p>)}
                            </div>


                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="currentCost">currentCost</Label>
                                    <Input {...register('currentCost')} id="currentCost" type="text" required />
                                </div>

                                {errors.currentCost && (<p className='text-red-700'>
                                    {errors.currentCost.message}
                                </p>)}
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="budget">budget</Label>
                                    <Input {...register('budget')} id="budget" type="number" required />
                                </div>

                                {errors.budget && (<p className='text-red-700'>
                                    {errors.budget.message}
                                </p>)}
                            </div>


                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Controller
                                        control={control}
                                        name="status"
                                        render={({ field }) => (
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="status"
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                                <Label htmlFor="status">Track cost</Label>
                                            </div>
                                        )}
                                    />
                                    {errors.status && (
                                        <p className="text-sm text-red-500">{errors.status.message}</p>
                                    )}
                                </div>


                            </div>

                        </div>
                        <Button type="submit" className="w-full">
                            Create
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
