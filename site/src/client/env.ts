import { z } from "zod";

const envSchema = z.object({
  // Auth0
  VITE_AUTH0_DOMAIN: z.string(),
  VITE_AUTH0_CLIENT_ID: z.string(),
  VITE_AUTH0_CLIENT_SECRET: z.string(),
  VITE_AUTH0_AUDIENCE: z.string(),
  
  VITE_STRIPE_PUBLISHABLE_KEY: z.string(),
});

console.log('Client Environment Variables:', import.meta.env);
export const env = envSchema.parse(import.meta.env);
