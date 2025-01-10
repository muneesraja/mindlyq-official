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

export type EnvConfig = z.infer<typeof envSchema>;

class EnvClass {
  static readonly TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? "";
  static readonly TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";
  static readonly TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER ?? "";
  static readonly GOOGLE_GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY ?? "";
  static readonly DATABASE_URL = process.env.DATABASE_URL ?? "";
  static readonly API_URL = process.env.API_URL ?? "";
}

export const Env = EnvClass;

export function validateEnv(): EnvConfig {
  if (!process.env.TWILIO_ACCOUNT_SID) throw new Error("TWILIO_ACCOUNT_SID is required");
  if (!process.env.TWILIO_AUTH_TOKEN) throw new Error("TWILIO_AUTH_TOKEN is required");
  if (!process.env.TWILIO_PHONE_NUMBER) throw new Error("TWILIO_PHONE_NUMBER is required");
  if (!process.env.GOOGLE_GEMINI_API_KEY) throw new Error("GOOGLE_GEMINI_API_KEY is required");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  if (!process.env.API_URL) throw new Error("API_URL is required");

  const env = {
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
    GOOGLE_GEMINI_API_KEY: process.env.GOOGLE_GEMINI_API_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    API_URL: process.env.API_URL,
  };

  try {
    return envSchema.parse(env);
  } catch (error) {
    console.error("❌ Invalid environment variables:", error);
    throw new Error("Invalid environment variables");
  }
}
