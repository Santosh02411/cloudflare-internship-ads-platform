/**
 * KV storage service for Cloudflare KV operations
 */

class KVService {
  constructor(kv) {
    this.kv = kv;
  }

  async get(key) {
    try {
      const value = await this.kv.get(key);
      if (!value) {
        return null;
      }

      return JSON.parse(value);
    } catch (error) {
      console.error(`KV get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key, value, expirationTtl = null) {
    try {
      const jsonValue = JSON.stringify(value);
      const options = {};
      if (expirationTtl) {
        options.expirationTtl = expirationTtl;
      }
      await this.kv.put(key, jsonValue, options);
    } catch (error) {
      console.error(`KV set error for key ${key}:`, error);
      throw error;
    }
  }

  async delete(key) {
    try {
      await this.kv.delete(key);
    } catch (error) {
      console.error(`KV delete error for key ${key}:`, error);
      throw error;
    }
  }

  async setToken(userId, token, expiresIn = 86400) {
    const key = `auth:${userId}:token`;
    await this.set(key, { token, createdAt: Date.now() }, expiresIn);
  }

  async getToken(userId) {
    const key = `auth:${userId}:token`;
    const data = await this.get(key);
    return data?.token || null;
  }

  async deleteToken(userId) {
    const key = `auth:${userId}:token`;
    await this.delete(key);
  }

  async cacheResponse(key, value, ttl = 3600) {
    const cacheKey = `cache:${key}`;
    await this.set(cacheKey, value, ttl);
  }

  async getCachedResponse(key) {
    const cacheKey = `cache:${key}`;
    return this.get(cacheKey);
  }

  async clearCache(pattern) {
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

function createKVService(kv) {
  return new KVService(kv);
}

export {
  KVService,
  createKVService,
};
