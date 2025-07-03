const BaseAgent = require('./BaseAgent');
const config = require('../config');
const logger = require('../utils/logger');
const OllamaService = require('../utils/ollama');

class AnalysisAgent extends BaseAgent {
  constructor() {
    super(
      'AnalysisAgent',
      [config.queues.analysis],
      [config.queues.ui]
    );
    
    this.pendingAnalyses = new Map();
    this.dataCollectionTimeout = 300000; // 5 minutes timeout (extended for comprehensive LLM analysis)
    this.ollama = new OllamaService();
    this.ollamaEnabled = false;
    
    // Check Ollama availability
    this.initializeOllama();
  }

  async initializeOllama() {
    try {
      console.log('🔍 [AnalysisAgent] Checking Ollama availability...');
      this.ollamaEnabled = await this.ollama.isAvailable();
      
      if (this.ollamaEnabled) {
        console.log('✅ [AnalysisAgent] Ollama service available - LLM-enhanced analysis enabled');
        logger.info('Ollama service available - LLM-enhanced analysis enabled');
        
        // Check available models
        const models = await this.ollama.getModels();
        console.log('📋 [AnalysisAgent] Available models:', models.map(m => m.name));
        
        const hasRecommendedModel = models.some(model => 
          model.name.includes('llama3.1') || 
          model.name.includes('mistral') ||
          model.name.includes('phi3')
        );
        
        if (!hasRecommendedModel) {
          console.log('📥 [AnalysisAgent] Pulling recommended model for analysis...');
          logger.info('Pulling recommended model for analysis...');
          try {
            await this.ollama.pullModel('llama3.1:8b');
            console.log('✅ [AnalysisAgent] Model pull completed successfully');
          } catch (err) {
            console.warn('⚠️ [AnalysisAgent] Failed to pull model:', err.message);
            logger.warn('Failed to pull model:', err.message);
            // Continue with existing models
          }
        } else {
          console.log('✅ [AnalysisAgent] Recommended model already available');
        }
        
        // Test a simple generation to ensure everything is working
        try {
          const testResponse = await this.ollama.generate('Hello', { maxTokens: 10 });
          console.log('✅ [AnalysisAgent] LLM test successful');
          logger.info('LLM test successful');
        } catch (testError) {
          console.error('❌ [AnalysisAgent] LLM test failed:', testError.message);
          logger.error('LLM test failed:', testError.message);
          this.ollamaEnabled = false;
        }
        
      } else {
        console.warn('⚠️ [AnalysisAgent] Ollama not available - using traditional analysis methods');
        logger.warn('Ollama not available - using traditional analysis methods');
      }
    } catch (error) {
      console.error('❌ [AnalysisAgent] Error initializing Ollama:', error.message);
      logger.error('Error initializing Ollama:', error.message);
      this.ollamaEnabled = false;
    }
  }

  async processMessage(message) {
    try {
      console.log('📥 [AnalysisAgent] Processing message:', {
        requestId: message.requestId,
        agentType: message.agentType,
        status: message.status,
        hasPayload: !!message.payload
      });

      // Validate message structure
      if (!this.validateMessage(message)) {
        logger.warn(`${this.agentName} received invalid message:`, message);
        return;
      }

      const { requestId, agentType, timestamp, payload, status } = message;
      
      logger.info(`${this.agentName} processing request ${requestId} from ${agentType}`);
      
      let result;
      
      // Handle different types of messages
      if (agentType === 'UIAgent') {
        // This is an initial analysis request
        console.log('🚀 [AnalysisAgent] Processing initial analysis request from UI');
        result = await this.initiateAnalysis(payload, requestId);
        
        // Only mark as processed for initial UI requests
        if (result) {
          this.processedRequests.set(requestId, {
            timestamp: Date.now(),
            result
          });
        }
      } else if (status === 'success' && (agentType === 'StockDataAgent' || agentType === 'NewsSentimentAgent' || agentType === 'FundamentalDataAgent' || agentType === 'CompetitiveAgent')) {
        // This is data from another agent
        console.log('📊 [AnalysisAgent] Processing data from agent:', agentType);
        result = await this.handleAgentData(message, requestId);
        
        // Don't mark as processed here - handleAgentData manages its own completion state
        // When analysis is complete, it will be handled internally
      } else {
        console.log('⚠️ [AnalysisAgent] Unhandled message type:', { agentType, status });
        return;
      }
      
      // Clean up old processed requests (keep only last 1000) - only for UI requests
      if (agentType === 'UIAgent' && this.processedRequests.size > 1000) {
        const oldestEntries = Array.from(this.processedRequests.entries())
          .sort(([,a], [,b]) => a.timestamp - b.timestamp)
          .slice(0, this.processedRequests.size - 1000);
        
        oldestEntries.forEach(([key]) => {
          this.processedRequests.delete(key);
        });
      }
      
      if (result && agentType === 'UIAgent') {
        logger.info(`${this.agentName} completed processing request ${requestId}`);
      }
      
    } catch (error) {
      logger.error(`${this.agentName} error processing message:`, error);
      
      // Send error result
      if (message.requestId) {
        await this.sendError(message.requestId, error);
      }
    }
  }

  async handleRequest(payload, requestId) {
    try {
      console.log('📥 [AnalysisAgent] Received request:', { requestId, payload });
      
      // This should not be called directly anymore since we override processMessage
      console.log('🚀 [AnalysisAgent] Initiating new analysis via handleRequest');
      return await this.initiateAnalysis(payload, requestId);
    } catch (error) {
      console.error(`💥 [AnalysisAgent] Error for request ${requestId}:`, error);
      logger.error(`AnalysisAgent error for request ${requestId}:`, error);
      throw error;
    }
  }

  async initiateAnalysis(payload, requestId) {
    const { symbol } = payload;
    
    console.log('🎯 [AnalysisAgent] Initiating analysis:', { symbol, requestId });
    
    if (!symbol) {
      console.log('❌ [AnalysisAgent] Missing symbol in payload');
      throw new Error('Symbol is required');
    }

    // Always expect all four agents
    const expectedAgents = [
      'StockDataAgent',
      'NewsSentimentAgent',
      'FundamentalDataAgent',
      'CompetitiveAgent'
    ];

    // Initialize analysis tracking
    const analysisData = {
      symbol: symbol.toUpperCase(),
      startTime: Date.now(),
      receivedData: {},
      expectedAgents,
      completed: false
    };
    
    this.pendingAnalyses.set(requestId, analysisData);
    
    console.log('📦 [AnalysisAgent] Analysis tracking initialized:', {
      requestId,
      symbol: analysisData.symbol,
      expectedAgents: analysisData.expectedAgents,
      pendingCount: this.pendingAnalyses.size
    });

    await this.sendProgress(requestId, 66, 'Starting comprehensive analysis...');

    // Start timeout timer
    setTimeout(() => {
      console.log('⏰ [AnalysisAgent] Timeout triggered for request:', requestId);
      this.checkAndCompleteAnalysis(requestId, true);
    }, this.dataCollectionTimeout);

    console.log('✅ [AnalysisAgent] Analysis initiated successfully');
    return { status: 'analysis_initiated', requestId };
  }

  async handleAgentData(message, requestId) {
    console.log('📊 [AnalysisAgent] Handling agent data:', {
      requestId,
      agentType: message.agentType,
      hasPayload: !!message.payload
    });
    
    const analysis = this.pendingAnalyses.get(requestId);
    
    if (!analysis || analysis.completed) {
      console.log('⚠️ [AnalysisAgent] Analysis not found or already completed:', {
        requestId,
        found: !!analysis,
        completed: analysis?.completed
      });
      logger.debug(`Analysis ${requestId} not found or already completed`);
      return null;
    }

    // Store the received data
    analysis.receivedData[message.agentType] = message.payload;
    
    console.log('📦 [AnalysisAgent] Data stored from agent:', {
      agentType: message.agentType,
      requestId,
      receivedAgents: Object.keys(analysis.receivedData),
      expectedAgents: analysis.expectedAgents
    });
    
    logger.info(`AnalysisAgent received data from ${message.agentType} for request ${requestId}`);

    // Update progress - scale to 66-90% range
    const receivedCount = Object.keys(analysis.receivedData).length;
    const totalExpected = analysis.expectedAgents.length;
    const progress = Math.min(90, 66 + (receivedCount / totalExpected) * 24); // 66% + up to 24% = 90% max
    
    console.log('📈 [AnalysisAgent] Progress update:', {
      requestId,
      receivedCount,
      totalExpected,
      progress: Math.round(progress)
    });
    
    await this.sendProgress(requestId, progress, `Received data from ${message.agentType}...`);

    // Check if we have all the data we need
    if (receivedCount >= totalExpected) {
      console.log('🎉 [AnalysisAgent] All data received, completing analysis');
      return await this.checkAndCompleteAnalysis(requestId, false);
    }

    console.log('⏳ [AnalysisAgent] Waiting for more data...');
    return null;
  }

  async checkAndCompleteAnalysis(requestId, isTimeout = false) {
    console.log('🔍 [AnalysisAgent] Checking completion status:', {
      requestId,
      isTimeout,
      hasPendingAnalysis: this.pendingAnalyses.has(requestId)
    });
    
    const analysis = this.pendingAnalyses.get(requestId);
    
    if (!analysis || analysis.completed) {
      console.log('⚠️ [AnalysisAgent] Analysis not found or already completed');
      return null;
    }

    const receivedCount = Object.keys(analysis.receivedData).length;
    
    console.log('📊 [AnalysisAgent] Analysis completion check:', {
      requestId,
      receivedCount,
      expectedCount: analysis.expectedAgents.length,
      receivedFrom: Object.keys(analysis.receivedData),
      isTimeout
    });
    
    if (receivedCount === 0) {
      console.log('❌ [AnalysisAgent] No data received within timeout');
      logger.warn(`No data received for analysis ${requestId} within timeout`);
      analysis.completed = true;
      this.pendingAnalyses.delete(requestId);
      return null;
    }

    if (isTimeout) {
      console.log('⏰ [AnalysisAgent] Completing analysis due to timeout');
      logger.warn(`Analysis ${requestId} timing out with ${receivedCount} of ${analysis.expectedAgents.length} agents`);
    }

    analysis.completed = true;
    
    try {
      console.log('🔄 [AnalysisAgent] Generating investment analysis...');
      await this.sendProgress(requestId, 95, 'Generating investment recommendations...');

      // Generate comprehensive analysis
      const result = await this.generateInvestmentAnalysis(analysis);
      
      console.log('✅ [AnalysisAgent] Analysis generation completed:', {
        requestId,
        resultKeys: Object.keys(result),
        hasSymbol: !!result.symbol,
        hasAnalysis: !!result.analysis,
        hasRawData: !!result.rawData
      });
      
      await this.sendProgress(requestId, 100, 'Analysis complete');

      // Clean up
      this.pendingAnalyses.delete(requestId);
      
      console.log('📤 [AnalysisAgent] Sending final result to UI queue');
      
      // Send final result to UI queue
      await this.publishMessage(config.queues.ui, {
        requestId,
        type: 'analysis_result',
        status: 'success',
        payload: result,
        timestamp: new Date().toISOString()
      });

      console.log('🎉 [AnalysisAgent] Analysis completed and sent successfully');
      return result;

    } catch (error) {
      console.error('💥 [AnalysisAgent] Error completing analysis:', error);
      logger.error(`Error completing analysis for ${requestId}:`, error);
      this.pendingAnalyses.delete(requestId);
      
      // Send error to UI queue
      await this.publishMessage(config.queues.ui, {
        requestId,
        type: 'analysis_error',
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }

  async generateInvestmentAnalysis(analysis) {
    const { symbol, receivedData } = analysis;
    
    try {
      // Extract data from different agents
      const stockData = receivedData.StockDataAgent || {};
      const newsData = receivedData.NewsSentimentAgent || {};
      const fundamentalData = receivedData.FundamentalDataAgent || {};
      const competitiveData = receivedData.CompetitiveAgent || {};
      const economicData = receivedData.EconomicIndicatorAgent || {};

      console.log('🧠 [AnalysisAgent] Starting LLM-powered analysis for', symbol);

      // **PRIORITIZE LLM ANALYSIS** - Try LLM first, fallback to traditional only if LLM completely fails
      let recommendations = null;
      let insights = null;
      let riskAssessment = null;
      let marketContext = null;
      let fundamentalSummary = null;
      let competitiveSummary = null;
      let isLLMPowered = false;
      let llmFailureReason = null;

      if (this.ollamaEnabled) {
        try {
          console.log('🚀 [AnalysisAgent] Generating comprehensive LLM analysis...');
          // Generate ALL analysis components using LLM with rich context
          const llmAnalysis = await this.generateComprehensiveLLMAnalysis(symbol, stockData, newsData, fundamentalData, competitiveData, economicData);
          if (llmAnalysis) {
            recommendations = llmAnalysis.recommendations;
            insights = llmAnalysis.insights;
            riskAssessment = llmAnalysis.riskAssessment;
            marketContext = llmAnalysis.marketContext;
            fundamentalSummary = llmAnalysis.fundamentalSummary || this.summarizeFundamentals(fundamentalData);
            competitiveSummary = llmAnalysis.competitiveSummary || this.summarizeCompetitive(competitiveData);
            isLLMPowered = true;
            console.log('✅ [AnalysisAgent] LLM analysis completed successfully');
          }
        } catch (error) {
          console.error('❌ [AnalysisAgent] LLM analysis failed:', error.message);
          llmFailureReason = error.message;
        }
      } else {
        llmFailureReason = 'Ollama LLM service not available';
        console.warn('⚠️ [AnalysisAgent] Ollama service not available');
      }

      // Only use traditional analysis as fallback if LLM completely failed
      if (!isLLMPowered) {
        console.log('⚠️ [AnalysisAgent] Falling back to traditional analysis');
        // Fallback: generate summaries from agent data
        recommendations = this.generateTraditionalRecommendations(stockData, newsData, fundamentalData, competitiveData, economicData);
        insights = this.summarizeInsights(stockData, newsData, fundamentalData, competitiveData, economicData);
        riskAssessment = this.summarizeRisks(stockData, newsData, fundamentalData, competitiveData, economicData);
        marketContext = this.summarizeMarketContext(stockData, newsData, fundamentalData, competitiveData, economicData);
        fundamentalSummary = this.summarizeFundamentals(fundamentalData);
        competitiveSummary = this.summarizeCompetitive(competitiveData);
      }

      return {
        symbol,
        analysis: {
          recommendations,
          insights,
          riskAssessment,
          marketContext,
          fundamentalSummary,
          competitiveSummary,
          dataQuality: this.assessDataQuality(receivedData),
          generatedAt: new Date().toISOString(),
          llmEnhanced: isLLMPowered,
          llmFailureReason: llmFailureReason,
          analysisType: isLLMPowered ? 'LLM-Powered AI Analysis' : 'Traditional Mathematical Analysis',
          analysisWarning: isLLMPowered ? null : {
            title: '⚠️ AI Analysis Unavailable',
            message: `Advanced AI analysis could not be generated due to: ${llmFailureReason}. This report uses traditional mathematical models which may provide less specific and contextual insights.`
          },
          agentDataStatus: {
            StockDataAgent: {
              status: receivedData.StockDataAgent ? 'success' : 'missing',
              hasData: !!receivedData.StockDataAgent,
              dataKeys: receivedData.StockDataAgent ? Object.keys(receivedData.StockDataAgent) : [],
              timestamp: receivedData.StockDataAgent?.lastUpdated
            },
            NewsSentimentAgent: {
              status: receivedData.NewsSentimentAgent ? 'success' : 'missing',
              hasData: !!receivedData.NewsSentimentAgent,
              dataKeys: receivedData.NewsSentimentAgent ? Object.keys(receivedData.NewsSentimentAgent) : [],
              timestamp: receivedData.NewsSentimentAgent?.lastUpdated
            },
            FundamentalDataAgent: {
              status: receivedData.FundamentalDataAgent ? 'success' : 'missing',
              hasData: !!receivedData.FundamentalDataAgent,
              dataKeys: receivedData.FundamentalDataAgent ? Object.keys(receivedData.FundamentalDataAgent) : [],
              timestamp: receivedData.FundamentalDataAgent?.lastUpdated
            },
            CompetitiveAgent: {
              status: receivedData.CompetitiveAgent ? 'success' : 'missing',
              hasData: !!receivedData.CompetitiveAgent,
              dataKeys: receivedData.CompetitiveAgent ? Object.keys(receivedData.CompetitiveAgent) : [],
              timestamp: receivedData.CompetitiveAgent?.lastUpdated
            }
          }
        },
        rawData: {
          stockData,
          newsData,
          fundamentalData,
          competitiveData,
          economicData
        }
      };
    } catch (error) {
      console.error('💥 [AnalysisAgent] Error generating investment analysis:', error);
      throw error;
    }
  }

  // --- Helper summary methods for fallback reporting ---
  summarizeFundamentals(fundamentalData) {
    if (!fundamentalData.fundamentals) return '**Fundamental Analysis**\n\nNo fundamental data available.';
    const m = fundamentalData.fundamentals.metrics || {};
    const health = fundamentalData.fundamentals.financialHealth || {};
    const valuation = fundamentalData.fundamentals.valuation || {};
    const highlights = (fundamentalData.fundamentals.keyHighlights || []).map(h => `- ${h}`).join('\n');
    return `**Fundamental Analysis**\n\n- Market Cap: $${m.marketCap?.toLocaleString() || 'N/A'}\n- P/E Ratio: ${m.peRatio || 'N/A'}\n- PEG Ratio: ${m.pegRatio || 'N/A'}\n- EPS: ${m.eps || 'N/A'}\n- Dividend Yield: ${m.dividendYield || 'N/A'}%\n- Debt/Equity: ${m.debtToEquity || 'N/A'}\n- ROE: ${m.roe || 'N/A'}%\n- Revenue Growth: ${m.revenueGrowth || 'N/A'}%\n- Financial Health: ${health.rating || 'N/A'} (Score: ${health.score || 'N/A'})\n- Valuation: ${valuation.rating || 'N/A'}\n${highlights ? `\n**Highlights:**\n${highlights}` : ''}`;
  }

  summarizeCompetitive(competitiveData) {
    if (!competitiveData.competitive) return '**Competitive Analysis**\n\nNo competitive data available.';
    const c = competitiveData.competitive;
    const peers = (c.peers || []).map(p => `- ${p}`).join('\n');
    const advantages = (c.competitiveAdvantages || []).map(a => `- ${a.advantage}`).join('\n');
    return `**Competitive Analysis**\n\n- Peers:\n${peers || 'N/A'}\n- Market Position: ${c.marketPosition?.industryRank ? `Rank ${c.marketPosition.industryRank}` : 'N/A'}\n- Market Share: ${c.marketPosition?.marketShare || 'N/A'}%\n- Competitive Advantages:\n${advantages || 'N/A'}\n- SWOT: ${c.swotAnalysis ? JSON.stringify(c.swotAnalysis, null, 2) : 'N/A'}\n- Competitive Score: ${c.competitiveScore || 'N/A'}`;
  }

  summarizeRisks(stockData, newsData, fundamentalData, competitiveData, economicData) {
    let risks = [];
    if (fundamentalData.fundamentals && fundamentalData.fundamentals.financialHealth?.rating === 'Poor') {
      risks.push('Financial health is poor.');
    }
    if (competitiveData.competitive && competitiveData.competitive.marketPosition?.competitiveIntensity === 'high') {
      risks.push('High competitive intensity in the sector.');
    }
    if (stockData.technicalIndicators && stockData.technicalIndicators.rsi > 70) {
      risks.push('Stock is overbought (RSI > 70).');
    }
    if (newsData.sentimentAnalysis && newsData.sentimentAnalysis.overallScore < 40) {
      risks.push('Recent news sentiment is negative.');
    }
    if (economicData.regimeAnalysis && economicData.regimeAnalysis.regime === 'contractionary') {
      risks.push('Macroeconomic regime is contractionary.');
    }
    return `**Risk Assessment**\n\n${risks.length ? risks.map(r => `- ${r}`).join('\n') : 'No major risks identified.'}`;
  }

  summarizeInsights(stockData, newsData, fundamentalData, competitiveData, economicData) {
    let insights = [];
    if (fundamentalData.fundamentals && fundamentalData.fundamentals.financialHealth?.rating === 'Excellent') {
      insights.push('Company has excellent financial health.');
    }
    if (competitiveData.competitive && competitiveData.competitive.marketPosition?.marketLeader) {
      insights.push('Company is a market leader in its sector.');
    }
    if (newsData.sentimentAnalysis && newsData.sentimentAnalysis.overallScore > 60) {
      insights.push('Recent news sentiment is positive.');
    }
    if (stockData.technicalIndicators && stockData.technicalIndicators.rsi < 30) {
      insights.push('Stock is oversold (RSI < 30), possible rebound.');
    }
    if (economicData.regimeAnalysis && economicData.regimeAnalysis.regime === 'expansionary') {
      insights.push('Macroeconomic regime is expansionary.');
    }
    return `**Additional Insights**\n\n${insights.length ? insights.map(i => `- ${i}`).join('\n') : 'No additional insights.'}`;
  }

  summarizeMarketContext(stockData, newsData, fundamentalData, competitiveData, economicData) {
    return `**Market Context**\n\nTraditional analysis based on mathematical models and available agent data.\n`;
  }

  generateTraditionalRecommendations(stockData, newsData, fundamentalData, competitiveData, economicData) {
    if (fundamentalData.fundamentals && fundamentalData.fundamentals.financialHealth?.rating === 'Excellent') {
      return 'Strong Buy based on excellent fundamentals.';
    }
    if (competitiveData.competitive && competitiveData.competitive.marketPosition?.marketLeader) {
      return 'Buy - Company is a market leader.';
    }
    if (newsData.sentimentAnalysis && newsData.sentimentAnalysis.overallScore < 40) {
      return 'Sell - Negative news sentiment.';
    }
    return 'Hold - No strong signals.';
  }

  // **NEW COMPREHENSIVE LLM ANALYSIS METHOD**
  async generateComprehensiveLLMAnalysis(symbol, stockData, newsData, fundamentalData, competitiveData, economicData) {
    try {
      // Prepare rich, contextual data for LLM
      const contextualData = this.prepareContextualData(symbol, stockData, newsData, fundamentalData, competitiveData, economicData);
      
      // Generate comprehensive analysis with enhanced prompts
      const analysisPromise = this.ollama.generateInvestmentRecommendation({
        symbol,
        technical: {
          score: contextualData.technicalScore,
          indicators: stockData.technicalIndicators,
          trend: contextualData.priceTrend,
          currentPrice: stockData.currentPrice,
          supportResistance: contextualData.supportResistance,
          volumeAnalysis: stockData.volumeAnalysis,
          patternAnalysis: stockData.patternAnalysis
        },
        sentiment: {
          score: contextualData.sentimentScore,
          newsSentiment: newsData.sentimentAnalysis?.sentimentScore,
          socialSentiment: newsData.socialSentiment?.score,
          summary: newsData.sentimentAnalysis?.summary,
          keyThemes: newsData.sentimentAnalysis?.keyThemes || [],
          recentNews: newsData.articles?.slice(0, 5) || [],
          marketImpact: newsData.sentimentAnalysis?.marketImpact
        },
        overall: {
          score: contextualData.overallScore,
          analysis: contextualData.marketSummary
        },
        marketContext: {
          currentDate: new Date().toISOString(),
          marketConditions: contextualData.marketConditions,
          sectorContext: contextualData.sectorContext,
          timeOfAnalysis: contextualData.timeContext
        }
      });

      // Set a longer timeout specifically for comprehensive analysis
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('LLM analysis timeout')), 240000); // 4 minutes for LLM analysis
      });

      const llmRecommendations = await Promise.race([analysisPromise, timeoutPromise]);

      console.log('📊 [AnalysisAgent] LLM recommendations received, generating insights and risk analysis...');

      // Generate insights and risk assessment in parallel
      const [insights, riskAssessment] = await Promise.all([
        this.generateEnhancedLLMInsights(symbol, stockData, newsData, contextualData),
        this.generateEnhancedLLMRiskAnalysis(symbol, stockData, newsData, contextualData)
      ]);

      console.log('🧠 [AnalysisAgent] Insights and risk analysis complete, generating market context...');

      // Generate market context
      const marketContext = await this.generateEnhancedMarketContext(symbol, stockData, newsData, contextualData);

      console.log('✅ [AnalysisAgent] All LLM analysis components completed successfully');

      return {
        recommendations: llmRecommendations,
        insights,
        riskAssessment,
        marketContext
      };

    } catch (error) {
      console.error('💥 [AnalysisAgent] Comprehensive LLM analysis failed:', error);
      throw error;
    }
  }

  // **PREPARE RICH CONTEXTUAL DATA**
  prepareContextualData(symbol, stockData, newsData, fundamentalData, competitiveData, economicData) {
    const currentPrice = stockData.currentPrice?.price || 0;
    const priceChange = stockData.currentPrice?.changePercent || 0;
    
    // Calculate technical score with more nuance
    let technicalScore = 50;
    if (stockData.technicalIndicators) {
      const indicators = stockData.technicalIndicators;
      
      // RSI analysis
      if (indicators.rsi && indicators.rsi.length > 0) {
        const rsi = indicators.rsi[indicators.rsi.length - 1];
        if (rsi < 30) technicalScore += 20; // Oversold
        else if (rsi > 70) technicalScore -= 20; // Overbought
        else if (rsi >= 40 && rsi <= 60) technicalScore += 10; // Neutral zone
      }
      
      // Moving averages
      if (indicators.sma?.sma20 && indicators.sma.sma20.length > 0) {
        const sma20 = indicators.sma.sma20[indicators.sma.sma20.length - 1];
        if (currentPrice > sma20) technicalScore += 15;
        else technicalScore -= 15;
      }
      
      // Volume confirmation
      if (stockData.volumeAnalysis?.volumeRatio > 1.5) {
        technicalScore += 10; // High volume confirms trend
      }
    }
    
    // Calculate sentiment score
    let sentimentScore = 50;
    if (newsData.sentimentAnalysis?.sentimentScore) {
      sentimentScore = 50 + (newsData.sentimentAnalysis.sentimentScore * 50);
    }
    
    // Overall score
    const overallScore = (technicalScore * 0.6 + sentimentScore * 0.4);
    
    // Determine price trend with more detail
    let priceTrend = 'neutral';
    if (priceChange > 5) priceTrend = 'strongly bullish';
    else if (priceChange > 2) priceTrend = 'bullish';
    else if (priceChange > 0.5) priceTrend = 'slightly bullish';
    else if (priceChange < -5) priceTrend = 'strongly bearish';
    else if (priceChange < -2) priceTrend = 'bearish';
    else if (priceChange < -0.5) priceTrend = 'slightly bearish';
    
    // Market conditions based on current data
    const now = new Date();
    const marketHours = now.getHours();
    const isMarketHours = marketHours >= 9 && marketHours <= 16;
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    let marketConditions = 'Regular trading';
    if (isWeekend) marketConditions = 'Weekend - markets closed';
    else if (!isMarketHours) marketConditions = 'After-hours trading';
    
    // Time context
    const timeContext = `Analysis generated on ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`;
    
    return {
      technicalScore: Math.max(0, Math.min(100, technicalScore)),
      sentimentScore: Math.max(0, Math.min(100, sentimentScore)),
      overallScore: Math.max(0, Math.min(100, overallScore)),
      priceTrend,
      marketConditions,
      timeContext,
      supportResistance: this.calculateSupportResistance(stockData),
      sectorContext: this.inferSectorContext(symbol),
      marketSummary: `${symbol} showing ${priceTrend} trend with ${technicalScore.toFixed(0)}% technical strength and ${sentimentScore.toFixed(0)}% sentiment score`
    };
  }

  // **ENHANCED MARKET CONTEXT WITH SPECIFIC DETAILS**
  async generateEnhancedMarketContext(symbol, stockData, newsData, contextualData) {
    try {
      const recentNews = newsData.articles?.slice(0, 3).map(article => ({
        title: article.title,
        sentiment: article.sentiment || 'neutral',
        date: article.publishedAt
      })) || [];

      const prompt = `As a senior equity research analyst, provide a comprehensive market context analysis for ${symbol} stock:

**CURRENT MARKET POSITION:**
- Stock: ${symbol}
- Current Price: $${stockData.currentPrice?.price || 'N/A'}
- Today's Change: ${stockData.currentPrice?.changePercent || 'N/A'}%
- Price Trend: ${contextualData.priceTrend}
- Trading Volume Ratio: ${stockData.volumeAnalysis?.volumeRatio || 'N/A'}x normal

**TECHNICAL INDICATORS:**
- Technical Strength: ${contextualData.technicalScore}/100
- RSI: ${this.getLatestIndicator(stockData.technicalIndicators?.rsi)}
- 20-day SMA: $${this.getLatestIndicator(stockData.technicalIndicators?.sma?.sma20)}
- Support/Resistance: ${JSON.stringify(contextualData.supportResistance)}

**RECENT NEWS & SENTIMENT:**
- Overall Sentiment Score: ${contextualData.sentimentScore}/100
- Key Headlines:
${recentNews.map(news => `  • ${news.title} (${news.sentiment})`).join('\n')}

**MARKET CONDITIONS:**
- Analysis Time: ${contextualData.timeContext}
- Market Status: ${contextualData.marketConditions}
- Sector Context: ${contextualData.sectorContext}

**ANALYSIS REQUEST:**
Provide a detailed, stock-specific market context that explains:

1. **Current Positioning**: Where does ${symbol} stand in the current market environment?
2. **Key Drivers**: What specific factors are currently influencing ${symbol}'s price action?
3. **Sector Dynamics**: How is ${symbol} performing relative to its sector and broader market?
4. **News Impact**: How are recent news events specifically affecting ${symbol}?
5. **Technical Setup**: What does the technical picture tell us about ${symbol}'s near-term prospects?
6. **Unique Factors**: What makes ${symbol} unique in the current market context?

**FORMAT:** Provide a detailed narrative (200-300 words) that is highly specific to ${symbol} and the current market conditions. Avoid generic statements - focus on what makes this analysis unique to ${symbol} at this specific time.`;

      const response = await this.ollama.generate(prompt, {
        temperature: 0.3,
        maxTokens: 2000
      });

      return response.text;
    } catch (error) {
      console.error('Enhanced market context generation failed:', error);
      return `Unable to generate enhanced market context for ${symbol}`;
    }
  }

  calculateCompositeScores(stockData, newsData, fundamentalData, competitiveData, economicData) {
    const scores = {
      technical: 0,
      sentiment: 0,
      economic: 50, // Default neutral score since we no longer use economic data
      overall: 0
    };

    try {
      // Technical Score (0-100)
      scores.technical = this.calculateTechnicalScore(stockData);
      
      // Sentiment Score (0-100)
      scores.sentiment = this.calculateSentimentScore(newsData);
      
      // Economic Score - set to neutral since EconomicIndicatorAgent is removed
      scores.economic = 50;
      
      // Overall weighted score - rebalanced without economic component
      const weights = config.analysis.weights;
      const totalWeight = weights.technical + weights.sentiment;
      scores.overall = (
        scores.technical * (weights.technical / totalWeight) +
        scores.sentiment * (weights.sentiment / totalWeight)
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

  async generateRecommendations(scores, stockData, newsData, fundamentalData, competitiveData, economicData) {
    const recommendations = {};

    // Generate traditional recommendations first
    Object.entries(config.investmentHorizons).forEach(([horizon, details]) => {
      recommendations[horizon] = this.generateHorizonRecommendation(
        horizon,
        details,
        scores,
        stockData,
        newsData,
        fundamentalData,
        competitiveData,
        economicData
      );
    });

    // Enhance with LLM analysis if available
    if (this.ollamaEnabled) {
      try {
        logger.debug('Generating LLM-enhanced investment recommendations');
        
        const llmRecommendations = await this.ollama.generateInvestmentRecommendation({
          technical: {
            score: scores.technical,
            indicators: stockData.technicalIndicators,
            trend: this.determinePriceTrend(stockData),
            currentPrice: stockData.currentPrice
          },
          sentiment: {
            score: scores.sentiment,
            newsSentiment: newsData.sentimentAnalysis?.sentimentScore,
            socialSentiment: newsData.socialSentiment?.score,
            summary: newsData.sentimentAnalysis?.summary
          },
          overall: {
            score: scores.overall,
            analysis: 'Based on technical and sentiment analysis'
          }
        });

        // Merge LLM insights with traditional recommendations
        Object.keys(recommendations).forEach(horizon => {
          if (llmRecommendations[horizon]) {
            recommendations[horizon] = {
              ...recommendations[horizon],
              llmInsights: {
                reasoning: llmRecommendations[horizon].reasoning,
                confidence: llmRecommendations[horizon].confidence,
                keyFactors: llmRecommendations.keyFactors || [],
                riskLevel: llmRecommendations.riskLevel
              },
              enhancedExplanation: llmRecommendations[horizon].reasoning
            };
          }
        });

        // Add overall LLM assessment
        recommendations.llmOverallAssessment = llmRecommendations.overallAssessment;

      } catch (error) {
        logger.warn('LLM recommendation enhancement failed:', error.message);
      }
    }

    return recommendations;
  }

  generateHorizonRecommendation(horizon, details, scores, stockData, newsData, fundamentalData, competitiveData, economicData) {
    let recommendation = 'HOLD';
    let confidence = 50;
    let reasoning = [];
    let targetPrice = null;
    let stopLoss = null;
    let catalysts = [];
    let risks = [];
    let actionItems = [];

    try {
      const currentPrice = stockData.currentPrice?.price || 0;
      
      // Determine recommendation based on composite score and horizon
      let thresholdAdjustment = 0;
      
      switch (horizon) {
        case 'shortTerm':
          // More sensitive to technical and sentiment
          thresholdAdjustment = scores.technical * 0.6 + scores.sentiment * 0.4;
          catalysts = ['Technical breakout signals', 'Short-term news flow', 'Volume momentum'];
          risks = ['Market volatility', 'Technical reversal', 'Sentiment shift'];
          break;
        case 'midTerm':
          // Balanced approach
          thresholdAdjustment = scores.overall;
          catalysts = ['Quarterly earnings', 'Sector trends', 'Market rotation'];
          risks = ['Economic uncertainty', 'Sector rotation', 'Competition'];
          break;
        case 'longTerm':
          // More weight on technical fundamentals since economic data is no longer available
          thresholdAdjustment = scores.technical * 0.7 + scores.sentiment * 0.3;
          catalysts = ['Industry growth trends', 'Market expansion', 'Competitive advantages'];
          risks = ['Structural industry changes', 'Regulatory risks', 'Long-term competition'];
          break;
      }

      confidence = Math.max(config.analysis.confidenceThreshold * 100, Math.abs(thresholdAdjustment - 50) * 2);

      // Generate comprehensive recommendation with detailed analysis
      if (thresholdAdjustment >= 75) {
        recommendation = 'STRONG_BUY';
        reasoning.push('Exceptional alignment of multiple positive indicators');
        reasoning.push('Technical momentum strongly bullish with confirming volume');
        reasoning.push('Sentiment analysis shows overwhelming positive bias');
        targetPrice = currentPrice * (horizon === 'shortTerm' ? 1.12 : horizon === 'midTerm' ? 1.20 : 1.35);
        stopLoss = currentPrice * 0.93;
        actionItems = [
          'Establish full position immediately',
          'Monitor for profit-taking opportunities',
          'Consider scaling in on any weakness'
        ];
      } else if (thresholdAdjustment >= 65) {
        recommendation = 'BUY';
        reasoning.push('Strong positive indicators outweigh negatives significantly');
        reasoning.push('Technical setup shows bullish bias with good risk/reward');
        reasoning.push('Market sentiment provides supportive backdrop');
        targetPrice = currentPrice * (horizon === 'shortTerm' ? 1.08 : horizon === 'midTerm' ? 1.15 : 1.25);
        stopLoss = currentPrice * 0.95;
        actionItems = [
          'Build position gradually',
          'Set profit targets at resistance levels',
          'Monitor for confirmation signals'
        ];
      } else if (thresholdAdjustment >= 55) {
        recommendation = 'HOLD';
        reasoning.push('Positive factors slightly outweigh negatives');
        reasoning.push('Mixed technical signals suggest cautious optimism');
        reasoning.push('Sentiment neutral to slightly positive');
        targetPrice = currentPrice * (horizon === 'shortTerm' ? 1.05 : horizon === 'midTerm' ? 1.10 : 1.15);
        stopLoss = currentPrice * 0.92;
        actionItems = [
          'Maintain current position if held',
          'Wait for clearer directional signals',
          'Consider small additions on weakness'
        ];
      } else if (thresholdAdjustment >= 45) {
        recommendation = 'HOLD';
        reasoning.push('Neutral outlook with balanced positive and negative factors');
        reasoning.push('Technical indicators show mixed signals requiring patience');
        reasoning.push('Market sentiment lacks clear direction');
        targetPrice = currentPrice;
        stopLoss = currentPrice * 0.90;
        actionItems = [
          'Hold existing positions',
          'Avoid new purchases until clarity emerges',
          'Prepare for potential volatility'
        ];
      } else if (thresholdAdjustment >= 35) {
        recommendation = 'SELL';
        reasoning.push('Negative indicators outweigh positives');
        reasoning.push('Technical setup shows bearish bias');
        reasoning.push('Sentiment deteriorating');
        targetPrice = currentPrice * (horizon === 'shortTerm' ? 0.95 : horizon === 'midTerm' ? 0.90 : 0.85);
        stopLoss = currentPrice * 0.88;
        actionItems = [
          'Reduce position size gradually',
          'Set stop-loss orders',
          'Monitor for oversold bounce opportunities'
        ];
      } else {
        recommendation = 'STRONG_SELL';
        reasoning.push('Multiple negative indicators present significant downside risk');
        reasoning.push('Technical breakdown signals further decline');
        reasoning.push('Negative sentiment likely to persist');
        targetPrice = currentPrice * (horizon === 'shortTerm' ? 0.88 : horizon === 'midTerm' ? 0.80 : 0.70);
        stopLoss = currentPrice * 0.85;
        actionItems = [
          'Exit positions immediately',
          'Consider short positions if appropriate',
          'Wait for substantial decline before re-entry'
        ];
      }

      // Add specific reasoning based on scores with more detail
      if (scores.technical > 70) {
        reasoning.push(`Strong technical indicators (${Math.round(scores.technical)}/100) support bullish outlook`);
      } else if (scores.technical < 30) {
        reasoning.push(`Weak technical signals (${Math.round(scores.technical)}/100) suggest bearish pressure`);
      } else {
        reasoning.push(`Neutral technical indicators (${Math.round(scores.technical)}/100) provide limited directional bias`);
      }

      if (scores.sentiment > 70) {
        reasoning.push(`Positive market sentiment (${Math.round(scores.sentiment)}/100) provides strong support`);
      } else if (scores.sentiment < 30) {
        reasoning.push(`Negative sentiment (${Math.round(scores.sentiment)}/100) creates headwinds`);
      } else {
        reasoning.push(`Mixed sentiment (${Math.round(scores.sentiment)}/100) offers neutral backdrop`);
      }

      // Add horizon-specific insights
      if (horizon === 'shortTerm') {
        reasoning.push('Short-term focus on technical momentum and news-driven volatility');
        if (stockData.volumeAnalysis?.volumeRatio > 1.5) {
          reasoning.push('Above-average volume confirms price action');
        }
      } else if (horizon === 'midTerm') {
        reasoning.push('Mid-term outlook considers earnings cycles and sector rotation');
        reasoning.push('Position sizing should account for quarterly volatility');
      } else {
        reasoning.push('Long-term perspective focuses on sustained competitive advantages');
        reasoning.push('Consider this as core portfolio holding based on analysis');
      }

    } catch (error) {
      logger.error('Error generating recommendation:', error);
      recommendation = 'HOLD';
      confidence = 50;
      reasoning = ['Analysis incomplete due to data limitations', 'Default conservative stance recommended'];
      actionItems = ['Conduct additional research', 'Monitor key indicators', 'Reassess when more data available'];
    }

    return {
      action: recommendation,
      confidence: Math.round(Math.min(100, Math.max(0, confidence))),
      reasoning: reasoning,
      targetPrice: targetPrice ? Math.round(targetPrice * 100) / 100 : null,
      stopLoss: stopLoss ? Math.round(stopLoss * 100) / 100 : null,
      timeHorizon: details.period,
      catalysts: catalysts,
      risks: risks,
      actionItems: actionItems,
      riskRewardRatio: targetPrice && stopLoss ? Math.round(((targetPrice - (stockData.currentPrice?.price || 0)) / ((stockData.currentPrice?.price || 0) - stopLoss)) * 100) / 100 : null,
      positionSizing: confidence > 75 ? 'aggressive' : confidence > 60 ? 'normal' : 'conservative',
      marketContext: `Analysis based on technical (${Math.round(scores.technical)}/100) and sentiment (${Math.round(scores.sentiment)}/100) indicators`,
      analysisMethod: 'Traditional Mathematical Analysis',
      limitationsWarning: '⚠️ This recommendation uses basic mathematical models. AI-powered analysis would provide more specific insights based on current market conditions, recent news, and contextual factors.'
    };
  }

  async assessRisks(stockData, newsData, fundamentalData, competitiveData, economicData) {
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

      // Note: Economic risks no longer assessed since EconomicIndicatorAgent has been removed

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

      // Enhance with LLM analysis if available
      if (this.ollamaEnabled) {
        try {
          const llmRiskAnalysis = await this.generateLLMRiskAnalysis(stockData, newsData, fundamentalData, competitiveData, economicData);
          if (llmRiskAnalysis) {
            risks.llmInsights = llmRiskAnalysis;
            risks.detailedAnalysis = llmRiskAnalysis.analysis;
            
            // Incorporate LLM risk factors
            if (llmRiskAnalysis.additionalRisks) {
              risks.factors.push(...llmRiskAnalysis.additionalRisks);
            }
            
            // Add LLM mitigation strategies
            if (llmRiskAnalysis.strategies) {
              risks.mitigationStrategies.push(...llmRiskAnalysis.strategies);
            }
          }
        } catch (error) {
          logger.warn('LLM risk analysis failed:', error.message);
        }
      }

    } catch (error) {
      logger.error('Error assessing risks:', error);
      risks.factors.push('Risk assessment incomplete');
    }

    return risks;
  }

  async generateInsights(stockData, newsData, fundamentalData, competitiveData, economicData, scores) {
    const insights = {
      summary: '',
      keyPoints: [],
      marketContext: '',
      llmEnhancedInsights: null
    };

    try {
      // Generate traditional summary based on overall score
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

      // Traditional key points
      if (scores.technical > 60) {
        insights.keyPoints.push('Technical analysis shows bullish signals');
      }
      
      if (scores.sentiment > 60) {
        insights.keyPoints.push('Market sentiment is positive');
      }

      // Market context note
      insights.marketContext = 'Analysis based on technical and sentiment indicators';

      // Enhance with LLM analysis if available
      if (this.ollamaEnabled) {
        try {
          const llmInsights = await this.generateLLMInsights(stockData, newsData, fundamentalData, competitiveData, economicData, scores);
          if (llmInsights) {
            insights.llmEnhancedInsights = llmInsights;
            
            // Enhance traditional insights with LLM analysis
            if (llmInsights.enhancedSummary) {
              insights.summary = llmInsights.enhancedSummary;
            }
            
            if (llmInsights.additionalKeyPoints) {
              insights.keyPoints.push(...llmInsights.additionalKeyPoints);
            }
            
            if (llmInsights.detailedMarketContext) {
              insights.marketContext = llmInsights.detailedMarketContext;
            }
          }
        } catch (error) {
          logger.warn('LLM insights generation failed:', error.message);
        }
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
      // Expect all four agents
      const expectedAgents = [
        'StockDataAgent',
        'NewsSentimentAgent',
        'FundamentalDataAgent',
        'CompetitiveAgent'
      ];
      const totalExpected = expectedAgents.length;
      const receivedCount = Object.keys(receivedData).length;
      quality.coverage = Math.round((receivedCount / totalExpected) * 100);

      // Determine overall quality
      if (quality.coverage < 50) {
        quality.overall = 'POOR';
        quality.issues.push('Insufficient data coverage');
      } else if (quality.coverage < 100) {
        quality.overall = 'FAIR';
        quality.issues.push('Partial data coverage');
      }

      // Check for missing critical agents
      expectedAgents.forEach(agent => {
        if (!receivedData[agent]) {
          quality.issues.push(`Missing data from ${agent}`);
        }
      });

    } catch (error) {
      logger.error('Error assessing data quality:', error);
      quality.overall = 'UNKNOWN';
      quality.issues.push('Quality assessment failed');
    }

    return quality;
  }

  // ============ LLM-Enhanced Helper Methods ============

  async generateMarketContext(symbol, scores, stockData, newsData, fundamentalData, competitiveData, economicData) {
    try {
      const prompt = `Provide comprehensive market context analysis for ${symbol}:

CURRENT SCORES:
- Technical: ${scores.technical}/100
- Sentiment: ${scores.sentiment}/100  
- Overall: ${scores.overall}/100

MARKET DATA:
- Current Price: $${stockData.currentPrice?.price || 'N/A'}
- Price Change: ${stockData.currentPrice?.changePercent || 'N/A'}%
- Volume Ratio: ${stockData.volumeAnalysis?.volumeRatio || 'N/A'}

SENTIMENT SUMMARY:
- News Sentiment: ${newsData.sentimentAnalysis?.sentimentScore || 'N/A'}
- Article Count: ${newsData.sentimentAnalysis?.totalArticles || 'N/A'}

Provide a comprehensive market context analysis that explains:
1. Current market position and trends
2. Key factors driving the current situation
3. Potential catalysts and risks
4. Sector/industry dynamics
5. Overall market environment impact

Format as detailed narrative with clear insights.`;

      const response = await this.ollama.generate(prompt, {
        temperature: 0.4,
        maxTokens: 1500
      });

      return response.text;
    } catch (error) {
      logger.error('Market context generation failed:', error);
      return null;
    }
  }

  async generateLLMRiskAnalysis(stockData, newsData, fundamentalData, competitiveData, economicData) {
    try {
      const prompt = `Analyze investment risks based on the following data:

TECHNICAL DATA:
- RSI: ${this.getLatestIndicator(stockData.technicalIndicators?.rsi)}
- Price Trend: ${this.determinePriceTrend(stockData)}
- Volume Analysis: ${JSON.stringify(stockData.volumeAnalysis || {})}

SENTIMENT DATA:
- Sentiment Score: ${newsData.sentimentAnalysis?.sentimentScore || 'N/A'}
- Sentiment Trend: ${newsData.sentimentAnalysis?.sentimentTrend || 'N/A'}

Identify and analyze:
1. Primary risk factors
2. Secondary/emerging risks
3. Risk probability and impact
4. Specific mitigation strategies
5. Risk timeline (short/medium/long term)

Format as JSON:
{
    "analysis": "Detailed risk analysis narrative",
    "additionalRisks": ["risk1", "risk2"],
    "strategies": ["strategy1", "strategy2"],
    "riskLevel": "low|medium|high",
    "timeframe": "Risk timeline analysis"
}`;

      const response = await this.ollama.generate(prompt, {
        temperature: 0.3,
        maxTokens: 1200
      });

      return this.ollama.parseJsonResponse(response.text, {
        analysis: 'Risk analysis unavailable',
        additionalRisks: [],
        strategies: [],
        riskLevel: 'medium',
        timeframe: 'Unable to determine'
      });
    } catch (error) {
      logger.error('LLM risk analysis failed:', error);
      return null;
    }
  }

  async generateLLMInsights(stockData, newsData, fundamentalData, competitiveData, economicData, scores) {
    try {
      const prompt = `Generate comprehensive investment insights based on the analysis:

ANALYSIS SCORES:
- Technical: ${scores.technical}/100
- Sentiment: ${scores.sentiment}/100
- Overall: ${scores.overall}/100

KEY DATA POINTS:
- Current Price: $${stockData.currentPrice?.price || 'N/A'}
- Technical Indicators: ${JSON.stringify(this.getKeyIndicators(stockData))}
- Sentiment Summary: ${newsData.sentimentAnalysis?.summary || 'N/A'}

Provide:
1. Enhanced summary that explains the investment thesis
2. Additional key insights not captured in basic analysis
3. Detailed market context with sector/industry perspective
4. Forward-looking analysis and potential scenarios

Format as JSON:
{
    "enhancedSummary": "Comprehensive investment thesis",
    "additionalKeyPoints": ["insight1", "insight2"],
    "detailedMarketContext": "Market context with industry perspective",
    "forwardLookingAnalysis": "Potential scenarios and outlook",
    "investmentThesis": "Core investment argument"
}`;

      const response = await this.ollama.generate(prompt, {
        temperature: 0.4,
        maxTokens: 1800
      });

      return this.ollama.parseJsonResponse(response.text, {
        enhancedSummary: 'Enhanced analysis unavailable',
        additionalKeyPoints: [],
        detailedMarketContext: 'Market context unavailable',
        forwardLookingAnalysis: 'Forward-looking analysis unavailable',
        investmentThesis: 'Investment thesis unavailable'
      });
    } catch (error) {
      logger.error('LLM insights generation failed:', error);
      return null;
    }
  }

  // ============ Utility Helper Methods ============

  determinePriceTrend(stockData) {
    try {
      if (!stockData.currentPrice) return 'unknown';
      
      const changePercent = stockData.currentPrice.changePercent;
      if (changePercent > 2) return 'strong bullish';
      if (changePercent > 0.5) return 'bullish';
      if (changePercent < -2) return 'strong bearish';
      if (changePercent < -0.5) return 'bearish';
      return 'neutral';
    } catch (error) {
      return 'unknown';
    }
  }

  getLatestIndicator(indicatorArray) {
    try {
      if (Array.isArray(indicatorArray) && indicatorArray.length > 0) {
        return indicatorArray[indicatorArray.length - 1];
      }
      return 'N/A';
    } catch (error) {
      return 'N/A';
    }
  }

  getKeyIndicators(stockData) {
    try {
      const indicators = stockData.technicalIndicators || {};
      return {
        rsi: this.getLatestIndicator(indicators.rsi),
        sma20: this.getLatestIndicator(indicators.sma?.sma20),
        sma50: this.getLatestIndicator(indicators.sma?.sma50),
        macd: this.getLatestIndicator(indicators.macd),
        volume: stockData.volumeAnalysis?.volumeRatio
      };
    } catch (error) {
      return {};
    }
  }

  // **ENHANCED LLM INSIGHTS WITH SPECIFIC CONTEXT**
  async generateEnhancedLLMInsights(symbol, stockData, newsData, fundamentalData, competitiveData, economicData, contextualData) {
    try {
      const recentArticles = newsData.articles?.slice(0, 5) || [];
      const technicalIndicators = stockData.technicalIndicators || {};
      const currentPrice = stockData.currentPrice?.price || 0;

      const prompt = `As an expert equity analyst specializing in ${symbol}, provide unique investment insights based on current data:

**STOCK-SPECIFIC CONTEXT:**
- Company: ${symbol}
- Current Price: $${currentPrice}
- Price Trend: ${contextualData.priceTrend}
- Market Cap Context: ${this.getMarketCapContext(stockData.marketCap)}
- Sector: ${contextualData.sectorContext}

**TECHNICAL PICTURE:**
- RSI: ${this.getLatestIndicator(technicalIndicators.rsi)} (momentum indicator)
- Price vs 20-day SMA: ${this.getPriceVsSMA(currentPrice, technicalIndicators.sma?.sma20)}
- Volume Activity: ${stockData.volumeAnalysis?.volumeRatio || 1}x normal volume
- Support: $${contextualData.supportResistance?.support || 'N/A'}
- Resistance: $${contextualData.supportResistance?.resistance || 'N/A'}

**NEWS & SENTIMENT ANALYSIS:**
Recent Headlines for ${symbol}:
${recentArticles.map((article, idx) => `${idx + 1}. "${article.title}" (${new Date(article.publishedAt).toLocaleDateString()})`).join('\n')}

Sentiment Score: ${contextualData.sentimentScore}/100
Key Themes: ${newsData.sentimentAnalysis?.keyThemes?.join(', ') || 'No specific themes identified'}

**TIMING CONTEXT:**
- Analysis Date: ${new Date().toLocaleDateString()}
- Market Conditions: ${contextualData.marketConditions}
- Time of Analysis: ${new Date().toLocaleTimeString()}

**REQUIRED INSIGHTS:**
Generate highly specific insights for ${symbol} that address:

1. **Investment Thesis**: What is the unique investment case for ${symbol} right now?
2. **Catalyst Analysis**: What specific events or factors could move ${symbol} in the next 3-6 months?
3. **Competitive Position**: How does ${symbol} stand relative to its peers in current market conditions?
4. **Risk-Reward Assessment**: What is the specific risk-reward profile for ${symbol} at current levels?
5. **Timing Considerations**: Why is this particular moment significant for ${symbol} analysis?

**CRITICAL REQUIREMENTS:**
- Be specific to ${symbol} - avoid generic market commentary
- Reference actual price levels, technical levels, and recent news
- Explain WHY these insights apply specifically to ${symbol}
- Consider the current date and market environment
- Make insights actionable for investors

Format as JSON:
{
    "summary": "Specific investment thesis for ${symbol} at current levels",
    "keyPoints": [
        "Insight 1 specific to ${symbol}",
        "Insight 2 with actual data/levels",
        "Insight 3 about timing and catalysts"
    ],
    "investmentThesis": "Core argument for/against investing in ${symbol} now",
    "uniqueFactors": [
        "Factor 1 that makes ${symbol} unique",
        "Factor 2 specific to current conditions"
    ],
    "nearTermCatalysts": [
        "Specific event/date that could impact ${symbol}",
        "Technical level to watch for ${symbol}"
    ],
    "marketContext": "How ${symbol} fits in current market environment"
}`;

      const response = await this.ollama.generate(prompt, {
        temperature: 0.4,
        maxTokens: 2500
      });

      return this.ollama.parseJsonResponse(response.text, {
        summary: `Analysis for ${symbol} based on current market conditions`,
        keyPoints: [
          `${symbol} trading at $${currentPrice} with ${contextualData.priceTrend} trend`,
          `Technical indicators suggest ${contextualData.technicalScore > 60 ? 'bullish' : contextualData.technicalScore < 40 ? 'bearish' : 'neutral'} setup`,
          `Sentiment analysis shows ${contextualData.sentimentScore > 60 ? 'positive' : contextualData.sentimentScore < 40 ? 'negative' : 'mixed'} market perception`
        ],
        investmentThesis: `${symbol} presents a ${contextualData.overallScore > 60 ? 'compelling' : contextualData.overallScore < 40 ? 'challenging' : 'mixed'} investment opportunity`,
        uniqueFactors: [`Recent price action in ${symbol}`, `Current technical setup for ${symbol}`],
        nearTermCatalysts: [`Price levels to watch for ${symbol}`, `Volume patterns in ${symbol}`],
        marketContext: `${symbol} analysis conducted on ${new Date().toLocaleDateString()}`
      });

    } catch (error) {
      console.error('Enhanced LLM insights generation failed:', error);
      return {
        summary: `Unable to generate enhanced insights for ${symbol}`,
        keyPoints: ['LLM analysis unavailable'],
        investmentThesis: 'Analysis could not be completed',
        uniqueFactors: [],
        nearTermCatalysts: [],
        marketContext: 'Enhanced analysis unavailable'
      };
    }
  }

  // **ENHANCED RISK ANALYSIS WITH SPECIFIC CONTEXT**
  async generateEnhancedLLMRiskAnalysis(symbol, stockData, newsData, contextualData) {
    try {
      const currentPrice = stockData.currentPrice?.price || 0;
      const recentNews = newsData.articles?.slice(0, 3) || [];

      const prompt = `As a risk management specialist analyzing ${symbol}, provide a comprehensive risk assessment:

**CURRENT POSITION:**
- ${symbol} at $${currentPrice}
- Daily Change: ${stockData.currentPrice?.changePercent || 0}%
- Price Trend: ${contextualData.priceTrend}
- Volume: ${stockData.volumeAnalysis?.volumeRatio || 1}x normal

**TECHNICAL RISK FACTORS:**
- RSI Level: ${this.getLatestIndicator(stockData.technicalIndicators?.rsi)}
- Distance from Support: ${this.calculateDistanceFromSupport(currentPrice, contextualData.supportResistance?.support)}
- Distance from Resistance: ${this.calculateDistanceFromResistance(currentPrice, contextualData.supportResistance?.resistance)}
- Technical Score: ${contextualData.technicalScore}/100

**NEWS-BASED RISKS:**
Recent ${symbol} Headlines:
${recentNews.map(news => `• ${news.title}`).join('\n')}

**MARKET ENVIRONMENT:**
- Current Date: ${new Date().toLocaleDateString()}
- Market Conditions: ${contextualData.marketConditions}
- Sector Context: ${contextualData.sectorContext}

**RISK ANALYSIS REQUIREMENTS:**
Provide specific risk assessment for ${symbol} covering:

1. **Immediate Risks (1-7 days)**: What could impact ${symbol} this week?
2. **Short-term Risks (1-4 weeks)**: Technical and news-driven risks for ${symbol}
3. **Medium-term Risks (1-6 months)**: Sector and company-specific risks for ${symbol}
4. **Risk Quantification**: Specific price levels where risks increase for ${symbol}
5. **Black Swan Events**: Low probability, high impact risks specific to ${symbol}

**BE SPECIFIC TO ${symbol}:**
- Reference actual price levels and technical indicators
- Consider recent news and market events affecting ${symbol}
- Provide actionable risk management strategies
- Avoid generic market risks - focus on ${symbol}-specific factors

Format as JSON:
{
    "overallRiskLevel": "LOW|MEDIUM|HIGH",
    "riskScore": 65,
    "immediateRisks": [
        {
            "risk": "Specific risk to ${symbol}",
            "probability": "HIGH|MEDIUM|LOW",
            "impact": "Price level or % impact",
            "timeframe": "1-7 days"
        }
    ],
    "shortTermRisks": [
        {
            "risk": "Technical or news risk for ${symbol}",
            "probability": "HIGH|MEDIUM|LOW", 
            "impact": "Specific impact on ${symbol}",
            "timeframe": "1-4 weeks"
        }
    ],
    "mediumTermRisks": [
        {
            "risk": "Sector/company risk for ${symbol}",
            "probability": "HIGH|MEDIUM|LOW",
            "impact": "Long-term impact on ${symbol}",
            "timeframe": "1-6 months"
        }
    ],
    "riskMitigation": [
        "Specific strategy 1 for ${symbol}",
        "Specific strategy 2 with price levels"
    ],
    "stopLossLevels": {
        "conservative": 0.00,
        "moderate": 0.00,
        "aggressive": 0.00
    },
    "keyLevelsToWatch": [
        "Support at $X for ${symbol}",
        "Resistance at $Y for ${symbol}"
    ]
}`;

      const response = await this.ollama.generate(prompt, {
        temperature: 0.3,
        maxTokens: 2500
      });

      return this.ollama.parseJsonResponse(response.text, {
        overallRiskLevel: contextualData.technicalScore < 30 || contextualData.sentimentScore < 30 ? 'HIGH' : contextualData.technicalScore > 70 && contextualData.sentimentScore > 70 ? 'LOW' : 'MEDIUM',
        riskScore: Math.max(10, Math.min(90, 100 - contextualData.overallScore)),
        immediateRisks: [{ risk: `${symbol} technical risk`, probability: 'MEDIUM', impact: '2-5% price movement', timeframe: '1-7 days' }],
        shortTermRisks: [{ risk: `${symbol} sentiment risk`, probability: 'MEDIUM', impact: 'News-driven volatility', timeframe: '1-4 weeks' }],
        mediumTermRisks: [{ risk: `${symbol} sector risk`, probability: 'LOW', impact: 'Sector rotation impact', timeframe: '1-6 months' }],
        riskMitigation: [`Monitor ${symbol} technical levels`, `Watch ${symbol} news flow`],
        stopLossLevels: {
          conservative: currentPrice * 0.90,
          moderate: currentPrice * 0.93,
          aggressive: currentPrice * 0.95
        },
        keyLevelsToWatch: [`Support: $${contextualData.supportResistance?.support || currentPrice * 0.95}`, `Resistance: $${contextualData.supportResistance?.resistance || currentPrice * 1.05}`]
      });

    } catch (error) {
      console.error('Enhanced LLM risk analysis failed:', error);
      return {
        overallRiskLevel: 'MEDIUM',
        riskScore: 50,
        immediateRisks: [],
        shortTermRisks: [],
        mediumTermRisks: [],
        riskMitigation: [],
        stopLossLevels: { conservative: 0, moderate: 0, aggressive: 0 },
        keyLevelsToWatch: []
      };
    }
  }

  // **HELPER METHODS FOR CONTEXTUAL ANALYSIS**
  calculateSupportResistance(stockData) {
    const currentPrice = stockData.currentPrice?.price || 0;
    const historical = stockData.historical || [];
    
    if (historical.length === 0) {
      return {
        support: currentPrice * 0.95,
        resistance: currentPrice * 1.05
      };
    }

    // Calculate support and resistance from recent price action
    const recentPrices = historical.slice(-20).map(day => [day.high, day.low]).flat();
    const sorted = recentPrices.sort((a, b) => a - b);
    
    const support = sorted[Math.floor(sorted.length * 0.2)]; // 20th percentile
    const resistance = sorted[Math.floor(sorted.length * 0.8)]; // 80th percentile
    
    return {
      support: Math.round(support * 100) / 100,
      resistance: Math.round(resistance * 100) / 100
    };
  }

  inferSectorContext(symbol) {
    // Basic sector inference - in a real system, this would use a sector mapping database
    const techStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'AMD', 'CRM', 'ORCL'];
    const financialStocks = ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'USB', 'PNC', 'TFC', 'COF'];
    const healthcareStocks = ['JNJ', 'PFE', 'UNH', 'ABBV', 'MRK', 'BMY', 'AMGN', 'GILD', 'LLY', 'TMO'];
    
    if (techStocks.includes(symbol)) return 'Technology sector - focus on innovation and growth metrics';
    if (financialStocks.includes(symbol)) return 'Financial sector - sensitive to interest rates and economic cycles';
    if (healthcareStocks.includes(symbol)) return 'Healthcare sector - defensive characteristics with regulatory considerations';
    
    return `Individual stock analysis for ${symbol} - sector-specific factors to be considered`;
  }

  getLatestIndicator(indicatorArray) {
    if (!indicatorArray || indicatorArray.length === 0) return 'N/A';
    const latest = indicatorArray[indicatorArray.length - 1];
    return typeof latest === 'number' ? latest.toFixed(2) : latest;
  }

  getMarketCapContext(marketCap) {
    if (!marketCap) return 'Market cap not available';
    if (marketCap > 200e9) return 'Large-cap stock (>$200B)';
    if (marketCap > 10e9) return 'Mid-cap stock ($10B-$200B)';
    if (marketCap > 2e9) return 'Small-cap stock ($2B-$10B)';
    return 'Micro-cap stock (<$2B)';
  }

  getPriceVsSMA(currentPrice, smaArray) {
    if (!smaArray || smaArray.length === 0) return 'SMA not available';
    const sma = smaArray[smaArray.length - 1];
    const diff = ((currentPrice - sma) / sma * 100).toFixed(1);
    return `${diff > 0 ? '+' : ''}${diff}% vs SMA20`;
  }

  calculateDistanceFromSupport(currentPrice, support) {
    if (!support) return 'Support level not available';
    const distance = ((currentPrice - support) / support * 100).toFixed(1);
    return `${distance}% above support`;
  }

  calculateDistanceFromResistance(currentPrice, resistance) {
    if (!resistance) return 'Resistance level not available';
    const distance = ((resistance - currentPrice) / currentPrice * 100).toFixed(1);
    return `${distance}% below resistance`;
  }

  generateFallbackMarketContext(symbol, llmFailureReason) {
    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString();
    
    return `⚠️ **LIMITED ANALYSIS NOTICE**

**AI Analysis Status**: UNAVAILABLE
**Reason**: ${llmFailureReason}
**Analysis Type**: Traditional Mathematical Models
**Generated**: ${currentDate} at ${currentTime}

**Impact on Analysis Quality**:
• Generic recommendations instead of ${symbol}-specific insights
• Limited integration of recent news and market sentiment
• Mathematical indicators only, no contextual AI interpretation
• Reduced accuracy for current market conditions

**What This Means**:
This analysis uses basic technical indicators and sentiment scores but lacks the advanced AI interpretation that provides stock-specific insights, market context, and nuanced recommendations. The results may be less accurate and actionable compared to AI-powered analysis.

**Recommendation**: For optimal investment analysis, ensure Ollama LLM service is running and accessible, then re-run the analysis for ${symbol}.`;
  }

  addLLMFailureIndicators(analysisComponent, llmFailureReason) {
    if (typeof analysisComponent === 'object' && analysisComponent !== null) {
      if (Array.isArray(analysisComponent)) {
        return analysisComponent.map(item => ({
          ...item,
          llmFailureNote: `⚠️ Traditional analysis used due to LLM failure: ${llmFailureReason}`
        }));
      } else {
        return {
          ...analysisComponent,
          llmFailureNote: `⚠️ Traditional analysis used due to LLM failure: ${llmFailureReason}`,
          analysisLimitations: [
            'Generic mathematical models instead of contextual AI analysis',
            'Less specific price targets and recommendations',
            'Limited integration of recent news and market conditions',
            'Reduced accuracy for current market environment'
          ]
        };
      }
    }
    return analysisComponent;
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