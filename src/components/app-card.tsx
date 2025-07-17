import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface AppCardProps {
  app: {
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
  };
}

export function AppCard({ app }: AppCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{app.name}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-1">
        <p>💰 Budget: ₹{app.budget}</p>
        <p>🔧 App Service: {app.appServiceName}</p>
        <p>📦 Resource Group: {app.resourceGroup}</p>
        <p>🧾 Subscription: {app.subscriptionId}</p>
      </CardContent>
    </Card>
  );
}
