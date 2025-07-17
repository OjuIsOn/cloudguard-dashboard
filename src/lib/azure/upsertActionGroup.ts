//  ▷ Create or update the Action Group to send an email
export async function upsertEmailActionGroup(
  accessToken: string,
  subscriptionId: string,
  resourceGroup: string,
  actionGroupName: string,
  email: string
): Promise<string> {
  const url =
    `https://management.azure.com/subscriptions/${subscriptionId}` +
    `/resourceGroups/${resourceGroup}` +
    `/providers/microsoft.insights/actionGroups/${actionGroupName}` +
    `?api-version=2021-09-01`;

  const payload = {
    location: "global",
    properties: {
      groupShortName: actionGroupName.slice(0, 12),
      enabled: true,
      emailReceivers: [
        {
          name: "BudgetOps",
          emailAddress: email
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
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Email Action Group failed (${res.status}): ${data.error?.message}`);
  }

  return data.id; 
}
