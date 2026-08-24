import { endpoint } from "../_lib/handler.js";
import { authenticate } from "../_lib/auth.js";
import { findTransactionForUser } from "../_lib/repository.js";
import { notFound } from "../_lib/errors.js";

export default endpoint({
  methods: ["GET"], scope: "transaction-detail", limit: 120, windowSeconds: 60,
  handler: async req => {
    const { user } = await authenticate(req);
    const transaction = await findTransactionForUser(req.query.id, user.id);
    if (!transaction) throw notFound("Transaction not found.");
    return { data: { transaction } };
  },
});
