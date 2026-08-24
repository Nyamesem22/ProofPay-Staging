const localCache = new Map();

function localGet(key) {
  const item = localCache.get(key);
  if (!item || item.expiresAt <= Date.now()) {
    localCache.delete(key);
    return null;
  }
  return item.value;
}

function localSet(key, value, ttlSeconds) {
  localCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

async function redisCommand(command) {
  const response = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify([command]),
    signal: AbortSignal.timeout(1200),
  });
  if (!response.ok) throw new Error(`Cache store responded ${response.status}`);
  return (await response.json())?.[0]?.result;
}

function configured() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

export async function cacheGet(key) {
  if (configured()) {
    try {
      const result = await redisCommand(["GET", `proofpay:cache:${key}`]);
      return result ? JSON.parse(result) : null;
    } catch { /* use the bounded local fallback */ }
  }
  return localGet(key);
}

export async function cacheSet(key, value, ttlSeconds = 15) {
  if (configured()) {
    try { await redisCommand(["SET", `proofpay:cache:${key}`, JSON.stringify(value), "EX", ttlSeconds]); return; }
    catch { /* use the bounded local fallback */ }
  }
  localSet(key, value, ttlSeconds);
}

export function resetLocalCacheForTests() {
  localCache.clear();
}
