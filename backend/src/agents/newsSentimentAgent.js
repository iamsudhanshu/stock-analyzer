const axios = require('axios');
const moment = require('moment');
const Sentiment = require('sentiment');
const BaseAgent = require('./BaseAgent');
const config = require('../config');
const logger = require('../utils/logger');

class NewsSentimentAgent extends BaseAgent {
  constructor() {
    super(
      'NewsSentimentAgent',
      [config.queues.news],
      [config.queues.analysis]
    );
    
    this.sentiment = new Sentiment();
    this.newsProviders = [
      { name: 'newsApi', priority: 1, rateLimit: { requests: 100, windowMs: 86400000 } },
      { name: 'newsData', priority: 2, rateLimit: { requests: 2000, windowMs: 86400000 } },
      { name: 'webz', priority: 3, rateLimit: { requests: 1000, windowMs: 2592000000 } }
    ];
  }

  async handleRequest(payload, requestId) {
    try {
      const { symbol } = payload;
      
      if (!symbol) {
        throw new Error('Symbol is required');
      }

      await this.sendProgress(requestId, 10, 'Starting news collection...');

      // Fetch news articles
      const articles = await this.fetchNews(symbol, requestId);
      
      await this.sendProgress(requestId, 40, 'Analyzing sentiment...');

      // Analyze sentiment
      const sentimentAnalysis = this.analyzeSentiment(articles);
      
      await this.sendProgress(requestId, 70, 'Processing social media signals...');

      // Get social media sentiment (if available)
      const socialSentiment = await this.fetchSocialSentiment(symbol, requestId);
      
      await this.sendProgress(requestId, 100, 'News sentiment analysis complete');

      return {
        symbol: symbol.toUpperCase(),
        articles,
        sentimentAnalysis,
        socialSentiment,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`NewsSentimentAgent error for request ${requestId}:`, error);
      throw error;
    }
  }

  async fetchNews(symbol, requestId) {
    const cacheKey = `news:${symbol}`;
    
    // Check cache first
    let cachedData = await this.getCachedData(cacheKey);
    if (cachedData) {
      logger.debug(`Using cached news data for ${symbol}`);
      return cachedData;
    }

    // Generate mock news if no API keys are available
    if (!config.apiKeys.newsApi && !config.apiKeys.newsData && !config.apiKeys.webz) {
      logger.warn('No news API keys configured, generating mock news data');
      const mockNews = this.generateMockNews(symbol);
      await this.setCachedData(cacheKey, mockNews, config.cache.newsTTL);
      return mockNews;
    }

    let allArticles = [];

    // Try each news provider
    for (const provider of this.newsProviders) {
      try {
        const canProceed = await this.checkRateLimit(
          provider.name,
          provider.rateLimit.requests,
          provider.rateLimit.windowMs
        );

        if (!canProceed) {
          logger.warn(`Rate limit exceeded for ${provider.name}`);
          continue;
        }

        let articles;
        
        switch (provider.name) {
          case 'newsApi':
            articles = await this.fetchNewsApi(symbol);
            break;
          case 'newsData':
            articles = await this.fetchNewsData(symbol);
            break;
          case 'webz':
            articles = await this.fetchWebzNews(symbol);
            break;
        }

        if (articles && articles.length > 0) {
          allArticles = allArticles.concat(articles);
        }

      } catch (error) {
        logger.warn(`Failed to fetch news from ${provider.name}:`, error.message);
        continue;
      }
    }

    // Remove duplicates and sort by date
    const uniqueArticles = this.removeDuplicateArticles(allArticles);
    const sortedArticles = uniqueArticles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    
    // Cache the results
    await this.setCachedData(cacheKey, sortedArticles, config.cache.newsTTL);
    
    return sortedArticles;
  }

  async fetchNewsApi(symbol) {
    if (!config.apiKeys.newsApi) {
      throw new Error('NewsAPI key not configured');
    }

    const queries = [
      symbol,
      `${symbol} stock`,
      `${symbol} earnings`,
      `${symbol} financial`
    ];

    let allArticles = [];

    for (const query of queries) {
      try {
        const response = await axios.get(`${config.apiEndpoints.newsApi}/everything`, {
          params: {
            q: query,
            language: 'en',
            sortBy: 'publishedAt',
            pageSize: 20,
            from: moment().subtract(7, 'days').toISOString(),
            apiKey: config.apiKeys.newsApi
          },
          timeout: 10000
        });

        if (response.data.articles) {
          const articles = response.data.articles.map(article => ({
            title: article.title,
            description: article.description,
            content: article.content,
            url: article.url,
            source: article.source.name,
            publishedAt: article.publishedAt,
            provider: 'newsApi'
          }));

          allArticles = allArticles.concat(articles);
        }

        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        logger.warn(`Error fetching from NewsAPI with query "${query}":`, error.message);
      }
    }

    return allArticles;
  }

  generateMockNews(symbol) {
    const mockHeadlines = [
      `${symbol} Reports Strong Q3 Earnings, Beats Analyst Expectations`,
      `${symbol} Announces Strategic Partnership with Major Tech Company`,
      `Analysts Upgrade ${symbol} Price Target Following Innovation Announcement`,
      `${symbol} CEO Discusses Future Growth Plans in Investor Call`,
      `Market Volatility Affects ${symbol} Trading Volume`,
      `${symbol} Launches New Product Line to Expand Market Share`,
      `Institutional Investors Increase Holdings in ${symbol}`,
      `${symbol} Stock Shows Resilience Despite Market Downturn`,
      `Breaking: ${symbol} Announces Major Acquisition Deal`,
      `${symbol} Dividend Increase Signals Management Confidence`
    ];

    const sources = ['Reuters', 'Bloomberg', 'Financial Times', 'MarketWatch', 'Yahoo Finance', 'CNBC'];
    const articles = [];

    for (let i = 0; i < 10; i++) {
      const headline = mockHeadlines[Math.floor(Math.random() * mockHeadlines.length)];
      const source = sources[Math.floor(Math.random() * sources.length)];
      const daysAgo = Math.floor(Math.random() * 7);
      
      articles.push({
        title: headline,
        description: `Detailed analysis of ${symbol} and its recent market performance...`,
        content: `This is mock content for ${symbol} news article. In a real implementation, this would contain the full article text.`,
        url: `https://example.com/news/${symbol.toLowerCase()}-${i}`,
        source,
        publishedAt: moment().subtract(daysAgo, 'days').toISOString(),
        provider: 'mock'
      });
    }

    return articles;
  }

  analyzeSentiment(articles) {
    if (!articles || articles.length === 0) {
      return {
        overallSentiment: 'neutral',
        sentimentScore: 0,
        sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
        totalArticles: 0,
        averageScore: 0,
        sentimentTrend: 'stable'
      };
    }

    let totalScore = 0;
    let positive = 0;
    let negative = 0;
    let neutral = 0;
    const dailyScores = {};

    articles.forEach(article => {
      // Analyze title and description
      const text = `${article.title || ''} ${article.description || ''}`;
      const result = this.sentiment.analyze(text);
      
      // Normalize score to -1 to 1 range
      const normalizedScore = Math.max(-1, Math.min(1, result.score / 10));
      
      totalScore += normalizedScore;
      
      if (normalizedScore > 0.1) {
        positive++;
      } else if (normalizedScore < -0.1) {
        negative++;
      } else {
        neutral++;
      }

      // Track daily sentiment for trend analysis
      const date = moment(article.publishedAt).format('YYYY-MM-DD');
      if (!dailyScores[date]) {
        dailyScores[date] = [];
      }
      dailyScores[date].push(normalizedScore);
    });

    const averageScore = totalScore / articles.length;
    const sentimentTrend = this.calculateSentimentTrend(dailyScores);

    let overallSentiment = 'neutral';
    if (averageScore > 0.2) {
      overallSentiment = 'positive';
    } else if (averageScore < -0.2) {
      overallSentiment = 'negative';
    }

    return {
      overallSentiment,
      sentimentScore: parseFloat(averageScore.toFixed(3)),
      sentimentDistribution: {
        positive: Math.round((positive / articles.length) * 100),
        neutral: Math.round((neutral / articles.length) * 100),
        negative: Math.round((negative / articles.length) * 100)
      },
      totalArticles: articles.length,
      averageScore: parseFloat(averageScore.toFixed(3)),
      sentimentTrend,
      dailyBreakdown: this.getDailySentimentBreakdown(dailyScores)
    };
  }

  calculateSentimentTrend(dailyScores) {
    const dates = Object.keys(dailyScores).sort();
    if (dates.length < 3) return 'insufficient_data';

    const dailyAverages = dates.map(date => {
      const scores = dailyScores[date];
      return scores.reduce((sum, score) => sum + score, 0) / scores.length;
    });

    // Compare recent half with earlier half
    const midPoint = Math.floor(dailyAverages.length / 2);
    const earlierAvg = dailyAverages.slice(0, midPoint).reduce((sum, avg) => sum + avg, 0) / midPoint;
    const recentAvg = dailyAverages.slice(midPoint).reduce((sum, avg) => sum + avg, 0) / (dailyAverages.length - midPoint);

    const change = recentAvg - earlierAvg;
    
    if (change > 0.1) return 'improving';
    if (change < -0.1) return 'declining';
    return 'stable';
  }

  getDailySentimentBreakdown(dailyScores) {
    const breakdown = {};
    
    Object.keys(dailyScores).forEach(date => {
      const scores = dailyScores[date];
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      breakdown[date] = {
        averageScore: parseFloat(average.toFixed(3)),
        articleCount: scores.length
      };
    });

    return breakdown;
  }

  async fetchSocialSentiment(symbol, requestId) {
    // For now, return mock social sentiment data
    // In a real implementation, this would fetch from Twitter, StockTwits, etc.
    
    return {
      twitter: {
        mentionCount: Math.floor(Math.random() * 1000) + 100,
        sentimentScore: (Math.random() - 0.5) * 2, // -1 to 1
        trending: Math.random() > 0.7,
        hashtagActivity: Math.floor(Math.random() * 50) + 10
      },
      stockTwits: {
        bullishSentiment: Math.floor(Math.random() * 100),
        bearishSentiment: Math.floor(Math.random() * 100),
        messageVolume: Math.floor(Math.random() * 500) + 50,
        watcherCount: Math.floor(Math.random() * 10000) + 1000
      },
      reddit: {
        mentionCount: Math.floor(Math.random() * 200) + 20,
        sentimentScore: (Math.random() - 0.5) * 2,
        subredditActivity: ['investing', 'stocks', 'SecurityAnalysis'].slice(0, Math.floor(Math.random() * 3) + 1)
      }
    };
  }

  removeDuplicateArticles(articles) {
    const seen = new Set();
    return articles.filter(article => {
      const key = `${article.title}-${article.source}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}

// Start the agent if this file is run directly
if (require.main === module) {
  const agent = new NewsSentimentAgent();
  agent.start().catch(error => {
    logger.error('Failed to start NewsSentimentAgent:', error);
    process.exit(1);
  });
}

module.exports = NewsSentimentAgent; 