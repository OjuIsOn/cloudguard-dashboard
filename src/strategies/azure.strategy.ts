import { CloudProvider, DeployConfig } from "./cloudProvider.interface";

export class AzureStrategy implements CloudProvider {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async deployApp(zipBuffer: Buffer, config: DeployConfig): Promise<string> {
    const kuduUrl = `https://${config.appName}.scm.azurewebsites.net/api/zipdeploy?isAsync=true`;
    
    console.log(`[AzureStrategy] Deploying to ${config.appName}...`);

    const response = await fetch(kuduUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/zip",
      },
      body: zipBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure ZipDeploy failed: ${errorText}`);
    }

    // Step 2: Set startup config
    if (config.startupCommand) {
      await this.setStartupCommand(config);
    }

    return `https://${config.appName}.azurewebsites.net`;
  }

  private async setStartupCommand(config: DeployConfig) {
    const apiUrl = `https://management.azure.com/subscriptions/${config.subscriptionId}/resourceGroups/${config.resourceGroup}/providers/Microsoft.Web/sites/${config.appName}/config/web?api-version=2022-03-01`;

    const res = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          linuxFxVersion: config.runtime || "NODE|22-lts",
          appCommandLine: config.startupCommand,
        },
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to update Azure startup config.");
    }
  }

  async getCost(resourceGroup: string, subscriptionId: string): Promise<number> {
    const apiUrl = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.CostManagement/query?api-version=2023-03-01`;
    
    console.log(`[AzureStrategy] Fetching cost for ${resourceGroup}...`);

    // We use a mock-like structure for now, but this is the real endpoint
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "Usage",
        timeframe: "MonthToDate",
        dataset: {
          granularity: "None",
          aggregation: {
            totalCost: { name: "PreTaxCost", function: "Sum" }
          }
        }
      }),
    });

    if (!res.ok) return 0; // Return 0 if we can't fetch cost (or throw error)
    
    const data = await res.json();
    const rows = data?.properties?.rows || [];
    if (rows.length > 0 && rows[0].length > 0) {
      return rows[0][0]; // Azure usually returns the sum in the first column of the first row
    }
    
    return 0;
  }

  async stopResources(resourceGroup: string, subscriptionId: string): Promise<void> {
    // List all web apps in the resource group
    const listAppsUrl = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites?api-version=2022-03-01`;
    
    console.log(`[AzureStrategy] Stopping all apps in ${resourceGroup}...`);

    const res = await fetch(listAppsUrl, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });

    if (!res.ok) throw new Error("Failed to list apps for auto-stopping");
    const data = await res.json();

    // Iterate and STOP each app
    for (const app of data.value) {
      const stopUrl = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${app.name}/stop?api-version=2022-03-01`;
      await fetch(stopUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.accessToken}` }
      });
      console.log(`[AzureStrategy] Stopped app: ${app.name}`);
    }
  }

  async deleteApp(appName: string, resourceGroup: string, subscriptionId: string): Promise<void> {
    const url = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${appName}?api-version=2022-03-01`;
    console.log(`[AzureStrategy] Deleting app: ${appName}...`);

    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to delete Azure App ${appName}: ${errorText}`);
    }
  }

  async deleteResourceGroup(resourceGroup: string, subscriptionId: string): Promise<void> {
    const url = `https://management.azure.com/subscriptions/${subscriptionId}/resourcegroups/${resourceGroup}?api-version=2021-04-01`;
    console.log(`[AzureStrategy] Deleting Resource Group: ${resourceGroup}...`);

    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to delete Resource Group ${resourceGroup}: ${errorText}`);
    }
  }

  async createResourceGroup(resourceGroup: string, location: string, subscriptionId: string): Promise<void> {
    const url = `https://management.azure.com/subscriptions/${subscriptionId}/resourcegroups/${resourceGroup}?api-version=2021-04-01`;
    console.log(`[AzureStrategy] Creating Resource Group: ${resourceGroup} in ${location}...`);

    const res = await fetch(url, {
      method: "PUT",
      headers: { 
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ location })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to create Resource Group ${resourceGroup}: ${errorText}`);
    }
  }

  async listResources(resourceGroup: string, subscriptionId: string): Promise<any[]> {
    const url = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/resources?api-version=2021-04-01`;
    console.log(`[AzureStrategy] Listing resources for ${resourceGroup}...`);

    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });

    if (!res.ok) {
      console.error(`Failed to list resources for ${resourceGroup}`);
      return [];
    }
    const data = await res.json();
    return data.value || [];
  }

  async listResourceGroups(subscriptionId: string): Promise<any[]> {
    const url = `https://management.azure.com/subscriptions/${subscriptionId}/resourcegroups?api-version=2021-04-01`;
    console.log(`[AzureStrategy] Listing resource groups...`);

    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });

    if (!res.ok) {
      console.error(`Failed to list resource groups`);
      return [];
    }
    const data = await res.json();
    return data.value || [];
  }
}
