import mongoose, { Schema, InferSchemaType, model } from "mongoose"


const AppSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    subscriptionId: { type: String, required: true },
    resourceGroup: { type: String, required: true },
    appServiceName: { type: String, required: true },
    budget: { type: Number, required: true },
    currentCost: { type: Number, default: 0 },
    status: {
      type: Boolean,
      default: false,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

export type AppType = InferSchemaType<typeof AppSchema>

export const App = mongoose.models.App || model("App", AppSchema)
