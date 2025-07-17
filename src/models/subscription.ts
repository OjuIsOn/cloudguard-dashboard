
import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subscriptionId: { type: String, required: true },
    displayName: { type: String, required: true },
    tenantId: { type: String, required: true },
  },
  { timestamps: true }
);

export const Subscription = mongoose.models.Subscription || mongoose.model("Subscription", subscriptionSchema);
