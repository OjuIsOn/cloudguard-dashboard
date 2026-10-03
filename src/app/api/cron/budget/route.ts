import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/dist/nextjs";
import { resourceGroupRepository } from "@/repositories/resourceGroup.repository";
import { userRepository } from "@/repositories/user.repository";
import { CloudProviderFactory } from "@/strategies/cloudProvider.factory";
import { decrypt } from "@/utils/encryption";
import { connectDB } from "@/lib/db";

async function handler() {
  try {
    await connectDB();
    
    // Fetch all monitored resource groups
    const resourceGroups = await resourceGroupRepository.model.find({ autoStop: true });
    let stoppedCount = 0;

    for (const rg of resourceGroups) {
      if (!rg.budget || rg.budget <= 0) continue;

      const user = await userRepository.findById(rg.userId);
      if (!user || !user.azureTokens) continue;

      try {
        const accessToken = decrypt(
          user.azureTokens.encryptedData,
          user.azureTokens.iv,
          user.azureTokens.authTag
        );

        const cloudProvider = CloudProviderFactory.getProvider("AZURE", { accessToken });
        const currentCost = await cloudProvider.getCost(rg.name, rg.subscriptionId);
        
        // Update DB with current cost
        rg.cost = currentCost;
        await rg.save();

        if (currentCost >= rg.budget) {
          console.log(`[BUDGET EXCEEDED] ${rg.name} cost: ${currentCost} (Budget: ${rg.budget}). Triggering Auto-Stop...`);
          await cloudProvider.stopResources(rg.name, rg.subscriptionId);
          stoppedCount++;
        }
      } catch (err: any) {
        console.error(`Failed to process budget for RG ${rg.name}:`, err.message);
      }
    }

    return NextResponse.json({ success: true, checked: resourceGroups.length, stopped: stoppedCount });
  } catch (error: any) {
    console.error("Cron Budget Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Ensure this can only be triggered by Upstash Cron
export const POST = verifySignatureAppRouter(handler);
