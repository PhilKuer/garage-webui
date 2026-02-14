import { z } from "zod";

export const createAdminTokenSchema = z.object({
  name: z
    .string()
    .min(1, "Token name is required"),
  expiration: z.string().optional(),
  scope: z.string().optional(),
});

export type CreateAdminTokenSchema = z.infer<typeof createAdminTokenSchema>;
