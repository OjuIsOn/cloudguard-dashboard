import { z } from "zod"
export const registerSchema = z.object({
  name: z.string(),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),

  clientId: z.string(),
  clientSecret: z.string(),
  tenantId: z.string()

})

export const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
})
export const appSchema = z.object({
  name: z.string().min(1, "App name is required"),
  subscriptionId: z.string().min(1, "Subscription ID is required"),
  resourceGroup: z.string().min(1, "Resource group is required"),
  appServiceName: z.string().min(1, "App service name is required"),
  AppName: z.string().optional(),
  cost: z.number().nonnegative().optional(), // default: 0
  budget: z.number().positive("Budget must be a positive number"),
  autoStop: z.boolean().optional(),          
  lastSynced: z.date().optional(),           // ISO date
  isDraft: z.boolean().optional(),           // default: true
});

export const resourceGroupSchema = z.object({
  name: z.string().min(1, "Resource group name is required"),
  subscriptionId: z.string().min(1, "Subscription ID is required"),
  location: z.string().optional(), // Optional, depending on Azure sync
  cost: z.number().nonnegative().optional(), // default: 0
  budget: z.number().positive("Budget must be a positive number"),
  autoStop: z.boolean().optional(),          // default: false
});


export const subscriptionSchema = z.object({
  subscriptionId: z.string().min(1, "Subscription ID is required"),
  displayName: z.string().min(1, "Display name is required"),
  tenantId: z.string().min(1, "Tenant ID is required"),
});


export type AppInput = z.infer<typeof appSchema>

