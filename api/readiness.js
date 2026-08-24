import { endpoint } from "./_lib/handler.js";
import { db } from "./_lib/db.js";
import { publicReadiness } from "./_lib/env.js";

export default endpoint({
  methods: ["GET"], scope: "readiness", limit: 30, windowSeconds: 60,
  handler: async () => {
    const configuration = publicReadiness();
    if (!configuration.database) return { status: 503, data: { ready: false, reason: "DATABASE_URL is not configured.", configuration } };
    const sql = db();
    await sql`SELECT 1 AS ready`;
    return { data: { ready: true, configuration } };
  },
});
