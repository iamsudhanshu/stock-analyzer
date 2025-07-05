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
      // Generate mock stock data (in real implementation, this would fetch from APIs)
      const mockStockData = this.generateMockStockData(symbol);
      
      if (this.ollamaEnabled) {
        console.log('🧠 [StockDataAgent] Generating LLM-enhanced stock analysis...');
        
        // Use LLM to analyze stock data and generate insights
        const llmAnalysis = await this.generateLLMStockInsights(symbol, mockStockData);
        
        return {
          ...mockStockData,
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
      const prompt = `Analyze the following stock data for ${symbol} and provide intelligent insights:

Stock Data:
- Current Price: $${stockData.currentPrice}
- Volume: ${stockData.volume}
- Market Cap: $${stockData.marketCap}
- 52-Week High: $${stockData.fiftyTwoWeekHigh}
- 52-Week Low: $${stockData.fiftyTwoWeekLow}
- RSI: ${stockData.technicalIndicators?.rsi}
- MACD: ${stockData.technicalIndicators?.macd}
- Moving Averages: ${JSON.stringify(stockData.technicalIndicators?.movingAverages)}

Please provide:
1. Price trend analysis and momentum assessment
2. Technical indicator interpretation
3. Volume analysis and market sentiment
4. Support and resistance levels
5. Key price levels to watch
6. Risk assessment and volatility analysis
7. Short-term and medium-term outlook

Format your response as structured JSON with the following keys:
- priceAnalysis: { trend, momentum, outlook }
- technicalAnalysis: { rsiInterpretation, macdSignal, movingAverageAnalysis }
- volumeAnalysis: { volumeTrend, marketSentiment, unusualActivity }
- supportResistance: { support, resistance, keyLevels }
- riskAssessment: { volatility, riskLevel, riskFactors }
- outlook: { shortTerm, mediumTerm, confidence }

Provide detailed, professional analysis suitable for investment decision-making.`;

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
    // Generate realistic mock data for demonstration
    const basePrice = 100 + Math.random() * 200;
    const volume = 500000 + Math.random() * 1500000;
    const marketCap = basePrice * (1000000 + Math.random() * 9000000);
    
    return {
      symbol: symbol.toUpperCase(),
      currentPrice: parseFloat(basePrice.toFixed(2)),
      volume: Math.floor(volume),
      marketCap: Math.floor(marketCap),
      fiftyTwoWeekHigh: parseFloat((basePrice * 1.3).toFixed(2)),
      fiftyTwoWeekLow: parseFloat((basePrice * 0.7).toFixed(2)),
      technicalIndicators: {
        rsi: 30 + Math.random() * 40,
        macd: -2 + Math.random() * 4,
        movingAverages: {
          sma20: parseFloat((basePrice * (0.95 + Math.random() * 0.1)).toFixed(2)),
          sma50: parseFloat((basePrice * (0.9 + Math.random() * 0.2)).toFixed(2)),
          sma200: parseFloat((basePrice * (0.85 + Math.random() * 0.3)).toFixed(2))
        }
      }
    };
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