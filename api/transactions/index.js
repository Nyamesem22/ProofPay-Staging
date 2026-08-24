import { endpoint } from "../_lib/handler.js";
import { authenticate } from "../_lib/auth.js";
import { readJson } from "../_lib/http.js";
import { parse, transactionSchema } from "../_lib/validation.js";
import { createTransactionRecord, listTransactionsForUser, writeAudit } from "../_lib/repository.js";
import { unavailable } from "../_lib/errors.js";

export default endpoint({
  methods: ["GET", "POST"], scope: "transactions", limit: 60, windowSeconds: 60,
  handler: async (req, _res, { requestId }) => {
    const { user } = await authenticate(req);
    if (req.method === "GET") return { data: { transactions: await listTransactionsForUser(user.id) } };
    const input = parse(transactionSchema, readJson(req));
    if (!input.demoMode && process.env.PAYMENTS_ENABLED !== "true") throw unavailable("Live payment collection is disabled until a licensed payment partner is connected.");
    const transaction = await createTransactionRecord(user, input);
    await writeAudit({ requestId, actorUserId: user.id, action: "transaction.create", entityType: "transaction", entityId: transaction.id, result: "success", metadata: { reference: transaction.reference, demo: input.demoMode } });
    return { status: 201, data: { transaction } };
  },
});
