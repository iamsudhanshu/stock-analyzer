const axios = require('axios');
const moment = require('moment');
const { SMA, EMA, RSI, MACD, BollingerBands, Stochastic } = require('technicalindicators');
const BaseAgent = require('./BaseAgent');
const config = require('../config');
const logger = require('../utils/logger');

class StockDataAgent extends BaseAgent {
  constructor() {
    super(
      'StockDataAgent',
      [config.queues.stockData],
      [config.queues.analysis]
    );
    
    this.apiProviders = [
      { name: 'alphaVantage', priority: 1, rateLimit: { requests: 5, windowMs: 60000 } },
      { name: 'finnhub', priority: 2, rateLimit: { requests: 60, windowMs: 60000 } },
      { name: 'twelveData', priority: 3, rateLimit: { requests: 800, windowMs: 86400000 } }
    ];
  }

  async handleRequest(payload, requestId) {
    try {
      const { symbol } = payload;
      
      if (!symbol) {
        throw new Error('Symbol is required');
      }

      await this.sendProgress(requestId, 10, 'Starting stock data collection...');

      // Get current price data
      const currentData = await this.getCurrentPrice(symbol, requestId);
      
      await this.sendProgress(requestId, 30, 'Fetching historical data...');

      // Get historical data for different periods
      const historicalData = await this.getHistoricalData(symbol, requestId);
      
      await this.sendProgress(requestId, 60, 'Calculating technical indicators...');

      // Calculate technical indicators
      const technicalIndicators = this.calculateTechnicalIndicators(historicalData);
      
      await this.sendProgress(requestId, 80, 'Analyzing volume data...');

      // Get volume analysis
      const volumeAnalysis = this.analyzeVolume(historicalData);
      
      await this.sendProgress(requestId, 100, 'Stock data analysis complete');

      return {
        symbol: symbol.toUpperCase(),
        currentPrice: currentData,
        historical: historicalData,
        technicalIndicators,
        volumeAnalysis,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`StockDataAgent error for request ${requestId}:`, error);
      throw error;
    }
  }

  async getCurrentPrice(symbol, requestId) {
    const cacheKey = `current_price:${symbol}`;
    
    // Check cache first
    let cachedData = await this.getCachedData(cacheKey);
    if (cachedData) {
      logger.debug(`Using cached current price for ${symbol}`);
      return cachedData;
    }

    // Try each API provider in order of priority
    for (const provider of this.apiProviders) {
      try {
        // Check rate limiting
        const canProceed = await this.checkRateLimit(
          provider.name,
          provider.rateLimit.requests,
          provider.rateLimit.windowMs
        );

        if (!canProceed) {
          logger.warn(`Rate limit exceeded for ${provider.name}`);
          continue;
        }

        let currentData;
        
        switch (provider.name) {
          case 'alphaVantage':
            currentData = await this.fetchAlphaVantageCurrent(symbol);
            break;
          case 'finnhub':
            currentData = await this.fetchFinnhubCurrent(symbol);
            break;
          case 'twelveData':
            currentData = await this.fetchTwelveDataCurrent(symbol);
            break;
        }

        if (currentData) {
          // Cache for 1 minute
          await this.setCachedData(cacheKey, currentData, config.cache.stockDataTTL);
          return currentData;
        }

      } catch (error) {
        logger.warn(`Failed to fetch current price from ${provider.name}:`, error.message);
        continue;
      }
    }

    throw new Error(`Unable to fetch current price for ${symbol} from any provider`);
  }

  async fetchAlphaVantageCurrent(symbol) {
    if (!config.apiKeys.alphaVantage) {
      throw new Error('Alpha Vantage API key not configured');
    }

    const response = await axios.get(config.apiEndpoints.alphaVantage, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol,
        apikey: config.apiKeys.alphaVantage
      },
      timeout: 10000
    });

    const quote = response.data['Global Quote'];
    if (!quote || !quote['05. price']) {
      throw new Error('No quote data received from Alpha Vantage');
    }

    return {
      price: parseFloat(quote['05. price']),
      change: parseFloat(quote['09. change']),
      changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
      volume: parseInt(quote['06. volume']),
      high: parseFloat(quote['03. high']),
      low: parseFloat(quote['04. low']),
      open: parseFloat(quote['02. open']),
      previousClose: parseFloat(quote['08. previous close']),
      timestamp: new Date(quote['07. latest trading day']).toISOString(),
      provider: 'alphaVantage'
    };
  }

  async getHistoricalData(symbol, requestId) {
    const cacheKey = `historical:${symbol}`;
    
    // Check cache first (cache for 5 minutes)
    let cachedData = await this.getCachedData(cacheKey);
    if (cachedData) {
      logger.debug(`Using cached historical data for ${symbol}`);
      return cachedData;
    }

    // Generate mock data if no API keys are available
    if (!config.apiKeys.alphaVantage && !config.apiKeys.finnhub && !config.apiKeys.twelveData) {
      logger.warn('No API keys configured, generating mock historical data');
      const mockData = this.generateMockHistoricalData(symbol);
      await this.setCachedData(cacheKey, mockData, 300);
      return mockData;
    }

    throw new Error(`Unable to fetch historical data for ${symbol} - API keys required`);
  }

  generateMockHistoricalData(symbol) {
    const data = [];
    const basePrice = 100 + Math.random() * 400; // Random base price between 100-500
    let currentPrice = basePrice;
    
    for (let i = 100; i >= 0; i--) {
      const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
      
      // Simulate price movement
      const change = (Math.random() - 0.5) * 0.1; // ±5% daily change
      currentPrice = currentPrice * (1 + change);
      
      const open = currentPrice * (0.98 + Math.random() * 0.04);
      const close = currentPrice;
      const high = Math.max(open, close) * (1 + Math.random() * 0.03);
      const low = Math.min(open, close) * (0.97 + Math.random() * 0.03);
      const volume = Math.floor(1000000 + Math.random() * 5000000);
      
      data.push({
        date,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume
      });
    }
    
    return data;
  }

  calculateTechnicalIndicators(historicalData) {
    if (!historicalData || historicalData.length < 20) {
      return null;
    }

    const closes = historicalData.map(d => d.close);
    const highs = historicalData.map(d => d.high);
    const lows = historicalData.map(d => d.low);

    try {
      const indicators = {
        sma: {},
        ema: {},
        rsi: null,
        macd: null,
        bollingerBands: null,
        stochastic: null
      };

      // Simple Moving Averages
      if (closes.length >= 20) {
        indicators.sma.sma20 = SMA.calculate({ period: 20, values: closes });
      }
      if (closes.length >= 50) {
        indicators.sma.sma50 = SMA.calculate({ period: 50, values: closes });
      }
      if (closes.length >= 200) {
        indicators.sma.sma200 = SMA.calculate({ period: 200, values: closes });
      }

      // Exponential Moving Averages
      if (closes.length >= 12) {
        indicators.ema.ema12 = EMA.calculate({ period: 12, values: closes });
      }
      if (closes.length >= 26) {
        indicators.ema.ema26 = EMA.calculate({ period: 26, values: closes });
      }

      // RSI
      if (closes.length >= 14) {
        indicators.rsi = RSI.calculate({ period: 14, values: closes });
      }

      // MACD
      if (closes.length >= 26) {
        indicators.macd = MACD.calculate({
          fastPeriod: 12,
          slowPeriod: 26,
          signalPeriod: 9,
          values: closes
        });
      }

      // Bollinger Bands
      if (closes.length >= 20) {
        indicators.bollingerBands = BollingerBands.calculate({
          period: 20,
          stdDev: 2,
          values: closes
        });
      }

      // Stochastic
      if (highs.length >= 14 && lows.length >= 14 && closes.length >= 14) {
        indicators.stochastic = Stochastic.calculate({
          high: highs,
          low: lows,
          close: closes,
          period: 14,
          signalPeriod: 3
        });
      }

      return indicators;
    } catch (error) {
      logger.error('Error calculating technical indicators:', error);
      return null;
    }
  }

  analyzeVolume(historicalData) {
    if (!historicalData || historicalData.length < 20) {
      return null;
    }

    const volumes = historicalData.map(d => d.volume);
    const recentVolumes = volumes.slice(-20);
    const avgVolume = recentVolumes.reduce((sum, vol) => sum + vol, 0) / recentVolumes.length;
    const currentVolume = volumes[volumes.length - 1];
    
    return {
      currentVolume,
      avgVolume20: Math.round(avgVolume),
      volumeRatio: (currentVolume / avgVolume).toFixed(2),
      isAboveAverage: currentVolume > avgVolume,
      volumeTrend: this.calculateVolumeTrend(recentVolumes)
    };
  }

  calculateVolumeTrend(volumes) {
    if (volumes.length < 5) return 'insufficient_data';
    
    const recent = volumes.slice(-5);
    const earlier = volumes.slice(-10, -5);
    
    const recentAvg = recent.reduce((sum, vol) => sum + vol, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, vol) => sum + vol, 0) / earlier.length;
    
    const change = (recentAvg - earlierAvg) / earlierAvg;
    
    if (change > 0.2) return 'increasing';
    if (change < -0.2) return 'decreasing';
    return 'stable';
  }
}

// Start the agent if this file is run directly
if (require.main === module) {
  const agent = new StockDataAgent();
  agent.start().catch(error => {
    logger.error('Failed to start StockDataAgent:', error);
    process.exit(1);
  });
}

module.exports = StockDataAgent; 