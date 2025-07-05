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

  async fetchAnalystData(symbol) {
    return {
      consensusRating: 'Buy',
      priceTarget: 225,
      ratings: {
        strongBuy: 15,
        buy: 8,
        hold: 3,
        sell: 1,
        strongSell: 0
      },
      recentUpgrades: [
        { analyst: 'Goldman Sachs', from: 'Hold', to: 'Buy', priceTarget: 230 },
        { analyst: 'Morgan Stanley', from: 'Buy', to: 'Strong Buy', priceTarget: 240 }
      ],
      recentDowngrades: [
        { analyst: 'Barclays', from: 'Buy', to: 'Hold', priceTarget: 200 }
      ]
    };
  }

  async generateLLMEnhancedData(symbol) {
    try {
      // Generate mock enhanced data
      const mockEnhancedData = {
        symbol: symbol.toUpperCase(),
        optionsData: await this.fetchOptionsData(symbol),
        institutionalHoldings: await this.fetchInstitutionalData(symbol),
        insiderTrading: await this.fetchInsiderData(symbol),
        sectorAnalysis: await this.fetchSectorData(symbol),
        earningsCalendar: await this.fetchEarningsData(symbol),
        analystRatings: await this.fetchAnalystData(symbol)
      };

      if (this.ollamaEnabled) {
        console.log('🧠 [EnhancedDataAgent] Generating LLM-enhanced analysis...');
        
        // Use LLM to analyze enhanced data and generate insights
        const llmAnalysis = await this.generateLLMEnhancedInsights(symbol, mockEnhancedData);
        
        return {
          symbol: mockEnhancedData.symbol,
          enhancedData: {
            optionsData: mockEnhancedData.optionsData,
            institutionalHoldings: mockEnhancedData.institutionalHoldings,
            insiderTrading: mockEnhancedData.insiderTrading,
            sectorAnalysis: mockEnhancedData.sectorAnalysis,
            earningsCalendar: mockEnhancedData.earningsCalendar,
            analystRatings: mockEnhancedData.analystRatings
          },
          optionsData: mockEnhancedData.optionsData,
          insiderTrading: mockEnhancedData.insiderTrading,
          llmInsights: llmAnalysis,
          llmEnhanced: true,
          lastUpdated: new Date().toISOString()
        };
      } else {
        throw new Error('Ollama service not available');
      }
    } catch (error) {
      console.error('❌ [EnhancedDataAgent] Error generating LLM-enhanced data:', error.message);
      return {
        symbol: symbol.toUpperCase(),
        error: error.message,
        llmEnhanced: false,
        lastUpdated: new Date().toISOString()
      };
    }
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
      return this.generateFallbackEnhancedInsights(enhancedData);
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
      return this.generateFallbackEnhancedInsights({});
    }
  }

  generateFallbackEnhancedInsights(enhancedData) {
    return {
      optionsAnalysis: {
        sentiment: 'neutral',
        riskLevel: 'medium',
        keyInsights: ['Options data indicates balanced sentiment'],
        unusualActivity: 'No significant unusual activity detected'
      },
      institutionalAnalysis: {
        ownershipTrend: 'stable',
        confidence: 'medium',
        keyHolders: ['Major institutions maintaining positions'],
        recentActivity: 'Limited recent institutional activity'
      },
      insiderAnalysis: {
        sentiment: 'neutral',
        confidence: 'medium',
        significantTransactions: ['Standard insider trading patterns'],
        insiderConfidence: 'medium'
      },
      sectorAnalysis: {
        sectorOutlook: 'neutral',
        relativeStrength: 'neutral',
        peerComparison: 'Performing in line with sector peers',
        sectorTrends: ['Sector showing moderate growth']
      },
      earningsAnalysis: {
        earningsOutlook: 'neutral',
        expectations: 'meet',
        growthProspects: 'moderate',
        keyFactors: ['Stable earnings growth expected']
      },
      analystAnalysis: {
        consensus: 'neutral',
        priceTarget: 'moderate upside potential',
        ratingChanges: 'Limited recent rating changes',
        analystConfidence: 'medium'
      }
    };
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