const axios = require('axios');
const moment = require('moment');
const Sentiment = require('sentiment');
const BaseAgent = require('./BaseAgent');
const config = require('../config');
const logger = require('../utils/logger');
const OllamaService = require('../utils/ollama');

class NewsSentimentAgent extends BaseAgent {
  constructor() {
    super(
      'NewsSentimentAgent',
      [config.queues.newsSentiment],
      [config.queues.analysis]
    );
    
    this.sentiment = new Sentiment();
    this.ollama = new OllamaService();
    this.ollamaEnabled = false;
    this.newsProviders = [
   //   { name: 'newsApi', priority: 1, rateLimit: { requests: 100, windowMs: 86400000 } },
      { name: 'newsData', priority: 1, rateLimit: { requests: 2000, windowMs: 86400000 } }
   //   { name: 'webz', priority: 3, rateLimit: { requests: 1000, windowMs: 2592000000 } }
    ];
    
    // Initialize LLM capabilities
    this.initializeLLM();
  }

  async initializeLLM() {
    try {
      console.log('🧠 [NewsSentimentAgent] Initializing LLM capabilities...');
      this.ollamaEnabled = await this.ollama.isAvailable();
      
      if (this.ollamaEnabled) {
        console.log('✅ [NewsSentimentAgent] LLM capabilities enabled');
        logger.info('NewsSentimentAgent LLM capabilities enabled');
      } else {
        console.warn('⚠️ [NewsSentimentAgent] LLM not available, using enhanced traditional methods');
        logger.warn('NewsSentimentAgent LLM not available, using enhanced traditional methods');
      }
    } catch (error) {
      console.error('❌ [NewsSentimentAgent] Error initializing LLM:', error.message);
      logger.error('NewsSentimentAgent LLM initialization error:', error);
      this.ollamaEnabled = false;
    }
  }

  async processMessage(message) {
    try {
      console.log('📥 [NewsSentimentAgent] Processing message:', {
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

      console.log('📰 [NewsSentimentAgent] Starting LLM-enhanced news analysis for:', symbol);
      
      // Generate comprehensive news sentiment with LLM insights
      const result = await this.generateLLMEnhancedNewsSentiment(symbol);
      
      console.log('✅ [NewsSentimentAgent] Analysis completed:', {
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
      console.error('💥 [NewsSentimentAgent] Error processing message:', error);
      logger.error(`${this.agentName} error:`, error);
      
      // Send error result
      if (message.requestId) {
        await this.sendError(message.requestId, error);
      }
    }
  }

  async generateLLMEnhancedNewsSentiment(symbol) {
    try {
      let newsData;
      
      if (config.analysis.useMockData) {
        console.log('🧪 [NewsSentimentAgent] Using mock data for testing');
        newsData = this.generateMockNewsData(symbol);
      } else {
        console.log('📰 [NewsSentimentAgent] Fetching real news data from APIs');
        newsData = await this.fetchRealNewsData(symbol);
      }
      
      if (this.ollamaEnabled) {
        console.log('🧠 [NewsSentimentAgent] Generating LLM-enhanced news analysis...');
        
        // Use LLM to analyze news and generate insights
        const llmAnalysis = await this.generateLLMNewsInsights(symbol, newsData);
        
        return {
          ...newsData,
          llmInsights: llmAnalysis,
          llmEnhanced: true,
          lastUpdated: new Date().toISOString()
        };
      } else {
        throw new Error('LLM is required for NewsSentimentAgent analysis. Ollama service is not available.');
      }
      
    } catch (error) {
      console.error('❌ [NewsSentimentAgent] Error generating news sentiment:', error);
      logger.error('NewsSentimentAgent data generation error:', error);
      
      // No fallback - throw error if LLM is not available
      throw new Error(`NewsSentimentAgent requires LLM capabilities: ${error.message}`);
    }
  }

  async generateLLMNewsInsights(symbol, newsData) {
    try {
      const articles = newsData.articles || [];
      const articlesText = articles.map(article => 
        `Title: ${article.title}\nSummary: ${article.summary}\nSentiment: ${article.sentiment}`
      ).join('\n\n');

      const prompt = `Analyze the following news articles for ${symbol} and provide comprehensive sentiment analysis:

News Articles:
${articlesText}

Additional Data:
- Overall Sentiment Score: ${newsData.sentimentAnalysis?.overallScore || 50}
- Key Themes: ${JSON.stringify(newsData.sentimentAnalysis?.keyThemes || [])}
- Social Sentiment: ${newsData.socialSentiment?.score || 50}

Please provide:
1. Overall market sentiment assessment
2. Key themes and narratives driving sentiment
3. Impact on stock price and market perception
4. Risk factors and potential catalysts
5. Media bias and reliability assessment
6. Social media sentiment correlation
7. Short-term and long-term sentiment outlook

Format your response as structured JSON with the following keys:
- sentimentAnalysis: { overallSentiment, confidence, trend }
- keyThemes: { primary, secondary, emerging }
- marketImpact: { priceImpact, volatilityImpact, investorSentiment }
- riskAssessment: { risks, catalysts, concerns }
- mediaAnalysis: { bias, reliability, coverage }
- socialCorrelation: { correlation, divergence, influencers }
- outlook: { shortTerm, longTerm, confidence }

Provide detailed, professional analysis suitable for investment decision-making.`;

      const response = await this.ollama.generate(prompt, { 
        maxTokens: 2500,
        temperature: 0.3 
      });

      // Parse LLM response
      const llmInsights = this.parseLLMResponse(response);
      
      return {
        analysis: llmInsights,
        confidence: this.calculateConfidence(newsData),
        marketContext: this.generateMarketContext(symbol, newsData),
        recommendations: this.generateRecommendations(llmInsights)
      };

    } catch (error) {
      console.error('❌ [NewsSentimentAgent] LLM analysis failed:', error);
      logger.error('NewsSentimentAgent LLM analysis error:', error);
      
      // No fallback - throw error if LLM analysis fails
      throw new Error(`NewsSentimentAgent LLM analysis error: ${error.message}`);
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
          console.log('⚠️ [NewsSentimentAgent] JSON parsing failed, using fallback extraction');
          // Continue to fallback extraction
        }
      }
      
      // Fallback: extract key insights from text
      return {
        sentimentAnalysis: {
          overallSentiment: this.extractOverallSentiment(responseText),
          confidence: this.extractConfidence(responseText),
          trend: this.extractSentimentTrend(responseText)
        },
        keyThemes: {
          primary: this.extractPrimaryThemes(responseText),
          secondary: this.extractSecondaryThemes(responseText),
          emerging: this.extractEmergingThemes(responseText)
        },
        marketImpact: {
          priceImpact: this.extractPriceImpact(responseText),
          volatilityImpact: this.extractVolatilityImpact(responseText),
          investorSentiment: this.extractInvestorSentiment(responseText)
        },
        riskAssessment: {
          risks: this.extractRisks(responseText),
          catalysts: this.extractCatalysts(responseText),
          concerns: this.extractConcerns(responseText)
        },
        mediaAnalysis: {
          bias: this.extractMediaBias(responseText),
          reliability: this.extractReliability(responseText),
          coverage: this.extractCoverage(responseText)
        },
        socialCorrelation: {
          correlation: this.extractCorrelation(responseText),
          divergence: this.extractDivergence(responseText),
          influencers: this.extractInfluencers(responseText)
        },
        outlook: {
          shortTerm: this.extractShortTermOutlook(responseText),
          longTerm: this.extractLongTermOutlook(responseText),
          confidence: this.extractOutlookConfidence(responseText)
        }
      };
    } catch (error) {
      console.error('❌ [NewsSentimentAgent] Error parsing LLM response:', error);
      throw new Error('NewsSentimentAgent LLM response parsing error');
    }
  }

  generateEnhancedTraditionalSentiment(symbol, newsData) {
    const overallScore = newsData.sentimentAnalysis?.overallScore || 50;
    const articles = newsData.articles || [];
    
    return {
      sentimentAnalysis: {
        overallSentiment: this.categorizeSentiment(overallScore),
        confidence: this.calculateConfidence(newsData),
        trend: this.calculateSentimentTrend(articles)
      },
      keyThemes: {
        primary: this.extractPrimaryThemes(articles),
        secondary: this.extractSecondaryThemes(articles),
        emerging: this.extractEmergingThemes(articles)
      },
      marketImpact: {
        priceImpact: this.assessPriceImpact(overallScore),
        volatilityImpact: this.assessVolatilityImpact(articles),
        investorSentiment: this.assessInvestorSentiment(overallScore)
      },
      riskAssessment: {
        risks: this.identifyRisks(articles),
        catalysts: this.identifyCatalysts(articles),
        concerns: this.identifyConcerns(articles)
      },
      mediaAnalysis: {
        bias: this.assessMediaBias(articles),
        reliability: this.assessReliability(articles),
        coverage: this.assessCoverage(articles)
      },
      socialCorrelation: {
        correlation: this.calculateSocialCorrelation(newsData),
        divergence: this.calculateDivergence(newsData),
        influencers: this.identifyInfluencers(newsData)
      },
      outlook: {
        shortTerm: this.generateShortTermOutlook(overallScore),
        longTerm: this.generateLongTermOutlook(articles),
        confidence: this.calculateOutlookConfidence(newsData)
      }
    };
  }

  // Helper methods for traditional analysis
  categorizeSentiment(score) {
    if (score >= 80) return 'very_bullish';
    if (score >= 60) return 'bullish';
    if (score >= 40) return 'neutral';
    if (score >= 20) return 'bearish';
    return 'very_bearish';
  }

  calculateSentimentTrend(articles) {
    if (articles.length === 0) return 'stable';
    
    const recentArticles = articles.slice(0, 3);
    const olderArticles = articles.slice(-3);
    
    const recentAvg = recentArticles.reduce((sum, article) => sum + (article.sentiment || 50), 0) / recentArticles.length;
    const olderAvg = olderArticles.reduce((sum, article) => sum + (article.sentiment || 50), 0) / olderArticles.length;
    
    if (recentAvg > olderAvg + 10) return 'improving';
    if (recentAvg < olderAvg - 10) return 'deteriorating';
    return 'stable';
  }

  extractPrimaryThemes(articles) {
    const themes = ['earnings', 'product_launch', 'market_expansion', 'regulatory', 'leadership'];
    return themes.filter(theme => 
      articles.some(article => 
        article.title?.toLowerCase().includes(theme) || 
        article.summary?.toLowerCase().includes(theme)
      )
    );
  }

  extractSecondaryThemes(articles) {
    const themes = ['partnership', 'acquisition', 'innovation', 'competition', 'financial'];
    return themes.filter(theme => 
      articles.some(article => 
        article.title?.toLowerCase().includes(theme) || 
        article.summary?.toLowerCase().includes(theme)
      )
    );
  }

  extractEmergingThemes(articles) {
    const emerging = ['ai', 'blockchain', 'sustainability', 'esg', 'digital_transformation'];
    return emerging.filter(theme => 
      articles.some(article => 
        article.title?.toLowerCase().includes(theme) || 
        article.summary?.toLowerCase().includes(theme)
      )
    );
  }

  assessPriceImpact(score) {
    if (score >= 80) return 'strong_positive';
    if (score >= 60) return 'moderate_positive';
    if (score >= 40) return 'minimal';
    if (score >= 20) return 'moderate_negative';
    return 'strong_negative';
  }

  assessVolatilityImpact(articles) {
    const highVolatilityKeywords = ['volatile', 'uncertainty', 'risk', 'concern', 'warning'];
    const hasHighVolatility = articles.some(article => 
      highVolatilityKeywords.some(keyword => 
        article.title?.toLowerCase().includes(keyword) || 
        article.summary?.toLowerCase().includes(keyword)
      )
    );
    
    return hasHighVolatility ? 'increased' : 'normal';
  }

  assessInvestorSentiment(score) {
    if (score >= 70) return 'optimistic';
    if (score >= 50) return 'neutral';
    return 'pessimistic';
  }

  identifyRisks(articles) {
    const riskKeywords = ['risk', 'concern', 'warning', 'decline', 'loss', 'failure'];
    return riskKeywords.filter(keyword => 
      articles.some(article => 
        article.title?.toLowerCase().includes(keyword) || 
        article.summary?.toLowerCase().includes(keyword)
      )
    );
  }

  identifyCatalysts(articles) {
    const catalystKeywords = ['growth', 'expansion', 'launch', 'partnership', 'acquisition', 'innovation'];
    return catalystKeywords.filter(keyword => 
      articles.some(article => 
        article.title?.toLowerCase().includes(keyword) || 
        article.summary?.toLowerCase().includes(keyword)
      )
    );
  }

  identifyConcerns(articles) {
    const concernKeywords = ['regulation', 'competition', 'market_share', 'cost', 'delay'];
    return concernKeywords.filter(keyword => 
      articles.some(article => 
        article.title?.toLowerCase().includes(keyword) || 
        article.summary?.toLowerCase().includes(keyword)
      )
    );
  }

  assessMediaBias(articles) {
    const positiveSources = ['positive', 'bullish', 'growth', 'success'];
    const negativeSources = ['negative', 'bearish', 'decline', 'failure'];
    
    const positiveCount = articles.filter(article => 
      positiveSources.some(source => 
        article.title?.toLowerCase().includes(source) || 
        article.summary?.toLowerCase().includes(source)
      )
    ).length;
    
    const negativeCount = articles.filter(article => 
      negativeSources.some(source => 
        article.title?.toLowerCase().includes(source) || 
        article.summary?.toLowerCase().includes(source)
      )
    ).length;
    
    if (positiveCount > negativeCount * 2) return 'positive_bias';
    if (negativeCount > positiveCount * 2) return 'negative_bias';
    return 'balanced';
  }

  assessReliability(articles) {
    const reliableKeywords = ['official', 'confirmed', 'announced', 'reported'];
    const unreliableKeywords = ['rumor', 'speculation', 'unconfirmed', 'alleged'];
    
    const reliableCount = articles.filter(article => 
      reliableKeywords.some(keyword => 
        article.title?.toLowerCase().includes(keyword) || 
        article.summary?.toLowerCase().includes(keyword)
      )
    ).length;
    
    const unreliableCount = articles.filter(article => 
      unreliableKeywords.some(keyword => 
        article.title?.toLowerCase().includes(keyword) || 
        article.summary?.toLowerCase().includes(keyword)
      )
    ).length;
    
    if (reliableCount > unreliableCount) return 'high';
    if (unreliableCount > reliableCount) return 'low';
    return 'medium';
  }

  assessCoverage(articles) {
    if (articles.length >= 10) return 'extensive';
    if (articles.length >= 5) return 'moderate';
    return 'limited';
  }

  calculateSocialCorrelation(newsData) {
    const newsScore = newsData.sentimentAnalysis?.overallScore || 50;
    const socialScore = newsData.socialSentiment?.score || 50;
    const difference = Math.abs(newsScore - socialScore);
    
    if (difference <= 10) return 'high_correlation';
    if (difference <= 20) return 'moderate_correlation';
    return 'low_correlation';
  }

  calculateDivergence(newsData) {
    const newsScore = newsData.sentimentAnalysis?.overallScore || 50;
    const socialScore = newsData.socialSentiment?.score || 50;
    
    if (Math.abs(newsScore - socialScore) > 20) {
      return newsScore > socialScore ? 'news_more_positive' : 'social_more_positive';
    }
    return 'aligned';
  }

  identifyInfluencers(newsData) {
    return ['financial_analysts', 'industry_experts', 'social_media_traders'];
  }

  generateShortTermOutlook(score) {
    if (score >= 70) return 'positive_momentum';
    if (score >= 50) return 'stable';
    return 'negative_momentum';
  }

  generateLongTermOutlook(articles) {
    const positiveKeywords = ['growth', 'expansion', 'innovation', 'success'];
    const negativeKeywords = ['decline', 'risk', 'concern', 'failure'];
    
    const positiveCount = articles.filter(article => 
      positiveKeywords.some(keyword => 
        article.title?.toLowerCase().includes(keyword) || 
        article.summary?.toLowerCase().includes(keyword)
      )
    ).length;
    
    const negativeCount = articles.filter(article => 
      negativeKeywords.some(keyword => 
        article.title?.toLowerCase().includes(keyword) || 
        article.summary?.toLowerCase().includes(keyword)
      )
    ).length;
    
    if (positiveCount > negativeCount) return 'positive_trend';
    if (negativeCount > positiveCount) return 'negative_trend';
    return 'neutral_trend';
  }

  calculateOutlookConfidence(newsData) {
    const articleCount = newsData.articles?.length || 0;
    const score = newsData.sentimentAnalysis?.overallScore || 50;
    
    let confidence = 50; // Base confidence
    
    if (articleCount >= 10) confidence += 20;
    if (articleCount >= 5) confidence += 10;
    if (score >= 70 || score <= 30) confidence += 10; // Strong sentiment
    if (Math.abs(score - 50) > 20) confidence += 10; // Clear direction
    
    return Math.min(confidence, 100);
  }

  // Helper methods for data extraction from LLM responses
  extractOverallSentiment(response) {
    if (response.includes('very bullish') || response.includes('extremely positive')) return 'very_bullish';
    if (response.includes('bullish') || response.includes('positive')) return 'bullish';
    if (response.includes('very bearish') || response.includes('extremely negative')) return 'very_bearish';
    if (response.includes('bearish') || response.includes('negative')) return 'bearish';
    return 'neutral';
  }

  extractConfidence(response) {
    if (response.includes('high confidence') || response.includes('strong signal')) return 85;
    if (response.includes('low confidence') || response.includes('weak signal')) return 45;
    return 65;
  }

  extractSentimentTrend(response) {
    if (response.includes('improving') || response.includes('increasing')) return 'improving';
    if (response.includes('deteriorating') || response.includes('decreasing')) return 'deteriorating';
    return 'stable';
  }

  extractPrimaryThemes(response) {
    const themes = [];
    if (response.includes('earnings')) themes.push('earnings');
    if (response.includes('product launch')) themes.push('product_launch');
    if (response.includes('expansion')) themes.push('market_expansion');
    return themes;
  }

  extractSecondaryThemes(response) {
    const themes = [];
    if (response.includes('partnership')) themes.push('partnership');
    if (response.includes('acquisition')) themes.push('acquisition');
    if (response.includes('innovation')) themes.push('innovation');
    return themes;
  }

  extractEmergingThemes(response) {
    const themes = [];
    if (response.includes('AI') || response.includes('artificial intelligence')) themes.push('ai');
    if (response.includes('blockchain')) themes.push('blockchain');
    if (response.includes('sustainability')) themes.push('sustainability');
    return themes;
  }

  extractPriceImpact(response) {
    if (response.includes('strong positive impact')) return 'strong_positive';
    if (response.includes('positive impact')) return 'moderate_positive';
    if (response.includes('negative impact')) return 'moderate_negative';
    if (response.includes('strong negative impact')) return 'strong_negative';
    return 'minimal';
  }

  extractVolatilityImpact(response) {
    if (response.includes('increased volatility')) return 'increased';
    if (response.includes('decreased volatility')) return 'decreased';
    return 'normal';
  }

  extractInvestorSentiment(response) {
    if (response.includes('optimistic') || response.includes('positive sentiment')) return 'optimistic';
    if (response.includes('pessimistic') || response.includes('negative sentiment')) return 'pessimistic';
    return 'neutral';
  }

  extractRisks(response) {
    const risks = [];
    if (response.includes('regulatory risk')) risks.push('regulatory');
    if (response.includes('market risk')) risks.push('market');
    if (response.includes('competition risk')) risks.push('competition');
    return risks;
  }

  extractCatalysts(response) {
    const catalysts = [];
    if (response.includes('growth catalyst')) catalysts.push('growth');
    if (response.includes('product catalyst')) catalysts.push('product');
    if (response.includes('partnership catalyst')) catalysts.push('partnership');
    return catalysts;
  }

  extractConcerns(response) {
    const concerns = [];
    if (response.includes('regulatory concern')) concerns.push('regulatory');
    if (response.includes('market concern')) concerns.push('market');
    if (response.includes('financial concern')) concerns.push('financial');
    return concerns;
  }

  extractMediaBias(response) {
    if (response.includes('positive bias') || response.includes('bullish bias')) return 'positive_bias';
    if (response.includes('negative bias') || response.includes('bearish bias')) return 'negative_bias';
    return 'balanced';
  }

  extractReliability(response) {
    if (response.includes('high reliability') || response.includes('reliable sources')) return 'high';
    if (response.includes('low reliability') || response.includes('unreliable')) return 'low';
    return 'medium';
  }

  extractCoverage(response) {
    if (response.includes('extensive coverage')) return 'extensive';
    if (response.includes('limited coverage')) return 'limited';
    return 'moderate';
  }

  extractCorrelation(response) {
    if (response.includes('high correlation')) return 'high_correlation';
    if (response.includes('low correlation')) return 'low_correlation';
    return 'moderate_correlation';
  }

  extractDivergence(response) {
    if (response.includes('news more positive')) return 'news_more_positive';
    if (response.includes('social more positive')) return 'social_more_positive';
    return 'aligned';
  }

  extractInfluencers(response) {
    const influencers = [];
    if (response.includes('analysts')) influencers.push('financial_analysts');
    if (response.includes('experts')) influencers.push('industry_experts');
    if (response.includes('traders')) influencers.push('social_media_traders');
    return influencers;
  }

  extractShortTermOutlook(response) {
    if (response.includes('positive momentum')) return 'positive_momentum';
    if (response.includes('negative momentum')) return 'negative_momentum';
    return 'stable';
  }

  extractLongTermOutlook(response) {
    if (response.includes('positive trend')) return 'positive_trend';
    if (response.includes('negative trend')) return 'negative_trend';
    return 'neutral_trend';
  }

  extractOutlookConfidence(response) {
    if (response.includes('high confidence')) return 85;
    if (response.includes('low confidence')) return 45;
    return 65;
  }

  generateMarketContext(symbol, newsData) {
    return {
      sector: this.inferSector(symbol),
      coverage: this.assessCoverage(newsData.articles || []),
      reliability: this.assessReliability(newsData.articles || []),
      bias: this.assessMediaBias(newsData.articles || [])
    };
  }

  generateRecommendations(insights) {
    // Handle cases where insights might be undefined or missing expected properties
    if (!insights) {
      return 'monitor_closely';
    }
    
    const { sentimentAnalysis, marketImpact, outlook } = insights;
    
    // Check if required properties exist before accessing them
    const overallSentiment = sentimentAnalysis?.overallSentiment || 'neutral';
    const priceImpact = marketImpact?.priceImpact || 'minimal';
    
    if (overallSentiment === 'bullish' && priceImpact === 'moderate_positive') {
      return 'positive_outlook';
    } else if (overallSentiment === 'bearish' && priceImpact === 'moderate_negative') {
      return 'negative_outlook';
    } else {
      return 'monitor_closely';
    }
  }

  calculateConfidence(newsData) {
    const articleCount = newsData.articles?.length || 0;
    const score = newsData.sentimentAnalysis?.overallScore || 50;
    
    let confidence = 50; // Base confidence
    
    if (articleCount >= 10) confidence += 20;
    if (articleCount >= 5) confidence += 10;
    if (score >= 70 || score <= 30) confidence += 10; // Strong sentiment
    if (Math.abs(score - 50) > 20) confidence += 10; // Clear direction
    
    return Math.min(confidence, 100);
  }

  // Utility methods
  inferSector(symbol) {
    // Simple sector inference based on symbol patterns
    if (symbol.includes('AAPL') || symbol.includes('MSFT') || symbol.includes('GOOGL')) return 'Technology';
    if (symbol.includes('JPM') || symbol.includes('BAC') || symbol.includes('WFC')) return 'Financial';
    if (symbol.includes('XOM') || symbol.includes('CVX')) return 'Energy';
    return 'General';
  }

  generateMockNewsData(symbol) {
    // Generate stock-specific mock news data based on symbol
    const symbolHash = this.hashSymbol(symbol);
    const stockType = this.getStockType(symbol);
    
    const mockArticles = this.generateStockSpecificArticles(symbol, stockType, symbolHash.sentiment);
    const overallScore = mockArticles.reduce((sum, article) => sum + article.sentiment, 0) / mockArticles.length;
    
    return {
      symbol: symbol.toUpperCase(),
      articles: mockArticles,
      sentimentAnalysis: {
        overallScore: Math.round(overallScore),
        keyThemes: this.getStockSpecificThemes(stockType, symbolHash.themes),
        summary: `Overall sentiment for ${symbol} is ${overallScore > 60 ? 'positive' : overallScore < 40 ? 'negative' : 'neutral'}.`
      },
      socialSentiment: {
        score: overallScore + (symbolHash.social - 0.5) * 30,
        mentions: Math.floor(100 + symbolHash.social * 2000),
        trending: symbolHash.social > 0.7
      }
    };
  }

  // Helper methods for stock-specific data
  hashSymbol(symbol) {
    let hash = 0;
    for (let i = 0; i < symbol.length; i++) {
      const char = symbol.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const normalizedHash = Math.abs(hash) / 2147483647;
    return {
      sentiment: (normalizedHash * 1000) % 1,
      themes: (normalizedHash * 2000) % 1,
      social: (normalizedHash * 3000) % 1
    };
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

  generateStockSpecificArticles(symbol, stockType, hash) {
    const articles = [];
    
    if (stockType === 'tech') {
      articles.push(
        {
          title: `${symbol} Reports Strong Q3 Earnings, Exceeds Expectations`,
          summary: `${symbol} announced quarterly earnings that beat analyst estimates, driven by strong product sales and market expansion.`,
          sentiment: 80 + (hash * 20),
          source: 'Financial Times',
          publishedAt: new Date().toISOString()
        },
        {
          title: `${symbol} Launches New AI-Powered Product Line`,
          summary: `${symbol} unveiled its latest artificial intelligence product, positioning the company for future growth in the AI market.`,
          sentiment: 70 + (hash * 25),
          source: 'TechCrunch',
          publishedAt: new Date().toISOString()
        },
        {
          title: `${symbol} Faces Regulatory Scrutiny in European Markets`,
          summary: `${symbol} is under investigation by European regulators over potential antitrust concerns.`,
          sentiment: 30 + (hash * 20),
          source: 'Reuters',
          publishedAt: new Date().toISOString()
        }
      );
    } else if (stockType === 'financial') {
      articles.push(
        {
          title: `${symbol} Reports Strong Q3 Earnings, Exceeds Expectations`,
          summary: `${symbol} announced quarterly earnings that beat analyst estimates, driven by strong lending and investment banking.`,
          sentiment: 75 + (hash * 20),
          source: 'Financial Times',
          publishedAt: new Date().toISOString()
        },
        {
          title: `${symbol} Expands Digital Banking Services`,
          summary: `${symbol} launched new digital banking features to compete with fintech startups.`,
          sentiment: 65 + (hash * 25),
          source: 'Bloomberg',
          publishedAt: new Date().toISOString()
        },
        {
          title: `${symbol} Faces Regulatory Changes in Banking Sector`,
          summary: `${symbol} is adapting to new banking regulations that could impact profitability.`,
          sentiment: 40 + (hash * 20),
          source: 'Reuters',
          publishedAt: new Date().toISOString()
        }
      );
    } else if (stockType === 'energy') {
      articles.push(
        {
          title: `${symbol} Reports Strong Q3 Earnings, Exceeds Expectations`,
          summary: `${symbol} announced quarterly earnings that beat analyst estimates, driven by strong oil prices and production.`,
          sentiment: 70 + (hash * 20),
          source: 'Financial Times',
          publishedAt: new Date().toISOString()
        },
        {
          title: `${symbol} Invests in Renewable Energy Projects`,
          summary: `${symbol} announced new investments in renewable energy to diversify its portfolio.`,
          sentiment: 60 + (hash * 25),
          source: 'Bloomberg',
          publishedAt: new Date().toISOString()
        },
        {
          title: `${symbol} Faces Environmental Regulations`,
          summary: `${symbol} is dealing with new environmental regulations that could impact operations.`,
          sentiment: 35 + (hash * 20),
          source: 'Reuters',
          publishedAt: new Date().toISOString()
        }
      );
    } else {
      // General articles
      articles.push(
        {
          title: `${symbol} Reports Strong Q3 Earnings, Exceeds Expectations`,
          summary: `${symbol} announced quarterly earnings that beat analyst estimates, driven by strong business performance.`,
          sentiment: 75 + (hash * 20),
          source: 'Financial Times',
          publishedAt: new Date().toISOString()
        },
        {
          title: `${symbol} Announces Strategic Partnership`,
          summary: `${symbol} has formed a strategic partnership that could significantly expand its market reach.`,
          sentiment: 70 + (hash * 25),
          source: 'Bloomberg',
          publishedAt: new Date().toISOString()
        },
        {
          title: `${symbol} Stock Shows Strong Technical Momentum`,
          summary: `${symbol} shares are showing positive technical indicators, suggesting continued upward movement.`,
          sentiment: 65 + (hash * 20),
          source: 'MarketWatch',
          publishedAt: new Date().toISOString()
        }
      );
    }
    
    return articles;
  }

  getStockSpecificThemes(stockType, hash) {
    const themes = {
      tech: ['earnings', 'ai_innovation', 'product_launch', 'regulation'],
      financial: ['earnings', 'digital_banking', 'regulation', 'interest_rates'],
      energy: ['earnings', 'renewable_energy', 'oil_prices', 'environmental_regs'],
      general: ['earnings', 'partnership', 'market_momentum', 'business_growth']
    };
    
    return themes[stockType] || themes.general;
  }

  async fetchRealNewsData(symbol) {
    try {
      console.log(`📰 [NewsSentimentAgent] Fetching real news data for ${symbol}`);
      
      // Try different news API providers
      const newsProviders = [
        { name: 'newsApi', enabled: !!config.apiKeys.newsApi },
        { name: 'newsData', enabled: !!config.apiKeys.newsData },
        { name: 'webz', enabled: !!config.apiKeys.webz }
      ];

      for (const provider of newsProviders) {
        if (!provider.enabled) continue;
        
        try {
          console.log(`🔄 [NewsSentimentAgent] Trying ${provider.name} API...`);
          
          switch (provider.name) {
            case 'newsApi':
              return await this.fetchFromNewsApi(symbol);
            case 'newsData':
              return await this.fetchFromNewsData(symbol);
            case 'webz':
              return await this.fetchFromWebz(symbol);
            default:
              console.log(`⚠️ [NewsSentimentAgent] Unknown provider: ${provider.name}`);
          }
        } catch (error) {
          console.log(`❌ [NewsSentimentAgent] ${provider.name} failed:`, error.message);
          continue;
        }
      }
      
      throw new Error('All news API providers failed');
      
    } catch (error) {
      console.error(`💥 [NewsSentimentAgent] Error fetching real news data for ${symbol}:`, error);
      throw new Error(`Failed to fetch news data: ${error.message}`);
    }
  }

  async fetchFromNewsApi(symbol) {
    if (!config.apiKeys.newsApi) {
      throw new Error('News API key not configured');
    }

    const url = `${config.apiEndpoints.newsApi}/everything?q=${symbol}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${config.apiKeys.newsApi}`;
    const response = await axios.get(url);
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message);
    }

    const articles = response.data.articles.map(article => ({
      title: article.title,
      summary: article.description,
      sentiment: this.calculateArticleSentiment(article.title + ' ' + article.description),
      source: article.source.name,
      publishedAt: article.publishedAt
    }));

    const overallScore = articles.reduce((sum, article) => sum + article.sentiment, 0) / articles.length;
    
    return {
      symbol: symbol.toUpperCase(),
      articles: articles,
      sentimentAnalysis: {
        overallScore: Math.round(overallScore),
        keyThemes: this.extractThemesFromArticles(articles),
        summary: `Overall sentiment for ${symbol} is ${overallScore > 60 ? 'positive' : overallScore < 40 ? 'negative' : 'neutral'}.`
      },
      socialSentiment: {
        score: overallScore,
        mentions: 0, // News API doesn't provide social data
        trending: false
      }
    };
  }

  async fetchFromNewsData(symbol) {
    if (!config.apiKeys.newsData) {
      throw new Error('NewsData API key not configured');
    }

    const url = `${config.apiEndpoints.newsData}/news?apikey=${config.apiKeys.newsData}&q=${symbol}&language=en`;
    const response = await axios.get(url);
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message);
    }

    const articles = response.data.results.map(article => ({
      title: article.title,
      summary: article.description,
      sentiment: this.calculateArticleSentiment(article.title + ' ' + article.description),
      source: article.source_id,
      publishedAt: article.pubDate
    }));

    const overallScore = articles.reduce((sum, article) => sum + article.sentiment, 0) / articles.length;
    
    return {
      symbol: symbol.toUpperCase(),
      articles: articles,
      sentimentAnalysis: {
        overallScore: Math.round(overallScore),
        keyThemes: this.extractThemesFromArticles(articles),
        summary: `Overall sentiment for ${symbol} is ${overallScore > 60 ? 'positive' : overallScore < 40 ? 'negative' : 'neutral'}.`
      },
      socialSentiment: {
        score: overallScore,
        mentions: 0,
        trending: false
      }
    };
  }

  async fetchFromWebz(symbol) {
    if (!config.apiKeys.webz) {
      throw new Error('Webz API key not configured');
    }

    const url = `${config.apiEndpoints.webz}?token=${config.apiKeys.webz}&q=${symbol}&format=json&size=10`;
    const response = await axios.get(url);
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message);
    }

    const articles = response.data.posts.map(article => ({
      title: article.title,
      summary: article.text.substring(0, 200),
      sentiment: this.calculateArticleSentiment(article.title + ' ' + article.text),
      source: article.domain,
      publishedAt: new Date(article.published * 1000).toISOString()
    }));

    const overallScore = articles.reduce((sum, article) => sum + article.sentiment, 0) / articles.length;
    
    return {
      symbol: symbol.toUpperCase(),
      articles: articles,
      sentimentAnalysis: {
        overallScore: Math.round(overallScore),
        keyThemes: this.extractThemesFromArticles(articles),
        summary: `Overall sentiment for ${symbol} is ${overallScore > 60 ? 'positive' : overallScore < 40 ? 'negative' : 'neutral'}.`
      },
      socialSentiment: {
        score: overallScore,
        mentions: 0,
        trending: false
      }
    };
  }

  calculateArticleSentiment(text) {
    // Simple sentiment calculation using VADER-like approach
    const positiveWords = ['positive', 'good', 'great', 'excellent', 'strong', 'up', 'gain', 'profit', 'growth', 'success'];
    const negativeWords = ['negative', 'bad', 'poor', 'weak', 'down', 'loss', 'decline', 'failure', 'risk', 'concern'];
    
    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    });
    
    const total = words.length;
    const sentiment = ((positiveCount - negativeCount) / total) * 100 + 50;
    
    return Math.max(0, Math.min(100, sentiment));
  }

  extractThemesFromArticles(articles) {
    const themes = new Set();
    const commonThemes = ['earnings', 'revenue', 'profit', 'growth', 'market', 'stock', 'price', 'trading', 'investment'];
    
    articles.forEach(article => {
      const text = (article.title + ' ' + article.summary).toLowerCase();
      commonThemes.forEach(theme => {
        if (text.includes(theme)) themes.add(theme);
      });
    });
    
    return Array.from(themes);
  }
}

module.exports = NewsSentimentAgent; 