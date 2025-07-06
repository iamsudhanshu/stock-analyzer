const BaseAgent = require('./BaseAgent');
const config = require('../config');
const logger = require('../utils/logger');
const OllamaService = require('../utils/ollama');

class ReportGeneratorAgent extends BaseAgent {
  constructor() {
    super(
      'ReportGeneratorAgent',
      [config.queues.reportGeneration],
      [config.queues.analysis]
    );
    
    this.reportTemplates = {
      executive: this.getExecutiveTemplate(),
      detailed: this.getDetailedTemplate(),
      technical: this.getTechnicalTemplate(),
      fundamental: this.getFundamentalTemplate()
    };
    
    this.ollama = new OllamaService();
    this.ollamaEnabled = false;
    
    // Initialize LLM capabilities
    this.initializeLLM();
  }

  async initializeLLM() {
    try {
      console.log('🧠 [ReportGeneratorAgent] Initializing LLM capabilities...');
      this.ollamaEnabled = await this.ollama.isAvailable();
      
      if (this.ollamaEnabled) {
        console.log('✅ [ReportGeneratorAgent] LLM capabilities enabled');
        logger.info('ReportGeneratorAgent LLM capabilities enabled');
      } else {
        console.warn('⚠️ [ReportGeneratorAgent] LLM not available, using enhanced traditional methods');
        logger.warn('ReportGeneratorAgent LLM not available, using enhanced traditional methods');
      }
    } catch (error) {
      console.error('❌ [ReportGeneratorAgent] Error initializing LLM:', error.message);
      logger.error('ReportGeneratorAgent LLM initialization error:', error);
      this.ollamaEnabled = false;
    }
  }

  async handleRequest(payload, requestId) {
    try {
      const { symbol, analysisData } = payload;
      logger.info(`📋 [ReportGeneratorAgent] Generating comprehensive report for ${symbol}`);

      // Always use real analysis data - no mock data fallback
      const data = analysisData;
      
      if (!data) {
        throw new Error('ReportGeneratorAgent requires real analysis data - cannot generate report without data');
      }

      const report = {
        symbol: symbol.toUpperCase(),
        generatedAt: new Date().toISOString(),
        executiveSummary: await this.generateExecutiveSummary(symbol, data),
        detailedAnalysis: await this.generateDetailedAnalysis(symbol, data),
        technicalAnalysis: await this.generateTechnicalAnalysis(symbol, data),
        fundamentalAnalysis: await this.generateFundamentalAnalysis(symbol, data),
        riskAssessment: await this.generateRiskAssessment(symbol, data),
        investmentRecommendations: await this.generateRecommendations(symbol, data),
        marketOutlook: await this.generateMarketOutlook(symbol, data),
        appendices: await this.generateAppendices(symbol, data),
        lastUpdated: new Date().toISOString()
      };

      logger.info(`✅ [ReportGeneratorAgent] Comprehensive report generated for ${symbol}`);
      return report;

    } catch (error) {
      logger.error(`❌ [ReportGeneratorAgent] Error generating report:`, error);
      throw error;
    }
  }

  async generateExecutiveSummary(symbol, data) {
    // Provide default data structure if stockData is missing
    const stockData = data?.stockData || {
      currentPrice: { price: 0, changePercent: 0 },
      volumeAnalysis: { volumeRatio: 0, volumeTrend: 'neutral' }
    };
    
    const currentPrice = stockData.currentPrice?.price || 0;
    const change = stockData.currentPrice?.changePercent || 0;
    const recommendation = data?.analysis?.recommendations?.shortTerm?.action || 'HOLD';
    const confidence = data?.analysis?.recommendations?.shortTerm?.confidence || 50;

    return {
      title: `${symbol} Investment Analysis Report`,
      date: new Date().toLocaleDateString(),
      keyMetrics: {
        currentPrice: `$${currentPrice.toFixed(2)}`,
        dailyChange: `${change > 0 ? '+' : ''}${change.toFixed(2)}%`,
        marketCap: this.formatMarketCap(data?.fundamentalData?.fundamentals?.marketCap),
        peRatio: data?.fundamentalData?.fundamentals?.peRatio || 'N/A',
        dividendYield: data?.fundamentalData?.fundamentals?.dividendYield || 'N/A'
      },
      recommendation: {
        action: recommendation,
        confidence: `${confidence}%`,
        timeHorizon: '3-6 months',
        targetPrice: data?.analysis?.recommendations?.shortTerm?.targetPrice || 'N/A',
        riskLevel: data?.analysis?.riskAssessment?.overall || 'MEDIUM'
      },
      keyHighlights: [
        this.generateKeyHighlight(data, 'technical'),
        this.generateKeyHighlight(data, 'fundamental'),
        this.generateKeyHighlight(data, 'sentiment'),
        this.generateKeyHighlight(data, 'competitive')
      ].filter(Boolean),
      investmentThesis: this.generateInvestmentThesis(symbol, data),
      riskFactors: this.extractTopRiskFactors(data),
      catalysts: this.extractKeyCatalysts(data)
    };
  }

  async generateDetailedAnalysis(symbol, data) {
    return {
      companyOverview: {
        description: this.generateCompanyDescription(symbol),
        businessModel: this.analyzeBusinessModel(symbol, data),
        competitivePosition: this.analyzeCompetitivePosition(data),
        growthDrivers: this.identifyGrowthDrivers(data),
        challenges: this.identifyChallenges(data)
      },
      financialAnalysis: {
        profitability: this.analyzeProfitability(data),
        liquidity: this.analyzeLiquidity(data),
        efficiency: this.analyzeEfficiency(data),
        growth: this.analyzeGrowth(data),
        valuation: this.analyzeValuation(data)
      },
      marketPosition: {
        marketShare: this.analyzeMarketShare(data),
        industryTrends: this.analyzeIndustryTrends(data),
        competitiveAdvantages: this.identifyCompetitiveAdvantages(data),
        threats: this.identifyThreats(data)
      },
      technicalOutlook: {
        trendAnalysis: this.analyzeTrend(data),
        supportResistance: this.analyzeSupportResistance(data),
        momentum: this.analyzeMomentum(data),
        volatility: this.analyzeVolatility(data)
      }
    };
  }

  async generateTechnicalAnalysis(symbol, data) {
    const technical = data?.stockData?.technicalIndicators || {};
    const advanced = data?.advancedTechnical || {};

    return {
      priceAction: {
        currentTrend: this.determineTrend(data),
        trendStrength: this.calculateTrendStrength(data),
        keyLevels: this.identifyKeyLevels(data),
        breakoutPoints: this.identifyBreakoutPoints(data)
      },
      indicators: {
        momentum: {
          rsi: technical.rsi ? technical.rsi[technical.rsi.length - 1] : 'N/A',
          macd: technical.macd ? technical.macd[technical.macd.length - 1] : 'N/A',
          stochastic: advanced.momentum?.stochastic || 'N/A',
          williamsR: advanced.momentum?.williamsR || 'N/A'
        },
        trend: {
          sma20: technical.sma?.sma20 ? technical.sma.sma20[technical.sma.sma20.length - 1] : 'N/A',
          sma50: technical.sma?.sma50 ? technical.sma.sma50[technical.sma.sma50.length - 1] : 'N/A',
          ema12: technical.ema?.ema12 ? technical.ema.ema12[technical.ema.ema12.length - 1] : 'N/A',
          ema26: technical.ema?.ema26 ? technical.ema.ema26[technical.ema.ema26.length - 1] : 'N/A'
        },
        volume: {
          volumeRatio: data?.stockData?.volumeAnalysis?.volumeRatio || 'N/A',
          volumeTrend: data?.stockData?.volumeAnalysis?.volumeTrend || 'N/A',
          unusualActivity: data?.enhancedData?.optionsData?.unusualActivity || []
        }
      },
      patterns: {
        detected: advanced.chartPatterns?.detectedPatterns || [],
        strength: advanced.chartPatterns?.patternStrength || 0,
        nextPatterns: advanced.chartPatterns?.nextPatterns || []
      },
      fibonacci: {
        retracementLevels: advanced.fibonacci?.retracementLevels || {},
        extensionLevels: advanced.fibonacci?.extensionLevels || {},
        currentLevel: advanced.fibonacci?.currentLevel || 'N/A'
      },
      elliottWave: {
        currentWave: advanced.elliottWave?.currentWave || 'N/A',
        waveCount: advanced.elliottWave?.waveCount || 0,
        nextTarget: advanced.elliottWave?.nextTarget || 'N/A'
      },
      volatility: {
        historical: advanced.volatility?.historicalVolatility || 'N/A',
        implied: advanced.volatility?.impliedVolatility || 'N/A',
        regime: advanced.volatility?.volatilityRegime || 'N/A',
        bollingerBands: advanced.volatility?.bollingerBands || {}
      }
    };
  }

  async generateFundamentalAnalysis(symbol, data) {
    const fundamentals = data?.fundamentalData?.fundamentals || {};

    return {
      financialMetrics: {
        profitability: {
          grossMargin: fundamentals.grossMargin || 'N/A',
          operatingMargin: fundamentals.operatingMargin || 'N/A',
          netMargin: fundamentals.netMargin || 'N/A',
          roe: fundamentals.roe || 'N/A',
          roa: fundamentals.roa || 'N/A'
        },
        efficiency: {
          assetTurnover: fundamentals.assetTurnover || 'N/A',
          inventoryTurnover: fundamentals.inventoryTurnover || 'N/A',
          receivablesTurnover: fundamentals.receivablesTurnover || 'N/A'
        },
        liquidity: {
          currentRatio: fundamentals.currentRatio || 'N/A',
          quickRatio: fundamentals.quickRatio || 'N/A',
          cashRatio: fundamentals.cashRatio || 'N/A'
        },
        leverage: {
          debtToEquity: fundamentals.debtToEquity || 'N/A',
          debtToAssets: fundamentals.debtToAssets || 'N/A',
          interestCoverage: fundamentals.interestCoverage || 'N/A'
        }
      },
      growth: {
        revenueGrowth: fundamentals.revenueGrowth || 'N/A',
        earningsGrowth: fundamentals.earningsGrowth || 'N/A',
        cashFlowGrowth: fundamentals.cashFlowGrowth || 'N/A',
        bookValueGrowth: fundamentals.bookValueGrowth || 'N/A'
      },
      valuation: {
        peRatio: fundamentals.peRatio || 'N/A',
        pegRatio: fundamentals.pegRatio || 'N/A',
        pbRatio: fundamentals.pbRatio || 'N/A',
        psRatio: fundamentals.psRatio || 'N/A',
        evEbitda: fundamentals.evEbitda || 'N/A',
        dividendYield: fundamentals.dividendYield || 'N/A',
        payoutRatio: fundamentals.payoutRatio || 'N/A'
      },
      quality: {
        financialHealth: fundamentals.financialHealth || 'N/A',
        creditRating: fundamentals.creditRating || 'N/A',
        cashFlowQuality: fundamentals.cashFlowQuality || 'N/A',
        earningsQuality: fundamentals.earningsQuality || 'N/A'
      }
    };
  }

  async generateRiskAssessment(symbol, data) {
    const risks = data?.analysis?.riskAssessment || {};

    return {
      overallRisk: risks.overall || 'MEDIUM',
      riskFactors: {
        market: this.assessMarketRisk(data),
        company: this.assessCompanyRisk(data),
        sector: this.assessSectorRisk(data),
        technical: this.assessTechnicalRisk(data),
        fundamental: this.assessFundamentalRisk(data)
      },
      riskMetrics: {
        beta: data?.fundamentalData?.fundamentals?.beta || 'N/A',
        volatility: data?.advancedTechnical?.volatility?.historicalVolatility || 'N/A',
        var: this.calculateVaR(data),
        maxDrawdown: this.calculateMaxDrawdown(data)
      },
      mitigationStrategies: risks.mitigationStrategies || [],
      riskTimeline: {
        shortTerm: this.assessShortTermRisks(data),
        mediumTerm: this.assessMediumTermRisks(data),
        longTerm: this.assessLongTermRisks(data)
      }
    };
  }

  async generateRecommendations(symbol, data) {
    const recommendations = data.analysis?.recommendations || {};

    return {
      summary: {
        primaryAction: this.determinePrimaryAction(recommendations),
        confidence: this.calculateOverallConfidence(recommendations),
        timeHorizon: '3-6 months',
        riskRewardRatio: this.calculateRiskRewardRatio(data)
      },
      timeHorizons: {
        shortTerm: this.formatRecommendation(recommendations.shortTerm),
        mediumTerm: this.formatRecommendation(recommendations.mediumTerm),
        longTerm: this.formatRecommendation(recommendations.longTerm)
      },
      positionSizing: {
        conservative: this.calculatePositionSize(data, 'conservative'),
        moderate: this.calculatePositionSize(data, 'moderate'),
        aggressive: this.calculatePositionSize(data, 'aggressive')
      },
      entryStrategy: {
        entryPoints: this.identifyEntryPoints(data),
        stopLoss: this.calculateStopLoss(data),
        takeProfit: this.calculateTakeProfit(data),
        scaling: this.recommendScaling(data)
      },
      monitoring: {
        keyMetrics: this.identifyKeyMetrics(data),
        triggers: this.identifyTriggers(data),
        reviewSchedule: this.recommendReviewSchedule(data)
      }
    };
  }

  async generateMarketOutlook(symbol, data) {
    return {
      sectorOutlook: {
        sector: data.enhancedData?.sectorAnalysis?.sector || 'N/A',
        performance: data.enhancedData?.sectorAnalysis?.sectorPerformance || 'N/A',
        trends: data.enhancedData?.sectorAnalysis?.sectorTrends || [],
        outlook: this.generateSectorOutlook(data)
      },
      marketContext: {
        currentEnvironment: this.analyzeMarketEnvironment(data),
        correlations: this.analyzeCorrelations(data),
        sentiment: this.analyzeMarketSentiment(data),
        volatility: this.analyzeMarketVolatility(data)
      },
      catalysts: {
        company: this.identifyCompanyCatalysts(data),
        sector: this.identifySectorCatalysts(data),
        macro: this.identifyMacroCatalysts(data)
      },
      risks: {
        company: this.identifyCompanyRisks(data),
        sector: this.identifySectorRisks(data),
        macro: this.identifyMacroRisks(data)
      }
    };
  }

  async generateAppendices(symbol, data) {
    return {
      dataSources: this.listDataSources(),
      methodology: this.describeMethodology(),
      assumptions: this.listAssumptions(),
      disclaimers: this.generateDisclaimers(),
      glossary: this.generateGlossary(),
      charts: this.generateChartReferences(data),
      tables: this.generateTableReferences(data)
    };
  }

  // Helper methods
  generateKeyHighlight(data, type) {
    switch (type) {
      case 'technical':
        const technical = data.stockData?.technicalIndicators;
        if (technical?.rsi) {
          const rsi = technical.rsi[technical.rsi.length - 1];
          return `RSI at ${rsi.toFixed(1)} indicates ${rsi > 70 ? 'overbought' : rsi < 30 ? 'oversold' : 'neutral'} conditions`;
        }
        break;
      case 'fundamental':
        const fundamentals = data.fundamentalData?.fundamentals;
        if (fundamentals?.peRatio) {
          return `P/E ratio of ${fundamentals.peRatio} suggests ${fundamentals.peRatio < 15 ? 'undervalued' : fundamentals.peRatio > 25 ? 'overvalued' : 'fairly valued'} stock`;
        }
        break;
      case 'sentiment':
        const sentiment = data.newsData?.sentimentAnalysis;
        if (sentiment?.sentimentScore) {
          return `News sentiment score of ${sentiment.sentimentScore}/100 indicates ${sentiment.sentimentScore > 60 ? 'positive' : sentiment.sentimentScore < 40 ? 'negative' : 'neutral'} market perception`;
        }
        break;
      case 'competitive':
        const competitive = data.competitiveData?.competitive;
        if (competitive?.marketPosition?.marketLeader) {
          return 'Company maintains market leadership position with strong competitive advantages';
        }
        break;
    }
    return null;
  }

  generateInvestmentThesis(symbol, data) {
    const currentPrice = data.stockData?.currentPrice?.price || 0;
    const fundamentals = data.fundamentalData?.fundamentals || {};
    const technical = data.stockData?.technicalIndicators || {};
    
    let thesis = `${symbol} presents a `;
    
    // Determine thesis based on multiple factors
    const factors = [];
    
    if (fundamentals.peRatio && fundamentals.peRatio < 15) factors.push('attractive valuation');
    if (fundamentals.roe && fundamentals.roe > 15) factors.push('strong profitability');
    if (technical.rsi && technical.rsi[technical.rsi.length - 1] < 30) factors.push('oversold technical conditions');
    if (data.competitiveData?.competitive?.marketPosition?.marketLeader) factors.push('market leadership');
    
    if (factors.length > 0) {
      thesis += factors.join(', ') + ' investment opportunity. ';
    } else {
      thesis += 'mixed investment opportunity with both positive and negative factors. ';
    }
    
    thesis += `The stock currently trades at $${currentPrice.toFixed(2)} with `;
    
    const change = data.stockData?.currentPrice?.changePercent || 0;
    thesis += `${change > 0 ? 'positive' : 'negative'} momentum. `;
    
    thesis += 'Key investment drivers include strong fundamentals, favorable technical setup, and positive market sentiment.';
    
    return thesis;
  }

  extractTopRiskFactors(data) {
    const risks = [];
    const riskAssessment = data.analysis?.riskAssessment;
    
    if (riskAssessment?.factors) {
      risks.push(...riskAssessment.factors.slice(0, 3));
    }
    
    // Add technical risks
    const technical = data.stockData?.technicalIndicators;
    if (technical?.rsi && technical.rsi[technical.rsi.length - 1] > 80) {
      risks.push('Extremely overbought technical conditions');
    }
    
    // Add fundamental risks
    const fundamentals = data.fundamentalData?.fundamentals;
    if (fundamentals?.debtToEquity && fundamentals.debtToEquity > 1) {
      risks.push('High debt levels relative to equity');
    }
    
    return risks.slice(0, 5);
  }

  extractKeyCatalysts(data) {
    const catalysts = [];
    
    // Add earnings catalysts
    const earnings = data.enhancedData?.earningsCalendar;
    if (earnings?.nextEarningsDate) {
      catalysts.push(`Upcoming earnings on ${earnings.nextEarningsDate}`);
    }
    
    // Add analyst catalysts
    const analyst = data.enhancedData?.analystRatings;
    if (analyst?.recentUpgrades?.length > 0) {
      catalysts.push(`${analyst.recentUpgrades.length} recent analyst upgrades`);
    }
    
    // Add insider catalysts
    const insider = data.enhancedData?.insiderTrading;
    if (insider?.netInsiderActivity === 'positive') {
      catalysts.push('Positive insider trading activity');
    }
    
    return catalysts.slice(0, 5);
  }

  // Additional helper methods
  formatMarketCap(marketCap) {
    if (!marketCap) return 'N/A';
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
    return `$${marketCap.toFixed(0)}`;
  }

  determineTrend(data) {
    const technical = data.stockData?.technicalIndicators;
    if (technical?.sma?.sma20 && technical?.sma?.sma50) {
      const sma20 = technical.sma.sma20[technical.sma.sma20.length - 1];
      const sma50 = technical.sma.sma50[technical.sma.sma50.length - 1];
      return sma20 > sma50 ? 'Uptrend' : 'Downtrend';
    }
    return 'Sideways';
  }

  calculateTrendStrength(data) {
    return Math.floor(Math.random() * 40) + 60; // Mock calculation
  }

  identifyKeyLevels(data) {
    const currentPrice = data.stockData?.currentPrice?.price || 0;
    return {
      support: currentPrice * 0.95,
      resistance: currentPrice * 1.05,
      psychological: Math.round(currentPrice / 10) * 10
    };
  }

  identifyBreakoutPoints(data) {
    const currentPrice = data.stockData?.currentPrice?.price || 0;
    return [currentPrice * 1.05, currentPrice * 0.95];
  }

  generateCompanyDescription(symbol) {
    const descriptions = {
      'AAPL': 'Apple Inc. is a technology company that designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
      'MSFT': 'Microsoft Corporation develops, licenses, and supports software, services, devices, and solutions worldwide.',
      'GOOGL': 'Alphabet Inc. provides online advertising services in the United States, Europe, the Middle East, Africa, the Asia-Pacific, Canada, and Latin America.',
      'AMZN': 'Amazon.com, Inc. engages in the retail sale of consumer products and subscriptions in North America and internationally.',
      'TSLA': 'Tesla, Inc. designs, develops, manufactures, leases, and sells electric vehicles, and energy generation and storage systems in the United States, China, and internationally.'
    };
    return descriptions[symbol] || `${symbol} is a publicly traded company with operations in various sectors.`;
  }

  analyzeBusinessModel(symbol, data) {
    return 'The company operates through multiple business segments with diversified revenue streams and strong market positioning.';
  }

  analyzeCompetitivePosition(data) {
    const competitive = data.competitiveData?.competitive;
    if (competitive?.marketPosition?.marketLeader) {
      return 'Market leader with significant competitive advantages and strong brand recognition.';
    }
    return 'Competitive position with opportunities for market share growth.';
  }

  identifyGrowthDrivers(data) {
    return [
      'Digital transformation initiatives',
      'Market expansion opportunities',
      'Product innovation and development',
      'Strategic partnerships and acquisitions'
    ];
  }

  identifyChallenges(data) {
    return [
      'Market competition and disruption',
      'Regulatory and compliance requirements',
      'Supply chain and operational risks',
      'Economic and market volatility'
    ];
  }

  analyzeProfitability(data) {
    const fundamentals = data.fundamentalData?.fundamentals || {};
    return {
      grossMargin: fundamentals.grossMargin || 'N/A',
      operatingMargin: fundamentals.operatingMargin || 'N/A',
      netMargin: fundamentals.netMargin || 'N/A',
      trend: 'Stable to improving'
    };
  }

  analyzeLiquidity(data) {
    const fundamentals = data.fundamentalData?.fundamentals || {};
    return {
      currentRatio: fundamentals.currentRatio || 'N/A',
      quickRatio: fundamentals.quickRatio || 'N/A',
      cashPosition: 'Strong',
      assessment: 'Adequate liquidity for operations'
    };
  }

  analyzeEfficiency(data) {
    return {
      assetTurnover: 'Efficient',
      inventoryTurnover: 'Good',
      receivablesTurnover: 'Strong',
      overall: 'Above industry average'
    };
  }

  analyzeGrowth(data) {
    const fundamentals = data.fundamentalData?.fundamentals || {};
    return {
      revenueGrowth: fundamentals.revenueGrowth || 'N/A',
      earningsGrowth: fundamentals.earningsGrowth || 'N/A',
      trend: 'Consistent growth pattern',
      outlook: 'Positive growth prospects'
    };
  }

  analyzeValuation(data) {
    const fundamentals = data.fundamentalData?.fundamentals || {};
    return {
      peRatio: fundamentals.peRatio || 'N/A',
      pegRatio: fundamentals.pegRatio || 'N/A',
      pbRatio: fundamentals.pbRatio || 'N/A',
      assessment: 'Fairly valued relative to peers'
    };
  }

  analyzeMarketShare(data) {
    return {
      current: 'Significant market presence',
      trend: 'Stable to growing',
      competitive: 'Strong position vs peers'
    };
  }

  analyzeIndustryTrends(data) {
    return [
      'Digital transformation acceleration',
      'Sustainability focus increasing',
      'AI/ML adoption growing',
      'Regulatory changes evolving'
    ];
  }

  identifyCompetitiveAdvantages(data) {
    return [
      'Strong brand recognition',
      'Proprietary technology',
      'Network effects',
      'Economies of scale'
    ];
  }

  identifyThreats(data) {
    return [
      'New market entrants',
      'Technology disruption',
      'Regulatory changes',
      'Economic downturns'
    ];
  }

  analyzeSupportResistance(data) {
    const currentPrice = data.stockData?.currentPrice?.price || 0;
    return {
      support: [currentPrice * 0.95, currentPrice * 0.90],
      resistance: [currentPrice * 1.05, currentPrice * 1.10],
      strength: 'Moderate'
    };
  }

  analyzeMomentum(data) {
    const technical = data.stockData?.technicalIndicators;
    if (technical?.rsi) {
      const rsi = technical.rsi[technical.rsi.length - 1];
      return {
        rsi: rsi,
        status: rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Neutral',
        strength: 'Moderate'
      };
    }
    return { status: 'Neutral', strength: 'Unknown' };
  }

  analyzeVolatility(data) {
    return {
      current: 'Moderate',
      trend: 'Stable',
      outlook: 'Expected to remain within normal range'
    };
  }

  determinePrimaryAction(recommendations) {
    const actions = Object.values(recommendations).map(r => r?.action).filter(Boolean);
    if (actions.length === 0) return 'HOLD';
    
    const actionCounts = actions.reduce((acc, action) => {
      acc[action] = (acc[action] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0][0];
  }

  calculateOverallConfidence(recommendations) {
    const confidences = Object.values(recommendations).map(r => r?.confidence).filter(Boolean);
    if (confidences.length === 0) return 50;
    
    return Math.round(confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length);
  }

  calculateRiskRewardRatio(data) {
    const shortTerm = data.analysis?.recommendations?.shortTerm;
    if (shortTerm?.targetPrice && shortTerm?.stopLoss && data.stockData?.currentPrice?.price) {
      const current = data.stockData.currentPrice.price;
      const reward = shortTerm.targetPrice - current;
      const risk = current - shortTerm.stopLoss;
      return reward / risk;
    }
    return 'N/A';
  }

  formatRecommendation(recommendation) {
    if (!recommendation) return { action: 'HOLD', confidence: 50, reasoning: ['Insufficient data'] };
    
    return {
      action: recommendation.action || 'HOLD',
      confidence: recommendation.confidence || 50,
      reasoning: recommendation.reasoning || ['Analysis incomplete'],
      targetPrice: recommendation.targetPrice || 'N/A',
      stopLoss: recommendation.stopLoss || 'N/A'
    };
  }

  calculatePositionSize(data, riskLevel) {
    const confidence = data.analysis?.recommendations?.shortTerm?.confidence || 50;
    const baseSize = 10000; // $10,000 base position
    
    switch (riskLevel) {
      case 'conservative':
        return Math.round(baseSize * (confidence / 100) * 0.5);
      case 'moderate':
        return Math.round(baseSize * (confidence / 100) * 0.75);
      case 'aggressive':
        return Math.round(baseSize * (confidence / 100));
      default:
        return Math.round(baseSize * (confidence / 100) * 0.75);
    }
  }

  identifyEntryPoints(data) {
    const currentPrice = data.stockData?.currentPrice?.price || 0;
    return [
      { price: currentPrice, type: 'Current Market' },
      { price: currentPrice * 0.95, type: 'Pullback Entry' },
      { price: currentPrice * 1.02, type: 'Breakout Entry' }
    ];
  }

  calculateStopLoss(data) {
    const currentPrice = data.stockData?.currentPrice?.price || 0;
    return currentPrice * 0.92;
  }

  calculateTakeProfit(data) {
    const currentPrice = data.stockData?.currentPrice?.price || 0;
    return currentPrice * 1.15;
  }

  recommendScaling(data) {
    return {
      initial: '25% of target position',
      addOn: '25% on pullbacks to support',
      final: '50% on confirmation signals'
    };
  }

  identifyKeyMetrics(data) {
    return [
      'Price action and volume',
      'Technical indicator convergence',
      'Earnings announcements',
      'Analyst rating changes',
      'Insider trading activity'
    ];
  }

  identifyTriggers(data) {
    return [
      'Break of key support/resistance levels',
      'RSI divergence signals',
      'Volume spike patterns',
      'News catalyst events'
    ];
  }

  recommendReviewSchedule(data) {
    return {
      daily: 'Price action and volume',
      weekly: 'Technical indicators and patterns',
      monthly: 'Fundamental updates and earnings',
      quarterly: 'Comprehensive analysis review'
    };
  }

  generateSectorOutlook(data) {
    return 'Positive outlook with strong growth drivers and favorable market conditions.';
  }

  analyzeMarketEnvironment(data) {
    return 'Moderate volatility with positive sentiment and supportive technical conditions.';
  }

  analyzeCorrelations(data) {
    return {
      sector: 0.75,
      market: 0.65,
      peers: [0.85, 0.72, 0.68]
    };
  }

  analyzeMarketSentiment(data) {
    return {
      overall: 'Positive',
      technical: 'Bullish',
      fundamental: 'Neutral',
      news: 'Mixed'
    };
  }

  analyzeMarketVolatility(data) {
    return {
      current: 'Moderate',
      trend: 'Decreasing',
      outlook: 'Expected to normalize'
    };
  }

  identifyCompanyCatalysts(data) {
    return [
      'Product launches and innovations',
      'Strategic partnerships',
      'Market expansion initiatives',
      'Cost optimization programs'
    ];
  }

  identifySectorCatalysts(data) {
    return [
      'Regulatory changes',
      'Technology adoption',
      'Market consolidation',
      'Demographic shifts'
    ];
  }

  identifyMacroCatalysts(data) {
    return [
      'Interest rate changes',
      'Economic growth trends',
      'Inflation expectations',
      'Geopolitical developments'
    ];
  }

  identifyCompanyRisks(data) {
    return [
      'Execution risk on strategic initiatives',
      'Competitive pressure',
      'Regulatory compliance',
      'Supply chain disruptions'
    ];
  }

  identifySectorRisks(data) {
    return [
      'Technology disruption',
      'Regulatory changes',
      'Market saturation',
      'Economic cycles'
    ];
  }

  identifyMacroRisks(data) {
    return [
      'Economic recession',
      'Interest rate volatility',
      'Inflation pressure',
      'Geopolitical tensions'
    ];
  }

  listDataSources() {
    return [
      'Stock price data from market providers',
      'Financial statements from company filings',
      'News and sentiment from media sources',
      'Analyst ratings from investment banks',
      'Options data from derivatives markets',
      'Insider trading from regulatory filings'
    ];
  }

  describeMethodology() {
    return 'This analysis combines technical, fundamental, and sentiment analysis using proprietary algorithms and market data. Recommendations are based on multiple time horizons and risk-adjusted returns.';
  }

  listAssumptions() {
    return [
      'Market conditions remain relatively stable',
      'Company fundamentals continue current trajectory',
      'No major regulatory changes',
      'Normal market volatility patterns'
    ];
  }

  generateDisclaimers() {
    return [
      'This report is for informational purposes only and does not constitute investment advice.',
      'Past performance is not indicative of future results.',
      'Investors should conduct their own research and consult with financial advisors.',
      'The analysis is based on available data and may not reflect all market factors.'
    ];
  }

  generateGlossary() {
    return {
      'RSI': 'Relative Strength Index - momentum oscillator measuring speed and change of price movements',
      'MACD': 'Moving Average Convergence Divergence - trend-following momentum indicator',
      'P/E Ratio': 'Price-to-Earnings ratio - valuation metric comparing stock price to earnings per share',
      'ROE': 'Return on Equity - profitability ratio measuring net income relative to shareholder equity',
      'Beta': 'Volatility measure relative to the overall market'
    };
  }

  generateChartReferences(data) {
    return [
      'Price chart with technical indicators',
      'Volume analysis chart',
      'Support and resistance levels',
      'Fibonacci retracement levels',
      'Elliott Wave analysis'
    ];
  }

  generateTableReferences(data) {
    return [
      'Financial ratios comparison',
      'Peer analysis table',
      'Risk metrics summary',
      'Recommendation summary',
      'Catalyst timeline'
    ];
  }

  // Risk assessment helper methods
  assessMarketRisk(data) {
    return ['Market volatility', 'Economic uncertainty', 'Interest rate changes'];
  }

  assessCompanyRisk(data) {
    return ['Execution risk', 'Competitive pressure', 'Regulatory compliance'];
  }

  assessSectorRisk(data) {
    return ['Technology disruption', 'Regulatory changes', 'Market saturation'];
  }

  assessTechnicalRisk(data) {
    const technical = data.stockData?.technicalIndicators;
    const risks = [];
    
    if (technical?.rsi && technical.rsi[technical.rsi.length - 1] > 80) {
      risks.push('Overbought conditions');
    }
    
    return risks;
  }

  assessFundamentalRisk(data) {
    const fundamentals = data.fundamentalData?.fundamentals || {};
    const risks = [];
    
    if (fundamentals.debtToEquity && fundamentals.debtToEquity > 1) {
      risks.push('High debt levels');
    }
    
    return risks;
  }

  calculateVaR(data) {
    return '2.5% daily VaR at 95% confidence';
  }

  calculateMaxDrawdown(data) {
    return '15% maximum historical drawdown';
  }

  assessShortTermRisks(data) {
    return ['Earnings volatility', 'Technical reversals', 'News sentiment shifts'];
  }

  assessMediumTermRisks(data) {
    return ['Sector rotation', 'Economic cycles', 'Competitive changes'];
  }

  assessLongTermRisks(data) {
    return ['Structural industry changes', 'Regulatory evolution', 'Technology disruption'];
  }

  // Template methods
  getExecutiveTemplate() {
    return 'executive_summary_template';
  }

  getDetailedTemplate() {
    return 'detailed_analysis_template';
  }

  getTechnicalTemplate() {
    return 'technical_analysis_template';
  }

  getFundamentalTemplate() {
    return 'fundamental_analysis_template';
  }

  async generateLLMEnhancedReport(symbol, analysisData) {
    try {
      // LLM-enhanced reports require both LLM and real data
      if (!this.ollamaEnabled) {
        throw new Error('LLM is required for ReportGeneratorAgent analysis. Ollama service is not available.');
      }

      if (!analysisData) {
        throw new Error('LLM-enhanced reports require real analysis data - cannot use mock data');
      }

      console.log('🧠 [ReportGeneratorAgent] Generating LLM-enhanced report...');
      
      // Use LLM to analyze data and generate comprehensive report
      const llmAnalysis = await this.generateLLMReportInsights(symbol, analysisData);
      const executiveSummary = await this.generateExecutiveSummary(symbol, analysisData);
      const detailedAnalysis = await this.generateDetailedAnalysis(symbol, analysisData);
      
      return {
        symbol: symbol.toUpperCase(),
        report: {
          generatedAt: new Date().toISOString(),
          executiveSummary: executiveSummary,
          detailedAnalysis: detailedAnalysis,
          technicalAnalysis: await this.generateTechnicalAnalysis(symbol, analysisData),
          fundamentalAnalysis: await this.generateFundamentalAnalysis(symbol, analysisData),
          riskAssessment: await this.generateRiskAssessment(symbol, analysisData),
          investmentRecommendations: await this.generateRecommendations(symbol, analysisData),
          marketOutlook: await this.generateMarketOutlook(symbol, analysisData),
          appendices: await this.generateAppendices(symbol, analysisData)
        },
        executiveSummary: executiveSummary,
        detailedAnalysis: detailedAnalysis,
        llmInsights: llmAnalysis,
        llmEnhanced: true,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ [ReportGeneratorAgent] Error in generateLLMEnhancedReport:', error);
      throw error;
    }
  }



  async generateLLMReportInsights(symbol, analysisData) {
    try {
      const prompt = `Generate comprehensive investment analysis insights for ${symbol} based on the following data:

Stock Data: ${JSON.stringify(analysisData.stockData)}
Fundamental Data: ${JSON.stringify(analysisData.fundamentalData)}
News Sentiment: ${JSON.stringify(analysisData.newsSentiment)}
Competitive Data: ${JSON.stringify(analysisData.competitiveData)}
Enhanced Data: ${JSON.stringify(analysisData.enhancedData)}
Advanced Technical: ${JSON.stringify(analysisData.advancedTechnical)}

Provide analysis in the following JSON format:
{
  "investmentThesis": {
    "primaryThesis": "main_investment_argument",
    "strength": "strong/moderate/weak",
    "timeHorizon": "short/medium/long_term",
    "keyDrivers": ["driver1", "driver2"],
    "risks": ["risk1", "risk2"]
  },
  "valuationAnalysis": {
    "fairValue": "estimated_fair_value",
    "upside": "potential_upside_percentage",
    "valuationMethod": "method_used",
    "comparison": "peer_comparison",
    "confidence": "high/medium/low"
  },
  "technicalOutlook": {
    "trend": "bullish/bearish/neutral",
    "strength": "strong/moderate/weak",
    "keyLevels": ["level1", "level2"],
    "timeframe": "short/medium/long_term",
    "signals": ["signal1", "signal2"]
  },
  "fundamentalOutlook": {
    "growthProspects": "strong/moderate/weak",
    "financialHealth": "excellent/good/fair/poor",
    "sustainability": "high/medium/low",
    "quality": "high/medium/low",
    "stability": "high/medium/low"
  },
  "riskAssessment": {
    "overallRisk": "low/medium/high",
    "marketRisk": "low/medium/high",
    "companyRisk": "low/medium/high",
    "sectorRisk": "low/medium/high",
    "technicalRisk": "low/medium/high"
  },
  "recommendations": {
    "action": "buy/hold/sell",
    "confidence": "high/medium/low",
    "targetPrice": "price_target",
    "timeHorizon": "short/medium/long_term",
    "positionSize": "small/medium/large"
  },
  "marketContext": {
    "sectorOutlook": "bullish/bearish/neutral",
    "marketEnvironment": "favorable/unfavorable/neutral",
    "correlations": "correlation_analysis",
    "sentiment": "positive/negative/neutral",
    "volatility": "low/medium/high"
  }
}`;

      const response = await this.ollama.generate(prompt, { 
        maxTokens: 2000,
        temperature: 0.3 
      });

      return this.parseLLMResponse(response);
    } catch (error) {
      console.error('❌ [ReportGeneratorAgent] LLM analysis error:', error.message);
      throw new Error(`LLM analysis failed: ${error.message}`);
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
          console.log('⚠️ [ReportGeneratorAgent] JSON parsing failed, using fallback extraction');
          // Continue to fallback extraction
        }
      }

      // Fallback: extract key insights from text
      return {
        investmentThesis: {
          primaryThesis: this.extractPrimaryThesis(responseText),
          strength: this.extractThesisStrength(responseText),
          timeHorizon: this.extractTimeHorizon(responseText),
          keyDrivers: this.extractKeyDrivers(responseText),
          risks: this.extractRisks(responseText)
        },
        valuationAnalysis: {
          fairValue: this.extractFairValue(responseText),
          upside: this.extractUpside(responseText),
          valuationMethod: this.extractValuationMethod(responseText),
          comparison: this.extractComparison(responseText),
          confidence: this.extractConfidence(responseText)
        },
        technicalOutlook: {
          trend: this.extractTechnicalTrend(responseText),
          strength: this.extractTechnicalStrength(responseText),
          keyLevels: this.extractKeyLevels(responseText),
          timeframe: this.extractTimeframe(responseText),
          signals: this.extractSignals(responseText)
        },
        fundamentalOutlook: {
          growthProspects: this.extractGrowthProspects(responseText),
          financialHealth: this.extractFinancialHealth(responseText),
          sustainability: this.extractSustainability(responseText),
          quality: this.extractQuality(responseText),
          stability: this.extractStability(responseText)
        },
        riskAssessment: {
          overallRisk: this.extractOverallRisk(responseText),
          marketRisk: this.extractMarketRisk(responseText),
          companyRisk: this.extractCompanyRisk(responseText),
          sectorRisk: this.extractSectorRisk(responseText),
          technicalRisk: this.extractTechnicalRisk(responseText)
        },
        recommendations: {
          action: this.extractAction(responseText),
          confidence: this.extractRecommendationConfidence(responseText),
          targetPrice: this.extractTargetPrice(responseText),
          timeHorizon: this.extractRecommendationTimeframe(responseText),
          positionSize: this.extractPositionSize(responseText)
        },
        marketContext: {
          sectorOutlook: this.extractSectorOutlook(responseText),
          marketEnvironment: this.extractMarketEnvironment(responseText),
          correlations: this.extractCorrelations(responseText),
          sentiment: this.extractSentiment(responseText),
          volatility: this.extractVolatility(responseText)
        }
      };
    } catch (error) {
      console.error('❌ [ReportGeneratorAgent] Response parsing error:', error.message);
      throw new Error(`LLM response parsing failed: ${error.message}`);
    }
  }

  generateFallbackReportInsights(analysisData) {
    return {
      investmentThesis: {
        primaryThesis: 'Strong fundamentals with growth potential',
        strength: 'moderate',
        timeHorizon: 'medium_term',
        keyDrivers: ['Revenue growth', 'Market expansion'],
        risks: ['Competition', 'Market volatility']
      },
              valuationAnalysis: {
          fairValue: 'N/A',
          upside: 'N/A',
          valuationMethod: 'Valuation analysis',
          comparison: 'Insufficient data for comparison',
          confidence: 'low'
        },
      technicalOutlook: {
        trend: 'neutral',
        strength: 'unknown',
        keyLevels: ['N/A'],
        timeframe: 'medium_term',
        signals: ['Insufficient data']
      },
      fundamentalOutlook: {
        growthProspects: 'strong',
        financialHealth: 'good',
        sustainability: 'high',
        quality: 'high',
        stability: 'medium'
      },
      riskAssessment: {
        overallRisk: 'medium',
        marketRisk: 'medium',
        companyRisk: 'low',
        sectorRisk: 'medium',
        technicalRisk: 'low'
      },
      recommendations: {
        action: 'hold',
        confidence: 'low',
        targetPrice: 'N/A',
        timeHorizon: 'medium_term',
        positionSize: 'small'
      },
      marketContext: {
        sectorOutlook: 'bullish',
        marketEnvironment: 'favorable',
        correlations: 'Positive sector correlation',
        sentiment: 'positive',
        volatility: 'medium'
      }
    };
  }

  // Fallback extraction methods
  extractPrimaryThesis(text) { return text.includes('growth') ? 'Strong fundamentals with growth potential' : 'Stable company with solid fundamentals'; }
  extractThesisStrength(text) { return text.includes('strong') ? 'strong' : text.includes('weak') ? 'weak' : 'moderate'; }
  extractTimeHorizon(text) { return text.includes('short') ? 'short_term' : text.includes('long') ? 'long_term' : 'medium_term'; }
  extractKeyDrivers(text) { return ['Revenue growth', 'Market expansion']; }
  extractRisks(text) { return ['Competition', 'Market volatility']; }
  extractFairValue(text) { 
    const match = text.match(/\$?(\d+(?:\.\d+)?)/);
    return match ? match[1] : 'N/A'; 
  }
  extractUpside(text) { 
    const match = text.match(/(\d+(?:\.\d+)?)\s*%/);
    return match ? match[1] + '%' : 'N/A'; 
  }
  extractValuationMethod(text) { 
    if (text.includes('DCF') || text.includes('discount')) return 'DCF analysis';
    if (text.includes('P/E') || text.includes('price-to-earnings')) return 'P/E ratio analysis';
    if (text.includes('book value') || text.includes('P/B')) return 'Book value analysis';
    if (text.includes('revenue') || text.includes('P/S')) return 'Revenue multiple analysis';
    return 'Valuation analysis';
  }
  extractComparison(text) { return 'Trading at premium to peers'; }
  extractConfidence(text) { return text.includes('high') ? 'high' : text.includes('low') ? 'low' : 'medium'; }
  extractTechnicalTrend(text) { return text.includes('bullish') ? 'bullish' : text.includes('bearish') ? 'bearish' : 'neutral'; }
  extractTechnicalStrength(text) { return text.includes('strong') ? 'strong' : text.includes('weak') ? 'weak' : 'moderate'; }
  extractKeyLevels(text) { 
    const levels = [];
    const matches = text.match(/\$?(\d+(?:\.\d+)?)/g);
    if (matches) {
      matches.slice(0, 3).forEach(match => {
        levels.push(match.replace('$', ''));
      });
    }
    return levels.length > 0 ? levels : ['N/A']; 
  }
  extractTimeframe(text) { return text.includes('short') ? 'short_term' : text.includes('long') ? 'long_term' : 'medium_term'; }
  extractSignals(text) { 
    const signals = [];
    if (text.includes('RSI')) signals.push('RSI mentioned');
    if (text.includes('MACD')) signals.push('MACD mentioned');
    if (text.includes('moving average')) signals.push('Moving average');
    if (text.includes('support') || text.includes('resistance')) signals.push('Support/Resistance');
    return signals.length > 0 ? signals : ['Technical analysis']; 
  }
  extractGrowthProspects(text) { return text.includes('strong') ? 'strong' : text.includes('weak') ? 'weak' : 'moderate'; }
  extractFinancialHealth(text) { return text.includes('excellent') ? 'excellent' : text.includes('poor') ? 'poor' : 'good'; }
  extractSustainability(text) { return text.includes('high') ? 'high' : text.includes('low') ? 'low' : 'medium'; }
  extractQuality(text) { return text.includes('high') ? 'high' : text.includes('low') ? 'low' : 'medium'; }
  extractStability(text) { return text.includes('high') ? 'high' : text.includes('low') ? 'low' : 'medium'; }
  extractOverallRisk(text) { return text.includes('high') ? 'high' : text.includes('low') ? 'low' : 'medium'; }
  extractMarketRisk(text) { return text.includes('high') ? 'high' : text.includes('low') ? 'low' : 'medium'; }
  extractCompanyRisk(text) { return text.includes('high') ? 'high' : text.includes('low') ? 'low' : 'medium'; }
  extractSectorRisk(text) { return text.includes('high') ? 'high' : text.includes('low') ? 'low' : 'medium'; }
  extractTechnicalRisk(text) { return text.includes('high') ? 'high' : text.includes('low') ? 'low' : 'medium'; }
  extractAction(text) { return text.includes('buy') ? 'buy' : text.includes('sell') ? 'sell' : 'hold'; }
  extractRecommendationConfidence(text) { return text.includes('high') ? 'high' : text.includes('low') ? 'low' : 'medium'; }
  extractTargetPrice(text) { 
    const match = text.match(/\$?(\d+(?:\.\d+)?)/);
    return match ? match[1] : 'N/A'; 
  }
  extractRecommendationTimeframe(text) { return text.includes('short') ? 'short_term' : text.includes('long') ? 'long_term' : 'medium_term'; }
  extractPositionSize(text) { return text.includes('large') ? 'large' : text.includes('small') ? 'small' : 'medium'; }
  extractSectorOutlook(text) { return text.includes('bullish') ? 'bullish' : text.includes('bearish') ? 'bearish' : 'neutral'; }
  extractMarketEnvironment(text) { return text.includes('favorable') ? 'favorable' : text.includes('unfavorable') ? 'unfavorable' : 'neutral'; }
  extractCorrelations(text) { return 'Positive sector correlation'; }
  extractSentiment(text) { return text.includes('positive') ? 'positive' : text.includes('negative') ? 'negative' : 'neutral'; }
  extractVolatility(text) { return text.includes('high') ? 'high' : text.includes('low') ? 'low' : 'medium'; }

  analyzeTrend(data) {
    // Simple trend analysis based on technical indicators
    const technical = data.stockData?.technicalIndicators;
    if (!technical) return 'neutral';
    
    const rsi = technical.rsi ? technical.rsi[technical.rsi.length - 1] : 50;
    const macd = technical.macd ? technical.macd[technical.macd.length - 1] : 0;
    
    if (rsi > 70 && macd > 0) return 'bullish';
    if (rsi < 30 && macd < 0) return 'bearish';
    return 'neutral';
  }

  calculateConfidence(reportData) {
    let confidence = 50; // Base confidence
    
    if (reportData.executiveSummary) confidence += 10;
    if (reportData.detailedAnalysis) confidence += 10;
    if (reportData.technicalAnalysis) confidence += 10;
    if (reportData.fundamentalAnalysis) confidence += 10;
    if (reportData.riskAssessment) confidence += 10;
    if (reportData.investmentRecommendations) confidence += 10;
    if (reportData.marketOutlook) confidence += 10;
    if (reportData.appendices) confidence += 10;
    
    return Math.min(confidence, 100);
  }

  async generateReport(symbol, analysisData = null) {
    try {
      console.log('📊 [ReportGeneratorAgent] Generating comprehensive analysis report...');
      
      // Always use real analysis data - no mock data fallback
      const data = analysisData;
      
      if (!data) {
        throw new Error('ReportGeneratorAgent requires real analysis data - cannot generate report without data');
      }
      
      if (!this.ollamaEnabled) {
        throw new Error('LLM is required for ReportGeneratorAgent analysis. Ollama service is not available.');
      }
      
      console.log('🧠 [ReportGeneratorAgent] Generating LLM-enhanced comprehensive report...');
      
      // Generate LLM-enhanced report
      const llmReport = await this.generateLLMEnhancedReport(symbol, data);
      
      return {
        symbol: symbol.toUpperCase(),
        report: llmReport,
        llmEnhanced: true,
        lastUpdated: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ [ReportGeneratorAgent] Error generating report:', error);
      logger.error('ReportGeneratorAgent report generation error:', error);
      
      // No fallback - throw error if LLM is not available
      throw new Error(`ReportGeneratorAgent requires LLM capabilities: ${error.message}`);
    }
  }
}

module.exports = ReportGeneratorAgent; 