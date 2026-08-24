import { endpoint } from "../../_lib/handler.js";
import { authenticate } from "../../_lib/auth.js";
import { findTransactionForUser, releaseDemoTransaction, writeAudit } from "../../_lib/repository.js";
import { conflict, notFound, unavailable } from "../../_lib/errors.js";

export default endpoint({
  methods: ["POST"], scope: "transaction-release", limit: 10, windowSeconds: 60,
  handler: async (req, _res, { requestId }) => {
    const { user } = await authenticate(req);
    const existing = await findTransactionForUser(req.query.id, user.id);
    if (!existing) throw notFound("Transaction not found.");
    if (existing.status === "DISPUTED") throw conflict("This payment is frozen because a dispute is open.");
    if (!existing.is_demo) throw unavailable("Live release requires a licensed payment provider and safeguarded-account connection.");
    const transaction = await releaseDemoTransaction(existing.id, user.id);
    if (!transaction) throw conflict("This demo transaction is not eligible for release.");
    await writeAudit({ requestId, actorUserId: user.id, action: "transaction.release", entityType: "transaction", entityId: transaction.id, result: "success", metadata: { demo: true } });
    return { data: { transaction } };
  },
});
