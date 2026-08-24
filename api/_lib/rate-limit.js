import { getIp } from "./http.js";

const localWindows = new Map();

function localLimit(key, limit, windowSeconds) {
  const now = Date.now();
  const current = localWindows.get(key);
  if (!current || current.resetAt <= now) {
    const next = { count: 1, resetAt: now + windowSeconds * 1000 };
    localWindows.set(key, next);
    return { allowed: true, remaining: limit - 1, resetAt: next.resetAt, mode: "local" };
  }
  current.count += 1;
  return { allowed: current.count <= limit, remaining: Math.max(0, limit - current.count), resetAt: current.resetAt, mode: "local" };
}

async function upstashLimit(key, limit, windowSeconds) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const redisKey = `proofpay:ratelimit:${key}:${bucket}`;
  const response = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([["INCR", redisKey], ["EXPIRE", redisKey, windowSeconds, "NX"]]),
    signal: AbortSignal.timeout(1200),
  });
  if (!response.ok) throw new Error(`Rate-limit store responded ${response.status}`);
  const data = await response.json();
  const count = Number(data?.[0]?.result || 1);
  return { allowed: count <= limit, remaining: Math.max(0, limit - count), resetAt: (bucket + 1) * windowSeconds * 1000, mode: "distributed" };
}

export async function rateLimit(req, scope, { limit = 60, windowSeconds = 60 } = {}) {
  const key = `${scope}:${getIp(req)}`;
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try { return await upstashLimit(key, limit, windowSeconds); } catch { return localLimit(key, limit, windowSeconds); }
  }
  return localLimit(key, limit, windowSeconds);
}

export function rateHeaders(result) {
  return {
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    "X-RateLimit-Mode": result.mode,
  };
}

export function resetLocalRateLimitsForTests() {
  localWindows.clear();
}
