// What this file does: configures Redis client connection with graceful fallbacks if Redis is offline
const redis = require('redis');

let client = null;
let isConnected = false;

// Create Redis Client instance
if (process.env.REDIS_URL || process.env.NODE_ENV === 'production' || true) {
  let url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  
  // Handle case where Redis URL is set to password or has missing protocol
  if (url && !url.startsWith('redis://') && !url.startsWith('rediss://')) {
    console.warn(`⚠️ Warning: Redis URL '${url}' is missing redis:// or rediss:// protocol.`);
    if (url.includes(':') || url.includes('.') || url === 'localhost') {
      url = `redis://${url}`;
    }
  }

  console.log(`🔌 Initializing Redis client on: ${url}`);
  
  try {
    client = redis.createClient({
      url,
      socket: {
        reconnectStrategy: (retries) => {
          // Limit reconnection attempts so logs aren't spammed endlessly
          if (retries > 10) {
            console.warn('⚠️ Redis reconnection attempts exceeded limit. Continuing with fallback queries.');
            return new Error('Redis connection failed permanently');
          }
          return Math.min(retries * 500, 2000); // retry after 0.5s, 1s, etc.
        }
      }
    });

    client.on('connect', () => {
      console.log('🔌 Connecting to Redis...');
    });

    client.on('ready', () => {
      isConnected = true;
      console.log('✅ Redis client ready and connected!');
    });

    client.on('error', (err) => {
      isConnected = false;
      console.warn('⚠️ Redis connection error/offline:', err.message || err);
    });

    client.on('end', () => {
      isConnected = false;
      console.log('🔌 Redis connection closed.');
    });

    // Asynchronously connect the client
    client.connect().catch((err) => {
      console.warn('⚠️ Failed to connect to Redis on startup. Fallback cache mode active.', err.message);
    });
  } catch (err) {
    client = null;
    isConnected = false;
    console.error('❌ Failed to create Redis client instance. Fallback cache mode active. Error:', err.message || err);
  }
}

// Helper: check if we should query Redis
function checkConnection() {
  return client && isConnected;
}

// Expose wrappers
module.exports = {
  get client() {
    return client;
  },
  get isConnected() {
    return checkConnection();
  },

  /**
   * Get value from cache and automatically parse it
   */
  async getCache(key) {
    if (!checkConnection()) return null;
    try {
      const val = await client.get(key);
      return val ? JSON.parse(val) : null;
    } catch (err) {
      console.warn(`[Redis] Error getting cache for key ${key}:`, err.message);
      return null;
    }
  },

  /**
   * Set value in cache with automatic JSON serialization and expiration
   */
  async setCache(key, value, ttlSeconds = 86400) {
    if (!checkConnection()) return false;
    try {
      const dataStr = JSON.stringify(value);
      await client.set(key, dataStr, { EX: ttlSeconds });
      return true;
    } catch (err) {
      console.warn(`[Redis] Error setting cache for key ${key}:`, err.message);
      return false;
    }
  },

  /**
   * Delete specific cache key
   */
  async delCache(key) {
    if (!checkConnection()) return false;
    try {
      await client.del(key);
      return true;
    } catch (err) {
      console.warn(`[Redis] Error deleting cache key ${key}:`, err.message);
      return false;
    }
  },

  /**
   * Clear all property-related cache keys (all listings + similar listings + details)
   */
  async clearPropertyCache() {
    if (!checkConnection()) return;
    try {
      // 1. Delete the main properties listing cache
      await client.del('properties:all');
      console.log('[Redis] Cleared listing cache: properties:all');

      // 2. Clear pattern-matched individual keys (similar and detail)
      const keys = await client.keys('property:*');
      if (keys && keys.length > 0) {
        await client.del(keys);
        console.log(`[Redis] Cleared ${keys.length} pattern-matched caches:`, keys);
      }
    } catch (err) {
      console.warn('[Redis] Error clearing property cache:', err.message);
    }
  }
};
