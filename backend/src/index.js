#!/usr/bin/env node

const config = require('./config');
const logger = require('./utils/logger');
const redisClient = require('./utils/redis');

// Import all agents
const StockDataAgent = require('./agents/stockDataAgent');
const NewsSentimentAgent = require('./agents/newsSentimentAgent');
const EconomicIndicatorAgent = require('./agents/economicIndicatorAgent');
const AnalysisAgent = require('./agents/analysisAgent');
const UIAgent = require('./agents/uiAgent');

class ApplicationManager {
  constructor() {
    this.agents = new Map();
    this.mode = process.env.START_MODE || 'all'; // 'all', 'ui-only', 'agents-only'
    this.isShuttingDown = false;
  }

  async start() {
    try {
      logger.info('Starting Stock Analysis Application...');
      logger.info(`Mode: ${this.mode}`);
      logger.info(`Environment: ${config.server.nodeEnv}`);

      // Connect to Redis first
      await redisClient.connect();
      logger.info('Connected to Redis successfully');

      // Create and start agents based on mode
      if (this.mode === 'all' || this.mode === 'agents-only') {
        await this.startDataAgents();
      }

      if (this.mode === 'all' || this.mode === 'ui-only') {
        await this.startUIAgent();
      }

      // Set up graceful shutdown
      this.setupGracefulShutdown();

      logger.info('All agents started successfully');
      
      // Log startup summary
      this.logStartupSummary();

    } catch (error) {
      logger.error('Failed to start application:', error);
      await this.shutdown();
      process.exit(1);
    }
  }

  async startDataAgents() {
    try {
      logger.info('Starting data processing agents...');

      // Create agent instances
      const stockDataAgent = new StockDataAgent();
      const newsSentimentAgent = new NewsSentimentAgent();
      const economicIndicatorAgent = new EconomicIndicatorAgent();
      const analysisAgent = new AnalysisAgent();

      // Store agent references
      this.agents.set('StockDataAgent', stockDataAgent);
      this.agents.set('NewsSentimentAgent', newsSentimentAgent);
      this.agents.set('EconomicIndicatorAgent', economicIndicatorAgent);
      this.agents.set('AnalysisAgent', analysisAgent);

      // Start all data agents in parallel
      await Promise.all([
        stockDataAgent.start(),
        newsSentimentAgent.start(),
        economicIndicatorAgent.start(),
        analysisAgent.start()
      ]);

      logger.info('Data processing agents started successfully');

    } catch (error) {
      logger.error('Failed to start data agents:', error);
      throw error;
    }
  }

  async startUIAgent() {
    try {
      logger.info('Starting UI agent...');

      const uiAgent = new UIAgent();
      this.agents.set('UIAgent', uiAgent);

      await uiAgent.start();

      logger.info(`UI agent started successfully on port ${config.server.port}`);

    } catch (error) {
      logger.error('Failed to start UI agent:', error);
      throw error;
    }
  }

  setupGracefulShutdown() {
    const signals = ['SIGINT', 'SIGTERM', 'SIGUSR2'];
    
    signals.forEach(signal => {
      process.on(signal, () => {
        logger.info(`Received ${signal}, shutting down gracefully...`);
        this.shutdown().then(() => {
          process.exit(0);
        }).catch(error => {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        });
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      this.shutdown().then(() => {
        process.exit(1);
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      this.shutdown().then(() => {
        process.exit(1);
      });
    });
  }

  async shutdown() {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.info('Shutting down application...');

    try {
      // Stop all agents
      const shutdownPromises = Array.from(this.agents.values()).map(agent => {
        return agent.stop().catch(error => {
          logger.error(`Error stopping ${agent.agentName}:`, error);
        });
      });

      // Wait for all agents to stop
      await Promise.all(shutdownPromises);

      // Disconnect from Redis
      await redisClient.disconnect();

      logger.info('Application shutdown complete');

    } catch (error) {
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

    logger.info('Application startup summary:', summary);

    // Log configuration warnings
    if (!config.apiKeys.alphaVantage && !config.apiKeys.finnhub) {
      logger.warn('No stock data API keys configured - using mock data');
    }

    if (!config.apiKeys.newsApi) {
      logger.warn('No news API key configured - using mock data');
    }

    if (!config.apiKeys.fred) {
      logger.warn('No FRED API key configured - using mock economic data');
    }
  }

  // Health check method for monitoring
  async getHealthStatus() {
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
        if (agent.healthCheck) {
          status.agents[name] = await agent.healthCheck();
        } else {
          status.agents[name] = {
            status: agent.isRunning ? 'running' : 'stopped'
          };
        }
      } catch (error) {
        status.agents[name] = {
          status: 'error',
          error: error.message
        };
      }
    }

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