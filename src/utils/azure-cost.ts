import { App } from "@/models/app";

type CostQueryResponse = {
  properties: {
    rows: any[][];
  };
};

export async function getCostEstimate(
  _id:string,
  subscriptionId: string,
  resourceGroup: string,
  AppName: string,
  accessToken: string
): Promise<number> {
  const url = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/query?api-version=2023-03-01`;

  const body = 
    {
  "type": "ActualCost",
  "timeframe": "MonthToDate",
  "dataset": {
    "granularity": "None",
    "aggregation": {
      "totalCost": {
        "name": "PreTaxCost",
        "function": "Sum"
      }
    },
    "filter": {
      "dimensions": {
        "name": "ResourceId",
        "operator": "In",
        "values": [
          "/subscriptions/abc123/resourceGroups/my-rg/providers/Microsoft.Web/sites/my-app"
        ]
      }
    }
  }
};


const response = await fetchWithRetry(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`, 
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

if (!response.ok) {
  const err = await response.json().catch(() => ({}));
  console.error("Failed to fetch cost estimate:", err);
  throw new Error("Cost estimate API failed");
}

const result: CostQueryResponse = await response.json();

const cost =
  result.properties?.rows?.length && result.properties.rows[0]?.length
    ? Number(result.properties.rows[0][0])
    : 0;

  const app=await App.findByIdAndUpdate({_id},{
    cost:cost
  })

return cost;
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 1, delay = 1000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, options);
    if (response.status !== 429) return response;

    const retryAfter = response.headers.get("Retry-After");
    const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delay * (2 ** i);
    console.warn(`429 received. Retrying after ${waitTime} ms...`);
    await new Promise(res => setTimeout(res, waitTime));
  }
  throw new Error("Too many retries (429 rate limited)");
}
