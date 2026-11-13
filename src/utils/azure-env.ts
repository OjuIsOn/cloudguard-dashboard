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
  settings: Record<string, any>;
}) {
  if (!appName || !resourceGroup || !subscriptionId) {
    return { success: false, error: "Missing required app details to update settings" };
  }

  // Sanitize all values into strings (Azure requires string values)
  const sanitizedNewSettings: Record<string, string> = {};
  for (const [key, val] of Object.entries(settings)) {
    if (val !== undefined && val !== null) {
      sanitizedNewSettings[key] = String(val);
    }
  }

  // 1. Fetch current settings from Azure so we don't wipe out system flags like SCM_DO_BUILD_DURING_DEPLOYMENT
  let existingProperties: Record<string, string> = {};
  try {
    const listUrl = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${appName}/config/appsettings/list?api-version=2022-03-01`;
    const listRes = await fetch(listUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (listRes.ok) {
      const listData = await listRes.json();
      existingProperties = listData.properties || {};
    }
  } catch (e) {
    console.warn("Could not list existing Azure app settings, proceeding with update", e);
  }

  const mergedProperties = { ...existingProperties, ...sanitizedNewSettings };

  const url = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${appName}/config/appsettings?api-version=2022-03-01`;

  const body = {
    properties: mergedProperties,
  };

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
