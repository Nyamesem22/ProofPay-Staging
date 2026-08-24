import { endpoint } from "../_lib/handler.js";
import { authenticate, requireRole } from "../_lib/auth.js";
import { readJson } from "../_lib/http.js";
import { parse, staffReportSchema } from "../_lib/validation.js";
import { listStaffReports, upsertStaffReport, writeAudit } from "../_lib/repository.js";

export default endpoint({
  methods: ["GET", "POST"], scope: "admin-reports", limit: 60, windowSeconds: 60,
  handler: async (req, _res, { requestId }) => {
    const { user } = await authenticate(req);
    requireRole(user, "staff", "admin", "auditor");
    if (req.method === "GET") return { data: { reports: await listStaffReports() } };
    const report = await upsertStaffReport(user.id, parse(staffReportSchema, readJson(req)));
    await writeAudit({ requestId, actorUserId: user.id, action: "staff-report.upsert", entityType: "staff_report", entityId: report.id, result: "success", metadata: { status: report.status } });
    return { status: 201, data: { report } };
  },
});
