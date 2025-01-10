import { z } from "zod";

const envSchema = z.object({
  // Twilio Configuration
  TWILIO_ACCOUNT_SID: z.string().min(1),
  TWILIO_AUTH_TOKEN: z.string().min(1),
  TWILIO_PHONE_NUMBER: z.string().min(1),

  // Google Gemini
  GOOGLE_GEMINI_API_KEY: z.string().min(1),

  // Database Configuration
  DATABASE_URL: z.string().min(1),

  // API Configuration
  API_URL: z.string().url(),
});

export class Env {
  static readonly TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? "";
  static readonly TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";
  static readonly TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER ?? "";
  static readonly GOOGLE_GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY ?? "";
  static readonly DATABASE_URL = process.env.DATABASE_URL ?? "";
  static readonly API_URL = process.env.API_URL ?? "";
}

export function validateEnv() {
  const requiredEnvVars = [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_PHONE_NUMBER",
    "GOOGLE_GEMINI_API_KEY",
    "DATABASE_URL",
    "API_URL"
  ];

  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingEnvVars.join(", ")}`
    );
  }

  try {
    const parsed = envSchema.parse({
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
      TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
      GOOGLE_GEMINI_API_KEY: process.env.GOOGLE_GEMINI_API_KEY,
      DATABASE_URL: process.env.DATABASE_URL,
      API_URL: process.env.API_URL,
    });
    return { valid: true, env: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors };
    }
    throw error;
  }
}

export type Env = z.infer<typeof envSchema>;
