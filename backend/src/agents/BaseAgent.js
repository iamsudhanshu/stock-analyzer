const { v4: uuidv4 } = require('uuid');
const redisClient = require('../utils/redis');
const logger = require('../utils/logger');
const config = require('../config');

class BaseAgent {
  constructor(agentName, inputQueues = [], outputQueues = []) {
    this.agentName = agentName;
    this.inputQueues = inputQueues;
    this.outputQueues = outputQueues;
    this.isRunning = false;
    this.processedRequests = new Map();
    
    // Bind methods to preserve context
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
    this.processMessage = this.processMessage.bind(this);
    this.handleRequest = this.handleRequest.bind(this);
  }

  async initialize() {
    try {
      // Connect to Redis if not already connected
      if (!redisClient.isConnected) {
        await redisClient.connect();
      }

      // Subscribe to input channels
      for (const queue of this.inputQueues) {
        await redisClient.subscribe(queue, this.processMessage);
        logger.info(`${this.agentName} subscribed to ${queue}`);
      }

      logger.info(`${this.agentName} initialized successfully`);
      return true;
    } catch (error) {
      logger.error(`Failed to initialize ${this.agentName}:`, error);
      throw error;
    }
  }

  async start() {
    if (this.isRunning) {
      logger.warn(`${this.agentName} is already running`);
      return;
    }

    try {
      await this.initialize();
      this.isRunning = true;
      logger.info(`${this.agentName} started successfully`);
      
      // Set up graceful shutdown
      process.on('SIGINT', this.stop);
      process.on('SIGTERM', this.stop);
      
    } catch (error) {
      logger.error(`Failed to start ${this.agentName}:`, error);
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning) {
      logger.warn(`${this.agentName} is not running`);
      return;
    }

    try {
      this.isRunning = false;
      
      // Unsubscribe from all input queues
      for (const queue of this.inputQueues) {
        await redisClient.unsubscribe(queue);
      }
      
      logger.info(`${this.agentName} stopped successfully`);
    } catch (error) {
      logger.error(`Error stopping ${this.agentName}:`, error);
    }
  }

  async processMessage(message) {
    try {
      // Validate message structure
      if (!this.validateMessage(message)) {
        logger.warn(`${this.agentName} received invalid message:`, message);
        return;
      }

      const { requestId, agentType, timestamp, payload } = message;
      
      // Check if we've already processed this request
      if (this.processedRequests.has(requestId)) {
        logger.debug(`${this.agentName} already processed request ${requestId}`);
        return;
      }

      logger.info(`${this.agentName} processing request ${requestId}`);
      
      // Process the request
      const result = await this.handleRequest(payload, requestId);
      
      if (result) {
        // Mark as processed
        this.processedRequests.set(requestId, {
          timestamp: Date.now(),
          result
        });

        // Clean up old processed requests (keep only last 1000)
        if (this.processedRequests.size > 1000) {
          const oldestEntries = Array.from(this.processedRequests.entries())
            .sort(([,a], [,b]) => a.timestamp - b.timestamp)
            .slice(0, this.processedRequests.size - 1000);
          
          oldestEntries.forEach(([key]) => {
            this.processedRequests.delete(key);
          });
        }

        // Send result to output queues
        await this.sendResult(requestId, result);
        
        logger.info(`${this.agentName} completed processing request ${requestId}`);
      }
      
    } catch (error) {
      logger.error(`${this.agentName} error processing message:`, error);
      
      // Send error result
      if (message.requestId) {
        await this.sendError(message.requestId, error);
      }
    }
  }

  validateMessage(message) {
    return (
      message &&
      typeof message === 'object' &&
      message.requestId &&
      message.agentType &&
      message.payload !== undefined
    );
  }

  async sendResult(requestId, result) {
    const message = {
      requestId,
      agentType: this.agentName,
      timestamp: new Date().toISOString(),
      status: 'success',
      payload: result
    };

    // Send to all output queues
    for (const queue of this.outputQueues) {
      await redisClient.publish(queue, message);
      logger.debug(`${this.agentName} sent result to ${queue}`, { requestId });
    }
  }

  async sendError(requestId, error) {
    const message = {
      requestId,
      agentType: this.agentName,
      timestamp: new Date().toISOString(),
      status: 'error',
      error: {
        message: error.message,
        stack: error.stack
      }
    };

    // Send to all output queues
    for (const queue of this.outputQueues) {
      await redisClient.publish(queue, message);
      logger.debug(`${this.agentName} sent error to ${queue}`, { requestId, error: error.message });
    }
  }

  async sendProgress(requestId, progress, message) {
    const progressMessage = {
      requestId,
      agentType: this.agentName,
      timestamp: new Date().toISOString(),
      type: 'progress',
      progress,
      message
    };

    // Send progress to UI queue
    await redisClient.publish(config.queues.ui, progressMessage);
  }

  // Abstract method to be implemented by subclasses
  async handleRequest(payload, requestId) {
    throw new Error(`handleRequest method must be implemented by ${this.agentName}`);
  }

  // Utility method for caching
  async getCachedData(key) {
    try {
      return await redisClient.get(key);
    } catch (error) {
      logger.error(`Error getting cached data for key ${key}:`, error);
      return null;
    }
  }

  async setCachedData(key, data, ttl) {
    try {
      return await redisClient.set(key, data, ttl);
    } catch (error) {
      logger.error(`Error setting cached data for key ${key}:`, error);
      return false;
    }
  }

  // Utility method for rate limiting
  async checkRateLimit(identifier, limit, windowMs) {
    try {
      const key = `rate_limit:${this.agentName}:${identifier}`;
      const current = await redisClient.get(key) || 0;
      
      if (current >= limit) {
        return false;
      }
      
      // Increment counter
      await redisClient.set(key, current + 1, Math.ceil(windowMs / 1000));
      return true;
    } catch (error) {
      logger.error(`Error checking rate limit:`, error);
      return true; // Allow on error
    }
  }

  // Health check method
  async healthCheck() {
    return {
      agent: this.agentName,
      status: this.isRunning ? 'running' : 'stopped',
      redisConnected: redisClient.isConnected,
      processedRequests: this.processedRequests.size,
      inputQueues: this.inputQueues,
      outputQueues: this.outputQueues
    };
  }
}

module.exports = BaseAgent; 