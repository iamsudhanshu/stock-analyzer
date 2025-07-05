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
    
    // Initialize LLM capabilities
    this.initializeLLM();
  }

  async initializeLLM() {
    try {
      console.log('🧠 [StockDataAgent] Initializing LLM capabilities...');
      this.ollamaEnabled = await this.ollama.isAvailable();
      
      if (this.ollamaEnabled) {
        console.log('✅ [StockDataAgent] LLM capabilities enabled');
        logger.info('StockDataAgent LLM capabilities enabled');
      } else {
        console.warn('⚠️ [StockDataAgent] LLM not available, using enhanced traditional methods');
        logger.warn('StockDataAgent LLM not available, using enhanced traditional methods');
      }
    } catch (error) {
      console.error('❌ [StockDataAgent] Error initializing LLM:', error.message);
      logger.error('StockDataAgent LLM initialization error:', error);
      this.ollamaEnabled = false;
    }
  }

  async processMessage(message) {
    try {
      console.log('📥 [StockDataAgent] Processing message:', {
        requestId: message.requestId,
        agentType: message.agentType,
        status: message.status
      });

      if (!this.validateMessage(message)) {
        logger.warn(`${this.agentName} received invalid message:`, message);
        return;
      }

      const { requestId, payload } = message;
      const { symbol } = payload;

      console.log('📊 [StockDataAgent] Starting LLM-enhanced stock analysis for:', symbol);
      
      // Generate comprehensive stock data with LLM insights
      const result = await this.generateLLMEnhancedStockData(symbol);
      
      console.log('✅ [StockDataAgent] Analysis completed:', {
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
      console.error('💥 [StockDataAgent] Error processing message:', error);
      logger.error(`${this.agentName} error:`, error);
      
      // Send error result
      if (message.requestId) {
        await this.sendError(message.requestId, error);
      }
    }
  }

  async generateLLMEnhancedStockData(symbol) {
    try {
      let stockData;
      if (config.analysis.useMockData) {
        console.log('🧪 [StockDataAgent] Using mock data for testing');
        stockData = this.generateMockStockData(symbol);
      } else {
        console.log('📊 [StockDataAgent] Fetching real stock data from APIs');
        stockData = await this.fetchRealStockData(symbol);
      }
      
      if (this.ollamaEnabled) {
        console.log('🧠 [StockDataAgent] Generating LLM-enhanced stock analysis...');
        
        // Use LLM to analyze stock data and generate insights
        const llmAnalysis = await this.generateLLMStockInsights(symbol, stockData);
        
        return {
          ...stockData,
          llmInsights: llmAnalysis,
          llmEnhanced: true,
          lastUpdated: new Date().toISOString()
        };
      } else {
        throw new Error('LLM is required for StockDataAgent analysis. Ollama service is not available.');
      }
      
    } catch (error) {
      console.error('❌ [StockDataAgent] Error generating stock data:', error);
      logger.error('StockDataAgent data generation error:', error);
      
      // No fallback - throw error if LLM is not available
      throw new Error(`StockDataAgent requires LLM capabilities: ${error.message}`);
    }
  }

  async generateLLMStockInsights(symbol, stockData) {
    try {
      const stockType = this.getStockType(symbol);
      const sectorContext = this.getSectorContext(stockType);
      
      const prompt = `Analyze the following stock data for ${symbol} (${sectorContext}) and provide intelligent insights:

Stock Data:
- Current Price: $${stockData.currentPrice}
- Volume: ${stockData.volume}
- Market Cap: $${stockData.marketCap}
- 52-Week High: $${stockData.fiftyTwoWeekHigh}
- 52-Week Low: $${stockData.fiftyTwoWeekLow}
- RSI: ${stockData.technicalIndicators?.rsi}
- MACD: ${stockData.technicalIndicators?.macd}
- Moving Averages: ${JSON.stringify(stockData.technicalIndicators?.movingAverages)}

Sector Context: ${sectorContext}
Stock Type: ${stockType}

Please provide ${symbol}-specific analysis considering:
1. ${symbol} price trend analysis and momentum assessment
2. Technical indicator interpretation for ${symbol}
3. Volume analysis and market sentiment for ${symbol}
4. Support and resistance levels specific to ${symbol}
5. Key price levels to watch for ${symbol}
6. Risk assessment and volatility analysis for ${symbol}
7. Short-term and medium-term outlook for ${symbol}

Format your response as structured JSON with the following keys:
- priceAnalysis: { trend, momentum, outlook }
- technicalAnalysis: { rsiInterpretation, macdSignal, movingAverageAnalysis }
- volumeAnalysis: { volumeTrend, marketSentiment, unusualActivity }
- supportResistance: { support, resistance, keyLevels }
- riskAssessment: { volatility, riskLevel, riskFactors }
- outlook: { shortTerm, mediumTerm, confidence }

Provide detailed, professional analysis specific to ${symbol} suitable for investment decision-making.`;

      const response = await this.ollama.generate(prompt, { 
        maxTokens: 2000,
        temperature: 0.3 
      });

      // Parse LLM response
      const llmInsights = this.parseLLMResponse(response);
      
      return {
        analysis: llmInsights,
        confidence: this.calculateConfidence(stockData),
        marketContext: this.generateMarketContext(symbol, stockData),
        recommendations: this.generateRecommendations(llmInsights)
      };

    } catch (error) {
      console.error('❌ [StockDataAgent] LLM analysis failed:', error);
      logger.error('StockDataAgent LLM analysis error:', error);
      
      // No fallback - throw error if LLM analysis fails
      throw new Error(`StockDataAgent LLM analysis error: ${error.message}`);
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
          console.log('⚠️ [StockDataAgent] JSON parsing failed, using fallback extraction');
          // Continue to fallback extraction
        }
      }
      
      // Fallback: extract key insights from text
      return {
        priceAnalysis: {
          trend: this.extractTrend(responseText),
          momentum: this.extractMomentum(responseText),
          outlook: this.extractOutlook(responseText)
        },
        technicalAnalysis: {
          rsiInterpretation: this.extractRSIAnalysis(responseText),
          macdSignal: this.extractMACDSignal(responseText),
          movingAverageAnalysis: this.extractMAAnalysis(responseText)
        },
        volumeAnalysis: {
          volumeTrend: this.extractVolumeTrend(responseText),
          marketSentiment: this.extractSentiment(responseText),
          unusualActivity: this.extractUnusualActivity(responseText)
        },
        supportResistance: {
          support: this.extractSupportLevels(responseText),
          resistance: this.extractResistanceLevels(responseText),
          keyLevels: this.extractKeyLevels(responseText)
        },
        riskAssessment: {
          volatility: this.extractVolatility(responseText),
          riskLevel: this.extractRiskLevel(responseText),
          riskFactors: this.extractRiskFactors(responseText)
        },
        outlook: {
          shortTerm: this.extractShortTermOutlook(responseText),
          mediumTerm: this.extractMediumTermOutlook(responseText),
          confidence: this.extractConfidence(responseText)
        }
      };
    } catch (error) {
      console.error('❌ [StockDataAgent] Error parsing LLM response:', error);
      throw new Error('StockDataAgent LLM response parsing error');
    }
  }

  // Traditional analysis methods removed - system is now purely LLM-based
  // All analysis is performed by LLM agents with no traditional fallbacks

  generateRecommendations(insights) {
    if (!insights) {
      return 'hold_and_monitor';
    }
    
    const { priceAnalysis, technicalAnalysis, riskAssessment } = insights;
    
    // Check if required properties exist before accessing them
    const trend = priceAnalysis?.trend || 'neutral';
    const rsiInterpretation = technicalAnalysis?.rsiInterpretation || 'neutral';
    
    if (trend === 'bullish' && rsiInterpretation !== 'overbought') {
      return 'consider_buying';
    } else if (trend === 'bearish' && rsiInterpretation !== 'oversold') {
      return 'consider_selling';
    } else {
      return 'hold_and_monitor';
    }
  }

  // Helper methods for data extraction from LLM responses
  extractTrend(response) {
    if (response.includes('bullish') || response.includes('uptrend')) return 'bullish';
    if (response.includes('bearish') || response.includes('downtrend')) return 'bearish';
    return 'neutral';
  }

  extractMomentum(response) {
    if (response.includes('strong momentum') || response.includes('accelerating')) return 'strong_bullish';
    if (response.includes('weak momentum') || response.includes('decelerating')) return 'weak';
    return 'moderate';
  }

  extractOutlook(response) {
    if (response.includes('positive') || response.includes('optimistic')) return 'positive';
    if (response.includes('negative') || response.includes('pessimistic')) return 'negative';
    return 'neutral';
  }

  extractRSIAnalysis(response) {
    if (response.includes('overbought')) return 'overbought';
    if (response.includes('oversold')) return 'oversold';
    return 'neutral';
  }

  extractMACDSignal(response) {
    if (response.includes('buy signal') || response.includes('bullish crossover')) return 'buy';
    if (response.includes('sell signal') || response.includes('bearish crossover')) return 'sell';
    return 'neutral';
  }

  extractMAAnalysis(response) {
    if (response.includes('above moving averages') || response.includes('bullish alignment')) return 'bullish';
    if (response.includes('below moving averages') || response.includes('bearish alignment')) return 'bearish';
    return 'mixed';
  }

  extractVolumeTrend(response) {
    if (response.includes('high volume') || response.includes('increasing volume')) return 'increasing';
    if (response.includes('low volume') || response.includes('decreasing volume')) return 'decreasing';
    return 'stable';
  }

  extractSentiment(response) {
    if (response.includes('bullish sentiment') || response.includes('positive sentiment')) return 'bullish';
    if (response.includes('bearish sentiment') || response.includes('negative sentiment')) return 'bearish';
    return 'neutral';
  }

  extractUnusualActivity(response) {
    if (response.includes('unusual') || response.includes('abnormal')) return 'detected';
    return 'normal';
  }

  extractSupportLevels(response) {
    const supportMatch = response.match(/\$(\d+(?:\.\d+)?)/g);
    return supportMatch ? supportMatch.slice(0, 2) : [];
  }

  extractResistanceLevels(response) {
    const resistanceMatch = response.match(/\$(\d+(?:\.\d+)?)/g);
    return resistanceMatch ? resistanceMatch.slice(-2) : [];
  }

  extractKeyLevels(response) {
    const levelsMatch = response.match(/\$(\d+(?:\.\d+)?)/g);
    return levelsMatch || [];
  }

  extractVolatility(response) {
    if (response.includes('high volatility') || response.includes('volatile')) return 'high';
    if (response.includes('low volatility') || response.includes('stable')) return 'low';
    return 'medium';
  }

  extractRiskLevel(response) {
    if (response.includes('high risk') || response.includes('risky')) return 'high';
    if (response.includes('low risk') || response.includes('safe')) return 'low';
    return 'medium';
  }

  extractRiskFactors(response) {
    const riskFactors = [];
    if (response.includes('overbought')) riskFactors.push('overbought_condition');
    if (response.includes('oversold')) riskFactors.push('oversold_condition');
    if (response.includes('low volume')) riskFactors.push('low_liquidity');
    return riskFactors;
  }

  extractShortTermOutlook(response) {
    if (response.includes('short term') && response.includes('positive')) return 'positive';
    if (response.includes('short term') && response.includes('negative')) return 'negative';
    return 'neutral';
  }

  extractMediumTermOutlook(response) {
    if (response.includes('medium term') && response.includes('positive')) return 'positive';
    if (response.includes('medium term') && response.includes('negative')) return 'negative';
    return 'neutral';
  }

  extractConfidence(response) {
    if (response.includes('high confidence') || response.includes('strong signal')) return 85;
    if (response.includes('low confidence') || response.includes('weak signal')) return 45;
    return 65;
  }

  calculateConfidence(stockData) {
    // Calculate confidence based on data quality and completeness
    let confidence = 50; // Base confidence
    
    if (stockData.currentPrice && stockData.currentPrice.price) confidence += 10;
    if (stockData.volume && stockData.volume > 0) confidence += 10;
    if (stockData.marketCap && stockData.marketCap > 0) confidence += 10;
    if (stockData.technicalIndicators && Object.keys(stockData.technicalIndicators).length > 0) confidence += 10;
    if (stockData.historical && stockData.historical.length > 0) confidence += 10;
    
    return Math.min(100, confidence);
  }

  generateMarketContext(symbol, stockData) {
    const currentPrice = stockData.currentPrice?.price || 0;
    const volume = stockData.volume || 0;
    const marketCap = stockData.marketCap || 0;
    
    return {
      symbol,
      currentPrice,
      volume,
      marketCap,
      sector: this.inferSector(symbol),
      marketCapCategory: this.categorizeMarketCap(marketCap),
      liquidity: this.categorizeLiquidity(volume),
      timestamp: new Date().toISOString()
    };
  }

  // Utility methods
  inferSector(symbol) {
    // Simple sector inference based on symbol patterns
    if (symbol.includes('AAPL') || symbol.includes('MSFT') || symbol.includes('GOOGL')) return 'Technology';
    if (symbol.includes('JPM') || symbol.includes('BAC') || symbol.includes('WFC')) return 'Financial';
    if (symbol.includes('XOM') || symbol.includes('CVX')) return 'Energy';
    return 'General';
  }

  categorizeMarketCap(marketCap) {
    if (marketCap > 200000000000) return 'mega_cap';
    if (marketCap > 10000000000) return 'large_cap';
    if (marketCap > 2000000000) return 'mid_cap';
    return 'small_cap';
  }

  categorizeVolatility(price, high, low) {
    const volatility = this.calculateVolatility(price, high, low);
    if (volatility > 30) return 'high';
    if (volatility > 15) return 'medium';
    return 'low';
  }

  categorizeLiquidity(volume) {
    if (volume > 1000000) return 'high';
    if (volume > 500000) return 'medium';
    return 'low';
  }

  generateMockStockData(symbol) {
    // Generate stock-specific mock data based on symbol
    const symbolHash = this.hashSymbol(symbol);
    const basePrice = this.getStockSpecificPrice(symbol, symbolHash.price);
    const volume = this.getStockSpecificVolume(symbol, symbolHash.volume);
    const marketCap = this.getStockSpecificMarketCap(symbol, basePrice, symbolHash.price);
    
    return {
      symbol: symbol.toUpperCase(),
      currentPrice: parseFloat(basePrice.toFixed(2)),
      volume: Math.floor(volume),
      marketCap: Math.floor(marketCap),
      fiftyTwoWeekHigh: parseFloat((basePrice * (1.2 + symbolHash.price * 0.2)).toFixed(2)),
      fiftyTwoWeekLow: parseFloat((basePrice * (0.6 + symbolHash.price * 0.2)).toFixed(2)),
      technicalIndicators: {
        rsi: 25 + (symbolHash.technical * 50), // Different RSI for each stock
        macd: -3 + (symbolHash.technical * 6), // Different MACD for each stock
        movingAverages: {
          sma20: parseFloat((basePrice * (0.9 + symbolHash.technical * 0.2)).toFixed(2)),
          sma50: parseFloat((basePrice * (0.8 + symbolHash.technical * 0.3)).toFixed(2)),
          sma200: parseFloat((basePrice * (0.7 + symbolHash.technical * 0.4)).toFixed(2))
        }
      }
    };
  }

  // Helper methods to generate stock-specific data
  hashSymbol(symbol) {
    let hash = 0;
    for (let i = 0; i < symbol.length; i++) {
      const char = symbol.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Add more variation by using different parts of the hash
    const normalizedHash = Math.abs(hash) / 2147483647;
    // Use different parts of the hash for different metrics
    return {
      price: (normalizedHash * 1000) % 1,
      volume: (normalizedHash * 2000) % 1,
      technical: (normalizedHash * 3000) % 1,
      fundamental: (normalizedHash * 4000) % 1
    };
  }

  getStockSpecificPrice(symbol, hash) {
    // Different price ranges for different stock types
    if (symbol.includes('AAPL') || symbol.includes('MSFT') || symbol.includes('GOOGL')) {
      return 150 + (hash * 100); // Tech stocks: $150-250
    } else if (symbol.includes('JPM') || symbol.includes('BAC') || symbol.includes('WFC')) {
      return 30 + (hash * 70); // Financial stocks: $30-100
    } else if (symbol.includes('XOM') || symbol.includes('CVX')) {
      return 80 + (hash * 60); // Energy stocks: $80-140
    } else if (symbol.includes('TSLA')) {
      return 200 + (hash * 100); // Tesla: $200-300
    } else {
      return 50 + (hash * 150); // Default: $50-200
    }
  }

  getStockSpecificVolume(symbol, hash) {
    // Different volume ranges for different stock types
    if (symbol.includes('AAPL') || symbol.includes('TSLA')) {
      return 5000000 + (hash * 10000000); // High volume stocks
    } else if (symbol.includes('MSFT') || symbol.includes('GOOGL')) {
      return 3000000 + (hash * 7000000); // Medium-high volume
    } else {
      return 500000 + (hash * 2000000); // Default volume
    }
  }

  getStockSpecificMarketCap(symbol, basePrice, hash) {
    // Different market cap ranges for different stock types
    if (symbol.includes('AAPL') || symbol.includes('MSFT') || symbol.includes('GOOGL')) {
      return basePrice * (5000000 + hash * 5000000); // Mega cap
    } else if (symbol.includes('TSLA')) {
      return basePrice * (3000000 + hash * 2000000); // Large cap
    } else {
      return basePrice * (1000000 + hash * 4000000); // Default
    }
  }

  getStockType(symbol) {
    if (symbol.includes('AAPL') || symbol.includes('MSFT') || symbol.includes('GOOGL') || symbol.includes('TSLA')) {
      return 'tech';
    } else if (symbol.includes('JPM') || symbol.includes('BAC') || symbol.includes('WFC')) {
      return 'financial';
    } else if (symbol.includes('XOM') || symbol.includes('CVX')) {
      return 'energy';
    } else {
      return 'general';
    }
  }

  getSectorContext(stockType) {
    const contexts = {
      tech: 'Technology sector with focus on innovation and growth',
      financial: 'Financial services sector with regulatory considerations',
      energy: 'Energy sector with commodity price sensitivity',
      general: 'Diversified sector with mixed market dynamics'
    };
    return contexts[stockType] || contexts.general;
  }

  async fetchRealStockData(symbol) {
    try {
      console.log(`📊 [StockDataAgent] Fetching real data for ${symbol}`);
      
      // Try different API providers in order of preference
      for (const provider of this.apiProviders) {
        try {
          console.log(`🔄 [StockDataAgent] Trying ${provider.name} API...`);
          
          switch (provider.name) {
            case 'alphaVantage':
              return await this.fetchFromAlphaVantage(symbol);
            case 'finnhub':
              return await this.fetchFromFinnhub(symbol);
            case 'twelveData':
              return await this.fetchFromTwelveData(symbol);
            default:
              console.log(`⚠️ [StockDataAgent] Unknown provider: ${provider.name}`);
          }
        } catch (error) {
          console.log(`❌ [StockDataAgent] ${provider.name} failed:`, error.message);
          continue;
        }
      }
      
      throw new Error('All API providers failed');
      
    } catch (error) {
      console.error(`💥 [StockDataAgent] Error fetching real stock data for ${symbol}:`, error);
      throw new Error(`Failed to fetch stock data: ${error.message}`);
    }
  }

  async fetchFromAlphaVantage(symbol) {
    if (!config.apiKeys.alphaVantage) {
      throw new Error('Alpha Vantage API key not configured');
    }

    const url = `${config.apiEndpoints.alphaVantage}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${config.apiKeys.alphaVantage}`;
    const response = await axios.get(url);
    
    if (response.data['Error Message']) {
      throw new Error(response.data['Error Message']);
    }

    const quote = response.data['Global Quote'];
    if (!quote || !quote['05. price']) {
      throw new Error('No data returned from Alpha Vantage');
    }

    return {
      symbol: symbol.toUpperCase(),
      currentPrice: parseFloat(quote['05. price']),
      volume: parseInt(quote['06. volume']),
      marketCap: parseFloat(quote['07. market cap']) || 0,
      fiftyTwoWeekHigh: parseFloat(quote['09. change']) || 0,
      fiftyTwoWeekLow: parseFloat(quote['10. change percent']) || 0,
      technicalIndicators: await this.fetchTechnicalIndicators(symbol),
      lastUpdated: new Date().toISOString()
    };
  }

  async fetchFromFinnhub(symbol) {
    if (!config.apiKeys.finnhub) {
      throw new Error('Finnhub API key not configured');
    }

    const url = `${config.apiEndpoints.finnhub}/quote?symbol=${symbol}&token=${config.apiKeys.finnhub}`;
    const response = await axios.get(url);
    
    if (response.data.error) {
      throw new Error(response.data.error);
    }

    return {
      symbol: symbol.toUpperCase(),
      currentPrice: response.data.c,
      volume: response.data.v,
      marketCap: 0, // Finnhub doesn't provide market cap in quote endpoint
      fiftyTwoWeekHigh: response.data.h,
      fiftyTwoWeekLow: response.data.l,
      technicalIndicators: await this.fetchTechnicalIndicators(symbol),
      lastUpdated: new Date().toISOString()
    };
  }

  async fetchFromTwelveData(symbol) {
    if (!config.apiKeys.twelveData) {
      throw new Error('Twelve Data API key not configured');
    }

    const url = `${config.apiEndpoints.twelveData}/quote?symbol=${symbol}&apikey=${config.apiKeys.twelveData}`;
    const response = await axios.get(url);
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message);
    }

    const quote = response.data;
    return {
      symbol: symbol.toUpperCase(),
      currentPrice: parseFloat(quote.close),
      volume: parseInt(quote.volume),
      marketCap: parseFloat(quote.market_cap) || 0,
      fiftyTwoWeekHigh: parseFloat(quote.fifty_two_week.high) || 0,
      fiftyTwoWeekLow: parseFloat(quote.fifty_two_week.low) || 0,
      technicalIndicators: await this.fetchTechnicalIndicators(symbol),
      lastUpdated: new Date().toISOString()
    };
  }

  async fetchTechnicalIndicators(symbol) {
    try {
      // Fetch RSI, MACD, and moving averages
      const indicators = {};
      
      // RSI
      if (config.apiKeys.twelveData) {
        try {
          const rsiUrl = `${config.apiEndpoints.twelveData}/rsi?symbol=${symbol}&interval=1day&apikey=${config.apiKeys.twelveData}`;
          const rsiResponse = await axios.get(rsiUrl);
          if (rsiResponse.data.status !== 'error') {
            indicators.rsi = parseFloat(rsiResponse.data.values[0].rsi);
          }
        } catch (error) {
          console.log('⚠️ [StockDataAgent] RSI fetch failed:', error.message);
        }
      }
      
      // MACD
      if (config.apiKeys.twelveData) {
        try {
          const macdUrl = `${config.apiEndpoints.twelveData}/macd?symbol=${symbol}&interval=1day&apikey=${config.apiKeys.twelveData}`;
          const macdResponse = await axios.get(macdUrl);
          if (macdResponse.data.status !== 'error') {
            indicators.macd = parseFloat(macdResponse.data.values[0].macd);
          }
        } catch (error) {
          console.log('⚠️ [StockDataAgent] MACD fetch failed:', error.message);
        }
      }
      
      // Moving Averages
      if (config.apiKeys.twelveData) {
        try {
          const smaUrl = `${config.apiEndpoints.twelveData}/sma?symbol=${symbol}&interval=1day&time_period=20&apikey=${config.apiKeys.twelveData}`;
          const smaResponse = await axios.get(smaUrl);
          if (smaResponse.data.status !== 'error') {
            indicators.movingAverages = {
              sma20: parseFloat(smaResponse.data.values[0].sma)
            };
          }
        } catch (error) {
          console.log('⚠️ [StockDataAgent] SMA fetch failed:', error.message);
        }
      }
      
      return indicators;
      
    } catch (error) {
      console.log('⚠️ [StockDataAgent] Technical indicators fetch failed:', error.message);
      return {};
    }
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