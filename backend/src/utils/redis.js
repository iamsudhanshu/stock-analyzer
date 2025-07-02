const redis = require('redis');
const config = require('../config');
const logger = require('./logger');

class RedisClient {
  constructor() {
    this.client = null;
    this.subscriber = null;
    this.publisher = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      // Create main client for general operations
      this.client = redis.createClient({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        retryDelayOnFailover: config.redis.retryDelayOnFailover,
        maxRetriesPerRequest: config.redis.maxRetriesPerRequest
      });

      // Create subscriber client for pub/sub
      this.subscriber = this.client.duplicate();
      
      // Create publisher client for pub/sub
      this.publisher = this.client.duplicate();

      // Handle connection events
      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        logger.error('Redis client error:', err);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        logger.info('Redis client disconnected');
        this.isConnected = false;
      });

      // Connect all clients
      await Promise.all([
        this.client.connect(),
        this.subscriber.connect(),
        this.publisher.connect()
      ]);

      logger.info('All Redis clients connected successfully');
      return true;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.client) await this.client.quit();
      if (this.subscriber) await this.subscriber.quit();
      if (this.publisher) await this.publisher.quit();
      
      this.isConnected = false;
      logger.info('Redis clients disconnected');
    } catch (error) {
      logger.error('Error disconnecting Redis clients:', error);
    }
  }

  // Cache operations
  async set(key, value, ttl = config.cache.defaultTTL) {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        await this.client.setEx(key, ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
      return true;
    } catch (error) {
      logger.error(`Error setting cache key ${key}:`, error);
      return false;
    }
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Error deleting cache key ${key}:`, error);
      return false;
    }
  }

  async exists(key) {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Error checking existence of key ${key}:`, error);
      return false;
    }
  }

  // Pub/Sub operations
  async publish(channel, message) {
    try {
      const serializedMessage = JSON.stringify(message);
      await this.publisher.publish(channel, serializedMessage);
      logger.debug(`Published message to channel ${channel}`, { message });
      return true;
    } catch (error) {
      logger.error(`Error publishing to channel ${channel}:`, error);
      return false;
    }
  }

  async subscribe(channel, callback) {
    try {
      await this.subscriber.subscribe(channel, (message) => {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch (parseError) {
          logger.error(`Error parsing message from channel ${channel}:`, parseError);
        }
      });
      logger.info(`Subscribed to channel: ${channel}`);
      return true;
    } catch (error) {
      logger.error(`Error subscribing to channel ${channel}:`, error);
      return false;
    }
  }

  async unsubscribe(channel) {
    try {
      await this.subscriber.unsubscribe(channel);
      logger.info(`Unsubscribed from channel: ${channel}`);
      return true;
    } catch (error) {
      logger.error(`Error unsubscribing from channel ${channel}:`, error);
      return false;
    }
  }

  // Queue operations using Redis lists
  async pushToQueue(queueName, data) {
    try {
      const serializedData = JSON.stringify(data);
      await this.client.rPush(queueName, serializedData);
      logger.debug(`Pushed data to queue ${queueName}`, { data });
      return true;
    } catch (error) {
      logger.error(`Error pushing to queue ${queueName}:`, error);
      return false;
    }
  }

  async popFromQueue(queueName, timeout = 0) {
    try {
      const result = await this.client.blPop(queueName, timeout);
      if (result) {
        const parsedData = JSON.parse(result.element);
        logger.debug(`Popped data from queue ${queueName}`, { data: parsedData });
        return parsedData;
      }
      return null;
    } catch (error) {
      logger.error(`Error popping from queue ${queueName}:`, error);
      return null;
    }
  }

  async getQueueLength(queueName) {
    try {
      return await this.client.lLen(queueName);
    } catch (error) {
      logger.error(`Error getting queue length for ${queueName}:`, error);
      return 0;
    }
  }

  // Health check
  async ping() {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis ping failed:', error);
      return false;
    }
  }
}

// Create singleton instance
const redisClient = new RedisClient();

module.exports = redisClient; 