const BaseAgent = require('./BaseAgent');
const config = require('../config');
const logger = require('../utils/logger');

class AnalysisAgent extends BaseAgent {
  constructor() {
    super(
      'AnalysisAgent',
      [config.queues.analysis],
      [config.queues.ui]
    );
    
    this.pendingAnalyses = new Map();
    this.dataCollectionTimeout = 30000; // 30 seconds timeout
  }

  async handleRequest(payload, requestId) {
    try {
      // Check if this is initial data or consolidated data from other agents
      if (payload.agentType) {
        return await this.handleAgentData(payload, requestId);
      } else {
        // This is the initial request to start analysis
        return await this.initiateAnalysis(payload, requestId);
      }
    } catch (error) {
      logger.error(`AnalysisAgent error for request ${requestId}:`, error);
      throw error;
    }
  }

  async initiateAnalysis(payload, requestId) {
    const { symbol } = payload;
    
    if (!symbol) {
      throw new Error('Symbol is required');
    }

    // Initialize analysis tracking
    this.pendingAnalyses.set(requestId, {
      symbol: symbol.toUpperCase(),
      startTime: Date.now(),
      receivedData: {},
      expectedAgents: ['StockDataAgent', 'NewsSentimentAgent', 'EconomicIndicatorAgent'],
      completed: false
    });

    await this.sendProgress(requestId, 0, 'Starting comprehensive analysis...');

    // Start timeout timer
    setTimeout(() => {
      this.checkAndCompleteAnalysis(requestId, true);
    }, this.dataCollectionTimeout);

    return { status: 'analysis_initiated', requestId };
  }

  async handleAgentData(payload, requestId) {
    const analysis = this.pendingAnalyses.get(requestId);
    
    if (!analysis || analysis.completed) {
      logger.debug(`Analysis ${requestId} not found or already completed`);
      return null;
    }

    // Store the received data
    analysis.receivedData[payload.agentType] = payload.payload;
    
    logger.info(`AnalysisAgent received data from ${payload.agentType} for request ${requestId}`);

    // Update progress
    const receivedCount = Object.keys(analysis.receivedData).length;
    const totalExpected = analysis.expectedAgents.length;
    const progress = Math.min(90, (receivedCount / totalExpected) * 90);
    
    await this.sendProgress(requestId, progress, `Received data from ${payload.agentType}...`);

    // Check if we have all the data we need
    if (receivedCount >= totalExpected) {
      return await this.checkAndCompleteAnalysis(requestId, false);
    }

    return null;
  }

  async checkAndCompleteAnalysis(requestId, isTimeout = false) {
    const analysis = this.pendingAnalyses.get(requestId);
    
    if (!analysis || analysis.completed) {
      return null;
    }

    const receivedCount = Object.keys(analysis.receivedData).length;
    
    if (receivedCount === 0) {
      logger.warn(`No data received for analysis ${requestId} within timeout`);
      analysis.completed = true;
      this.pendingAnalyses.delete(requestId);
      return null;
    }

    if (isTimeout) {
      logger.warn(`Analysis ${requestId} timing out with ${receivedCount} of ${analysis.expectedAgents.length} agents`);
    }

    analysis.completed = true;
    
    try {
      await this.sendProgress(requestId, 95, 'Generating investment recommendations...');

      // Generate comprehensive analysis
      const result = await this.generateInvestmentAnalysis(analysis);
      
      await this.sendProgress(requestId, 100, 'Analysis complete');

      // Clean up
      this.pendingAnalyses.delete(requestId);

      return result;

    } catch (error) {
      logger.error(`Error completing analysis for ${requestId}:`, error);
      this.pendingAnalyses.delete(requestId);
      throw error;
    }
  }

  async generateInvestmentAnalysis(analysis) {
    const { symbol, receivedData } = analysis;
    
    try {
      // Extract data from different agents
      const stockData = receivedData.StockDataAgent || {};
      const newsData = receivedData.NewsSentimentAgent || {};
      const economicData = receivedData.EconomicIndicatorAgent || {};

      // Calculate composite scores
      const scores = this.calculateCompositeScores(stockData, newsData, economicData);
      
      // Generate recommendations for different time horizons
      const recommendations = this.generateRecommendations(scores, stockData, newsData, economicData);
      
      // Assess risks
      const riskAssessment = this.assessRisks(stockData, newsData, economicData);
      
      // Generate insights and explanations
      const insights = this.generateInsights(stockData, newsData, economicData, scores);

      return {
        symbol,
        analysis: {
          scores,
          recommendations,
          riskAssessment,
          insights,
          dataQuality: this.assessDataQuality(receivedData),
          generatedAt: new Date().toISOString()
        },
        rawData: {
          stockData,
          newsData,
          economicData
        }
      };

    } catch (error) {
      logger.error('Error generating investment analysis:', error);
      throw error;
    }
  }

  calculateCompositeScores(stockData, newsData, economicData) {
    const scores = {
      technical: 0,
      sentiment: 0,
      economic: 0,
      overall: 0
    };

    try {
      // Technical Score (0-100)
      scores.technical = this.calculateTechnicalScore(stockData);
      
      // Sentiment Score (0-100)
      scores.sentiment = this.calculateSentimentScore(newsData);
      
      // Economic Score (0-100)
      scores.economic = this.calculateEconomicScore(economicData);
      
      // Overall weighted score
      const weights = config.analysis.weights;
      scores.overall = (
        scores.technical * weights.technical +
        scores.sentiment * weights.sentiment +
        scores.economic * weights.economic
      );

      // Round scores to 1 decimal place
      Object.keys(scores).forEach(key => {
        scores[key] = Math.round(scores[key] * 10) / 10;
      });

    } catch (error) {
      logger.error('Error calculating composite scores:', error);
    }

    return scores;
  }

  calculateTechnicalScore(stockData) {
    if (!stockData.technicalIndicators || !stockData.currentPrice) {
      return 50; // Neutral score if no data
    }

    let score = 50; // Start neutral
    const indicators = stockData.technicalIndicators;
    const currentPrice = stockData.currentPrice.price;

    try {
      // RSI analysis
      if (indicators.rsi && indicators.rsi.length > 0) {
        const latestRSI = indicators.rsi[indicators.rsi.length - 1];
        if (latestRSI < 30) score += 15; // Oversold - bullish
        else if (latestRSI > 70) score -= 15; // Overbought - bearish
        else if (latestRSI >= 40 && latestRSI <= 60) score += 5; // Neutral zone - slightly positive
      }

      // Moving Average analysis
      if (indicators.sma?.sma20 && indicators.sma.sma20.length > 0) {
        const sma20 = indicators.sma.sma20[indicators.sma.sma20.length - 1];
        if (currentPrice > sma20) score += 10; // Above SMA20 - bullish
        else score -= 10;
      }

      if (indicators.sma?.sma50 && indicators.sma.sma50.length > 0) {
        const sma50 = indicators.sma.sma50[indicators.sma.sma50.length - 1];
        if (currentPrice > sma50) score += 10; // Above SMA50 - bullish
        else score -= 10;
      }

      // MACD analysis
      if (indicators.macd && indicators.macd.length > 0) {
        const latestMACD = indicators.macd[indicators.macd.length - 1];
        if (latestMACD.MACD > latestMACD.signal) score += 10; // MACD above signal - bullish
        else score -= 5;
      }

      // Volume analysis
      if (stockData.volumeAnalysis) {
        const volumeRatio = parseFloat(stockData.volumeAnalysis.volumeRatio);
        if (volumeRatio > 1.5) score += 5; // High volume - confirmation
        else if (volumeRatio < 0.5) score -= 5; // Low volume - weak signal
      }

      // Price momentum
      if (stockData.currentPrice.changePercent) {
        const change = stockData.currentPrice.changePercent;
        if (change > 2) score += 5; // Strong positive momentum
        else if (change < -2) score -= 5; // Strong negative momentum
      }

    } catch (error) {
      logger.error('Error in technical score calculation:', error);
    }

    return Math.max(0, Math.min(100, score));
  }

  calculateSentimentScore(newsData) {
    if (!newsData.sentimentAnalysis) {
      return 50; // Neutral score if no data
    }

    let score = 50;
    const sentiment = newsData.sentimentAnalysis;

    try {
      // Base sentiment score (convert from -1,1 to 0,100 scale)
      if (sentiment.sentimentScore !== undefined) {
        score = 50 + (sentiment.sentimentScore * 25); // -1 -> 25, 0 -> 50, 1 -> 75
      }

      // Adjust based on sentiment distribution
      if (sentiment.sentimentDistribution) {
        const positive = sentiment.sentimentDistribution.positive || 0;
        const negative = sentiment.sentimentDistribution.negative || 0;
        
        if (positive > 60) score += 10; // Overwhelmingly positive
        else if (negative > 60) score -= 10; // Overwhelmingly negative
      }

      // Sentiment trend adjustment
      if (sentiment.sentimentTrend === 'improving') score += 5;
      else if (sentiment.sentimentTrend === 'declining') score -= 5;

      // Article volume consideration
      if (sentiment.totalArticles > 20) score += 5; // High coverage
      else if (sentiment.totalArticles < 5) score -= 5; // Low coverage

    } catch (error) {
      logger.error('Error in sentiment score calculation:', error);
    }

    return Math.max(0, Math.min(100, score));
  }

  calculateEconomicScore(economicData) {
    if (!economicData.regimeAnalysis) {
      return 50; // Neutral score if no data
    }

    let score = 50;
    const regime = economicData.regimeAnalysis;

    try {
      // Base regime score
      switch (regime.regime) {
        case 'expansionary':
          score = 75;
          break;
        case 'contractionary':
          score = 25;
          break;
        default:
          score = 50;
      }

      // Adjust by confidence
      if (regime.confidence) {
        const confidenceAdjustment = (regime.confidence - 0.5) * 20; // ±10 points
        score += confidenceAdjustment;
      }

      // Risk factors penalty
      if (regime.riskFactors && regime.riskFactors.length > 0) {
        score -= regime.riskFactors.length * 5; // -5 per risk factor
      }

      // Opportunities bonus
      if (regime.opportunities && regime.opportunities.length > 0) {
        score += regime.opportunities.length * 5; // +5 per opportunity
      }

    } catch (error) {
      logger.error('Error in economic score calculation:', error);
    }

    return Math.max(0, Math.min(100, score));
  }

  generateRecommendations(scores, stockData, newsData, economicData) {
    const recommendations = {};

    // Generate recommendations for each time horizon
    Object.entries(config.investmentHorizons).forEach(([horizon, details]) => {
      recommendations[horizon] = this.generateHorizonRecommendation(
        horizon,
        details,
        scores,
        stockData,
        newsData,
        economicData
      );
    });

    return recommendations;
  }

  generateHorizonRecommendation(horizon, details, scores, stockData, newsData, economicData) {
    let recommendation = 'HOLD';
    let confidence = 50;
    let reasoning = [];
    let targetPrice = null;
    let stopLoss = null;

    try {
      const currentPrice = stockData.currentPrice?.price || 0;
      
      // Determine recommendation based on composite score and horizon
      let thresholdAdjustment = 0;
      
      switch (horizon) {
        case 'shortTerm':
          // More sensitive to technical and sentiment
          thresholdAdjustment = scores.technical * 0.6 + scores.sentiment * 0.4;
          break;
        case 'midTerm':
          // Balanced approach
          thresholdAdjustment = scores.overall;
          break;
        case 'longTerm':
          // More weight on economic fundamentals
          thresholdAdjustment = scores.economic * 0.6 + scores.technical * 0.4;
          break;
      }

      confidence = Math.max(config.analysis.confidenceThreshold * 100, Math.abs(thresholdAdjustment - 50) * 2);

      // Generate recommendation
      if (thresholdAdjustment >= 70) {
        recommendation = 'STRONG_BUY';
        reasoning.push('Multiple positive indicators align');
        targetPrice = currentPrice * 1.15;
        stopLoss = currentPrice * 0.92;
      } else if (thresholdAdjustment >= 60) {
        recommendation = 'BUY';
        reasoning.push('Positive indicators outweigh negatives');
        targetPrice = currentPrice * 1.08;
        stopLoss = currentPrice * 0.95;
      } else if (thresholdAdjustment >= 40) {
        recommendation = 'HOLD';
        reasoning.push('Mixed signals suggest waiting');
        targetPrice = currentPrice;
        stopLoss = currentPrice * 0.90;
      } else if (thresholdAdjustment >= 30) {
        recommendation = 'SELL';
        reasoning.push('Negative indicators suggest reducing position');
        targetPrice = currentPrice * 0.95;
        stopLoss = currentPrice * 0.88;
      } else {
        recommendation = 'STRONG_SELL';
        reasoning.push('Multiple negative indicators present');
        targetPrice = currentPrice * 0.90;
        stopLoss = currentPrice * 0.85;
      }

      // Add specific reasoning based on scores
      if (scores.technical > 70) reasoning.push('Strong technical indicators');
      else if (scores.technical < 30) reasoning.push('Weak technical signals');

      if (scores.sentiment > 70) reasoning.push('Positive market sentiment');
      else if (scores.sentiment < 30) reasoning.push('Negative sentiment prevails');

      if (scores.economic > 70) reasoning.push('Favorable economic environment');
      else if (scores.economic < 30) reasoning.push('Economic headwinds present');

    } catch (error) {
      logger.error('Error generating recommendation:', error);
      recommendation = 'HOLD';
      confidence = 50;
      reasoning = ['Analysis incomplete due to data limitations'];
    }

    return {
      action: recommendation,
      confidence: Math.round(Math.min(100, Math.max(0, confidence))),
      reasoning,
      targetPrice: targetPrice ? Math.round(targetPrice * 100) / 100 : null,
      stopLoss: stopLoss ? Math.round(stopLoss * 100) / 100 : null,
      timeHorizon: details.period
    };
  }

  assessRisks(stockData, newsData, economicData) {
    const risks = {
      overall: 'MEDIUM',
      factors: [],
      mitigationStrategies: []
    };

    try {
      let riskScore = 50; // Start neutral

      // Technical risks
      if (stockData.technicalIndicators?.rsi) {
        const rsi = stockData.technicalIndicators.rsi;
        const latestRSI = rsi[rsi.length - 1];
        if (latestRSI > 80) {
          risks.factors.push('Extremely overbought conditions');
          riskScore += 15;
        }
      }

      // Economic risks
      if (economicData.regimeAnalysis?.riskFactors?.length > 0) {
        risks.factors.push(...economicData.regimeAnalysis.riskFactors);
        riskScore += economicData.regimeAnalysis.riskFactors.length * 8;
      }

      // Determine overall risk level
      if (riskScore >= 70) {
        risks.overall = 'HIGH';
        risks.mitigationStrategies.push('Consider smaller position sizes');
        risks.mitigationStrategies.push('Use tight stop-loss orders');
      } else if (riskScore <= 35) {
        risks.overall = 'LOW';
        risks.mitigationStrategies.push('Standard position sizing appropriate');
      } else {
        risks.overall = 'MEDIUM';
        risks.mitigationStrategies.push('Regular monitoring recommended');
      }

    } catch (error) {
      logger.error('Error assessing risks:', error);
      risks.factors.push('Risk assessment incomplete');
    }

    return risks;
  }

  generateInsights(stockData, newsData, economicData, scores) {
    const insights = {
      summary: '',
      keyPoints: [],
      marketContext: ''
    };

    try {
      // Generate summary based on overall score
      const overallScore = scores.overall;
      if (overallScore >= 70) {
        insights.summary = 'Strong positive indicators across multiple dimensions suggest favorable investment opportunity.';
      } else if (overallScore >= 55) {
        insights.summary = 'Mixed but generally positive signals indicate cautious optimism.';
      } else if (overallScore >= 45) {
        insights.summary = 'Neutral outlook with balanced positive and negative factors.';
      } else {
        insights.summary = 'Concerning signals suggest increased caution warranted.';
      }

      // Key points
      if (scores.technical > 60) {
        insights.keyPoints.push('Technical analysis shows bullish signals');
      }
      
      if (scores.sentiment > 60) {
        insights.keyPoints.push('Market sentiment is positive');
      }
      
      if (scores.economic > 60) {
        insights.keyPoints.push('Economic environment is supportive');
      }

      // Market context
      if (economicData.regimeAnalysis?.regime) {
        insights.marketContext = `Current economic regime is ${economicData.regimeAnalysis.regime}`;
      }

    } catch (error) {
      logger.error('Error generating insights:', error);
      insights.summary = 'Analysis insights could not be fully generated.';
    }

    return insights;
  }

  assessDataQuality(receivedData) {
    const quality = {
      overall: 'GOOD',
      coverage: 0,
      completeness: {},
      issues: []
    };

    try {
      const totalExpected = 3; // StockDataAgent, NewsSentimentAgent, EconomicIndicatorAgent
      const receivedCount = Object.keys(receivedData).length;
      quality.coverage = Math.round((receivedCount / totalExpected) * 100);

      // Determine overall quality
      if (quality.coverage < 50) {
        quality.overall = 'POOR';
        quality.issues.push('Insufficient data coverage');
      } else if (quality.coverage < 80) {
        quality.overall = 'FAIR';
        quality.issues.push('Partial data coverage');
      }

      // Check for missing critical agents
      if (!receivedData.StockDataAgent) {
        quality.issues.push('Missing stock price data');
      }
      if (!receivedData.NewsSentimentAgent) {
        quality.issues.push('Missing sentiment analysis');
      }
      if (!receivedData.EconomicIndicatorAgent) {
        quality.issues.push('Missing economic context');
      }

    } catch (error) {
      logger.error('Error assessing data quality:', error);
      quality.overall = 'UNKNOWN';
      quality.issues.push('Quality assessment failed');
    }

    return quality;
  }
}

// Start the agent if this file is run directly
if (require.main === module) {
  const agent = new AnalysisAgent();
  agent.start().catch(error => {
    logger.error('Failed to start AnalysisAgent:', error);
    process.exit(1);
  });
}

module.exports = AnalysisAgent; 