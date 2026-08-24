import { endpoint } from "./_lib/handler.js";
import { publicReadiness } from "./_lib/env.js";

export default endpoint({
  methods: ["GET"], scope: "health", limit: 120, windowSeconds: 60,
  handler: async () => ({
    data: {
      service: "proofpay-api",
      status: "ok",
      timestamp: new Date().toISOString(),
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || "development",
      configuration: publicReadiness(),
    },
  }),
});
