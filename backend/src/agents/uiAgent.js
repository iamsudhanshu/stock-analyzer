const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const BaseAgent = require('./BaseAgent');
const config = require('../config');
const logger = require('../utils/logger');
const redisClient = require('../utils/redis');

class UIAgent extends BaseAgent {
  constructor() {
    super(
      'UIAgent',
      [config.queues.ui],
      [] // UI agent doesn't send to other queues
    );
    
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: config.server.corsOrigin,
        methods: ['GET', 'POST']
      }
    });
    
    this.activeRequests = new Map();
    this.socketConnections = new Map();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
  }

  async start() {
    try {
      // Connect to Redis first
      if (!redisClient.isConnected) {
        await redisClient.connect();
      }

      // Subscribe to UI queue for progress updates and results
      await redisClient.subscribe(config.queues.ui, this.handleUIMessage.bind(this));
      
      // Start the HTTP server
      this.server.listen(config.server.port, () => {
        logger.info(`UIAgent HTTP server running on port ${config.server.port}`);
      });

      this.isRunning = true;
      logger.info('UIAgent started successfully');

    } catch (error) {
      logger.error('Failed to start UIAgent:', error);
      throw error;
    }
  }

  async stop() {
    try {
      if (this.server) {
        this.server.close();
      }
      
      if (this.io) {
        this.io.close();
      }
      
      await redisClient.unsubscribe(config.queues.ui);
      
      this.isRunning = false;
      logger.info('UIAgent stopped successfully');
    } catch (error) {
      logger.error('Error stopping UIAgent:', error);
    }
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet());
    
    // CORS middleware
    this.app.use(cors({
      origin: config.server.corsOrigin,
      credentials: true
    }));
    
    // Logging middleware
    this.app.use(morgan('combined', { stream: logger.stream }));
    
    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        redis: redisClient.isConnected
      });
    });

    // Main analysis endpoint
    this.app.post('/api/analyze/:symbol', async (req, res) => {
      try {
        const { symbol } = req.params;
        const requestId = uuidv4();
        
        if (!symbol) {
          return res.status(400).json({
            error: 'Symbol is required',
            requestId
          });
        }

        // Validate symbol format
        const cleanSymbol = symbol.toUpperCase().trim();
        if (!/^[A-Z]{1,5}$/.test(cleanSymbol)) {
          return res.status(400).json({
            error: 'Invalid symbol format',
            requestId
          });
        }

        logger.info(`Starting analysis for symbol ${cleanSymbol} (${requestId})`);

        // Store request information
        this.activeRequests.set(requestId, {
          symbol: cleanSymbol,
          startTime: Date.now(),
          socketId: req.headers['x-socket-id'], // If provided by frontend
          status: 'initiated'
        });

        // Trigger analysis by sending to all data agent queues
        const analysisPayload = { symbol: cleanSymbol };
        
        await Promise.all([
          redisClient.publish(config.queues.stockData, {
            requestId,
            agentType: 'UIAgent',
            timestamp: new Date().toISOString(),
            payload: analysisPayload
          }),
          redisClient.publish(config.queues.news, {
            requestId,
            agentType: 'UIAgent',
            timestamp: new Date().toISOString(),
            payload: analysisPayload
          }),
          redisClient.publish(config.queues.economic, {
            requestId,
            agentType: 'UIAgent',
            timestamp: new Date().toISOString(),
            payload: analysisPayload
          }),
          redisClient.publish(config.queues.analysis, {
            requestId,
            agentType: 'UIAgent',
            timestamp: new Date().toISOString(),
            payload: analysisPayload
          })
        ]);

        res.json({
          requestId,
          symbol: cleanSymbol,
          status: 'analysis_started',
          message: 'Analysis initiated. Use WebSocket connection for real-time updates.'
        });

      } catch (error) {
        logger.error('Error in analyze endpoint:', error);
        res.status(500).json({
          error: 'Internal server error',
          message: error.message
        });
      }
    });

    // Get analysis status
    this.app.get('/api/status/:requestId', async (req, res) => {
      try {
        const { requestId } = req.params;
        const request = this.activeRequests.get(requestId);
        
        if (!request) {
          return res.status(404).json({
            error: 'Request not found',
            requestId
          });
        }

        res.json({
          requestId,
          symbol: request.symbol,
          status: request.status,
          startTime: request.startTime,
          elapsed: Date.now() - request.startTime
        });

      } catch (error) {
        logger.error('Error in status endpoint:', error);
        res.status(500).json({
          error: 'Internal server error',
          message: error.message
        });
      }
    });

    // Get historical analysis results (if cached)
    this.app.get('/api/history/:symbol', async (req, res) => {
      try {
        const { symbol } = req.params;
        const cacheKey = `analysis_result:${symbol.toUpperCase()}`;
        
        const cachedResult = await redisClient.get(cacheKey);
        
        if (cachedResult) {
          res.json({
            symbol: symbol.toUpperCase(),
            cached: true,
            result: cachedResult
          });
        } else {
          res.status(404).json({
            error: 'No cached analysis found',
            symbol: symbol.toUpperCase()
          });
        }

      } catch (error) {
        logger.error('Error in history endpoint:', error);
        res.status(500).json({
          error: 'Internal server error',
          message: error.message
        });
      }
    });

    // List all agents status
    this.app.get('/api/agents/status', async (req, res) => {
      try {
        const agents = ['StockDataAgent', 'NewsSentimentAgent', 'EconomicIndicatorAgent', 'AnalysisAgent'];
        const status = {};
        
        for (const agent of agents) {
          const key = `agent_health:${agent}`;
          const health = await redisClient.get(key);
          status[agent] = health || { status: 'unknown', lastSeen: null };
        }

        res.json({
          agents: status,
          uiAgent: {
            status: 'running',
            activeRequests: this.activeRequests.size,
            connectedSockets: this.socketConnections.size
          }
        });

      } catch (error) {
        logger.error('Error in agents status endpoint:', error);
        res.status(500).json({
          error: 'Internal server error',
          message: error.message
        });
      }
    });

    // Catch-all for undefined routes
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl
      });
    });

    // Error handling middleware
    this.app.use((error, req, res, next) => {
      logger.error('Express error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: config.server.nodeEnv === 'development' ? error.message : 'Something went wrong'
      });
    });
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`New WebSocket connection: ${socket.id}`);
      
      this.socketConnections.set(socket.id, {
        connectedAt: Date.now(),
        subscribedRequests: new Set()
      });

      // Handle subscription to specific analysis requests
      socket.on('subscribe', (data) => {
        try {
          const { requestId } = data;
          if (requestId) {
            this.socketConnections.get(socket.id)?.subscribedRequests.add(requestId);
            socket.join(`request_${requestId}`);
            logger.debug(`Socket ${socket.id} subscribed to request ${requestId}`);
            
            socket.emit('subscribed', { requestId });
          }
        } catch (error) {
          logger.error('Error handling socket subscription:', error);
          socket.emit('error', { message: 'Subscription failed' });
        }
      });

      // Handle unsubscription
      socket.on('unsubscribe', (data) => {
        try {
          const { requestId } = data;
          if (requestId) {
            this.socketConnections.get(socket.id)?.subscribedRequests.delete(requestId);
            socket.leave(`request_${requestId}`);
            logger.debug(`Socket ${socket.id} unsubscribed from request ${requestId}`);
            
            socket.emit('unsubscribed', { requestId });
          }
        } catch (error) {
          logger.error('Error handling socket unsubscription:', error);
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        logger.info(`WebSocket disconnected: ${socket.id} (${reason})`);
        this.socketConnections.delete(socket.id);
      });

      // Send initial connection confirmation
      socket.emit('connected', {
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });
    });
  }

  async handleUIMessage(message) {
    try {
      const { requestId, type, progress, message: progressMessage, payload, status } = message;
      
      if (!requestId) {
        logger.warn('Received UI message without requestId:', message);
        return;
      }

      const request = this.activeRequests.get(requestId);
      if (!request) {
        logger.debug(`Received message for unknown request ${requestId}`);
        return;
      }

      // Handle different message types
      if (type === 'progress') {
        // Progress update
        this.io.to(`request_${requestId}`).emit('progress', {
          requestId,
          progress,
          message: progressMessage,
          timestamp: new Date().toISOString()
        });
        
        request.lastProgress = progress;
        request.lastProgressMessage = progressMessage;
        
      } else if (status === 'success' && payload) {
        // Final analysis result
        logger.info(`Analysis completed for request ${requestId}`);
        
        request.status = 'completed';
        request.completedAt = Date.now();
        request.result = payload;
        
        // Cache the result for future requests
        const cacheKey = `analysis_result:${request.symbol}`;
        await redisClient.set(cacheKey, payload, 3600); // Cache for 1 hour
        
        // Send final result to connected clients
        this.io.to(`request_${requestId}`).emit('completed', {
          requestId,
          symbol: request.symbol,
          result: payload,
          timestamp: new Date().toISOString(),
          duration: request.completedAt - request.startTime
        });
        
        // Clean up after 5 minutes
        setTimeout(() => {
          this.activeRequests.delete(requestId);
        }, 300000);
        
      } else if (status === 'error') {
        // Error occurred
        logger.error(`Analysis failed for request ${requestId}:`, message);
        
        request.status = 'failed';
        request.error = message.error || 'Unknown error';
        
        this.io.to(`request_${requestId}`).emit('error', {
          requestId,
          error: request.error,
          timestamp: new Date().toISOString()
        });
        
        // Clean up after 1 minute on error
        setTimeout(() => {
          this.activeRequests.delete(requestId);
        }, 60000);
      }

    } catch (error) {
      logger.error('Error handling UI message:', error);
    }
  }

  // This method is called by BaseAgent but we override it for UI-specific behavior
  async handleRequest(payload, requestId) {
    // UIAgent doesn't process requests in the traditional sense
    // It handles HTTP requests and WebSocket communications
    return null;
  }

  // Health check method
  async healthCheck() {
    return {
      agent: this.agentName,
      status: this.isRunning ? 'running' : 'stopped',
      httpServer: this.server ? 'running' : 'stopped',
      redisConnected: redisClient.isConnected,
      activeRequests: this.activeRequests.size,
      connectedSockets: this.socketConnections.size,
      port: config.server.port
    };
  }
}

// Start the agent if this file is run directly
if (require.main === module) {
  const agent = new UIAgent();
  agent.start().catch(error => {
    logger.error('Failed to start UIAgent:', error);
    process.exit(1);
  });
}

module.exports = UIAgent; 