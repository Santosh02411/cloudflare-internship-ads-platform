import { KVNamespace } from '../types';

export class KVService {
  constructor(private kv: KVNamespace) {}

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.kv.get(key);
      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`KV get error for key ${key}:`, error);
      return null;
    }
  }

  async set<T = any>(key: string, value: T, expirationTtl?: number): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await this.kv.put(key, jsonValue, { expirationTtl });
    } catch (error) {
      console.error(`KV set error for key ${key}:`, error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.kv.delete(key);
    } catch (error) {
      console.error(`KV delete error for key ${key}:`, error);
      throw error;
    }
  }

  async setToken(userId: string, token: string, expiresIn: number = 86400): Promise<void> {
    const key = `auth:${userId}:token`;
    await this.set(key, { token, createdAt: Date.now() }, expiresIn);
  }

  async getToken(userId: string): Promise<string | null> {
    const key = `auth:${userId}:token`;
    const data = await this.get<{ token: string; createdAt: number }>(key);
    return data?.token || null;
  }

  async deleteToken(userId: string): Promise<void> {
    const key = `auth:${userId}:token`;
    await this.delete(key);
  }

  async cacheResponse<T = any>(key: string, value: T, ttl: number = 3600): Promise<void> {
    const cacheKey = `cache:${key}`;
    await this.set(cacheKey, value, ttl);
  }

  async getCachedResponse<T = any>(key: string): Promise<T | null> {
    const cacheKey = `cache:${key}`;
    return this.get<T>(cacheKey);
  }

  async clearCache(pattern: string): Promise<void> {
    try {
      const list = await this.kv.list({ prefix: `cache:${pattern}` });

      for (const item of list.keys) {
        await this.kv.delete(item.name);
      }
    } catch (error) {
      console.error(`KV clearCache error for pattern ${pattern}:`, error);
      throw error;
    }
  }
}

export function createKVService(kv: KVNamespace): KVService {
  return new KVService(kv);
}
