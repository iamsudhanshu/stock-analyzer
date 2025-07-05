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
const OllamaService = require('../utils/ollama');

class UIAgent extends BaseAgent {
  constructor() {
    super(
      'UIAgent',
      [config.queues.ui],
      [config.queues.analysis]
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
    
    this.ollama = new OllamaService();
    this.ollamaEnabled = false;
    
    // Initialize LLM capabilities
    this.initializeLLM();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
  }

  async initializeLLM() {
    try {
      console.log('🧠 [UIAgent] Initializing LLM capabilities...');
      this.ollamaEnabled = await this.ollama.isAvailable();
      
      if (this.ollamaEnabled) {
        console.log('✅ [UIAgent] LLM capabilities enabled');
        logger.info('UIAgent LLM capabilities enabled');
      } else {
        console.warn('⚠️ [UIAgent] LLM not available, using enhanced traditional methods');
        logger.warn('UIAgent LLM not available, using enhanced traditional methods');
      }
    } catch (error) {
      console.error('❌ [UIAgent] Error initializing LLM:', error.message);
      logger.error('UIAgent LLM initialization error:', error);
      this.ollamaEnabled = false;
    }
  }

  async start() {
    try {
      // Initialize LLM first
      await this.initializeLLM();
      
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
        console.log('📡 [UIAgent] POST /api/analyze/:symbol received');
        
        const { symbol } = req.params;
        const requestId = uuidv4();
        
        console.log('🔍 [UIAgent] Analysis request details:', {
          symbol,
          requestId,
          headers: req.headers,
          body: req.body
        });
        
        if (!symbol) {
          console.log('❌ [UIAgent] Missing symbol in request');
          return res.status(400).json({
            error: 'Symbol is required',
            requestId
          });
        }

        // Validate symbol format
        const cleanSymbol = symbol.toUpperCase().trim();
        console.log('🔍 [UIAgent] Symbol validation:', { original: symbol, cleaned: cleanSymbol });
        
        if (!/^[A-Z]{1,5}$/.test(cleanSymbol)) {
          console.log('❌ [UIAgent] Invalid symbol format:', cleanSymbol);
          return res.status(400).json({
            error: 'Invalid symbol format',
            requestId
          });
        }

        console.log('🚀 [UIAgent] Starting analysis for symbol:', cleanSymbol, 'with requestId:', requestId);
        logger.info(`Starting analysis for symbol ${cleanSymbol} (${requestId})`);

        // Store request information
        this.activeRequests.set(requestId, {
          symbol: cleanSymbol,
          startTime: Date.now(),
          socketId: req.headers['x-socket-id'], // If provided by frontend
          status: 'initiated'
        });

        console.log('📦 [UIAgent] Request stored in activeRequests:', {
          requestId,
          activeRequestsCount: this.activeRequests.size
        });

        // Trigger analysis by sending to all data agent queues
        const analysisPayload = { symbol: cleanSymbol };
        
        console.log('📤 [UIAgent] Publishing to agent queues...');
        console.log('📤 [UIAgent] Payload:', analysisPayload);
        
        await Promise.all([
          redisClient.publish(config.queues.stockData, {
            requestId,
            agentType: 'UIAgent',
            timestamp: new Date().toISOString(),
            payload: analysisPayload
          }).then(() => console.log('✅ [UIAgent] Published to stockData queue')),
          redisClient.publish(config.queues.newsSentiment, {
            requestId,
            agentType: 'UIAgent',
            timestamp: new Date().toISOString(),
            payload: analysisPayload
          }).then(() => console.log('✅ [UIAgent] Published to newsSentiment queue')),
          redisClient.publish(config.queues.fundamentalData, {
            requestId,
            agentType: 'UIAgent',
            timestamp: new Date().toISOString(),
            payload: analysisPayload
          }).then(() => console.log('✅ [UIAgent] Published to fundamentalData queue')),
          redisClient.publish(config.queues.competitiveAnalysis, {
            requestId,
            agentType: 'UIAgent',
            timestamp: new Date().toISOString(),
            payload: analysisPayload
          }).then(() => console.log('✅ [UIAgent] Published to competitiveAnalysis queue')),
          redisClient.publish(config.queues.enhancedData, {
            requestId,
            agentType: 'UIAgent',
            timestamp: new Date().toISOString(),
            payload: analysisPayload
          }).then(() => console.log('✅ [UIAgent] Published to enhancedData queue')),
          redisClient.publish(config.queues.advancedTechnical, {
            requestId,
            agentType: 'UIAgent',
            timestamp: new Date().toISOString(),
            payload: analysisPayload
          }).then(() => console.log('✅ [UIAgent] Published to advancedTechnical queue')),
          redisClient.publish(config.queues.reportGeneration, {
            requestId,
            agentType: 'UIAgent',
            timestamp: new Date().toISOString(),
            payload: analysisPayload
          }).then(() => console.log('✅ [UIAgent] Published to reportGeneration queue')),
          redisClient.publish(config.queues.analysis, {
            requestId,
            agentType: 'UIAgent',
            timestamp: new Date().toISOString(),
            payload: analysisPayload
          }).then(() => console.log('✅ [UIAgent] Published to analysis queue'))
        ]);

        console.log('✅ [UIAgent] All queue publications completed');

        const response = {
          requestId,
          symbol: cleanSymbol,
          status: 'analysis_started',
          message: 'Analysis initiated. Use WebSocket connection for real-time updates.'
        };

        console.log('📤 [UIAgent] Sending response:', response);
        res.json(response);

      } catch (error) {
        console.error('💥 [UIAgent] Error in analyze endpoint:', error);
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
        const agents = ['StockDataAgent', 'NewsSentimentAgent', 'FundamentalDataAgent', 'CompetitiveAgent', 'AnalysisAgent'];
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
      console.log('🔌 [UIAgent] New WebSocket connection:', socket.id);
      logger.info(`New WebSocket connection: ${socket.id}`);
      
      this.socketConnections.set(socket.id, {
        connectedAt: Date.now(),
        subscribedRequests: new Set()
      });

      console.log('📊 [UIAgent] Socket connections count:', this.socketConnections.size);

      // Handle subscription to specific analysis requests
      socket.on('subscribe', (data) => {
        try {
          console.log('🔔 [UIAgent] Socket subscribe request:', { socketId: socket.id, data });
          
          const { requestId } = data;
          if (requestId) {
            this.socketConnections.get(socket.id)?.subscribedRequests.add(requestId);
            socket.join(`request_${requestId}`);
            console.log('✅ [UIAgent] Socket subscribed:', { socketId: socket.id, requestId });
            logger.debug(`Socket ${socket.id} subscribed to request ${requestId}`);
            
            socket.emit('subscribed', { requestId });
          } else {
            console.log('❌ [UIAgent] Subscribe request missing requestId:', data);
          }
        } catch (error) {
          console.error('💥 [UIAgent] Error handling socket subscription:', error);
          logger.error('Error handling socket subscription:', error);
          socket.emit('error', { message: 'Subscription failed' });
        }
      });

      // Handle unsubscription
      socket.on('unsubscribe', (data) => {
        try {
          console.log('🔕 [UIAgent] Socket unsubscribe request:', { socketId: socket.id, data });
          
          const { requestId } = data;
          if (requestId) {
            this.socketConnections.get(socket.id)?.subscribedRequests.delete(requestId);
            socket.leave(`request_${requestId}`);
            console.log('✅ [UIAgent] Socket unsubscribed:', { socketId: socket.id, requestId });
            logger.debug(`Socket ${socket.id} unsubscribed from request ${requestId}`);
            
            socket.emit('unsubscribed', { requestId });
          }
        } catch (error) {
          console.error('💥 [UIAgent] Error handling socket unsubscription:', error);
          logger.error('Error handling socket unsubscription:', error);
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log('🔌❌ [UIAgent] WebSocket disconnected:', { socketId: socket.id, reason });
        logger.info(`WebSocket disconnected: ${socket.id} (${reason})`);
        this.socketConnections.delete(socket.id);
        console.log('📊 [UIAgent] Socket connections count after disconnect:', this.socketConnections.size);
      });

      // Send initial connection confirmation
      const connectionData = {
        socketId: socket.id,
        timestamp: new Date().toISOString()
      };
      console.log('📤 [UIAgent] Sending connection confirmation:', connectionData);
      socket.emit('connected', connectionData);
    });
  }

  async handleUIMessage(message) {
    try {
      // Message should already be parsed by RedisClient
      if (!message || typeof message !== 'object') {
        console.error('💥 [UIAgent] Received invalid message type:', typeof message);
        logger.error('UIAgent received invalid message type:', typeof message);
        return;
      }

      console.log('📨 [UIAgent] Received UI message:', message);
      console.log('📨 [UIAgent] Message details:', {
        type: message.type,
        status: message.status,
        agentType: message.agentType,
        requestId: message.requestId,
        progress: message.progress,
        message: message.message
      });
      
      const { requestId, type, progress, message: progressMessage, payload, status } = message;
      
      if (!requestId) {
        console.log('⚠️ [UIAgent] Message missing requestId:', message);
        logger.warn('Received UI message without requestId:', message);
        return;
      }

      const request = this.activeRequests.get(requestId);
      if (!request) {
        console.log('⚠️ [UIAgent] Unknown requestId:', requestId);
        console.log('⚠️ [UIAgent] Active requests:', Array.from(this.activeRequests.keys()));
        logger.debug(`Received message for unknown request ${requestId}`);
        return;
      }

      console.log('📊 [UIAgent] Processing message for known request:', {
        requestId,
        type,
        status,
        hasPayload: !!payload,
        progress,
        connectedSockets: this.socketConnections.size
      });

      // Handle different message types
      if (type === 'progress') {
        console.log('📈 [UIAgent] Sending progress update:', {
          requestId,
          progress,
          message: progressMessage,
          roomName: `request_${requestId}`,
          socketsInRoom: this.io.sockets.adapter.rooms.get(`request_${requestId}`)?.size || 0
        });
        
        // Progress update
        this.io.to(`request_${requestId}`).emit('progress', {
          requestId,
          progress,
          message: progressMessage,
          timestamp: new Date().toISOString()
        });
        
        console.log('✅ [UIAgent] Progress event emitted to room');
        
        request.lastProgress = progress;
        request.lastProgressMessage = progressMessage;
        
      } else if (status === 'success' && payload) {
        console.log('🎉 [UIAgent] Analysis completed for request:', requestId);
        console.log('📋 [UIAgent] Result payload structure:', {
          hasSymbol: !!payload.symbol,
          hasAnalysis: !!payload.analysis,
          hasRawData: !!payload.rawData,
          payloadKeys: Object.keys(payload)
        });
        
        // Final analysis result
        logger.info(`Analysis completed for request ${requestId}`);
        
        request.status = 'completed';
        request.completedAt = Date.now();
        request.result = payload;
        
        // Cache the result for future requests
        const cacheKey = `analysis_result:${request.symbol}`;
        console.log('💾 [UIAgent] Caching result with key:', cacheKey);
        await redisClient.set(cacheKey, payload, 3600); // Cache for 1 hour
        
        // Send final result to connected clients
        const completionData = {
          requestId,
          symbol: request.symbol,
          result: payload,
          timestamp: new Date().toISOString(),
          duration: request.completedAt - request.startTime
        };
        
        console.log('📤 [UIAgent] Sending completion data to sockets:', {
          requestId,
          symbol: request.symbol,
          duration: completionData.duration,
          resultKeys: Object.keys(payload)
        });
        
        this.io.to(`request_${requestId}`).emit('analysisCompleted', completionData);
        
        // Clean up after 5 minutes
        setTimeout(() => {
          console.log('🧹 [UIAgent] Cleaning up completed request:', requestId);
          this.activeRequests.delete(requestId);
        }, 300000);
        
      } else if (status === 'error') {
        console.error('💥 [UIAgent] Analysis failed for request:', requestId, message);
        
        // Error occurred
        logger.error(`Analysis failed for request ${requestId}:`, message);
        
        request.status = 'failed';
        request.error = message.error || 'Unknown error';
        
        const errorData = {
          requestId,
          error: request.error,
          timestamp: new Date().toISOString()
        };
        
        console.log('📤 [UIAgent] Sending error data to sockets:', errorData);
        this.io.to(`request_${requestId}`).emit('analysisError', errorData);
        
        // Clean up after 1 minute on error
        setTimeout(() => {
          console.log('🧹 [UIAgent] Cleaning up failed request:', requestId);
          this.activeRequests.delete(requestId);
        }, 60000);
      } else {
        console.log('⚠️ [UIAgent] Unhandled message type/status:', { type, status, requestId });
      }

    } catch (error) {
      console.error('💥 [UIAgent] Error handling UI message:', error);
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

  async processMessage(message) {
    try {
      console.log('📥 [UIAgent] Processing message:', {
        requestId: message.requestId,
        agentType: message.agentType,
        status: message.status
      });

      if (!this.validateMessage(message)) {
        logger.warn(`${this.agentName} received invalid message:`, message);
        return;
      }

      const { requestId, payload } = message;
      const { symbol, analysisData } = payload;

      console.log('🎨 [UIAgent] Starting LLM-enhanced UI analysis for:', symbol);
      
      // Generate comprehensive UI recommendations with LLM insights
      const result = await this.generateLLMEnhancedUIRecommendations(symbol, analysisData);
      
      console.log('✅ [UIAgent] Analysis completed:', {
        requestId,
        symbol,
        hasData: !!result,
        dataKeys: result ? Object.keys(result) : []
      });

      // Send result to analysis queue
      await this.publishMessage(config.queues.analysis, {
        requestId,
        agentType: this.agentName,
        status: 'success',
        payload: result,
        timestamp: new Date().toISOString()
      });

      logger.info(`${this.agentName} completed analysis for ${symbol}`);
      
    } catch (error) {
      console.error('💥 [UIAgent] Error processing message:', error);
      logger.error(`${this.agentName} error:`, error);
      
      // Send error result
      if (message.requestId) {
        await this.sendError(message.requestId, error);
      }
    }
  }

  async generateLLMEnhancedUIRecommendations(symbol, analysisData) {
    try {
      if (!this.ollamaEnabled) {
        throw new Error('LLM is required for UIAgent analysis. Ollama service is not available.');
      }
      
      console.log('🧠 [UIAgent] Generating LLM-enhanced UI recommendations...');
      
      // Use LLM to analyze data and generate UI insights
      const llmAnalysis = await this.generateLLMUIInsights(symbol, analysisData);
      
      return {
        symbol: symbol.toUpperCase(),
        uiRecommendations: llmAnalysis,
        llmEnhanced: true,
        lastUpdated: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ [UIAgent] Error generating UI recommendations:', error);
      logger.error('UIAgent data generation error:', error);
      
      // No fallback - throw error if LLM analysis fails
      throw new Error(`UIAgent LLM analysis error: ${error.message}`);
    }
  }

  async generateLLMUIInsights(symbol, analysisData) {
    try {
      const stockData = analysisData?.StockDataAgent || {};
      const newsData = analysisData?.NewsSentimentAgent || {};
      const fundamentalData = analysisData?.FundamentalDataAgent || {};
      const competitiveData = analysisData?.CompetitiveAgent || {};

      const prompt = `Analyze the following stock analysis data for ${symbol} and provide intelligent UI/UX recommendations:

Stock Data:
- Current Price: $${stockData.currentPrice || 'N/A'}
- Technical Indicators: ${JSON.stringify(stockData.technicalIndicators || {})}
- LLM Insights: ${stockData.llmInsights ? 'Available' : 'Not available'}

News Sentiment:
- Overall Score: ${newsData.sentimentAnalysis?.overallScore || 'N/A'}
- Key Themes: ${JSON.stringify(newsData.sentimentAnalysis?.keyThemes || [])}
- LLM Insights: ${newsData.llmInsights ? 'Available' : 'Not available'}

Fundamental Data:
- Financial Health: ${fundamentalData.fundamentals?.financialHealth?.rating || 'N/A'}
- Valuation: ${fundamentalData.fundamentals?.valuation?.rating || 'N/A'}
- LLM Insights: ${fundamentalData.llmInsights ? 'Available' : 'Not available'}

Competitive Analysis:
- Market Position: ${competitiveData.competitive?.marketPosition?.marketShare || 'N/A'}%
- Competitive Score: ${competitiveData.competitive?.competitiveScore || 'N/A'}
- LLM Insights: ${competitiveData.llmInsights ? 'Available' : 'Not available'}

Please provide:
1. Data visualization recommendations based on data complexity
2. Information hierarchy and priority suggestions
3. User interaction recommendations
4. Alert and notification suggestions
5. Mobile responsiveness considerations
6. Accessibility recommendations
7. Performance optimization suggestions

Format your response as structured JSON with the following keys:
- visualization: { charts, metrics, layout, complexity }
- hierarchy: { priority, sections, flow, emphasis }
- interaction: { features, alerts, notifications, actions }
- responsiveness: { mobile, tablet, desktop, adaptive }
- accessibility: { contrast, navigation, readability, compliance }
- performance: { optimization, loading, caching, efficiency }

Provide detailed, professional recommendations suitable for a financial analysis application.`;

      const response = await this.ollama.generate(prompt, { 
        maxTokens: 2000,
        temperature: 0.3 
      });

      // Parse LLM response
      const llmInsights = this.parseLLMResponse(response);
      
      return {
        recommendations: llmInsights,
        confidence: this.calculateConfidence(analysisData),
        userExperience: this.generateUserExperienceInsights(analysisData),
        implementation: this.generateImplementationGuidance(llmInsights)
      };

    } catch (error) {
      console.error('❌ [UIAgent] LLM analysis failed:', error);
      logger.error('UIAgent LLM analysis error:', error);
      
      // No fallback - throw error if LLM analysis fails
      throw new Error(`UIAgent LLM analysis error: ${error.message}`);
    }
  }

  parseLLMResponse(response) {
    try {
      // Handle both string and object responses from Ollama
      const responseText = typeof response === 'string' ? response : response.text || response.content || '';
      
      // Try to parse JSON response with better error handling
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (jsonError) {
          console.log('⚠️ [UIAgent] JSON parsing failed, using fallback extraction');
          // Continue to fallback extraction
        }
      }
      
      // Fallback: extract key insights from text
      return {
        visualization: {
          charts: this.extractChartRecommendations(responseText),
          metrics: this.extractMetricsRecommendations(responseText),
          layout: this.extractLayoutRecommendations(responseText),
          complexity: this.extractComplexityLevel(responseText)
        },
        hierarchy: {
          priority: this.extractPriorityRecommendations(responseText),
          sections: this.extractSectionRecommendations(responseText),
          flow: this.extractFlowRecommendations(responseText),
          emphasis: this.extractEmphasisRecommendations(responseText)
        },
        interaction: {
          features: this.extractFeatureRecommendations(responseText),
          alerts: this.extractAlertRecommendations(responseText),
          notifications: this.extractNotificationRecommendations(responseText),
          actions: this.extractActionRecommendations(responseText)
        },
        responsiveness: {
          mobile: this.extractMobileRecommendations(responseText),
          tablet: this.extractTabletRecommendations(responseText),
          desktop: this.extractDesktopRecommendations(responseText),
          adaptive: this.extractAdaptiveRecommendations(responseText)
        },
        accessibility: {
          contrast: this.extractContrastRecommendations(responseText),
          navigation: this.extractNavigationRecommendations(responseText),
          readability: this.extractReadabilityRecommendations(responseText),
          compliance: this.extractComplianceRecommendations(responseText)
        },
        performance: {
          optimization: this.extractOptimizationRecommendations(responseText),
          loading: this.extractLoadingRecommendations(responseText),
          caching: this.extractCachingRecommendations(responseText),
          efficiency: this.extractEfficiencyRecommendations(responseText)
        }
      };
    } catch (error) {
      console.error('❌ [UIAgent] Error parsing LLM response:', error);
      throw new Error('UIAgent LLM response parsing error');
    }
  }

  // Traditional UI analysis methods removed - system is now purely LLM-based
  // All UI recommendations are generated by LLM agents with no traditional fallbacks

  ensureReadability(analysisData) {
    return {
      font_size: 'adjustable',
      line_spacing: 'comfortable',
      text_contrast: 'high'
    };
  }

  ensureCompliance(analysisData) {
    return {
      wcag: 'aa_compliant',
      aria_labels: true,
      keyboard_navigation: true
    };
  }

  optimizePerformance(analysisData) {
    return {
      lazy_loading: true,
      data_caching: true,
      chart_optimization: true
    };
  }

  optimizeLoading(analysisData) {
    return {
      skeleton_screens: true,
      progressive_loading: true,
      background_updates: true
    };
  }

  optimizeCaching(analysisData) {
    return {
      data_cache: '1_hour',
      chart_cache: '30_minutes',
      api_cache: '5_minutes'
    };
  }

  ensureEfficiency(analysisData) {
    return {
      bundle_size: 'optimized',
      api_calls: 'minimized',
      rendering: 'efficient'
    };
  }

  // Helper methods for data extraction from LLM responses
  extractChartRecommendations(response) {
    const charts = [];
    if (response.includes('price chart')) charts.push('price_chart');
    if (response.includes('volume chart')) charts.push('volume_chart');
    if (response.includes('technical chart')) charts.push('technical_chart');
    if (response.includes('sentiment chart')) charts.push('sentiment_chart');
    return charts;
  }

  extractMetricsRecommendations(response) {
    const metrics = [];
    if (response.includes('key metrics')) metrics.push('key_metrics');
    if (response.includes('performance metrics')) metrics.push('performance_metrics');
    if (response.includes('financial metrics')) metrics.push('financial_metrics');
    return metrics;
  }

  extractLayoutRecommendations(response) {
    if (response.includes('grid layout')) return 'grid_layout';
    if (response.includes('card layout')) return 'card_layout';
    if (response.includes('dashboard layout')) return 'dashboard_layout';
    return 'standard_layout';
  }

  extractComplexityLevel(response) {
    if (response.includes('high complexity')) return 'high';
    if (response.includes('low complexity')) return 'low';
    return 'medium';
  }

  extractPriorityRecommendations(response) {
    const priorities = [];
    if (response.includes('technical analysis priority')) priorities.push('technical_analysis');
    if (response.includes('fundamental analysis priority')) priorities.push('fundamental_analysis');
    if (response.includes('sentiment priority')) priorities.push('sentiment_analysis');
    return priorities;
  }

  extractSectionRecommendations(response) {
    const sections = [];
    if (response.includes('overview section')) sections.push('overview');
    if (response.includes('analysis section')) sections.push('analysis');
    if (response.includes('recommendations section')) sections.push('recommendations');
    return sections;
  }

  extractFlowRecommendations(response) {
    if (response.includes('top down flow')) return 'top_down';
    if (response.includes('bottom up flow')) return 'bottom_up';
    return 'linear';
  }

  extractEmphasisRecommendations(response) {
    const emphasis = [];
    if (response.includes('highlight important')) emphasis.push('important_highlight');
    if (response.includes('alert warnings')) emphasis.push('warning_alerts');
    return emphasis;
  }

  extractFeatureRecommendations(response) {
    const features = [];
    if (response.includes('interactive charts')) features.push('interactive_charts');
    if (response.includes('real time updates')) features.push('real_time_updates');
    if (response.includes('comparison tools')) features.push('comparison_tools');
    return features;
  }

  extractAlertRecommendations(response) {
    const alerts = [];
    if (response.includes('price alerts')) alerts.push('price_alerts');
    if (response.includes('technical alerts')) alerts.push('technical_alerts');
    if (response.includes('news alerts')) alerts.push('news_alerts');
    return alerts;
  }

  extractNotificationRecommendations(response) {
    const notifications = [];
    if (response.includes('push notifications')) notifications.push('push_notifications');
    if (response.includes('email notifications')) notifications.push('email_notifications');
    return notifications;
  }

  extractActionRecommendations(response) {
    const actions = [];
    if (response.includes('buy action')) actions.push('buy');
    if (response.includes('sell action')) actions.push('sell');
    if (response.includes('watch action')) actions.push('watch');
    return actions;
  }

  extractMobileRecommendations(response) {
    if (response.includes('mobile optimized')) return { optimized: true, layout: 'mobile_friendly' };
    return { optimized: false, layout: 'standard' };
  }

  extractTabletRecommendations(response) {
    if (response.includes('tablet optimized')) return { optimized: true, layout: 'tablet_friendly' };
    return { optimized: false, layout: 'standard' };
  }

  extractDesktopRecommendations(response) {
    if (response.includes('desktop optimized')) return { optimized: true, layout: 'desktop_friendly' };
    return { optimized: false, layout: 'standard' };
  }

  extractAdaptiveRecommendations(response) {
    if (response.includes('adaptive design')) return 'adaptive';
    return 'responsive';
  }

  extractContrastRecommendations(response) {
    if (response.includes('high contrast')) return 'high_contrast';
    if (response.includes('low contrast')) return 'low_contrast';
    return 'standard_contrast';
  }

  extractNavigationRecommendations(response) {
    if (response.includes('intuitive navigation')) return 'intuitive';
    if (response.includes('simple navigation')) return 'simple';
    return 'standard';
  }

  extractReadabilityRecommendations(response) {
    if (response.includes('high readability')) return 'high';
    if (response.includes('low readability')) return 'low';
    return 'medium';
  }

  extractComplianceRecommendations(response) {
    if (response.includes('accessibility compliant')) return 'compliant';
    return 'basic';
  }

  extractOptimizationRecommendations(response) {
    const optimizations = [];
    if (response.includes('performance optimization')) optimizations.push('performance');
    if (response.includes('loading optimization')) optimizations.push('loading');
    return optimizations;
  }

  extractLoadingRecommendations(response) {
    if (response.includes('fast loading')) return 'fast';
    if (response.includes('slow loading')) return 'slow';
    return 'standard';
  }

  extractCachingRecommendations(response) {
    if (response.includes('aggressive caching')) return 'aggressive';
    if (response.includes('minimal caching')) return 'minimal';
    return 'standard';
  }

  extractEfficiencyRecommendations(response) {
    if (response.includes('high efficiency')) return 'high';
    if (response.includes('low efficiency')) return 'low';
    return 'medium';
  }

  // generateFallbackAnalysis method removed - no fallbacks in LLM-only system

  generateUserExperienceInsights(analysisData) {
    return {
      complexity: this.assessDataComplexity(analysisData),
      dataQuality: this.assessDataQuality(analysisData),
      userEngagement: this.assessUserEngagement(analysisData),
      recommendations: this.generateUXRecommendations(analysisData)
    };
  }

  assessDataComplexity(analysisData) {
    if (!analysisData) return 'low';
    
    const agentCount = Object.keys(analysisData).length;
    const hasLLM = Object.values(analysisData).some(agent => agent?.llmEnhanced);
    
    if (agentCount >= 5 && hasLLM) return 'high';
    if (agentCount >= 3) return 'medium';
    return 'low';
  }

  generateImplementationGuidance(recommendations) {
    return {
      priority: 'high',
      effort: 'medium',
      timeline: '2_weeks',
      resources: ['frontend_developer', 'ui_designer'],
      dependencies: ['api_integration', 'data_processing']
    };
  }

  calculateConfidence(analysisData) {
    let confidence = 50; // Base confidence
    
    if (!analysisData) return confidence;
    
    if (analysisData.StockDataAgent) confidence += 10;
    if (analysisData.NewsSentimentAgent) confidence += 10;
    if (analysisData.FundamentalDataAgent) confidence += 10;
    if (analysisData.CompetitiveAgent) confidence += 10;
    
    // Bonus for LLM-enhanced data
    Object.values(analysisData).forEach(agent => {
      if (agent?.llmEnhanced) confidence += 5;
    });
    
    return Math.min(confidence, 100);
  }

  assessDataQuality(analysisData) {
    if (!analysisData) return 'poor';
    
    const agents = Object.keys(analysisData).length;
    const hasLLM = Object.values(analysisData).some(agent => agent?.llmEnhanced);
    
    if (agents >= 4 && hasLLM) return 'excellent';
    if (agents >= 3) return 'good';
    if (agents >= 2) return 'fair';
    return 'poor';
  }

  assessUserEngagement(analysisData) {
    if (!analysisData) return 'medium';
    
    const hasAlerts = Object.values(analysisData).some(agent => 
      agent?.llmInsights?.analysis?.riskAssessment?.risks?.length > 0
    );
    
    if (hasAlerts) return 'high';
    return 'medium';
  }

  generateUXRecommendations(analysisData) {
    const recommendations = [];
    
    if (!analysisData) return recommendations;
    
    if (Object.values(analysisData).some(agent => agent?.llmEnhanced)) {
      recommendations.push('highlight_ai_insights');
    }
    
    if (Object.values(analysisData).some(agent => agent?.error)) {
      recommendations.push('show_error_states');
    }
    
    return recommendations;
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