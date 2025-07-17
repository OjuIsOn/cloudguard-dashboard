'use client'
import { useEffect, useState } from "react";
import { AppCard } from "@/components/app-card"; // we'll make this
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { error } from "console";
import { Pie } from "@visx/shape";
import dynamic from 'next/dynamic';

// Dynamic import with SSR disabled
const VisxPieChart = dynamic(() => import('@/components/pie-Chart'), {
  ssr: false,
});





interface AppData {
  _id?: string;
  userId: string;
  subscriptionId: string;
  resourceGroup: string;
  appServiceName: string;

  name: string;
  budget: number;
  AppName?: string;

  cost?: number;
  autoStop?: boolean;
  lastSynced?: string; 

  isDraft?: boolean;
  createdAt?: string; 
  updatedAt?: string; 
}



export default function Dashboard() {
  const [apps, setApps] = useState<AppData[] | []>([]);
  const [loading, setLoading] = useState(true);
  const [linked, setLinked] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const linked = searchParams.get('linked')
    if (linked == 'true') {
      toast("Your account has been successfully linked", {
        description: "Now you can deploy your apps to Azure",
      })
      setLinked(true);
      const params = new URLSearchParams(window.location.search);
      params.delete("linked");
      const newUrl = window.location.pathname + (params.toString() ? `?${params}` : "");
      router.replace(newUrl);
    }
  },[])


  const handleSync=async ()=>{
    setLoading(true);
    
    const res=await fetch('/api/auth/azure/sync',{
      method:'POST'
    }).then(res=>res.json).then(data=>{
      console.log(data);
      toast('successfully synced')
    })
    .catch(error=>console.log(error));
    setLoading(false);
    
    
  }

  useEffect(() => {
    fetch("/api/apps")
      .then(res => res.json())
      .then(data => {
        setApps(data.data || []);
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="p-4">Loading apps...</p>;


    // Group apps by resourceGroup
  const appsByGroup: { [key: string]: AppData[] } = apps.reduce((acc, app) => {
    if (!acc[app.resourceGroup]) acc[app.resourceGroup] = [];
    acc[app.resourceGroup].push(app);
    return acc;
  }, {} as { [key: string]: AppData[] });

  

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Your Apps</h1>
        <Link href="/dashboard/createApp">
          <Button>Create New App</Button>
        </Link>
        {!linked && (<a href="/api/auth/azure">
          <Button>
            Connect Azure Account
          </Button>
        </a>)}

        
        <Button onClick={handleSync}>Get Subs</Button>
       


      </div>
        
      <div className="flex">
          <VisxPieChart coins={apps}/>
      <div className="flex-1 space-y-8">
          {Object.entries(appsByGroup).map(([group, groupApps]) => (
            <div key={group} className="border rounded-lg p-4 shadow-sm">
              <Link href={`/resourceGroup/${group}`}>
                <h2 className="text-xl font-bold text-blue-600 hover:underline cursor-pointer mb-3">
                  {group}
                </h2>
              </Link>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {groupApps.map(app => {
                  const appLink = app.AppName
                    ? `/dashboard/monitor/${app._id}`
                    : app.isDraft
                      ? `/dashboard/deploy/${app._id}`
                      : `/dashboard/deploy/${app._id}/prepare`;

                  return (
                    <Link href={appLink} key={app._id}>
                      <AppCard app={app} />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

