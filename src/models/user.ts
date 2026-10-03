import mongoose, { Schema } from "mongoose"
import { string } from "zod"

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name:{type:String,required:true},

  azureTokens: {
    encryptedData: { type: String },
    iv: { type: String },
    authTag: { type: String },
    expiresAt: { type: Date },
    tenantId: { type: String },
  },

  isDevOps: { type: Boolean, default: false },

},{timestamps:true})

export const User = mongoose.models.User || mongoose.model("User", UserSchema)
