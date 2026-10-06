import { getRedis } from "./redis";

const memory = new Map<string, { count: number; resetAt: number }>();

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; remaining: number }> {
  const redis = getRedis();
  if (redis) {
    try {
      if (redis.status === "wait") {
        await redis.connect();
      }
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.pexpire(key, windowMs);
      }
      return { ok: count <= limit, remaining: Math.max(0, limit - count) };
    } catch {
      // Fall through to memory limiter if Redis is unavailable.
    }
  }

  const now = Date.now();
  const current = memory.get(key);
  if (!current || current.resetAt < now) {
    memory.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  current.count += 1;
  return {
    ok: current.count <= limit,
    remaining: Math.max(0, limit - current.count),
  };
}
