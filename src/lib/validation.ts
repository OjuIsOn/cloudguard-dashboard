import { z } from "zod"
export const registerSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
})

export const appSchema = z.object({
  name: z.string().min(1, "App name is required"),
  subscriptionId: z.string().min(1, "Subscription ID is required"),
  resourceGroup: z.string().min(1, "Resource group is required"),
  appServiceName: z.string().min(1, "App service name is required"),
  budget: z.number().positive("Budget must be a positive number"),
  currentCost:z.number().positive("Current cost should be postive").optional(),
  status: z.boolean().optional()
})


export type AppInput = z.infer<typeof appSchema>

export const loginSchema = registerSchema // same shape
