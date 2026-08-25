import { endpoint } from "../_lib/handler.js";
import { authenticate, requireRole } from "../_lib/auth.js";
import { readJson } from "../_lib/http.js";
import { parse, adminActionSchema, notificationUpdateSchema } from "../_lib/validation.js";
import {
  adminOperations, listDisputesForUser, listNotifications, markNotificationsRead,
  releaseAdminDemoTransaction, updateAdminDispute, updateAdminUser, writeAudit,
} from "../_lib/repository.js";
import { badRequest, notFound } from "../_lib/errors.js";

export default endpoint({
  methods: ["GET", "PATCH"], scope: "operations", limit: 120, windowSeconds: 60,
  handler: async (req, _res, { requestId }) => {
    const action = Array.isArray(req.query?.action) ? req.query.action[0] : req.query?.action;
    const { user } = await authenticate(req);

    if (action === "notifications") {
      if (req.method === "PATCH") await markNotificationsRead(user.id, parse(notificationUpdateSchema, readJson(req)));
      return { data: await listNotifications(user.id) };
    }
    if (action === "disputes") {
      if (req.method !== "GET") throw badRequest("Disputes are read through this endpoint.");
      return { data: { disputes: await listDisputesForUser(user.id) } };
    }
    if (action === "admin-data") {
      if (req.method !== "GET") throw badRequest("Admin data is read through this endpoint.");
      requireRole(user, "staff", "admin", "auditor");
      return { data: await adminOperations() };
    }
    if (action === "admin-action") {
      if (req.method !== "PATCH") throw badRequest("Admin actions require PATCH.");
      requireRole(user, "staff", "admin");
      const input = parse(adminActionSchema, readJson(req));
      let record;
      if (input.action === "dispute.status") record = await updateAdminDispute(user.id, input.entityId, input.status, input.note);
      if (input.action === "user.status") record = await updateAdminUser(input.entityId, "status", input.status);
      if (input.action === "user.verification") record = await updateAdminUser(input.entityId, "verification", input.status);
      if (input.action === "transaction.release-demo") record = await releaseAdminDemoTransaction(input.entityId, user.id);
      if (!record) throw notFound("The record was not found or is not eligible for this action.");
      await writeAudit({ requestId, actorUserId: user.id, action: input.action, entityType: input.action.split(".")[0], entityId: input.entityId, result: "success", metadata: { status: input.status || null } });
      return { data: { record } };
    }
    throw notFound("The requested operations endpoint does not exist.");
  },
});
