// lib/azure/upsertActionGroup.ts
export async function upsertActionGroup(
  accessToken: string,
  subscriptionId: string,
  resourceGroup: string,
  webhookUri: string
): Promise<string> {
  const actionGroupName = `AzoraWebhook-${resourceGroup}`;
  const url = `https://management.azure.com/subscriptions/${subscriptionId}` +
              `/resourceGroups/${resourceGroup}` +
              `/providers/microsoft.insights/actionGroups/${actionGroupName}` +
              `?api-version=2019-06-01`;

  const body = {
    location: "Global",
    properties: {
      groupShortName: "AzoraBG",
      enabled: true,
      webhookReceivers: [
        {
          name: "AzoraBudgetWebhook",
          serviceUri: webhookUri,
          useCommonAlertSchema: true
        }
      ]
    }
  };

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data.error?.message || JSON.stringify(data);
    throw new Error(`Action Group failed (${res.status}): ${msg}`);
  }

  return data.id;
}
