import { z } from "zod";

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

  // Twilio
  TWILIO_ACCOUNT_SID: z.string().min(1),
  TWILIO_AUTH_TOKEN: z.string().min(1),
  TWILIO_PHONE_NUMBER: z.string().min(1),

  // OpenAI
  OPENAI_API_KEY: z.string().min(1),

  // API Configuration
  API_URL: z.string().url(),
});

export function validateEnv() {
  try {
    const parsed = envSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
      TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      API_URL: process.env.API_URL,
    });
    return { valid: true, env: parsed };
  } catch (error) {
    console.error("❌ Invalid environment variables:", error);
    return { valid: false, error };
  }
}

export type Env = z.infer<typeof envSchema>;
