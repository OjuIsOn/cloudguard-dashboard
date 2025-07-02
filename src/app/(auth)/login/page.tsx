'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { loginSchema } from '@/lib/validation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';


export default function LoginForm() {
  const [isClient, setIsClient] = useState(false);
  const { register,
    handleSubmit,
    control,
    formState: { errors }
  } = useForm<z.infer<typeof loginSchema>>();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleOnSubmit = async (data: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password }),
        credentials: "include",
      });


      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed! Invalid email or password');
      }
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'An error occurred during login');
      } else {
        setError('An error occurred during login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isClient) {
    return <div>Loading...</div>; // Or a skeleton loader
  }

  return (
    <div className='flex justify-center items-center h-screen'>
      <Card className="w-full max-w-sm">
        <CardHeader>
          {error && (<p className='text-red-600 '>
            {error}
          </p>)}
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account

          </CardDescription>
          <CardAction>
            <Link href='/register'><Button variant="link">Sign Up</Button></Link>
          </CardAction>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleOnSubmit)}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Controller
                  name="email"
                  defaultValue="m@example.com"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      required
                    />
                  )}
                />
                {errors.email && (<p className='text-red-700'>
                  {errors.email.message}
                </p>)}



              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
                <Controller
                  name="password"
                  control={control}
                  defaultValue=""
                  render={({ field }) => (
                    <Input {...field} id="password" type="password" required />
                  )}
                />
                {errors.password && (<p className='text-red-700'>
                  {errors.password.message}
                </p>)}
              </div>
            </div>
            <Button type="submit" className="w-full">
              Login
            </Button>
          </form>
        </CardContent>

      </Card>
    </div>
  );
}