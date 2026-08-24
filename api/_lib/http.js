import { randomUUID } from "node:crypto";
import { AppError, badRequest, payloadTooLarge } from "./errors.js";

const sensitiveKeys = new Set(["password", "password_hash", "token", "secret", "pin", "otp", "authorization", "cookie"]);

export function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sensitiveKeys.has(key.toLowerCase()) ? "[REDACTED]" : redact(item)]));
}

export function getRequestId(req) {
  const supplied = String(req.headers["x-request-id"] || "");
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(supplied) ? supplied : randomUUID();
}

export function getIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  return String(Array.isArray(forwarded) ? forwarded[0] : forwarded || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
}

export function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || "").split(";").map(part => part.trim()).filter(part => part && part.includes("=")).map(part => {
    const index = part.indexOf("=");
    return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
  }));
}

export function sessionCookie(value, maxAgeSeconds) {
  const name = process.env.SESSION_COOKIE_NAME || "proofpay_session";
  const secure = process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production";
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}; ${secure ? "Secure; " : ""}Priority=High`;
}

export function clearSessionCookie() {
  return sessionCookie("", 0);
}

export function readJson(req) {
  const contentLength = Number(req.headers?.["content-length"] || 0);
  if (contentLength > 65536) throw payloadTooLarge("JSON requests are limited to 64 KiB.");
  if (req.body == null) return {};
  if (typeof req.body === "object") return req.body;
  if (Buffer.byteLength(req.body, "utf8") > 65536) throw payloadTooLarge("JSON requests are limited to 64 KiB.");
  try { return JSON.parse(req.body); } catch { throw badRequest("The request body must be valid JSON."); }
}

export function validateBrowserOrigin(req) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.origin;
  if (!origin) return;
  const expected = process.env.APP_ORIGIN;
  const hostOrigin = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;
  if (origin !== expected && origin !== hostOrigin) throw new AppError(403, "ORIGIN_REJECTED", "The request origin is not allowed.");
}

export function sendJson(res, status, body, requestId, extraHeaders = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.setHeader("X-Request-Id", requestId);
  for (const [key, value] of Object.entries(extraHeaders)) res.setHeader(key, value);
  res.end(JSON.stringify(body));
}

export function methodNotAllowed(req, res, allowed, requestId) {
  res.setHeader("Allow", allowed.join(", "));
  return sendJson(res, 405, { ok: false, error: { code: "METHOD_NOT_ALLOWED", message: `Use ${allowed.join(" or ")} for this endpoint.` }, requestId }, requestId);
}
