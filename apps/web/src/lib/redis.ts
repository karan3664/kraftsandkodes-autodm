import Redis from "ioredis";
import { getEnv } from "./env";
import { logger } from "./logger";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export function getRedis(): Redis | null {
  const url = getEnv().REDIS_URL;
  if (!url) {
    return null;
  }
  if (!globalForRedis.redis) {
    globalForRedis.redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    globalForRedis.redis.on("error", () => {
      logger.warn("redis_error");
    });
  }
  return globalForRedis.redis;
}

export async function pingRedis(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) {
    return false;
  }
  try {
    if (redis.status === "wait") {
      await redis.connect();
    }
    const pong = await redis.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}
