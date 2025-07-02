import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AppCard({ app }: { app: any }) {
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
