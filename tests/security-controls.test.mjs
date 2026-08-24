import { describe, expect, it, beforeEach } from "vitest";
import { requireRole } from "../api/_lib/auth.js";
import { cacheGet, cacheSet, resetLocalCacheForTests } from "../api/_lib/cache.js";
import { getRequestId, parseCookies, readJson, redact, sessionCookie, validateBrowserOrigin } from "../api/_lib/http.js";
import { rateLimit, resetLocalRateLimitsForTests } from "../api/_lib/rate-limit.js";

beforeEach(() => {
  resetLocalCacheForTests();
  resetLocalRateLimitsForTests();
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

describe("security controls", () => {
  it("creates an HttpOnly SameSite session cookie", () => {
    const cookie = sessionCookie("opaque-token", 3600);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(parseCookies({ headers: { cookie: "proofpay_session=opaque-token; theme=dark" } })).toEqual({ proofpay_session: "opaque-token", theme: "dark" });
  });

  it("redacts nested sensitive values", () => {
    expect(redact({ phone: "055", nested: { password: "secret", otp: "123" } })).toEqual({ phone: "055", nested: { password: "[REDACTED]", otp: "[REDACTED]" } });
  });

  it("does not trust malformed request IDs or oversized JSON bodies", () => {
    expect(getRequestId({ headers: { "x-request-id": "not-a-uuid" } })).toMatch(/^[0-9a-f-]{36}$/);
    expect(() => readJson({ headers: { "content-length": "70000" }, body: "{}" })).toThrow("64 KiB");
  });

  it("enforces staff roles", () => {
    expect(() => requireRole({ roles: ["customer"] }, "admin")).toThrow();
    expect(() => requireRole({ roles: ["customer", "admin"] }, "admin")).not.toThrow();
  });

  it("rejects cross-origin writes", () => {
    process.env.APP_ORIGIN = "https://proofpay.example";
    expect(() => validateBrowserOrigin({ method: "POST", headers: { origin: "https://evil.example", host: "proofpay.example", "x-forwarded-proto": "https" } })).toThrow("origin");
  });

  it("limits repeated requests and provides a cache fallback", async () => {
    const req = { headers: {}, socket: { remoteAddress: "127.0.0.1" } };
    expect((await rateLimit(req, "test", { limit: 1, windowSeconds: 60 })).allowed).toBe(true);
    expect((await rateLimit(req, "test", { limit: 1, windowSeconds: 60 })).allowed).toBe(false);
    await cacheSet("overview", { count: 3 }, 60);
    await expect(cacheGet("overview")).resolves.toEqual({ count: 3 });
  });
});
