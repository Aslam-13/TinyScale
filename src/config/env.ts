import dotenv from "dotenv";

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  DATABASE_URL: requireEnv("DATABASE_URL"),
  JWT_SECRET: requireEnv("JWT_SECRET"),
  PORT: parseInt(process.env["PORT"] ?? "3000", 10),
  HOST: process.env["HOST"] ?? "0.0.0.0",
  NODE_ENV: process.env["NODE_ENV"] ?? "development",
} as const;
