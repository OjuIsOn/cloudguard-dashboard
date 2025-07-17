import { App } from "@/models/app";

export async function stopAzureApp({
  AppName,
  resourceGroup,
  subscriptionId,
  accessToken,
}: {
  AppName: string;
  resourceGroup: string;
  subscriptionId: string;
  accessToken: string;
}) {
  if (!AppName || !resourceGroup || !subscriptionId || !accessToken) {
    throw new Error("Missing fields");
  }

  const url = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${AppName}/stop?api-version=2022-03-01`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    return { success: false, error: err };
  }

  return { success: true };
}



export async function deleteAzureApp({

  _id,
  AppName,
  resourceGroup,
  subscriptionId,
  accessToken,
}: {
  _id:string;
  AppName: string;
  resourceGroup: string;
  subscriptionId: string;
  accessToken: string;
}) {
  if (!AppName || !resourceGroup || !subscriptionId || !accessToken) {
    throw new Error("Missing required fields");
  }

  const url = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${AppName}?api-version=2022-03-01`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    return { success: false, error: err };
  }

  const deletion=await App.findByIdAndDelete(_id);
  return { success: true };
}


export async function restartAzureApp({
  AppName,
  resourceGroup,
  subscriptionId,
  accessToken,
}: {
  AppName: string;
  resourceGroup: string;
  subscriptionId: string;
  accessToken: string;
}){
  if (!AppName || !resourceGroup || !subscriptionId || !accessToken) {
    throw new Error("Missing required fields");
  }

  const baseUrl = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${AppName}`;
  const apiVersion = "2022-03-01";

  // 1. Get current app state
  const statusResponse = await fetch(`${baseUrl}?api-version=${apiVersion}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!statusResponse.ok) {
    const err = await statusResponse.json().catch(() => ({}));
    return { success: false, error: err, message: "Failed to fetch app status" };
  }

  const statusData = await statusResponse.json();
  const currentState = statusData.properties?.state;

  // 2. Decide endpoint based on state
  let endpoint = "";
  if (currentState === "Stopped") {
    endpoint = "start"; // Start the app if it's stopped
  } else if (currentState === "Running") {
    endpoint = "restart"; // Restart if it's already running
  } else {
    return { success: false, message: `Unhandled app state: ${currentState}` };
  }

  // 3. Perform the operation
  const operationResponse = await fetch(`${baseUrl}/${endpoint}?api-version=${apiVersion}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!operationResponse.ok) {
    const err = await operationResponse.json().catch(() => ({}));
    return { success: false, error: err, message: `Failed to ${endpoint} app` };
  }

  return { success: true, message: `App ${endpoint}ed successfully` };
}