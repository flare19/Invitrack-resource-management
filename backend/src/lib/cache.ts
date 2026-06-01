import redis from './redis';

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const value = await redis.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (err) {
    console.error(`[cache] Failed to get key "${key}":`, err);
    return null;
  }
}

export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    console.error(`[cache] Failed to set key "${key}":`, err);
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (err) {
    console.error(`[cache] Failed to delete key "${key}":`, err);
  }
}