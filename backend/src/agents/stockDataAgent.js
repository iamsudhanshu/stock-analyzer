const axios = require('axios');
const moment = require('moment');
const { SMA, EMA, RSI, MACD, BollingerBands, Stochastic } = require('technicalindicators');
const BaseAgent = require('./BaseAgent');
const config = require('../config');
const logger = require('../utils/logger');
const OllamaService = require('../utils/ollama');

class StockDataAgent extends BaseAgent {
  constructor() {
    super(
      'StockDataAgent',
      [config.queues.stockData],
      [config.queues.analysis]
    );
    
    this.apiProviders = [
     // { name: 'alphaVantage', priority: 1, rateLimit: { requests: 5, windowMs: 60000 } },
     // { name: 'finnhub', priority: 1, rateLimit: { requests: 60, windowMs: 60000 } }
      { name: 'twelveData', priority: 3, rateLimit: { requests: 800, windowMs: 86400000 } }
    ];
    
    this.ollama = new OllamaService();
    this.ollamaEnabled = false;
    
    // Initialize Ollama service
    this.initializeOllama();
  }

  async initializeOllama() {
    try {
      this.ollamaEnabled = await this.ollama.isAvailable();
      if (this.ollamaEnabled) {
        logger.info('StockDataAgent: Ollama service available - LLM-enhanced technical analysis enabled');
      } else {
        logger.warn('StockDataAgent: Ollama not available - using traditional technical analysis');
      }
    } catch (error) {
      logger.error('StockDataAgent: Error initializing Ollama:', error.message);
      this.ollamaEnabled = false;
    }
  }

  async handleRequest(payload, requestId) {
    try {
      const { symbol } = payload;
      
      if (!symbol) {
        throw new Error('Symbol is required');
      }

      await this.sendProgress(requestId, 3, 'Starting stock data collection...');

      // Get current price data
      const currentData = await this.getCurrentPrice(symbol, requestId);
      
      await this.sendProgress(requestId, 10, 'Fetching historical data...');

      // Get historical data for different periods
      const historicalData = await this.getHistoricalData(symbol, requestId);
      
      await this.sendProgress(requestId, 20, 'Calculating technical indicators...');

      // Calculate technical indicators
      const technicalIndicators = this.calculateTechnicalIndicators(historicalData);
      
      await this.sendProgress(requestId, 26, 'Analyzing volume data...');

      // Get volume analysis
      const volumeAnalysis = this.analyzeVolume(historicalData);
      
      // LLM-enhanced technical pattern analysis
      let patternAnalysis = null;
      if (this.ollamaEnabled) {
        try {
          await this.sendProgress(requestId, 30, 'Analyzing chart patterns with AI...');
          patternAnalysis = await this.analyzeChartPatterns(symbol, historicalData, technicalIndicators);
        } catch (error) {
          logger.warn(`LLM pattern analysis failed for ${symbol}:`, error.message);
        }
      }
      
      await this.sendProgress(requestId, 33, 'Stock data analysis complete');

      return {
        symbol: symbol.toUpperCase(),
        currentPrice: currentData,
        historical: historicalData,
        technicalIndicators,
        volumeAnalysis,
        patternAnalysis,
        llmEnhanced: this.ollamaEnabled,
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

        let historicalData;
        
        switch (provider.name) {
          case 'alphaVantage':
            if (config.apiKeys.alphaVantage) {
              historicalData = await this.fetchAlphaVantageHistorical(symbol);
            }
            break;
          case 'finnhub':
            if (config.apiKeys.finnhub) {
              historicalData = await this.fetchFinnhubHistorical(symbol);
            }
            break;
          case 'twelveData':
            if (config.apiKeys.twelveData) {
              historicalData = await this.fetchTwelveDataHistorical(symbol);
            }
            break;
        }

        if (historicalData && historicalData.length > 0) {
          // Cache for 5 minutes
          await this.setCachedData(cacheKey, historicalData, 300);
          return historicalData;
        }

      } catch (error) {
        logger.warn(`Failed to fetch historical data from ${provider.name}:`, error.message);
        continue;
      }
    }

    // If all APIs failed or no API keys available, generate mock data
    logger.warn(`Unable to fetch real historical data for ${symbol}, generating mock data`);
    const mockData = this.generateMockHistoricalData(symbol);
    await this.setCachedData(cacheKey, mockData, 300);
    return mockData;
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

  // ============ LLM-Enhanced Technical Analysis ============

  async analyzeChartPatterns(symbol, historicalData, technicalIndicators) {
    if (!this.ollamaEnabled || !historicalData || historicalData.length < 20) {
      return null;
    }

    try {
      // Prepare technical data summary for LLM analysis
      const recentData = historicalData.slice(-30); // Last 30 days
      const priceData = this.preparePriceDataSummary(recentData);
      const indicatorSummary = this.prepareIndicatorSummary(technicalIndicators);

      const prompt = `Analyze the technical chart patterns and indicators for ${symbol}:

RECENT PRICE ACTION (Last 30 days):
${priceData}

TECHNICAL INDICATORS:
${indicatorSummary}

Please identify and analyze:
1. Chart patterns (triangles, flags, head & shoulders, etc.)
2. Support and resistance levels
3. Trend analysis and momentum
4. Volume patterns and their significance
5. Entry and exit signals
6. Risk levels and stop-loss suggestions

Format as JSON:
{
    "patterns": {
        "identified": ["pattern1", "pattern2"],
        "primary": "Most significant pattern",
        "confidence": 0.85,
        "description": "Detailed pattern description"
    },
    "supportResistance": {
        "support": [145.50, 142.80],
        "resistance": [152.75, 155.20],
        "keyLevel": 150.00,
        "strength": "strong|moderate|weak"
    },
    "trend": {
        "shortTerm": "bullish|bearish|neutral",
        "mediumTerm": "bullish|bearish|neutral",
        "momentum": "increasing|decreasing|stable",
        "strength": "strong|moderate|weak"
    },
    "signals": {
        "buy": ["signal1", "signal2"],
        "sell": ["signal1", "signal2"],
        "current": "buy|sell|hold",
        "confidence": 0.75
    },
    "riskManagement": {
        "stopLoss": 147.25,
        "riskLevel": "low|medium|high",
        "positionSizing": "conservative|normal|aggressive"
    },
    "outlook": "Comprehensive technical outlook and next moves"
}`;

      const response = await this.ollama.generate(prompt, {
        temperature: config.ollama.temperatures.technical,
        maxTokens: 2000,
        model: config.ollama.models.technical
      });

      return this.ollama.parseJsonResponse(response.text, {
        patterns: { identified: [], primary: 'No clear pattern', confidence: 0.5 },
        supportResistance: { support: [], resistance: [], keyLevel: null, strength: 'moderate' },
        trend: { shortTerm: 'neutral', mediumTerm: 'neutral', momentum: 'stable', strength: 'moderate' },
        signals: { buy: [], sell: [], current: 'hold', confidence: 0.5 },
        riskManagement: { stopLoss: null, riskLevel: 'medium', positionSizing: 'normal' },
        outlook: 'Technical analysis unavailable'
      });

    } catch (error) {
      logger.error('Chart pattern analysis failed:', error);
      return null;
    }
  }

  preparePriceDataSummary(recentData) {
    return recentData.map((day, index) => {
      const change = index > 0 ? ((day.close - recentData[index - 1].close) / recentData[index - 1].close * 100).toFixed(2) : '0.00';
      return `${day.date}: Open $${day.open}, High $${day.high}, Low $${day.low}, Close $${day.close} (${change > 0 ? '+' : ''}${change}%), Vol ${(day.volume / 1000000).toFixed(1)}M`;
    }).join('\n');
  }

  prepareIndicatorSummary(indicators) {
    if (!indicators) return 'Technical indicators not available';

    const summary = [];

    // RSI
    if (indicators.rsi && indicators.rsi.length > 0) {
      const latestRSI = indicators.rsi[indicators.rsi.length - 1];
      summary.push(`RSI (14): ${latestRSI.toFixed(2)} - ${latestRSI > 70 ? 'Overbought' : latestRSI < 30 ? 'Oversold' : 'Neutral'}`);
    }

    // Moving Averages
    if (indicators.sma?.sma20?.length > 0) {
      summary.push(`SMA20: ${indicators.sma.sma20[indicators.sma.sma20.length - 1].toFixed(2)}`);
    }
    if (indicators.sma?.sma50?.length > 0) {
      summary.push(`SMA50: ${indicators.sma.sma50[indicators.sma.sma50.length - 1].toFixed(2)}`);
    }

    // MACD
    if (indicators.macd && indicators.macd.length > 0) {
      const latestMACD = indicators.macd[indicators.macd.length - 1];
      summary.push(`MACD: ${latestMACD.MACD.toFixed(3)}, Signal: ${latestMACD.signal.toFixed(3)}, Histogram: ${latestMACD.histogram.toFixed(3)}`);
    }

    // Bollinger Bands
    if (indicators.bollingerBands && indicators.bollingerBands.length > 0) {
      const latestBB = indicators.bollingerBands[indicators.bollingerBands.length - 1];
      summary.push(`Bollinger Bands: Upper ${latestBB.upper.toFixed(2)}, Middle ${latestBB.middle.toFixed(2)}, Lower ${latestBB.lower.toFixed(2)}`);
    }

    // Stochastic
    if (indicators.stochastic && indicators.stochastic.length > 0) {
      const latestStoch = indicators.stochastic[indicators.stochastic.length - 1];
      summary.push(`Stochastic: %K ${latestStoch.k.toFixed(2)}, %D ${latestStoch.d.toFixed(2)}`);
    }

    return summary.join('\n');
  }

  async identifyVolumePatternsWithLLM(historicalData, symbol) {
    if (!this.ollamaEnabled || !historicalData || historicalData.length < 20) {
      return null;
    }

    try {
      const volumeData = historicalData.slice(-20).map(day => ({
        date: day.date,
        volume: day.volume,
        priceChange: ((day.close - day.open) / day.open * 100).toFixed(2)
      }));

      const prompt = `Analyze volume patterns for ${symbol} stock:

VOLUME DATA (Last 20 days):
${volumeData.map(d => `${d.date}: ${(d.volume / 1000000).toFixed(1)}M vol, ${d.priceChange}% price change`).join('\n')}

Identify and analyze:
1. Volume spikes and their correlation with price moves
2. Volume patterns (accumulation, distribution, breakout)
3. Volume trend and what it indicates
4. Unusual volume activity and its implications

Provide JSON response:
{
    "patterns": ["accumulation", "breakout volume"],
    "trend": "increasing|decreasing|stable",
    "significance": "high|medium|low",
    "analysis": "Detailed volume pattern analysis",
    "priceVolumeRelationship": "Volume confirms price action analysis"
}`;

      const response = await this.ollama.generate(prompt, {
        temperature: 0.3,
        maxTokens: 800
      });

      return this.ollama.parseJsonResponse(response.text, {
        patterns: [],
        trend: 'stable',
        significance: 'medium',
        analysis: 'Volume analysis unavailable',
        priceVolumeRelationship: 'Unable to determine'
      });

    } catch (error) {
      logger.error('Volume pattern analysis failed:', error);
      return null;
    }
  }

  // ============ API Fetch Methods ============

  async fetchAlphaVantageHistorical(symbol) {
    if (!config.apiKeys.alphaVantage) {
      throw new Error('Alpha Vantage API key not configured');
    }

    const response = await axios.get(config.apiEndpoints.alphaVantage, {
      params: {
        function: 'TIME_SERIES_DAILY',
        symbol,
        apikey: config.apiKeys.alphaVantage,
        outputsize: 'compact' // Last 100 data points
      },
      timeout: 10000
    });

    const timeSeries = response.data['Time Series (Daily)'];
    if (!timeSeries) {
      throw new Error('No historical data received from Alpha Vantage');
    }

    const data = [];
    for (const [date, values] of Object.entries(timeSeries)) {
      data.push({
        date,
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: parseInt(values['5. volume'])
      });
    }

    // Sort by date (oldest first)
    return data.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  async fetchFinnhubCurrent(symbol) {
    if (!config.apiKeys.finnhub) {
      throw new Error('Finnhub API key not configured');
    }

    const response = await axios.get(`${config.apiEndpoints.finnhub}/quote`, {
      params: {
        symbol,
        token: config.apiKeys.finnhub
      },
      timeout: 30000
    });

    const quote = response.data;
    if (!quote || quote.c === undefined) {
      throw new Error('No quote data received from Finnhub');
    }

    logger.info('StockDataAgent Data======>', quote);
    return {
      price: quote.c, // Current price
      change: quote.d, // Change
      changePercent: quote.dp, // Percent change
      high: quote.h, // High price of the day
      low: quote.l, // Low price of the day
      open: quote.o, // Open price of the day
      previousClose: quote.pc, // Previous close price
      timestamp: new Date(quote.t * 1000).toISOString(), // Unix timestamp
      provider: 'finnhub'
    };
  }

  async fetchFinnhubHistorical(symbol) {
    if (!config.apiKeys.finnhub) {
      throw new Error('Finnhub API key not configured');
    }

    const toDate = Math.floor(Date.now() / 1000);
    const fromDate = toDate - (100 * 24 * 60 * 60); // 100 days ago

    const response = await axios.get(`${config.apiEndpoints.finnhub}/stock/candle`, {
      params: {
        symbol,
        resolution: 'D',
        from: fromDate,
        to: toDate,
        token: config.apiKeys.finnhub
      },
      timeout: 10000
    });

    const data = response.data;
    if (!data || data.s !== 'ok' || !data.c) {
      throw new Error('No historical data received from Finnhub');
    }

    const historicalData = [];
    for (let i = 0; i < data.c.length; i++) {
      historicalData.push({
        date: moment(data.t[i] * 1000).format('YYYY-MM-DD'),
        open: data.o[i],
        high: data.h[i],
        low: data.l[i],
        close: data.c[i],
        volume: data.v[i]
      });
    }

    return historicalData;
  }

  async fetchTwelveDataCurrent(symbol) {
    if (!config.apiKeys.twelveData) {
      throw new Error('Twelve Data API key not configured');
    }

    const response = await axios.get(`${config.apiEndpoints.twelveData}/quote`, {
      params: {
        symbol,
        apikey: config.apiKeys.twelveData
      },
      timeout: 10000
    });

    const quote = response.data;
    if (!quote || !quote.close) {
      throw new Error('No quote data received from Twelve Data');
    }

    return {
      price: parseFloat(quote.close),
      change: parseFloat(quote.change),
      changePercent: parseFloat(quote.percent_change),
      high: parseFloat(quote.high),
      low: parseFloat(quote.low),
      open: parseFloat(quote.open),
      previousClose: parseFloat(quote.previous_close),
      timestamp: new Date(quote.datetime).toISOString(),
      volume: parseInt(quote.volume),
      provider: 'twelveData'
    };
  }

  async fetchTwelveDataHistorical(symbol) {
    if (!config.apiKeys.twelveData) {
      throw new Error('Twelve Data API key not configured');
    }

    const response = await axios.get(`${config.apiEndpoints.twelveData}/time_series`, {
      params: {
        symbol,
        interval: '1day',
        outputsize: 100,
        apikey: config.apiKeys.twelveData
      },
      timeout: 10000
    });

    const data = response.data;
    if (!data || !data.values) {
      throw new Error('No historical data received from Twelve Data');
    }

    const historicalData = data.values.map(item => ({
      date: item.datetime,
      open: parseFloat(item.open),
      high: parseFloat(item.high),
      low: parseFloat(item.low),
      close: parseFloat(item.close),
      volume: parseInt(item.volume)
    }));

    // Sort by date (oldest first)
    return historicalData.sort((a, b) => new Date(a.date) - new Date(b.date));
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