export interface DeployConfig {
  appName: string;
  resourceGroup: string;
  subscriptionId: string;
  runtime?: string;
  startupCommand?: string;
}

export interface CloudProvider {
  /**
   * Deploys a zipped application to the cloud provider.
   * Returns the hosted URL or a deployment status message.
   */
  deployApp(zipBuffer: Buffer, config: DeployConfig): Promise<string>;

  /**
   * Fetches the current consumed cost of a specific resource group.
   */
  getCost(resourceGroup: string, subscriptionId: string): Promise<number>;

  /**
   * Stops all billing-incurring resources within a resource group.
   */
  stopResources(resourceGroup: string, subscriptionId: string): Promise<void>;

  /**
   * Deletes a specific app from the cloud provider.
   */
  deleteApp(appName: string, resourceGroup: string, subscriptionId: string): Promise<void>;

  /**
   * Deletes an entire resource group and all its contents.
   */
  deleteResourceGroup(resourceGroup: string, subscriptionId: string): Promise<void>;

  /**
   * Creates a new resource group.
   */
  createResourceGroup(resourceGroup: string, location: string, subscriptionId: string): Promise<void>;

  /**
   * Lists all resources (apps, databases, storage, etc) inside a resource group.
   */
  listResources(resourceGroup: string, subscriptionId: string): Promise<any[]>;

  /**
   * Lists all resource groups in the subscription.
   */
  listResourceGroups(subscriptionId: string): Promise<any[]>;
}
