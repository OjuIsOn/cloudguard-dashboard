export async function updateAppSettings({
  appName,
  resourceGroup,
  subscriptionId,
  accessToken,
  settings,
}: {
  appName: string;
  resourceGroup: string;
  subscriptionId: string;
  accessToken: string;
  settings: Record<string, string>;
}) {
  const url = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${appName}/config/appsettings?api-version=2022-03-01`;

  const body = {
    properties: settings,
  };

  console.log("Asdfsadf")
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { success: false, error: err };
  }

  return { success: true };
}
