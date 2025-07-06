require('dotenv').config();

const config = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
  },

  // API Keys
  apiKeys: {
    alphaVantage: process.env.ALPHA_VANTAGE_API_KEY,
    finnhub: process.env.FINNHUB_API_KEY,
    twelveData: process.env.TWELVE_DATA_API_KEY,
    newsApi: process.env.NEWS_API_KEY,
    newsData: process.env.NEWSDATA_API_KEY,
    webz: process.env.WEBZ_API_KEY,
    stockTwits: process.env.STOCKTWITS_ACCESS_TOKEN,
    twitter: process.env.TWITTER_BEARER_TOKEN,
    twinword: process.env.TWINWORD_API_KEY
  },

  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3
  },

  // Ollama Configuration
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    defaultModel: process.env.OLLAMA_MODEL || 'llama3.1:8b',
    timeout: parseInt(process.env.OLLAMA_TIMEOUT) || 180000, // 3 minutes for LLM
    maxRetries: parseInt(process.env.OLLAMA_MAX_RETRIES) || 3,
    enabled: process.env.OLLAMA_ENABLED !== 'false', // Default to enabled
    
    // Model preferences for different tasks
    models: {
      sentiment: process.env.OLLAMA_SENTIMENT_MODEL || 'llama3.1:8b',
      analysis: process.env.OLLAMA_ANALYSIS_MODEL || 'llama3.1:8b',
      technical: process.env.OLLAMA_TECHNICAL_MODEL || 'llama3.1:8b'
    },
    
    // Temperature settings for different tasks
    temperatures: {
      sentiment: 0.3,
      analysis: 0.4,
      technical: 0.3,
      general: 0.7
    },
    
    // Model requirements and recommendations
    recommendedModels: [
      'llama3.1:8b',
      'llama3.1:8b',
      'llama4:sonar',
      'llama3.1:70b',
      'mistral:7b',
      'phi3:medium',
      'qwen2:7b'
    ]
  },

  // Database Configuration
  database: {
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/stock_analysis'
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'debug'
  },

  // Rate Limiting
  rateLimiting: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },

  // Cache Configuration
  cache: {
    defaultTTL: parseInt(process.env.CACHE_TTL_SECONDS) || 300,
    stockDataTTL: parseInt(process.env.STOCK_DATA_CACHE_TTL) || 60,
    newsTTL: parseInt(process.env.NEWS_CACHE_TTL) || 1800
  },

  // Analysis Configuration
  analysis: {
    // Analysis configuration
    maxConcurrentRequests: 5,
    requestTimeout: 10000, // 10 seconds for API calls
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
    
    // LLM configuration
    llmMaxTokens: 2000,
    llmTemperature: 0.3,
    llmTimeout: 180000, // 3 minutes for LLM
    
    // Cache configuration
    cacheEnabled: true,
    cacheTTL: 3600, // 1 hour
    
    // Data quality thresholds
    minDataQuality: 0.7,
    maxDataAge: 86400, // 24 hours
    
    // Real-time updates
    realTimeUpdates: true,
    updateInterval: 300000, // 5 minutes
  },

  // Queue Names
  queues: {
    stockData: 'stock_data_queue',
    newsSentiment: 'news_sentiment_queue',
    fundamentalData: 'fundamental_data_queue',
    competitiveAnalysis: 'competitive_analysis_queue',
    enhancedData: 'enhanced_data_queue',
    advancedTechnical: 'advanced_technical_queue',
    reportGeneration: 'report_generation_queue',
    analysis: 'analysis_queue',
    ui: 'ui_queue'
  },

  // API Endpoints
  apiEndpoints: {
    alphaVantage: 'https://www.alphavantage.co/query',
    finnhub: 'https://finnhub.io/api/v1',
    twelveData: 'https://api.twelvedata.com',
    newsApi: 'https://newsapi.org/v2',
    newsData: 'https://newsdata.io/api/1',
    webz: 'https://api.webz.io/newsApiLite',
    stockTwits: 'https://api.stocktwits.com/api/2',
    twitter: 'https://api.twitter.com/2',
    twinword: 'https://api.twinword.com/v2'
  },

  // Investment Horizons
  investmentHorizons: {
    shortTerm: {
      name: 'Short Term',
      period: '1-4 weeks',
      days: 28
    },
    midTerm: {
      name: 'Mid Term', 
      period: '1-6 months',
      days: 180
    },
    longTerm: {
      name: 'Long Term',
      period: '6+ months', 
      days: 365
    }
  }
};

// Validate required API keys
const requiredApiKeys = ['alphaVantage', 'newsApi'];
const missingKeys = requiredApiKeys.filter(key => !config.apiKeys[key]);

if (missingKeys.length > 0 && config.server.nodeEnv === 'production') {
  console.error(`Missing required API keys: ${missingKeys.join(', ')}`);
  process.exit(1);
}

module.exports = config; 