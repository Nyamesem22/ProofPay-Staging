import { createHmac, timingSafeEqual } from "node:crypto";
import { endpoint } from "../_lib/handler.js";
import { badRequest, payloadTooLarge, unauthorised, unavailable } from "../_lib/errors.js";
import { recordWebhook } from "../_lib/repository.js";
import { sha256 } from "../_lib/crypto.js";

export const config = { api: { bodyParser: false } };

async function rawBody(req) {
  const maximum = 1024 * 1024;
  if (Number(req.headers["content-length"] || 0) > maximum) throw payloadTooLarge("Webhook payloads are limited to 1 MiB.");
  if (typeof req.body === "string") { if (Buffer.byteLength(req.body) > maximum) throw payloadTooLarge(); return req.body; }
  if (Buffer.isBuffer(req.body)) { if (req.body.length > maximum) throw payloadTooLarge(); return req.body.toString("utf8"); }
  if (req.body && typeof req.body === "object") { const encoded = JSON.stringify(req.body); if (Buffer.byteLength(encoded) > maximum) throw payloadTooLarge(); return encoded; }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > maximum) throw payloadTooLarge("Webhook payloads are limited to 1 MiB."); chunks.push(chunk); }
  return Buffer.concat(chunks).toString("utf8");
}

export default endpoint({
  methods: ["POST"], scope: "payment-webhook", limit: 600, windowSeconds: 60,
  handler: async req => {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!secret) throw unavailable("Payment webhooks are not configured.");
    const body = await rawBody(req);
    const signature = String(req.headers["x-proofpay-signature"] || "");
    const expected = createHmac("sha256", secret).update(body).digest("hex");
    const valid = signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    if (!valid) throw unauthorised("Invalid webhook signature.");
    let payload;
    try { payload = JSON.parse(body); } catch { throw badRequest("Webhook body must be valid JSON."); }
    if (!payload.id || !payload.provider) throw badRequest("Webhook event id and provider are required.");
    const receipt = await recordWebhook({ provider: payload.provider, providerEventId: String(payload.id), signatureValid: true, payloadHash: sha256(body) });
    return { data: { accepted: true, duplicate: !receipt } };
  },
});
