import { endpoint } from "../../_lib/handler.js";
import { authenticate } from "../../_lib/auth.js";
import { readJson } from "../../_lib/http.js";
import { parse, disputeSchema } from "../../_lib/validation.js";
import { findTransactionForUser, openDisputeRecord, writeAudit } from "../../_lib/repository.js";
import { conflict, notFound } from "../../_lib/errors.js";

export default endpoint({
  methods: ["POST"], scope: "transaction-dispute", limit: 5, windowSeconds: 300,
  handler: async (req, _res, { requestId }) => {
    const { user } = await authenticate(req);
    const transaction = await findTransactionForUser(req.query.id, user.id);
    if (!transaction) throw notFound("Transaction not found.");
    if (["RELEASED", "REFUNDED", "CANCELLED"].includes(transaction.status)) throw conflict("A completed transaction cannot be disputed through this route.");
    const input = parse(disputeSchema, readJson(req));
    const dispute = await openDisputeRecord(transaction, user.id, input);
    await writeAudit({ requestId, actorUserId: user.id, action: "dispute.open", entityType: "dispute", entityId: dispute.id, result: "success", metadata: { transactionId: transaction.id } });
    return { status: 201, data: { dispute } };
  },
});
