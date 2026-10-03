import mongoose, { Schema, InferSchemaType, model } from "mongoose"
import { string } from "zod"


const AppSchema = new Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subscriptionId: { type: String, required: true },
    resourceGroup: { type: String, required: true },
    appServiceName: { type: String, required: true },

    name: { type: String, required: true },
    budget: { type: Number, required: true },
    AppName:{type: String, default:""},

    cost: { type: Number, default: 0 },
    autoStop: { type: Boolean, default: false },
    hardLimit: { type: Number, default: 0 },
    lastSynced: { type: Date },

    deployStatus: { type: String, enum: ['idle', 'queued', 'deploying', 'live', 'failed'], default: 'idle' },
    deployMessage: { type: String, default: '' },
    appType: { type: String, enum: ['react', 'nodejs', ''], default: '' },
    envVars: { type: String, default: '' },

    isDraft: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

export type AppType = InferSchemaType<typeof AppSchema>

export const App = mongoose.models.App || model("App", AppSchema)
