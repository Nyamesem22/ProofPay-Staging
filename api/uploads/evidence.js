import { handleUpload } from "@vercel/blob/client";
import { endpoint } from "../_lib/handler.js";
import { authenticate } from "../_lib/auth.js";
import { readJson } from "../_lib/http.js";
import { findTransactionForUser, saveEvidenceRecord } from "../_lib/repository.js";
import { badRequest, notFound, unavailable } from "../_lib/errors.js";

export default endpoint({
  methods: ["POST"], scope: "evidence-upload", limit: 20, windowSeconds: 300,
  handler: async req => {
    if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.VERCEL_OIDC_TOKEN) throw unavailable("Private evidence storage is not connected yet.");
    const result = await handleUpload({
      body: readJson(req),
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const { user } = await authenticate(req);
        let payload;
        try { payload = JSON.parse(clientPayload || "{}"); } catch { throw badRequest("Invalid upload context."); }
        const transaction = await findTransactionForUser(payload.transactionId, user.id);
        if (!transaction) throw notFound("Transaction not found.");
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
          maximumSizeInBytes: 10 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: user.id, transactionId: transaction.id }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = JSON.parse(tokenPayload);
        await saveEvidenceRecord({ transactionId: payload.transactionId, userId: payload.userId, blob });
      },
    });
    return { data: result };
  },
});
