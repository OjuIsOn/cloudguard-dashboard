import mongoose, { Schema } from "mongoose"
import { string } from "zod"

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name:{type:String,required:true},

  azure: {
    accessToken: { type: String },
    refreshToken: { type: String },
    expiresAt: { type: Date },
    tenantId: { type: String },
  },

  accountCredentials:{
    clientId:{type: String , required:true},
    clientSecret:{type:String, required:true},
    tenantId:{type:String, required:true},
  },

  isDevOps: { type: Boolean, default: false },

},{timestamps:true})

export const User = mongoose.models.User || mongoose.model("User", UserSchema)
