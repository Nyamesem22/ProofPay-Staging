import { AppError } from "./errors.js";
import { getRequestId, methodNotAllowed, sendJson, validateBrowserOrigin } from "./http.js";
import { logger } from "./logger.js";
import { captureServerError } from "./observability.js";
import { rateHeaders, rateLimit } from "./rate-limit.js";

export function endpoint({ methods, scope, limit, windowSeconds, handler }) {
  return async function proofPayEndpoint(req, res) {
    const requestId = getRequestId(req);
    const started = Date.now();
    try {
      if (req.method === "OPTIONS") return sendJson(res, 204, {}, requestId);
      if (!methods.includes(req.method)) return methodNotAllowed(req, res, methods, requestId);
      validateBrowserOrigin(req);
      const rate = await rateLimit(req, scope, { limit, windowSeconds });
      if (!rate.allowed) return sendJson(res, 429, { ok: false, error: { code: "RATE_LIMITED", message: "Too many requests. Please wait and try again." }, requestId }, requestId, { ...rateHeaders(rate), "Retry-After": String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))) });
      const result = await handler(req, res, { requestId, rate });
      if (res.writableEnded) return;
      logger.info("request.completed", { requestId, method: req.method, path: req.url, status: result?.status || 200, durationMs: Date.now() - started });
      return sendJson(res, result?.status || 200, { ok: true, data: result?.data ?? result, requestId }, requestId, rateHeaders(rate));
    } catch (error) {
      const status = error instanceof AppError || error.status ? error.status : 500;
      const code = error.code || (status === 500 ? "INTERNAL_ERROR" : "REQUEST_FAILED");
      logger.error("request.failed", { requestId, method: req.method, path: req.url, status, code, message: error.message, stack: status === 500 ? error.stack : undefined });
      if (status >= 500) captureServerError(error, { requestId, method: req.method, path: req.url, code });
      return sendJson(res, status, { ok: false, error: { code, message: status === 500 ? "ProofPay could not complete this request. Please try again." : error.message, details: error.details }, requestId }, requestId);
    }
  };
}
