'use client'
import { useEffect, useState } from "react";
import { AppCard } from "@/components/app-card"; // we'll make this
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Dashboard() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/apps")
      .then(res => res.json())
      .then(data => {
        setApps(data.data || []);
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="p-4">Loading apps...</p>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Your Apps</h1>
        <Link href="/dashboard/create">
          <Button>Create New App</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {apps.length === 0 ? (
          <p>No apps found.</p>
        ) : (
          apps.map((app: {
            _id: string;
            name: string;
            budget: number;
            appServiceName: string;
            resourceGroup: string;
            subscriptionId: string;
          }) => <AppCard key={app._id} app={app} />)
        )}
      </div>
    </div>
  );
}
