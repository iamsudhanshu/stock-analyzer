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
            this.dataCollectionTimeout = 180000; // 3 minutes timeout for LLM analysis
    this.ollama = new OllamaService();
    this.ollamaEnabled = false;
  }

  async initialize() {
    // Call parent initialization first
    await super.initialize();
    
    // Then initialize Ollama
    await this.initializeOllama();
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
        console.warn('⚠️ [AnalysisAgent] Ollama not available - LLM analysis required');
        logger.warn('Ollama not available - LLM analysis required');
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
      } else if (status === 'success' && (agentType === 'StockDataAgent' || agentType === 'NewsSentimentAgent' || agentType === 'FundamentalDataAgent' || agentType === 'CompetitiveAgent' || agentType === 'EnhancedDataAgent' || agentType === 'AdvancedTechnicalAgent' || agentType === 'ReportGeneratorAgent')) {
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

    // Always expect all seven agents
    const expectedAgents = [
      'StockDataAgent',
      'NewsSentimentAgent',
      'FundamentalDataAgent',
      'CompetitiveAgent',
      'EnhancedDataAgent',
      'AdvancedTechnicalAgent',
      'ReportGeneratorAgent'
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
    try {
      const { symbol, receivedData } = analysis;
      const stockData = receivedData.StockDataAgent || {};
      const newsData = receivedData.NewsSentimentAgent || {};
      const fundamentalData = receivedData.FundamentalDataAgent || {};
      const competitiveData = receivedData.CompetitiveAgent || {};
      const economicData = receivedData.EconomicIndicatorAgent || {};
      const enhancedData = receivedData.EnhancedDataAgent || {};
      const advancedTechnicalData = receivedData.AdvancedTechnicalAgent || {};
      const reportData = receivedData.ReportGeneratorAgent || {};

      // All analysis is now LLM-based - no fallbacks
      if (!this.ollamaEnabled) {
        throw new Error('LLM is required for analysis. Ollama service is not available.');
      }

      console.log('🚀 [AnalysisAgent] Generating comprehensive LLM analysis...');
      
      // Generate comprehensive LLM analysis
      const llmAnalysis = await this.generateComprehensiveLLMAnalysis(symbol, stockData, newsData, fundamentalData, competitiveData, economicData);
      
      if (!llmAnalysis) {
        throw new Error('Failed to generate LLM analysis');
      }

      const {
        recommendations,
        insights,
        riskAssessment,
        marketContext,
        fundamentalSummary,
        competitiveSummary
      } = llmAnalysis;

      console.log('✅ [AnalysisAgent] LLM analysis completed successfully');

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
          analysisType: 'LLM-Powered AI Analysis',
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
            },
            EnhancedDataAgent: {
              status: receivedData.EnhancedDataAgent ? 'success' : 'missing',
              hasData: !!receivedData.EnhancedDataAgent,
              dataKeys: receivedData.EnhancedDataAgent ? Object.keys(receivedData.EnhancedDataAgent) : [],
              timestamp: receivedData.EnhancedDataAgent?.lastUpdated
            },
            AdvancedTechnicalAgent: {
              status: receivedData.AdvancedTechnicalAgent ? 'success' : 'missing',
              hasData: !!receivedData.AdvancedTechnicalAgent,
              dataKeys: receivedData.AdvancedTechnicalAgent ? Object.keys(receivedData.AdvancedTechnicalAgent) : [],
              timestamp: receivedData.AdvancedTechnicalAgent?.lastUpdated
            },
            ReportGeneratorAgent: {
              status: receivedData.ReportGeneratorAgent ? 'success' : 'missing',
              hasData: !!receivedData.ReportGeneratorAgent,
              dataKeys: receivedData.ReportGeneratorAgent ? Object.keys(receivedData.ReportGeneratorAgent) : [],
              timestamp: receivedData.ReportGeneratorAgent?.lastUpdated
            }
          }
        },
        rawData: {
          stockData,
          newsData,
          fundamentalData,
          competitiveData,
          economicData,
          enhancedData,
          advancedTechnicalData,
          reportData
        }
      };
    } catch (error) {
      console.error('💥 [AnalysisAgent] Error generating investment analysis:', error);
      throw error;
    }
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
        setTimeout(() => reject(new Error('LLM analysis timeout')), 180000); // 3 minutes for LLM analysis
      });

      const llmRecommendations = await Promise.race([analysisPromise, timeoutPromise]);

      console.log('📊 [AnalysisAgent] LLM recommendations received, generating insights and risk analysis...');

      // Generate insights and risk assessment in parallel
      const [insights, riskAssessment] = await Promise.all([
        this.generateEnhancedLLMInsights(symbol, stockData, newsData, fundamentalData, competitiveData, economicData, contextualData),
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

  assessDataQuality(receivedData) {
    const quality = {
      overall: 'GOOD',
      coverage: 0,
      completeness: {},
      issues: []
    };

    try {
      // Expect all seven agents
      const expectedAgents = [
        'StockDataAgent',
        'NewsSentimentAgent',
        'FundamentalDataAgent',
        'CompetitiveAgent',
        'EnhancedDataAgent',
        'AdvancedTechnicalAgent',
        'ReportGeneratorAgent'
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