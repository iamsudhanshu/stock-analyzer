#!/usr/bin/env node

const config = require('./config');
const logger = require('./utils/logger');
const redisClient = require('./utils/redis');

// Import all agents
const StockDataAgent = require('./agents/stockDataAgent');
const NewsSentimentAgent = require('./agents/newsSentimentAgent');
const FundamentalDataAgent = require('./agents/fundamentalDataAgent');
const CompetitiveAgent = require('./agents/competitiveAgent');
const EnhancedDataAgent = require('./agents/enhancedDataAgent');
const AdvancedTechnicalAgent = require('./agents/advancedTechnicalAgent');
const ReportGeneratorAgent = require('./agents/reportGeneratorAgent');
const AnalysisAgent = require('./agents/analysisAgent');
const UIAgent = require('./agents/uiAgent');

class ApplicationManager {
  constructor() {
    this.agents = new Map();
    this.mode = process.env.START_MODE || 'all'; // 'all', 'ui-only', 'agents-only'
    this.isShuttingDown = false;
    
    console.log('🏗️ [ApplicationManager] Initializing with mode:', this.mode);
  }

  async start() {
    try {
      console.log('🚀 [ApplicationManager] Starting Stock Analysis Application...');
      logger.info('Starting Stock Analysis Application...');
      logger.info(`Mode: ${this.mode}`);
      logger.info(`Environment: ${config.server.nodeEnv}`);

      // Connect to Redis first
      console.log('🔗 [ApplicationManager] Connecting to Redis...');
      await redisClient.connect();
      console.log('✅ [ApplicationManager] Connected to Redis successfully');
      logger.info('Connected to Redis successfully');

      // Create and start agents based on mode
      if (this.mode === 'all' || this.mode === 'agents-only') {
        console.log('🤖 [ApplicationManager] Starting data agents...');
        await this.startDataAgents();
      }

      if (this.mode === 'all' || this.mode === 'ui-only') {
        console.log('🌐 [ApplicationManager] Starting UI agent...');
        await this.startUIAgent();
      }

      // Set up graceful shutdown
      this.setupGracefulShutdown();

      console.log('✅ [ApplicationManager] All agents started successfully');
      logger.info('All agents started successfully');
      
      // Log startup summary
      this.logStartupSummary();

    } catch (error) {
      console.error('💥 [ApplicationManager] Failed to start application:', error);
      logger.error('Failed to start application:', error);
      await this.shutdown();
      process.exit(1);
    }
  }

  async startDataAgents() {
    try {
      console.log('📊 [ApplicationManager] Creating data processing agents...');
      logger.info('Starting data processing agents...');

      // Create agent instances
      const stockDataAgent = new StockDataAgent();
      const newsSentimentAgent = new NewsSentimentAgent();
      const fundamentalDataAgent = new FundamentalDataAgent();
      const competitiveAgent = new CompetitiveAgent();
      const enhancedDataAgent = new EnhancedDataAgent();
      const advancedTechnicalAgent = new AdvancedTechnicalAgent();
      const reportGeneratorAgent = new ReportGeneratorAgent();
      const analysisAgent = new AnalysisAgent();

      console.log('📦 [ApplicationManager] Created agents:', {
        StockDataAgent: !!stockDataAgent,
        NewsSentimentAgent: !!newsSentimentAgent,
        FundamentalDataAgent: !!fundamentalDataAgent,
        CompetitiveAgent: !!competitiveAgent,
        EnhancedDataAgent: !!enhancedDataAgent,
        AdvancedTechnicalAgent: !!advancedTechnicalAgent,
        ReportGeneratorAgent: !!reportGeneratorAgent,
        AnalysisAgent: !!analysisAgent
      });

      // Store agent references
      this.agents.set('StockDataAgent', stockDataAgent);
      this.agents.set('NewsSentimentAgent', newsSentimentAgent);
      this.agents.set('FundamentalDataAgent', fundamentalDataAgent);
      this.agents.set('CompetitiveAgent', competitiveAgent);
      this.agents.set('EnhancedDataAgent', enhancedDataAgent);
      this.agents.set('AdvancedTechnicalAgent', advancedTechnicalAgent);
      this.agents.set('ReportGeneratorAgent', reportGeneratorAgent);
      this.agents.set('AnalysisAgent', analysisAgent);

      console.log('🔄 [ApplicationManager] Starting data agents in parallel...');
      
      // Start all data agents in parallel
      await Promise.all([
        stockDataAgent.start().then(() => console.log('✅ [ApplicationManager] StockDataAgent started')),
        newsSentimentAgent.start().then(() => console.log('✅ [ApplicationManager] NewsSentimentAgent started')),
        fundamentalDataAgent.start().then(() => console.log('✅ [ApplicationManager] FundamentalDataAgent started')),
        competitiveAgent.start().then(() => console.log('✅ [ApplicationManager] CompetitiveAgent started')),
        enhancedDataAgent.start().then(() => console.log('✅ [ApplicationManager] EnhancedDataAgent started')),
        advancedTechnicalAgent.start().then(() => console.log('✅ [ApplicationManager] AdvancedTechnicalAgent started')),
        reportGeneratorAgent.start().then(() => console.log('✅ [ApplicationManager] ReportGeneratorAgent started')),
        analysisAgent.start().then(() => console.log('✅ [ApplicationManager] AnalysisAgent started'))
      ]);

      console.log('🎉 [ApplicationManager] All data processing agents started successfully');
      logger.info('Data processing agents started successfully');

    } catch (error) {
      console.error('💥 [ApplicationManager] Failed to start data agents:', error);
      logger.error('Failed to start data agents:', error);
      throw error;
    }
  }

  async startUIAgent() {
    try {
      console.log('🌐 [ApplicationManager] Creating UI agent...');
      logger.info('Starting UI agent...');

      const uiAgent = new UIAgent();
      this.agents.set('UIAgent', uiAgent);

      console.log('🔄 [ApplicationManager] Starting UI agent...');
      await uiAgent.start();

      console.log(`✅ [ApplicationManager] UI agent started successfully on port ${config.server.port}`);
      logger.info(`UI agent started successfully on port ${config.server.port}`);

    } catch (error) {
      console.error('💥 [ApplicationManager] Failed to start UI agent:', error);
      logger.error('Failed to start UI agent:', error);
      throw error;
    }
  }

  setupGracefulShutdown() {
    console.log('🛡️ [ApplicationManager] Setting up graceful shutdown handlers...');
    
    const signals = ['SIGINT', 'SIGTERM', 'SIGUSR2'];
    
    signals.forEach(signal => {
      process.on(signal, () => {
        console.log(`🛑 [ApplicationManager] Received ${signal}, shutting down gracefully...`);
        logger.info(`Received ${signal}, shutting down gracefully...`);
        this.shutdown().then(() => {
          console.log('👋 [ApplicationManager] Graceful shutdown completed');
          process.exit(0);
        }).catch(error => {
          console.error('💥 [ApplicationManager] Error during shutdown:', error);
          logger.error('Error during shutdown:', error);
          process.exit(1);
        });
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('💥 [ApplicationManager] Uncaught exception:', error);
      logger.error('Uncaught exception:', error);
      this.shutdown().then(() => {
        process.exit(1);
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 [ApplicationManager] Unhandled rejection at:', promise, 'reason:', reason);
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      this.shutdown().then(() => {
        process.exit(1);
      });
    });
  }

  async shutdown() {
    if (this.isShuttingDown) {
      console.log('⏳ [ApplicationManager] Shutdown already in progress...');
      return;
    }

    this.isShuttingDown = true;
    console.log('🛑 [ApplicationManager] Shutting down application...');
    logger.info('Shutting down application...');

    try {
      // Stop all agents
      console.log('🔄 [ApplicationManager] Stopping all agents...');
      const shutdownPromises = Array.from(this.agents.values()).map(agent => {
        console.log(`🔄 [ApplicationManager] Stopping ${agent.agentName}...`);
        return agent.stop().then(() => {
          console.log(`✅ [ApplicationManager] ${agent.agentName} stopped`);
        }).catch(error => {
          console.error(`💥 [ApplicationManager] Error stopping ${agent.agentName}:`, error);
          logger.error(`Error stopping ${agent.agentName}:`, error);
        });
      });

      // Wait for all agents to stop
      await Promise.all(shutdownPromises);
      console.log('✅ [ApplicationManager] All agents stopped');

      // Disconnect from Redis
      console.log('🔗 [ApplicationManager] Disconnecting from Redis...');
      await redisClient.disconnect();
      console.log('✅ [ApplicationManager] Disconnected from Redis');

      console.log('🏁 [ApplicationManager] Application shutdown complete');
      logger.info('Application shutdown complete');

    } catch (error) {
      console.error('💥 [ApplicationManager] Error during shutdown:', error);
      logger.error('Error during shutdown:', error);
    }
  }

  logStartupSummary() {
    const summary = {
      mode: this.mode,
      environment: config.server.nodeEnv,
      redisConnected: redisClient.isConnected,
      agents: Array.from(this.agents.keys()),
      port: this.agents.has('UIAgent') ? config.server.port : null,
      startupTime: process.uptime()
    };

    console.log('📊 [ApplicationManager] Startup summary:', summary);
    logger.info('Application startup summary:', summary);

    // Log configuration warnings
    if (!config.apiKeys.alphaVantage && !config.apiKeys.finnhub) {
      console.log('⚠️ [ApplicationManager] No stock data API keys configured - using mock data');
      logger.warn('No stock data API keys configured - using mock data');
    }

    if (!config.apiKeys.newsApi) {
      console.log('⚠️ [ApplicationManager] No news API key configured - using mock data');
      logger.warn('No news API key configured - using mock data');
    }
  }

  // Health check method for monitoring
  async getHealthStatus() {
    console.log('🔍 [ApplicationManager] Performing health check...');
    
    const status = {
      application: {
        status: 'running',
        uptime: process.uptime(),
        mode: this.mode,
        environment: config.server.nodeEnv
      },
      redis: {
        connected: redisClient.isConnected
      },
      agents: {}
    };

    // Get health status from each agent
    for (const [name, agent] of this.agents) {
      try {
        console.log(`🔍 [ApplicationManager] Checking health of ${name}...`);
        if (agent.healthCheck) {
          status.agents[name] = await agent.healthCheck();
        } else {
          status.agents[name] = {
            status: agent.isRunning ? 'running' : 'stopped'
          };
        }
        console.log(`✅ [ApplicationManager] ${name} health:`, status.agents[name]);
      } catch (error) {
        console.error(`💥 [ApplicationManager] Health check failed for ${name}:`, error);
        status.agents[name] = {
          status: 'error',
          error: error.message
        };
      }
    }

    console.log('📊 [ApplicationManager] Overall health status:', status);
    return status;
  }
}

// CLI handling
function printUsage() {
  console.log(`
Usage: node src/index.js [mode]

Modes:
  all         - Start all agents including UI (default)
  ui-only     - Start only the UI agent
  agents-only - Start only the data processing agents

Environment Variables:
  START_MODE - Set the startup mode (overrides command line argument)
  NODE_ENV   - Set environment (development/production)

Examples:
  node src/index.js all
  node src/index.js ui-only
  START_MODE=agents-only node src/index.js
`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('-h') || args.includes('--help')) {
    printUsage();
    process.exit(0);
  }

  // Set mode from command line argument or environment variable
  if (args.length > 0) {
    process.env.START_MODE = args[0];
  }

  const validModes = ['all', 'ui-only', 'agents-only'];
  const mode = process.env.START_MODE || 'all';

  if (!validModes.includes(mode)) {
    console.error(`Invalid mode: ${mode}`);
    console.error(`Valid modes: ${validModes.join(', ')}`);
    process.exit(1);
  }

  // Create and start the application
  const app = new ApplicationManager();
  await app.start();

  // Keep the process alive
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down...');
    app.shutdown().then(() => process.exit(0));
  });
}

// Start the application if this file is run directly
if (require.main === module) {
  main().catch(error => {
    console.error('Failed to start application:', error);
    process.exit(1);
  });
}

module.exports = ApplicationManager; 