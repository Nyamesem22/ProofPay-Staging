import { endpoint } from "../_lib/handler.js";
import { authenticate, requireRole } from "../_lib/auth.js";
import { adminOverview } from "../_lib/repository.js";
import { cacheGet, cacheSet } from "../_lib/cache.js";

export default endpoint({
  methods: ["GET"], scope: "admin-overview", limit: 120, windowSeconds: 60,
  handler: async req => {
    const { user } = await authenticate(req);
    requireRole(user, "staff", "admin", "auditor");
    const cached = await cacheGet("admin-overview");
    if (cached) return { data: { ...cached, cache: "hit" } };
    const overview = await adminOverview();
    await cacheSet("admin-overview", overview, 10);
    return { data: { ...overview, cache: "miss" } };
  },
});
