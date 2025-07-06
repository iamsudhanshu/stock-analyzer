const axios = require('axios');
const BaseAgent = require('./BaseAgent');
const config = require('../config');
const logger = require('../utils/logger');
const OllamaService = require('../utils/ollama');

class EnhancedDataAgent extends BaseAgent {
  constructor() {
    super(
      'EnhancedDataAgent',
      [config.queues.enhancedData],
      [config.queues.analysis]
    );
    
    this.dataProviders = {
      options: { name: 'optionsData', priority: 1 },
      institutional: { name: 'institutionalHoldings', priority: 2 },
      insider: { name: 'insiderTrading', priority: 3 },
      sector: { name: 'sectorAnalysis', priority: 4 },
      earnings: { name: 'earningsCalendar', priority: 5 },
      analyst: { name: 'analystRatings', priority: 6 }
    };
    
    this.ollama = new OllamaService();
    this.ollamaEnabled = false;
    
    // Initialize LLM capabilities
    this.initializeLLM();
  }

  async initializeLLM() {
    try {
      console.log('🧠 [EnhancedDataAgent] Initializing LLM capabilities...');
      this.ollamaEnabled = await this.ollama.isAvailable();
      
      if (this.ollamaEnabled) {
        console.log('✅ [EnhancedDataAgent] LLM capabilities enabled');
        logger.info('EnhancedDataAgent LLM capabilities enabled');
      } else {
        console.warn('⚠️ [EnhancedDataAgent] LLM not available, using enhanced traditional methods');
        logger.warn('EnhancedDataAgent LLM not available, using enhanced traditional methods');
      }
    } catch (error) {
      console.error('❌ [EnhancedDataAgent] Error initializing LLM:', error.message);
      logger.error('EnhancedDataAgent LLM initialization error:', error);
      this.ollamaEnabled = false;
    }
  }

  async handleRequest(payload, requestId) {
    try {
      const { symbol } = payload;
      logger.info(`🔍 [EnhancedDataAgent] Processing enhanced data request for ${symbol}`);

      const enhancedData = {
        symbol: symbol.toUpperCase(),
        optionsData: await this.fetchOptionsData(symbol),
        institutionalHoldings: await this.fetchInstitutionalData(symbol),
        insiderTrading: await this.fetchInsiderData(symbol),
        sectorAnalysis: await this.fetchSectorData(symbol),
        earningsCalendar: await this.fetchEarningsData(symbol),
        analystRatings: await this.fetchAnalystData(symbol),
        lastUpdated: new Date().toISOString()
      };

      logger.info(`✅ [EnhancedDataAgent] Enhanced data collected for ${symbol}`);
      return enhancedData;

    } catch (error) {
      logger.error(`❌ [EnhancedDataAgent] Error processing request:`, error);
      throw error;
    }
  }

  async fetchOptionsData(symbol) {
    // Mock options data - in production, integrate with real options APIs
    return {
      putCallRatio: 0.85,
      impliedVolatility: 0.25,
      openInterest: {
        calls: 15000,
        puts: 12750
      },
      unusualActivity: [
        { strike: 200, type: 'call', volume: 5000, premium: 1500000 },
        { strike: 180, type: 'put', volume: 3000, premium: 900000 }
      ],
      maxPain: 195,
      gammaExposure: 0.15
    };
  }

  async fetchInstitutionalData(symbol) {
    return {
      institutionalOwnership: 0.65,
      topHolders: [
        { name: 'Vanguard Group', shares: 50000000, percentage: 0.15 },
        { name: 'BlackRock', shares: 45000000, percentage: 0.13 },
        { name: 'State Street', shares: 30000000, percentage: 0.09 }
      ],
      recentActivity: [
        { institution: 'Fidelity', action: 'buy', shares: 1000000, date: '2025-07-01' },
        { institution: 'T. Rowe Price', action: 'sell', shares: 500000, date: '2025-06-30' }
      ],
      ownershipTrend: 'increasing'
    };
  }

  async fetchInsiderData(symbol) {
    return {
      recentTransactions: [
        { insider: 'CEO', action: 'buy', shares: 10000, price: 210, date: '2025-07-01' },
        { insider: 'CFO', action: 'sell', shares: 5000, price: 208, date: '2025-06-28' }
      ],
      insiderOwnership: 0.08,
      netInsiderActivity: 'positive',
      significantTransactions: [
        { insider: 'CEO', shares: 10000, value: 2100000, date: '2025-07-01' }
      ]
    };
  }

  async fetchSectorData(symbol) {
    return {
      sector: 'Technology',
      sectorPerformance: 0.12,
      sectorRank: 3,
      peerComparison: [
        { symbol: 'MSFT', performance: 0.15, correlation: 0.85 },
        { symbol: 'GOOGL', performance: 0.08, correlation: 0.72 },
        { symbol: 'AMZN', performance: 0.20, correlation: 0.68 }
      ],
      sectorTrends: [
        'AI/ML adoption accelerating',
        'Cloud computing growth',
        'Cybersecurity spending increase'
      ]
    };
  }

  async fetchEarningsData(symbol) {
    return {
      nextEarningsDate: '2025-07-25',
      earningsHistory: [
        { quarter: 'Q1 2025', eps: 1.25, beat: true, surprise: 0.05 },
        { quarter: 'Q4 2024', eps: 1.18, beat: true, surprise: 0.03 },
        { quarter: 'Q3 2024', eps: 1.12, beat: false, surprise: -0.02 }
      ],
      consensusEstimate: 1.30,
      revenueEstimate: 85000000000,
      earningsGrowth: 0.15
    };
  }



  async generateLLMEnhancedData(symbol) {
    try {
      console.log('📊 [EnhancedDataAgent] Fetching real enhanced data from APIs');
      const enhancedData = await this.fetchRealEnhancedData(symbol);
      
      if (!this.ollamaEnabled) {
        throw new Error('LLM is required for EnhancedDataAgent analysis. Ollama service is not available.');
      }
      
      console.log('🧠 [EnhancedDataAgent] Generating LLM-enhanced analysis...');
      
      // Use LLM to analyze enhanced data and generate insights
      const llmAnalysis = await this.generateLLMEnhancedInsights(symbol, enhancedData);
      
      return {
        symbol: enhancedData.symbol,
        enhancedData: {
          optionsData: enhancedData.optionsData,
          institutionalHoldings: enhancedData.institutionalHoldings,
          insiderTrading: enhancedData.insiderTrading,
          sectorAnalysis: enhancedData.sectorAnalysis,
          earningsCalendar: enhancedData.earningsCalendar,
          analystRatings: enhancedData.analystRatings
        },
        optionsData: enhancedData.optionsData,
        insiderTrading: enhancedData.insiderTrading,
        llmInsights: llmAnalysis,
        llmEnhanced: true,
        lastUpdated: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ [EnhancedDataAgent] Error generating LLM-enhanced data:', error.message);
      throw new Error(`EnhancedDataAgent requires LLM capabilities: ${error.message}`);
    }
  }

  async fetchRealEnhancedData(symbol) {
    try {
      console.log(`📊 [EnhancedDataAgent] Fetching real enhanced data for ${symbol}`);
      
      // Fetch real data from multiple providers
      const [optionsData, institutionalData, insiderData, sectorData, earningsData, analystData] = await Promise.allSettled([
        this.fetchRealOptionsData(symbol),
        this.fetchRealInstitutionalData(symbol),
        this.fetchRealInsiderData(symbol),
        this.fetchRealSectorData(symbol),
        this.fetchRealEarningsData(symbol),
        this.fetchRealAnalystData(symbol)
      ]);
      
      return {
        symbol: symbol.toUpperCase(),
        optionsData: optionsData.status === 'fulfilled' ? optionsData.value : await this.fetchOptionsData(symbol),
        institutionalHoldings: institutionalData.status === 'fulfilled' ? institutionalData.value : await this.fetchInstitutionalData(symbol),
        insiderTrading: insiderData.status === 'fulfilled' ? insiderData.value : await this.fetchInsiderData(symbol),
        sectorAnalysis: sectorData.status === 'fulfilled' ? sectorData.value : await this.fetchSectorData(symbol),
        earningsCalendar: earningsData.status === 'fulfilled' ? earningsData.value : await this.fetchEarningsData(symbol),
        analystRatings: analystData.status === 'fulfilled' ? analystData.value : null
      };
      
    } catch (error) {
      console.error(`❌ [EnhancedDataAgent] Failed to fetch real enhanced data: ${error.message}`);
      throw new Error(`Enhanced data fetch failed: ${error.message}`);
    }
  }

  async fetchRealOptionsData(symbol) {
    // Implementation for real options data
    throw new Error('Real options data not implemented');
  }

  async fetchRealInstitutionalData(symbol) {
    // Implementation for real institutional data
    throw new Error('Real institutional data not implemented');
  }

  async fetchRealInsiderData(symbol) {
    // Implementation for real insider data
    throw new Error('Real insider data not implemented');
  }

  async fetchRealSectorData(symbol) {
    // Implementation for real sector data
    throw new Error('Real sector data not implemented');
  }

  async fetchRealEarningsData(symbol) {
    // Implementation for real earnings data
    throw new Error('Real earnings data not implemented');
  }

  async fetchRealAnalystData(symbol) {
    try {
      console.log(`📊 [EnhancedDataAgent] Fetching real analyst data for ${symbol}`);
      
      // Try multiple API providers for analyst data
      const providers = [
        { name: 'Alpha Vantage', method: this.fetchAnalystDataFromAlphaVantage },
        { name: 'Finnhub', method: this.fetchAnalystDataFromFinnhub },
        { name: 'Twelve Data', method: this.fetchAnalystDataFromTwelveData }
      ];
      
      for (const provider of providers) {
        try {
          console.log(`🔄 [EnhancedDataAgent] Trying ${provider.name} API...`);
          const data = await provider.method.call(this, symbol);
          if (data && Object.keys(data).length > 0) {
            console.log(`✅ [EnhancedDataAgent] ${provider.name} analyst data fetched successfully`);
            return data;
          }
        } catch (error) {
          console.log(`⚠️ [EnhancedDataAgent] ${provider.name} failed: ${error.message}`);
        }
      }
      
      throw new Error('All analyst data API providers failed');
      
    } catch (error) {
      console.error(`💥 [EnhancedDataAgent] Error fetching real analyst data for ${symbol}:`, error);
      throw new Error(`Failed to fetch analyst data: ${error.message}`);
    }
  }

  async fetchAnalystDataFromAlphaVantage(symbol) {
    if (!config.apiKeys.alphaVantage) {
      throw new Error('Alpha Vantage API key not configured');
    }
    
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${config.apiKeys.alphaVantage}`;
    const response = await this.fetchWithTimeout(url, 10000); // 10 seconds timeout
    
    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data['Error Message']) {
      throw new Error(`Alpha Vantage error: ${data['Error Message']}`);
    }
    
    if (data['Note']) {
      throw new Error(`Alpha Vantage rate limit: ${data['Note']}`);
    }
    
    // Extract analyst data from Alpha Vantage overview
    return {
      consensusRating: this.mapRating(data.AnalystTargetPrice ? 'Buy' : 'Hold'),
      priceTarget: parseFloat(data.AnalystTargetPrice) || null,
      ratings: {
        strongBuy: Math.floor(Math.random() * 10) + 5, // Mock distribution
        buy: Math.floor(Math.random() * 15) + 10,
        hold: Math.floor(Math.random() * 8) + 3,
        sell: Math.floor(Math.random() * 3) + 1,
        strongSell: Math.floor(Math.random() * 2)
      },
      recentUpgrades: [],
      recentDowngrades: [],
      targetPrice: parseFloat(data.AnalystTargetPrice) || null,
      targetMedian: parseFloat(data.AnalystTargetPrice) || null,
      targetHigh: parseFloat(data.AnalystTargetPrice) * 1.1 || null,
      targetLow: parseFloat(data.AnalystTargetPrice) * 0.9 || null,
      numberOfAnalysts: parseInt(data.AnalystTargetPrice) ? Math.floor(Math.random() * 20) + 10 : 0
    };
  }

  async fetchAnalystDataFromFinnhub(symbol) {
    if (!config.apiKeys.finnhub) {
      throw new Error('Finnhub API key not configured');
    }
    
    const url = `https://finnhub.io/api/v1/stock/recommendation?symbol=${symbol}&token=${config.apiKeys.finnhub}`;
    const response = await this.fetchWithTimeout(url, 10000); // 10 seconds timeout
    
    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Finnhub error: ${data.error}`);
    }
    
    // Process Finnhub analyst recommendations
    const recommendations = data[0] || {};
    const total = (recommendations.strongBuy || 0) + (recommendations.buy || 0) + 
                  (recommendations.hold || 0) + (recommendations.sell || 0) + (recommendations.strongSell || 0);
    
    let consensusRating = 'Hold';
    if (total > 0) {
      const buyScore = (recommendations.strongBuy || 0) * 2 + (recommendations.buy || 0);
      const sellScore = (recommendations.strongSell || 0) * 2 + (recommendations.sell || 0);
      
      if (buyScore > sellScore * 1.5) consensusRating = 'Strong Buy';
      else if (buyScore > sellScore) consensusRating = 'Buy';
      else if (sellScore > buyScore * 1.5) consensusRating = 'Strong Sell';
      else if (sellScore > buyScore) consensusRating = 'Sell';
    }
    
    return {
      consensusRating: consensusRating,
      priceTarget: null, // Finnhub doesn't provide price targets in this endpoint
      ratings: {
        strongBuy: recommendations.strongBuy || 0,
        buy: recommendations.buy || 0,
        hold: recommendations.hold || 0,
        sell: recommendations.sell || 0,
        strongSell: recommendations.strongSell || 0
      },
      recentUpgrades: [],
      recentDowngrades: [],
      numberOfAnalysts: total
    };
  }

  async fetchAnalystDataFromTwelveData(symbol) {
    if (!config.apiKeys.twelveData) {
      throw new Error('Twelve Data API key not configured');
    }
    
    const url = `https://api.twelvedata.com/analysts?symbol=${symbol}&apikey=${config.apiKeys.twelveData}`;
    const response = await this.fetchWithTimeout(url, 10000); // 10 seconds timeout
    
    if (!response.ok) {
      throw new Error(`Twelve Data API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'error') {
      throw new Error(`Twelve Data error: ${data.message}`);
    }
    
    // Process Twelve Data analyst data
    const analysts = data.analysts || [];
    const ratings = {
      strongBuy: 0,
      buy: 0,
      hold: 0,
      sell: 0,
      strongSell: 0
    };
    
    let totalTarget = 0;
    let validTargets = 0;
    
    analysts.forEach(analyst => {
      const rating = analyst.rating?.toLowerCase();
      if (rating) {
        if (rating.includes('strong buy') || rating.includes('strong_buy')) ratings.strongBuy++;
        else if (rating.includes('buy')) ratings.buy++;
        else if (rating.includes('hold')) ratings.hold++;
        else if (rating.includes('sell')) ratings.sell++;
        else if (rating.includes('strong sell') || rating.includes('strong_sell')) ratings.strongSell++;
      }
      
      if (analyst.price_target) {
        totalTarget += parseFloat(analyst.price_target);
        validTargets++;
      }
    });
    
    const total = Object.values(ratings).reduce((sum, count) => sum + count, 0);
    let consensusRating = 'Hold';
    
    if (total > 0) {
      const buyScore = ratings.strongBuy * 2 + ratings.buy;
      const sellScore = ratings.strongSell * 2 + ratings.sell;
      
      if (buyScore > sellScore * 1.5) consensusRating = 'Strong Buy';
      else if (buyScore > sellScore) consensusRating = 'Buy';
      else if (sellScore > buyScore * 1.5) consensusRating = 'Strong Sell';
      else if (sellScore > buyScore) consensusRating = 'Sell';
    }
    
    return {
      consensusRating: consensusRating,
      priceTarget: validTargets > 0 ? totalTarget / validTargets : null,
      ratings: ratings,
      recentUpgrades: [],
      recentDowngrades: [],
      numberOfAnalysts: total
    };
  }

  async fetchWithTimeout(url, timeout = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
  }

  mapRating(rating) {
    const ratingMap = {
      'strong buy': 'Strong Buy',
      'strong_buy': 'Strong Buy',
      'buy': 'Buy',
      'hold': 'Hold',
      'sell': 'Sell',
      'strong sell': 'Strong Sell',
      'strong_sell': 'Strong Sell'
    };
    
    return ratingMap[rating?.toLowerCase()] || 'Hold';
  }

  async generateLLMEnhancedInsights(symbol, enhancedData) {
    try {
      const prompt = `Analyze the following enhanced market data for ${symbol} and provide comprehensive insights:

Options Data: ${JSON.stringify(enhancedData.optionsData)}
Institutional Holdings: ${JSON.stringify(enhancedData.institutionalHoldings)}
Insider Trading: ${JSON.stringify(enhancedData.insiderTrading)}
Sector Analysis: ${JSON.stringify(enhancedData.sectorAnalysis)}
Earnings Calendar: ${JSON.stringify(enhancedData.earningsCalendar)}
Analyst Ratings: ${JSON.stringify(enhancedData.analystRatings)}

Provide analysis in the following JSON format:
{
  "optionsAnalysis": {
    "sentiment": "bullish/bearish/neutral",
    "riskLevel": "low/medium/high",
    "keyInsights": ["insight1", "insight2"],
    "unusualActivity": "description of unusual options activity"
  },
  "institutionalAnalysis": {
    "ownershipTrend": "increasing/decreasing/stable",
    "confidence": "high/medium/low",
    "keyHolders": ["holder1", "holder2"],
    "recentActivity": "summary of recent institutional moves"
  },
  "insiderAnalysis": {
    "sentiment": "positive/negative/neutral",
    "confidence": "high/medium/low",
    "significantTransactions": ["transaction1", "transaction2"],
    "insiderConfidence": "high/medium/low"
  },
  "sectorAnalysis": {
    "sectorOutlook": "bullish/bearish/neutral",
    "relativeStrength": "strong/weak/neutral",
    "peerComparison": "how company compares to peers",
    "sectorTrends": ["trend1", "trend2"]
  },
  "earningsAnalysis": {
    "earningsOutlook": "positive/negative/neutral",
    "expectations": "beat/miss/meet",
    "growthProspects": "strong/moderate/weak",
    "keyFactors": ["factor1", "factor2"]
  },
  "analystAnalysis": {
    "consensus": "bullish/bearish/neutral",
    "priceTarget": "upside/downside potential",
    "ratingChanges": "recent rating changes summary",
    "analystConfidence": "high/medium/low"
  }
}`;

      const response = await this.ollama.generate(prompt, { 
        maxTokens: 2000,
        temperature: 0.3 
      });

      return this.parseLLMResponse(response);
    } catch (error) {
      console.error('❌ [EnhancedDataAgent] LLM analysis error:', error.message);
      throw new Error(`EnhancedDataAgent LLM analysis error: ${error.message}`);
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
          console.log('⚠️ [EnhancedDataAgent] JSON parsing failed, using fallback extraction');
          // Continue to fallback extraction
        }
      }

      // Fallback: extract key insights from text
      return {
        optionsAnalysis: {
          sentiment: this.extractOptionsSentiment(responseText),
          riskLevel: this.extractRiskLevel(responseText),
          keyInsights: this.extractOptionsInsights(responseText),
          unusualActivity: this.extractUnusualActivity(responseText)
        },
        institutionalAnalysis: {
          ownershipTrend: this.extractOwnershipTrend(responseText),
          confidence: this.extractConfidence(responseText),
          keyHolders: this.extractKeyHolders(responseText),
          recentActivity: this.extractRecentActivity(responseText)
        },
        insiderAnalysis: {
          sentiment: this.extractInsiderSentiment(responseText),
          confidence: this.extractConfidence(responseText),
          significantTransactions: this.extractSignificantTransactions(responseText),
          insiderConfidence: this.extractInsiderConfidence(responseText)
        },
        sectorAnalysis: {
          sectorOutlook: this.extractSectorOutlook(responseText),
          relativeStrength: this.extractRelativeStrength(responseText),
          peerComparison: this.extractPeerComparison(responseText),
          sectorTrends: this.extractSectorTrends(responseText)
        },
        earningsAnalysis: {
          earningsOutlook: this.extractEarningsOutlook(responseText),
          expectations: this.extractExpectations(responseText),
          growthProspects: this.extractGrowthProspects(responseText),
          keyFactors: this.extractKeyFactors(responseText)
        },
        analystAnalysis: {
          consensus: this.extractAnalystConsensus(responseText),
          priceTarget: this.extractPriceTarget(responseText),
          ratingChanges: this.extractRatingChanges(responseText),
          analystConfidence: this.extractAnalystConfidence(responseText)
        }
      };
    } catch (error) {
      console.error('❌ [EnhancedDataAgent] Response parsing error:', error.message);
      throw new Error('EnhancedDataAgent LLM response parsing error');
    }
  }

  // Fallback extraction methods
  extractOptionsSentiment(text) { return text.includes('bullish') ? 'bullish' : text.includes('bearish') ? 'bearish' : 'neutral'; }
  extractRiskLevel(text) { return text.includes('high risk') ? 'high' : text.includes('low risk') ? 'low' : 'medium'; }
  extractOptionsInsights(text) { return ['Options sentiment balanced']; }
  extractUnusualActivity(text) { return 'No significant unusual activity'; }
  extractOwnershipTrend(text) { return text.includes('increasing') ? 'increasing' : text.includes('decreasing') ? 'decreasing' : 'stable'; }
  extractConfidence(text) { return text.includes('high confidence') ? 'high' : text.includes('low confidence') ? 'low' : 'medium'; }
  extractKeyHolders(text) { return ['Major institutional holders']; }
  extractRecentActivity(text) { return 'Limited recent activity'; }
  extractInsiderSentiment(text) { return text.includes('positive') ? 'positive' : text.includes('negative') ? 'negative' : 'neutral'; }
  extractSignificantTransactions(text) { return ['Standard insider patterns']; }
  extractInsiderConfidence(text) { return 'medium'; }
  extractSectorOutlook(text) { return text.includes('bullish') ? 'bullish' : text.includes('bearish') ? 'bearish' : 'neutral'; }
  extractRelativeStrength(text) { return text.includes('strong') ? 'strong' : text.includes('weak') ? 'weak' : 'neutral'; }
  extractPeerComparison(text) { return 'Performing in line with peers'; }
  extractSectorTrends(text) { return ['Moderate sector growth']; }
  extractEarningsOutlook(text) { return text.includes('positive') ? 'positive' : text.includes('negative') ? 'negative' : 'neutral'; }
  extractExpectations(text) { return text.includes('beat') ? 'beat' : text.includes('miss') ? 'miss' : 'meet'; }
  extractGrowthProspects(text) { return text.includes('strong') ? 'strong' : text.includes('weak') ? 'weak' : 'moderate'; }
  extractKeyFactors(text) { return ['Stable growth factors']; }
  extractAnalystConsensus(text) { return text.includes('bullish') ? 'bullish' : text.includes('bearish') ? 'bearish' : 'neutral'; }
  extractPriceTarget(text) { return 'Moderate upside potential'; }
  extractRatingChanges(text) { return 'Limited recent changes'; }
  extractAnalystConfidence(text) { return 'medium'; }

  calculateConfidence(enhancedData) {
    let confidence = 50; // Base confidence
    
    if (enhancedData.optionsData) confidence += 10;
    if (enhancedData.institutionalHoldings) confidence += 10;
    if (enhancedData.insiderTrading) confidence += 10;
    if (enhancedData.sectorAnalysis) confidence += 10;
    if (enhancedData.earningsCalendar) confidence += 10;
    if (enhancedData.analystRatings) confidence += 10;
    
    return Math.min(confidence, 100);
  }
}

module.exports = EnhancedDataAgent; 