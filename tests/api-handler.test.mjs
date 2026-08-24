import { describe, expect, it } from "vitest";
import health from "../api/health.js";
import readiness from "../api/readiness.js";

function responseRecorder() {
  return {
    statusCode: 200,
    headers: {},
    writableEnded: false,
    setHeader(key, value) { this.headers[key.toLowerCase()] = value; },
    end(body) { this.body = body; this.writableEnded = true; },
  };
}

function request(path) {
  return { method: "GET", url: path, headers: { host: "localhost:3000" }, socket: { remoteAddress: "127.0.0.1" } };
}

describe("API health contracts", () => {
  it("returns a request id and safe readiness summary", async () => {
    const res = responseRecorder();
    await health(request("/api/health"), res);
    const payload = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(res.headers["x-request-id"]).toMatch(/[0-9a-f-]{36}/);
    expect(payload.data.service).toBe("proofpay-api");
    expect(payload.data.configuration).not.toHaveProperty("databaseUrl");
  });

  it("fails readiness closed when Neon is not configured", async () => {
    const previous = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    const res = responseRecorder();
    await readiness(request("/api/readiness"), res);
    expect(res.statusCode).toBe(503);
    expect(JSON.parse(res.body).data.ready).toBe(false);
    if (previous) process.env.DATABASE_URL = previous;
  });
});
