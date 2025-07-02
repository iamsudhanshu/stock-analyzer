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
    fred: process.env.FRED_API_KEY,
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

  // Database Configuration
  database: {
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/stock_analysis'
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info'
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
    newsTTL: parseInt(process.env.NEWS_CACHE_TTL) || 1800,
    economicDataTTL: parseInt(process.env.ECONOMIC_DATA_CACHE_TTL) || 3600
  },

  // Analysis Configuration
  analysis: {
    confidenceThreshold: parseFloat(process.env.CONFIDENCE_THRESHOLD) || 0.6,
    weights: {
      sentiment: parseFloat(process.env.SENTIMENT_WEIGHT) || 0.3,
      technical: parseFloat(process.env.TECHNICAL_WEIGHT) || 0.4,
      economic: parseFloat(process.env.ECONOMIC_WEIGHT) || 0.3
    }
  },

  // Queue Names
  queues: {
    stockData: 'stock_data_queue',
    news: 'news_queue',
    economic: 'economic_queue',
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
    fred: 'https://api.stlouisfed.org/fred',
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