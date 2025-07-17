// models/resourceGroup.ts
import mongoose from "mongoose";

const resourceGroupSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subscriptionId: { type: String, required: true },
    name: { type: String, required: true },
    location: { type: String },
    budget: { type: Number, required: true },
    cost: { type: Number, default: 0 },
    autoStop: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const ResourceGroup = mongoose.models.ResourceGroup || mongoose.model("ResourceGroup", resourceGroupSchema);
