import { unavailable } from "./errors.js";

export const isProduction = () => process.env.NODE_ENV === "production";

export function requireDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw unavailable("The live database is not connected. Add DATABASE_URL from Neon to enable persistent accounts and transactions.");
  }
  return process.env.DATABASE_URL;
}

export function publicReadiness() {
  return {
    database: Boolean(process.env.DATABASE_URL),
    distributedRateLimit: Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
    privateStorage: Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_OIDC_TOKEN),
    paymentProvider: process.env.PAYMENTS_ENABLED === "true",
    identityProvider: Boolean(process.env.NIA_IVSP_API_KEY),
    errorTracking: Boolean(process.env.SENTRY_DSN),
  };
}
