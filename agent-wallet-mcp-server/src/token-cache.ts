import { Redis } from 'ioredis';
import { env } from './env.js';

/**
 * Simple Redis-based token cache for MCP service connections
 * Caches Auth0 tokens so we can reconnect without full Skyfire dance
 */
export class TokenCache {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(env.REDIS_URL);

    this.redis.on('error', (err: Error) => {
      console.warn('[TokenCache] Redis error:', err);
    });
  }

  /**
   * Cache an Auth0 access token for a service
   */
  async cacheToken(serviceId: string, token: string, expiresInSeconds: number = 3600): Promise<void> {
    try {
      const key = `mcp:token:${serviceId}`;
      await this.redis.setex(key, expiresInSeconds, token);
      console.log(`[TokenCache] Cached token for service ${serviceId}`);
    } catch (error) {
      console.warn(`[TokenCache] Failed to cache token for ${serviceId}:`, error);
    }
  }

  /**
   * Retrieve cached Auth0 access token for a service
   */
  async getToken(serviceId: string): Promise<string | null> {
    try {
      const key = `mcp:token:${serviceId}`;
      const token = await this.redis.get(key);
      if (token) {
        console.log(`[TokenCache] Retrieved cached token for service ${serviceId}`);
      }
      return token;
    } catch (error) {
      console.warn(`[TokenCache] Failed to retrieve token for ${serviceId}:`, error);
      return null;
    }
  }

  /**
   * Remove cached token for a service
   */
  async removeToken(serviceId: string): Promise<void> {
    try {
      const key = `mcp:token:${serviceId}`;
      await this.redis.del(key);
      console.log(`[TokenCache] Removed token for service ${serviceId}`);
    } catch (error) {
      console.warn(`[TokenCache] Failed to remove token for ${serviceId}:`, error);
    }
  }

  /**
   * Cache service configuration for reconnection
   */
  async cacheServiceConfig(serviceId: string, config: any, expiresInSeconds: number = 7200): Promise<void> {
    try {
      const key = `mcp:config:${serviceId}`;
      await this.redis.setex(key, expiresInSeconds, JSON.stringify(config));
      console.log(`[TokenCache] Cached config for service ${serviceId}`);
    } catch (error) {
      console.warn(`[TokenCache] Failed to cache config for ${serviceId}:`, error);
    }
  }

  /**
   * Retrieve cached service configuration
   */
  async getServiceConfig(serviceId: string): Promise<any | null> {
    try {
      const key = `mcp:config:${serviceId}`;
      const configStr = await this.redis.get(key);
      if (configStr) {
        return JSON.parse(configStr);
      }
      return null;
    } catch (error) {
      console.warn(`[TokenCache] Failed to retrieve config for ${serviceId}:`, error);
      return null;
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}
