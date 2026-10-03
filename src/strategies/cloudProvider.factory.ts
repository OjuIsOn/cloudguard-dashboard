import { AzureStrategy } from "./azure.strategy";
import { CloudProvider } from "./cloudProvider.interface";

export type ProviderType = "AZURE" | "AWS";

export class CloudProviderFactory {
  static getProvider(type: ProviderType, credentials: { accessToken: string }): CloudProvider {
    switch (type) {
      case "AZURE":
        return new AzureStrategy(credentials.accessToken);
      case "AWS":
        throw new Error("AWS Strategy not implemented yet. Ready for expansion!");
      default:
        throw new Error(`Unsupported cloud provider: ${type}`);
    }
  }
}
