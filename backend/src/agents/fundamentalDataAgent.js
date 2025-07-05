const BaseAgent = require('./BaseAgent');
const config = require('../config');
const logger = require('../utils/logger');
const OllamaService = require('../utils/ollama');
const axios = require('axios');

class FundamentalDataAgent extends BaseAgent {
    constructor() {
            super(
      'FundamentalDataAgent',
      [config.queues.fundamentalData],
      [config.queues.analysis]
    );
        
        this.ollama = new OllamaService();
        this.ollamaEnabled = false;
        
        // Initialize LLM capabilities
        this.initializeLLM();
    }

    async initializeLLM() {
        try {
            console.log('🧠 [FundamentalDataAgent] Initializing LLM capabilities...');
            this.ollamaEnabled = await this.ollama.isAvailable();
            
            if (this.ollamaEnabled) {
                console.log('✅ [FundamentalDataAgent] LLM capabilities enabled');
                logger.info('FundamentalDataAgent LLM capabilities enabled');
            } else {
                console.warn('⚠️ [FundamentalDataAgent] LLM not available, using enhanced traditional methods');
                logger.warn('FundamentalDataAgent LLM not available, using enhanced traditional methods');
            }
        } catch (error) {
            console.error('❌ [FundamentalDataAgent] Error initializing LLM:', error.message);
            logger.error('FundamentalDataAgent LLM initialization error:', error);
            this.ollamaEnabled = false;
        }
    }

    async processMessage(message) {
        try {
            console.log('📥 [FundamentalDataAgent] Processing message:', {
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

            console.log('📊 [FundamentalDataAgent] Starting LLM-enhanced fundamental analysis for:', symbol);
            
            // Generate comprehensive fundamental data with LLM insights
            const result = await this.generateLLMEnhancedFundamentalData(symbol);
            
            console.log('✅ [FundamentalDataAgent] Analysis completed:', {
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
            console.error('💥 [FundamentalDataAgent] Error processing message:', error);
            logger.error(`${this.agentName} error:`, error);
            
            // Send error result
            if (message.requestId) {
                await this.sendError(message.requestId, error);
            }
        }
    }

    async generateLLMEnhancedFundamentalData(symbol) {
        try {
            let fundamentalData;
            
            if (config.analysis.useMockData) {
                console.log('🧪 [FundamentalDataAgent] Using mock data for testing');
                fundamentalData = this.generateMockFundamentalData(symbol);
            } else {
                console.log('📊 [FundamentalDataAgent] Fetching real fundamental data from APIs');
                fundamentalData = await this.fetchRealFundamentalData(symbol);
            }
            
            if (this.ollamaEnabled) {
                console.log('🧠 [FundamentalDataAgent] Generating LLM-enhanced fundamental analysis...');
                
                // Use LLM to analyze fundamental data and generate insights
                const llmAnalysis = await this.generateLLMFundamentalInsights(symbol, fundamentalData);
                
                // Restructure data to match expected format
                return {
                    symbol: fundamentalData.symbol,
                    fundamentals: fundamentalData.fundamentals,
                    financialMetrics: fundamentalData.fundamentals.metrics,
                    valuation: fundamentalData.fundamentals.valuation,
                    llmInsights: llmAnalysis,
                    llmEnhanced: true,
                    lastUpdated: new Date().toISOString()
                };
            } else {
                throw new Error('LLM is required for FundamentalDataAgent analysis. Ollama service is not available.');
            }
            
        } catch (error) {
            console.error('❌ [FundamentalDataAgent] Error generating fundamental data:', error);
            logger.error('FundamentalDataAgent data generation error:', error);
            
            // No fallback - throw error if LLM is not available
            throw new Error(`FundamentalDataAgent requires LLM capabilities: ${error.message}`);
        }
    }

    async generateLLMFundamentalInsights(symbol, fundamentalData) {
        try {
            const metrics = fundamentalData.fundamentals?.metrics || {};
            const health = fundamentalData.fundamentals?.financialHealth || {};
            const valuation = fundamentalData.fundamentals?.valuation || {};

            const prompt = `Analyze the following fundamental data for ${symbol} and provide comprehensive financial analysis:

Financial Metrics:
- Market Cap: $${metrics.marketCap?.toLocaleString() || 'N/A'}
- P/E Ratio: ${metrics.peRatio || 'N/A'}
- PEG Ratio: ${metrics.pegRatio || 'N/A'}
- EPS: ${metrics.eps || 'N/A'}
- Dividend Yield: ${metrics.dividendYield || 'N/A'}%
- Debt/Equity: ${metrics.debtToEquity || 'N/A'}
- ROE: ${metrics.roe || 'N/A'}%
- Revenue Growth: ${metrics.revenueGrowth || 'N/A'}%
- Profit Margin: ${metrics.profitMargin || 'N/A'}%
- Current Ratio: ${metrics.currentRatio || 'N/A'}

Financial Health:
- Rating: ${health.rating || 'N/A'}
- Score: ${health.score || 'N/A'}
- Strengths: ${JSON.stringify(health.strengths || [])}
- Weaknesses: ${JSON.stringify(health.weaknesses || [])}

Valuation:
- Rating: ${valuation.rating || 'N/A'}
- Fair Value: $${valuation.fairValue || 'N/A'}
- Upside Potential: ${valuation.upsidePotential || 'N/A'}%

Please provide:
1. Financial health assessment and risk analysis
2. Valuation analysis and fair value estimation
3. Growth prospects and sustainability
4. Competitive advantages and market position
5. Risk factors and financial concerns
6. Investment attractiveness and recommendations
7. Sector comparison and industry context

Format your response as structured JSON with the following keys:
- financialHealth: { assessment, riskLevel, strengths, weaknesses, concerns }
- valuation: { fairValue, upside, valuationMethod, comparison }
- growth: { prospects, sustainability, drivers, risks }
- competitive: { advantages, position, moat, threats }
- investment: { attractiveness, recommendation, timeHorizon, confidence }
- sector: { comparison, industry, trends, outlook }

Provide detailed, professional analysis suitable for investment decision-making.`;

            const response = await this.ollama.generate(prompt, { 
                maxTokens: 2500,
                temperature: 0.3 
            });

            // Parse LLM response
            const llmInsights = this.parseLLMResponse(response);
            
            return {
                analysis: {
                    financialHealth: llmInsights.financialHealth,
                    valuationAnalysis: llmInsights.valuation,
                    growthProspects: llmInsights.growth
                },
                confidence: this.calculateConfidence(fundamentalData),
                marketContext: this.generateMarketContext(symbol, fundamentalData),
                recommendations: this.generateRecommendations(llmInsights)
            };

        } catch (error) {
            console.error('❌ [FundamentalDataAgent] LLM analysis failed:', error);
            logger.error('FundamentalDataAgent LLM analysis error:', error);
            
            // No fallback - throw error if LLM analysis fails
            throw new Error(`FundamentalDataAgent LLM analysis error: ${error.message}`);
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
                    console.log('⚠️ [FundamentalDataAgent] JSON parsing failed, using fallback extraction');
                    // Continue to fallback extraction
                }
            }
            
            // Fallback: extract key insights from text
            return {
                financialHealth: {
                    assessment: this.extractHealthAssessment(responseText),
                    riskLevel: this.extractRiskLevel(responseText),
                    strengths: this.extractStrengths(responseText),
                    weaknesses: this.extractWeaknesses(responseText),
                    concerns: this.extractConcerns(responseText)
                },
                valuation: {
                    fairValue: this.extractFairValue(responseText),
                    upside: this.extractUpside(responseText),
                    valuationMethod: this.extractValuationMethod(responseText),
                    comparison: this.extractComparison(responseText)
                },
                growth: {
                    prospects: this.extractGrowthProspects(responseText),
                    sustainability: this.extractSustainability(responseText),
                    drivers: this.extractGrowthDrivers(responseText),
                    risks: this.extractGrowthRisks(responseText)
                },
                competitive: {
                    advantages: this.extractAdvantages(responseText),
                    position: this.extractPosition(responseText),
                    moat: this.extractMoat(responseText),
                    threats: this.extractThreats(responseText)
                },
                investment: {
                    attractiveness: this.extractAttractiveness(responseText),
                    recommendation: this.extractRecommendation(responseText),
                    timeHorizon: this.extractTimeHorizon(responseText),
                    confidence: this.extractConfidence(responseText)
                },
                sector: {
                    comparison: this.extractSectorComparison(responseText),
                    industry: this.extractIndustry(responseText),
                    trends: this.extractTrends(responseText),
                    outlook: this.extractOutlook(responseText)
                }
            };
        } catch (error) {
            console.error('❌ [FundamentalDataAgent] Error parsing LLM response:', error);
            throw new Error('FundamentalDataAgent LLM response parsing error');
        }
    }

    generateEnhancedTraditionalFundamentals(symbol, fundamentalData) {
        const metrics = fundamentalData.fundamentals?.metrics || {};
        const health = fundamentalData.fundamentals?.financialHealth || {};
        const valuation = fundamentalData.fundamentals?.valuation || {};
        
        return {
            financialHealth: {
                assessment: this.assessFinancialHealth(metrics, health),
                riskLevel: this.assessRiskLevel(metrics),
                strengths: this.identifyStrengths(metrics, health),
                weaknesses: this.identifyWeaknesses(metrics, health),
                concerns: this.identifyConcerns(metrics)
            },
            valuation: {
                fairValue: this.calculateFairValue(metrics),
                upside: this.calculateUpside(metrics, valuation),
                valuationMethod: this.determineValuationMethod(metrics),
                comparison: this.compareValuation(metrics)
            },
            growth: {
                prospects: this.assessGrowthProspects(metrics),
                sustainability: this.assessSustainability(metrics),
                drivers: this.identifyGrowthDrivers(metrics),
                risks: this.identifyGrowthRisks(metrics)
            },
            competitive: {
                advantages: this.identifyAdvantages(metrics, health),
                position: this.assessPosition(metrics),
                moat: this.assessMoat(metrics, health),
                threats: this.identifyThreats(metrics)
            },
            investment: {
                attractiveness: this.assessAttractiveness(metrics, valuation),
                recommendation: this.generateRecommendation(metrics, valuation),
                timeHorizon: this.determineTimeHorizon(metrics),
                confidence: this.calculateConfidence(fundamentalData)
            },
            sector: {
                comparison: this.compareSector(metrics),
                industry: this.assessIndustry(metrics),
                trends: this.identifyTrends(metrics),
                outlook: this.generateOutlook(metrics)
            }
        };
    }

    // Helper methods for traditional analysis
    assessFinancialHealth(metrics, health) {
        const peRatio = metrics.peRatio || 0;
        const debtToEquity = metrics.debtToEquity || 0;
        const currentRatio = metrics.currentRatio || 0;
        const roe = metrics.roe || 0;
        
        if (peRatio < 15 && debtToEquity < 0.5 && currentRatio > 1.5 && roe > 15) {
            return 'excellent';
        } else if (peRatio < 25 && debtToEquity < 1.0 && currentRatio > 1.0 && roe > 10) {
            return 'good';
        } else if (peRatio < 35 && debtToEquity < 1.5 && currentRatio > 0.8 && roe > 5) {
            return 'fair';
        } else {
            return 'poor';
        }
    }

    assessRiskLevel(metrics) {
        const debtToEquity = metrics.debtToEquity || 0;
        const currentRatio = metrics.currentRatio || 0;
        const profitMargin = metrics.profitMargin || 0;
        
        if (debtToEquity > 2.0 || currentRatio < 0.8 || profitMargin < 0) {
            return 'high';
        } else if (debtToEquity > 1.0 || currentRatio < 1.0 || profitMargin < 5) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    identifyStrengths(metrics, health) {
        const strengths = [];
        
        if (metrics.roe > 15) strengths.push('high_roe');
        if (metrics.profitMargin > 10) strengths.push('high_profit_margin');
        if (metrics.debtToEquity < 0.5) strengths.push('low_debt');
        if (metrics.currentRatio > 1.5) strengths.push('strong_liquidity');
        if (metrics.revenueGrowth > 10) strengths.push('strong_growth');
        
        return strengths;
    }

    identifyWeaknesses(metrics, health) {
        const weaknesses = [];
        
        if (metrics.roe < 5) weaknesses.push('low_roe');
        if (metrics.profitMargin < 5) weaknesses.push('low_profit_margin');
        if (metrics.debtToEquity > 1.0) weaknesses.push('high_debt');
        if (metrics.currentRatio < 1.0) weaknesses.push('weak_liquidity');
        if (metrics.revenueGrowth < 0) weaknesses.push('declining_revenue');
        
        return weaknesses;
    }

    identifyConcerns(metrics) {
        const concerns = [];
        
        if (metrics.debtToEquity > 2.0) concerns.push('excessive_debt');
        if (metrics.currentRatio < 0.8) concerns.push('liquidity_risk');
        if (metrics.profitMargin < 0) concerns.push('unprofitable');
        if (metrics.revenueGrowth < -10) concerns.push('declining_business');
        
        return concerns;
    }

    calculateFairValue(metrics) {
        const eps = metrics.eps || 0;
        const peRatio = metrics.peRatio || 0;
        const growthRate = metrics.revenueGrowth || 0;
        
        // Simple DCF-like calculation
        const baseValue = eps * 15; // Conservative P/E
        const growthAdjustment = 1 + (growthRate / 100) * 0.5;
        
        return Math.round(baseValue * growthAdjustment * 100) / 100;
    }

    calculateUpside(metrics, valuation) {
        const currentPrice = 100; // Mock current price
        const fairValue = this.calculateFairValue(metrics);
        
        return Math.round(((fairValue - currentPrice) / currentPrice) * 100);
    }

    determineValuationMethod(metrics) {
        if (metrics.peRatio && metrics.peRatio > 0) return 'pe_ratio';
        if (metrics.bookValue && metrics.bookValue > 0) return 'book_value';
        if (metrics.revenue && metrics.revenue > 0) return 'revenue_multiple';
        return 'dcf';
    }

    compareValuation(metrics) {
        const peRatio = metrics.peRatio || 0;
        
        if (peRatio < 15) return 'undervalued';
        if (peRatio < 25) return 'fair_value';
        return 'overvalued';
    }

    assessGrowthProspects(metrics) {
        const revenueGrowth = metrics.revenueGrowth || 0;
        const eps = metrics.eps || 0;
        
        if (revenueGrowth > 15 && eps > 0) return 'strong';
        if (revenueGrowth > 5 && eps > 0) return 'moderate';
        if (revenueGrowth > 0) return 'weak';
        return 'declining';
    }

    assessSustainability(metrics) {
        const debtToEquity = metrics.debtToEquity || 0;
        const profitMargin = metrics.profitMargin || 0;
        const revenueGrowth = metrics.revenueGrowth || 0;
        
        if (debtToEquity < 0.5 && profitMargin > 10 && revenueGrowth > 5) {
            return 'high';
        } else if (debtToEquity < 1.0 && profitMargin > 5 && revenueGrowth > 0) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    identifyGrowthDrivers(metrics) {
        const drivers = [];
        
        if (metrics.revenueGrowth > 10) drivers.push('revenue_growth');
        if (metrics.roe > 15) drivers.push('high_roe');
        if (metrics.profitMargin > 10) drivers.push('profit_margin_expansion');
        
        return drivers;
    }

    identifyGrowthRisks(metrics) {
        const risks = [];
        
        if (metrics.debtToEquity > 1.0) risks.push('high_debt');
        if (metrics.revenueGrowth < 0) risks.push('declining_revenue');
        if (metrics.profitMargin < 5) risks.push('low_profitability');
        
        return risks;
    }

    identifyAdvantages(metrics, health) {
        const advantages = [];
        
        if (metrics.roe > 20) advantages.push('high_roe');
        if (metrics.profitMargin > 15) advantages.push('high_margins');
        if (metrics.debtToEquity < 0.3) advantages.push('low_debt');
        if (metrics.revenueGrowth > 15) advantages.push('strong_growth');
        
        return advantages;
    }

    assessPosition(metrics) {
        const marketCap = metrics.marketCap || 0;
        
        if (marketCap > 100000000000) return 'large_cap';
        if (marketCap > 10000000000) return 'mid_cap';
        return 'small_cap';
    }

    assessMoat(metrics, health) {
        const roe = metrics.roe || 0;
        const profitMargin = metrics.profitMargin || 0;
        
        if (roe > 20 && profitMargin > 15) return 'strong';
        if (roe > 15 && profitMargin > 10) return 'moderate';
        return 'weak';
    }

    identifyThreats(metrics) {
        const threats = [];
        
        if (metrics.debtToEquity > 1.5) threats.push('high_debt');
        if (metrics.revenueGrowth < -5) threats.push('declining_revenue');
        if (metrics.profitMargin < 0) threats.push('unprofitable');
        
        return threats;
    }

    assessAttractiveness(metrics, valuation) {
        const peRatio = metrics.peRatio || 0;
        const roe = metrics.roe || 0;
        const revenueGrowth = metrics.revenueGrowth || 0;
        
        if (peRatio < 20 && roe > 15 && revenueGrowth > 10) return 'high';
        if (peRatio < 25 && roe > 10 && revenueGrowth > 5) return 'medium';
        return 'low';
    }

    generateRecommendation(metrics, valuation) {
        const attractiveness = this.assessAttractiveness(metrics, valuation);
        
        switch (attractiveness) {
            case 'high': return 'strong_buy';
            case 'medium': return 'buy';
            default: return 'hold';
        }
    }

    determineTimeHorizon(metrics) {
        const revenueGrowth = metrics.revenueGrowth || 0;
        
        if (revenueGrowth > 15) return 'short_term';
        if (revenueGrowth > 5) return 'medium_term';
        return 'long_term';
    }

    compareSector(metrics) {
        const peRatio = metrics.peRatio || 0;
        
        if (peRatio < 15) return 'below_sector_average';
        if (peRatio < 25) return 'sector_average';
        return 'above_sector_average';
    }

    assessIndustry(metrics) {
        return 'technology'; // Mock industry assessment
    }

    identifyTrends(metrics) {
        const trends = [];
        
        if (metrics.revenueGrowth > 10) trends.push('growth_trend');
        if (metrics.profitMargin > 10) trends.push('profitability_trend');
        
        return trends;
    }

    generateOutlook(metrics) {
        const revenueGrowth = metrics.revenueGrowth || 0;
        const roe = metrics.roe || 0;
        
        if (revenueGrowth > 10 && roe > 15) return 'positive';
        if (revenueGrowth > 0 && roe > 10) return 'neutral';
        return 'negative';
    }

    // Helper methods for data extraction from LLM responses
    extractHealthAssessment(response) {
        if (response.includes('excellent health') || response.includes('strong financial')) return 'excellent';
        if (response.includes('good health') || response.includes('solid financial')) return 'good';
        if (response.includes('fair health') || response.includes('adequate financial')) return 'fair';
        return 'poor';
    }

    extractRiskLevel(response) {
        if (response.includes('high risk') || response.includes('risky')) return 'high';
        if (response.includes('low risk') || response.includes('safe')) return 'low';
        return 'medium';
    }

    extractStrengths(response) {
        const strengths = [];
        if (response.includes('high ROE')) strengths.push('high_roe');
        if (response.includes('strong margins')) strengths.push('high_margins');
        if (response.includes('low debt')) strengths.push('low_debt');
        return strengths;
    }

    extractWeaknesses(response) {
        const weaknesses = [];
        if (response.includes('low ROE')) weaknesses.push('low_roe');
        if (response.includes('high debt')) weaknesses.push('high_debt');
        if (response.includes('weak margins')) weaknesses.push('low_margins');
        return weaknesses;
    }

    extractConcerns(response) {
        const concerns = [];
        if (response.includes('debt concern')) concerns.push('high_debt');
        if (response.includes('liquidity risk')) concerns.push('liquidity_risk');
        if (response.includes('profitability concern')) concerns.push('low_profitability');
        return concerns;
    }

    extractFairValue(response) {
        const match = response.match(/\$(\d+(?:\.\d+)?)/);
        return match ? parseFloat(match[1]) : 0;
    }

    extractUpside(response) {
        const match = response.match(/(\d+(?:\.\d+)?)%/);
        return match ? parseFloat(match[1]) : 0;
    }

    extractValuationMethod(response) {
        if (response.includes('P/E ratio')) return 'pe_ratio';
        if (response.includes('DCF')) return 'dcf';
        if (response.includes('book value')) return 'book_value';
        return 'multiple';
    }

    extractComparison(response) {
        if (response.includes('undervalued')) return 'undervalued';
        if (response.includes('overvalued')) return 'overvalued';
        return 'fair_value';
    }

    extractGrowthProspects(response) {
        if (response.includes('strong growth')) return 'strong';
        if (response.includes('moderate growth')) return 'moderate';
        if (response.includes('weak growth')) return 'weak';
        return 'declining';
    }

    extractSustainability(response) {
        if (response.includes('high sustainability')) return 'high';
        if (response.includes('low sustainability')) return 'low';
        return 'medium';
    }

    extractGrowthDrivers(response) {
        const drivers = [];
        if (response.includes('revenue growth')) drivers.push('revenue_growth');
        if (response.includes('margin expansion')) drivers.push('margin_expansion');
        return drivers;
    }

    extractGrowthRisks(response) {
        const risks = [];
        if (response.includes('debt risk')) risks.push('high_debt');
        if (response.includes('competition risk')) risks.push('competition');
        return risks;
    }

    extractAdvantages(response) {
        const advantages = [];
        if (response.includes('competitive advantage')) advantages.push('competitive_advantage');
        if (response.includes('market position')) advantages.push('market_position');
        return advantages;
    }

    extractPosition(response) {
        if (response.includes('market leader')) return 'leader';
        if (response.includes('niche player')) return 'niche';
        return 'follower';
    }

    extractMoat(response) {
        if (response.includes('strong moat')) return 'strong';
        if (response.includes('weak moat')) return 'weak';
        return 'moderate';
    }

    extractThreats(response) {
        const threats = [];
        if (response.includes('competition threat')) threats.push('competition');
        if (response.includes('regulatory threat')) threats.push('regulatory');
        return threats;
    }

    extractAttractiveness(response) {
        if (response.includes('highly attractive')) return 'high';
        if (response.includes('moderately attractive')) return 'medium';
        return 'low';
    }

    extractRecommendation(response) {
        if (response.includes('strong buy')) return 'strong_buy';
        if (response.includes('buy')) return 'buy';
        if (response.includes('sell')) return 'sell';
        return 'hold';
    }

    extractTimeHorizon(response) {
        if (response.includes('short term')) return 'short_term';
        if (response.includes('long term')) return 'long_term';
        return 'medium_term';
    }

    extractConfidence(response) {
        if (response.includes('high confidence')) return 85;
        if (response.includes('low confidence')) return 45;
        return 65;
    }

    extractSectorComparison(response) {
        if (response.includes('below average')) return 'below_sector_average';
        if (response.includes('above average')) return 'above_sector_average';
        return 'sector_average';
    }

    extractIndustry(response) {
        if (response.includes('technology')) return 'technology';
        if (response.includes('financial')) return 'financial';
        return 'general';
    }

    extractTrends(response) {
        const trends = [];
        if (response.includes('growth trend')) trends.push('growth_trend');
        if (response.includes('profitability trend')) trends.push('profitability_trend');
        return trends;
    }

    extractOutlook(response) {
        if (response.includes('positive outlook')) return 'positive';
        if (response.includes('negative outlook')) return 'negative';
        return 'neutral';
    }

    // generateFallbackAnalysis method removed - no fallbacks in LLM-only system

    generateMarketContext(symbol, fundamentalData) {
        return {
            sector: this.inferSector(symbol),
            marketCap: this.categorizeMarketCap(fundamentalData.fundamentals?.metrics?.marketCap),
            valuation: this.categorizeValuation(fundamentalData.fundamentals?.metrics?.peRatio),
            health: this.categorizeHealth(fundamentalData.fundamentals?.financialHealth?.rating)
        };
    }

    generateRecommendations(insights) {
        const { investment, valuation } = insights;
        
        if (investment.attractiveness === 'high' && valuation.comparison === 'undervalued') {
            return 'strong_buy';
        } else if (investment.attractiveness === 'medium' && valuation.comparison !== 'overvalued') {
            return 'buy';
        } else {
            return 'hold';
        }
    }

    calculateConfidence(fundamentalData) {
        const metrics = fundamentalData.fundamentals?.metrics || {};
        let confidence = 50; // Base confidence
        
        if (metrics.peRatio) confidence += 10;
        if (metrics.roe) confidence += 10;
        if (metrics.revenueGrowth) confidence += 10;
        if (metrics.debtToEquity) confidence += 10;
        if (metrics.profitMargin) confidence += 10;
        
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

    categorizeMarketCap(marketCap) {
        if (!marketCap) return 'unknown';
        if (marketCap > 200000000000) return 'mega_cap';
        if (marketCap > 10000000000) return 'large_cap';
        if (marketCap > 2000000000) return 'mid_cap';
        return 'small_cap';
    }

    categorizeValuation(peRatio) {
        if (!peRatio) return 'unknown';
        if (peRatio < 15) return 'undervalued';
        if (peRatio < 25) return 'fair_value';
        return 'overvalued';
    }

    categorizeHealth(rating) {
        if (!rating) return 'unknown';
        return rating.toLowerCase();
    }

    generateMockFundamentalData(symbol) {
        // Generate stock-specific mock fundamental data based on symbol
        const symbolHash = this.hashSymbol(symbol);
        const stockType = this.getStockType(symbol);
        
        const metrics = this.generateStockSpecificMetrics(symbol, stockType, symbolHash.metrics);
        const marketCap = metrics.marketCap;
        const eps = metrics.eps;
        const peRatio = metrics.peRatio;
        const revenueGrowth = metrics.revenueGrowth;
        const roe = metrics.roe;
        const profitMargin = metrics.profitMargin;
        const debtToEquity = metrics.debtToEquity;
        const currentRatio = metrics.currentRatio;
        
        return {
            symbol: symbol.toUpperCase(),
            fundamentals: {
                metrics: metrics,
                financialHealth: {
                    rating: this.assessFinancialHealthRating(roe, debtToEquity, currentRatio, profitMargin),
                    score: Math.floor(50 + symbolHash.health * 50),
                    strengths: this.generateStrengths(roe, profitMargin, debtToEquity),
                    weaknesses: this.generateWeaknesses(roe, profitMargin, debtToEquity)
                },
                valuation: {
                    rating: this.assessValuationRating(peRatio, revenueGrowth),
                    fairValue: parseFloat((eps * (12 + symbolHash.valuation * 8)).toFixed(2)),
                    upsidePotential: parseFloat((symbolHash.valuation * 60 - 10).toFixed(2))
                },
                keyHighlights: [
                    `${symbol} shows ${revenueGrowth > 10 ? 'strong' : 'moderate'} revenue growth`,
                    `ROE of ${roe.toFixed(1)}% indicates ${roe > 15 ? 'strong' : 'adequate'} profitability`,
                    `P/E ratio of ${peRatio.toFixed(1)} suggests ${peRatio < 20 ? 'reasonable' : 'premium'} valuation`
                ]
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
            metrics: (normalizedHash * 1000) % 1,
            health: (normalizedHash * 2000) % 1,
            valuation: (normalizedHash * 3000) % 1
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

    generateStockSpecificMetrics(symbol, stockType, hash) {
        let marketCap, eps, peRatio, revenueGrowth, roe, profitMargin, debtToEquity, currentRatio;
        
        if (stockType === 'tech') {
            marketCap = 200000000000 + hash * 800000000000; // $200B - $1T
            eps = 2 + hash * 8; // $2 - $10
            peRatio = 15 + hash * 25; // 15 - 40
            revenueGrowth = 5 + hash * 20; // 5% - 25%
            roe = 10 + hash * 20; // 10% - 30%
            profitMargin = 5 + hash * 15; // 5% - 20%
            debtToEquity = hash * 0.5; // 0 - 0.5
            currentRatio = 1.5 + hash * 1.5; // 1.5 - 3.0
        } else if (stockType === 'financial') {
            marketCap = 50000000000 + hash * 300000000000; // $50B - $350B
            eps = 1 + hash * 4; // $1 - $5
            peRatio = 8 + hash * 12; // 8 - 20
            revenueGrowth = -2 + hash * 12; // -2% - 10%
            roe = 8 + hash * 12; // 8% - 20%
            profitMargin = 15 + hash * 10; // 15% - 25%
            debtToEquity = 0.5 + hash * 1.5; // 0.5 - 2.0
            currentRatio = 0.8 + hash * 0.7; // 0.8 - 1.5
        } else if (stockType === 'energy') {
            marketCap = 100000000000 + hash * 400000000000; // $100B - $500B
            eps = 3 + hash * 7; // $3 - $10
            peRatio = 10 + hash * 15; // 10 - 25
            revenueGrowth = -5 + hash * 15; // -5% - 10%
            roe = 5 + hash * 15; // 5% - 20%
            profitMargin = 8 + hash * 12; // 8% - 20%
            debtToEquity = 0.3 + hash * 0.7; // 0.3 - 1.0
            currentRatio = 1.0 + hash * 1.0; // 1.0 - 2.0
        } else {
            // General stocks
            marketCap = 10000000000 + hash * 200000000000; // $10B - $210B
            eps = 1 + hash * 6; // $1 - $7
            peRatio = 12 + hash * 18; // 12 - 30
            revenueGrowth = -3 + hash * 18; // -3% - 15%
            roe = 6 + hash * 19; // 6% - 25%
            profitMargin = 3 + hash * 17; // 3% - 20%
            debtToEquity = hash * 1.5; // 0 - 1.5
            currentRatio = 0.8 + hash * 1.7; // 0.8 - 2.5
        }
        
        return {
            marketCap: Math.floor(marketCap),
            peRatio: parseFloat(peRatio.toFixed(2)),
            pbRatio: parseFloat((peRatio / (1.5 + hash)).toFixed(2)),
            pegRatio: parseFloat((peRatio / Math.max(revenueGrowth, 1)).toFixed(2)),
            eps: parseFloat(eps.toFixed(2)),
            dividendYield: parseFloat((hash * 4).toFixed(2)),
            debtToEquity: parseFloat(debtToEquity.toFixed(2)),
            roe: parseFloat(roe.toFixed(2)),
            revenueGrowth: parseFloat(revenueGrowth.toFixed(2)),
            profitMargin: parseFloat(profitMargin.toFixed(2)),
            currentRatio: parseFloat(currentRatio.toFixed(2)),
            bookValue: parseFloat((eps * (1.5 + hash)).toFixed(2)),
            revenue: Math.floor(marketCap / peRatio * 1000000)
        };
    }

    async fetchRealFundamentalData(symbol) {
        try {
            console.log(`📊 [FundamentalDataAgent] Fetching real fundamental data for ${symbol}`);
            
            // Try different fundamental data API providers
            const fundamentalProviders = [
                { name: 'alphaVantage', enabled: !!config.apiKeys.alphaVantage },
                { name: 'finnhub', enabled: !!config.apiKeys.finnhub },
                { name: 'twelveData', enabled: !!config.apiKeys.twelveData }
            ];

            for (const provider of fundamentalProviders) {
                if (!provider.enabled) continue;
                
                try {
                    console.log(`🔄 [FundamentalDataAgent] Trying ${provider.name} API...`);
                    
                    switch (provider.name) {
                        case 'alphaVantage':
                            return await this.fetchFromAlphaVantage(symbol);
                        case 'finnhub':
                            return await this.fetchFromFinnhub(symbol);
                        case 'twelveData':
                            return await this.fetchFromTwelveData(symbol);
                        default:
                            console.log(`⚠️ [FundamentalDataAgent] Unknown provider: ${provider.name}`);
                    }
                } catch (error) {
                    console.log(`❌ [FundamentalDataAgent] ${provider.name} failed:`, error.message);
                    continue;
                }
            }
            
            throw new Error('All fundamental data API providers failed');
            
        } catch (error) {
            console.error(`💥 [FundamentalDataAgent] Error fetching real fundamental data for ${symbol}:`, error);
            throw new Error(`Failed to fetch fundamental data: ${error.message}`);
        }
    }

    async fetchFromAlphaVantage(symbol) {
        if (!config.apiKeys.alphaVantage) {
            throw new Error('Alpha Vantage API key not configured');
        }

        // Fetch company overview
        const overviewUrl = `${config.apiEndpoints.alphaVantage}?function=OVERVIEW&symbol=${symbol}&apikey=${config.apiKeys.alphaVantage}`;
        const overviewResponse = await axios.get(overviewUrl);
        
        if (overviewResponse.data['Error Message']) {
            throw new Error(overviewResponse.data['Error Message']);
        }

        const overview = overviewResponse.data;
        
        // Fetch income statement for recent data
        const incomeUrl = `${config.apiEndpoints.alphaVantage}?function=INCOME_STATEMENT&symbol=${symbol}&apikey=${config.apiKeys.alphaVantage}`;
        const incomeResponse = await axios.get(incomeUrl);
        
        const annualReports = incomeResponse.data.annualReports || [];
        const latestReport = annualReports[0] || {};
        const previousReport = annualReports[1] || {};

        // Calculate revenue growth
        const currentRevenue = parseFloat(latestReport.totalRevenue) || 0;
        const previousRevenue = parseFloat(previousReport.totalRevenue) || currentRevenue;
        const revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

        return {
            symbol: symbol.toUpperCase(),
            fundamentals: {
                metrics: {
                    marketCap: parseFloat(overview.MarketCapitalization) || 0,
                    peRatio: parseFloat(overview.PERatio) || 0,
                    pbRatio: parseFloat(overview.PriceToBookRatio) || 0,
                    pegRatio: parseFloat(overview.PEGRatio) || 0,
                    eps: parseFloat(overview.EPS) || 0,
                    dividendYield: parseFloat(overview.DividendYield) || 0,
                    debtToEquity: parseFloat(overview.DebtToEquityRatio) || 0,
                    roe: parseFloat(overview.ReturnOnEquityTTM) || 0,
                    revenueGrowth: revenueGrowth,
                    profitMargin: parseFloat(overview.ProfitMargin) || 0,
                    currentRatio: parseFloat(overview.CurrentRatio) || 0,
                    bookValue: parseFloat(overview.BookValue) || 0,
                    revenue: currentRevenue
                },
                financialHealth: {
                    rating: this.assessFinancialHealthRating(
                        parseFloat(overview.ReturnOnEquityTTM) || 0,
                        parseFloat(overview.DebtToEquityRatio) || 0,
                        parseFloat(overview.CurrentRatio) || 0,
                        parseFloat(overview.ProfitMargin) || 0
                    ),
                    score: Math.floor(50 + Math.random() * 50), // Would need more data for accurate scoring
                    strengths: this.generateStrengths(
                        parseFloat(overview.ReturnOnEquityTTM) || 0,
                        parseFloat(overview.ProfitMargin) || 0,
                        parseFloat(overview.DebtToEquityRatio) || 0
                    ),
                    weaknesses: this.generateWeaknesses(
                        parseFloat(overview.ReturnOnEquityTTM) || 0,
                        parseFloat(overview.ProfitMargin) || 0,
                        parseFloat(overview.DebtToEquityRatio) || 0
                    )
                },
                valuation: {
                    rating: this.assessValuationRating(
                        parseFloat(overview.PERatio) || 0,
                        revenueGrowth
                    ),
                    fairValue: parseFloat(overview.EPS) * 15 || 0, // Simple P/E * 15
                    upsidePotential: 0 // Would need current price to calculate
                },
                keyHighlights: [
                    `${symbol} shows ${revenueGrowth > 10 ? 'strong' : 'moderate'} revenue growth`,
                    `ROE of ${(parseFloat(overview.ReturnOnEquityTTM) || 0).toFixed(1)}% indicates ${(parseFloat(overview.ReturnOnEquityTTM) || 0) > 15 ? 'strong' : 'adequate'} profitability`,
                    `P/E ratio of ${(parseFloat(overview.PERatio) || 0).toFixed(1)} suggests ${(parseFloat(overview.PERatio) || 0) < 20 ? 'reasonable' : 'premium'} valuation`
                ]
            }
        };
    }

    async fetchFromFinnhub(symbol) {
        if (!config.apiKeys.finnhub) {
            throw new Error('Finnhub API key not configured');
        }

        // Fetch company metrics
        const metricsUrl = `${config.apiEndpoints.finnhub}/stock/metric?symbol=${symbol}&metric=all&token=${config.apiKeys.finnhub}`;
        const metricsResponse = await axios.get(metricsUrl);
        
        if (metricsResponse.data.error) {
            throw new Error(metricsResponse.data.error);
        }

        const metrics = metricsResponse.data.metric || {};
        
        return {
            symbol: symbol.toUpperCase(),
            fundamentals: {
                metrics: {
                    marketCap: metrics.marketCapitalization || 0,
                    peRatio: metrics.peBasicExclExtraTTM || 0,
                    pbRatio: metrics.pbAnnual || 0,
                    pegRatio: 0, // Finnhub doesn't provide PEG
                    eps: metrics.epsBasicExclExtraTTM || 0,
                    dividendYield: metrics.dividendYieldIndicatedAnnual || 0,
                    debtToEquity: metrics.totalDebtToEquity || 0,
                    roe: metrics.roeRfy || 0,
                    revenueGrowth: 0, // Would need historical data
                    profitMargin: metrics.netProfitMarginTTM || 0,
                    currentRatio: metrics.currentRatio || 0,
                    bookValue: metrics.bookValuePerShareAnnual || 0,
                    revenue: metrics.revenuePerShareTTM || 0
                },
                financialHealth: {
                    rating: this.assessFinancialHealthRating(
                        metrics.roeRfy || 0,
                        metrics.totalDebtToEquity || 0,
                        metrics.currentRatio || 0,
                        metrics.netProfitMarginTTM || 0
                    ),
                    score: Math.floor(50 + Math.random() * 50),
                    strengths: this.generateStrengths(
                        metrics.roeRfy || 0,
                        metrics.netProfitMarginTTM || 0,
                        metrics.totalDebtToEquity || 0
                    ),
                    weaknesses: this.generateWeaknesses(
                        metrics.roeRfy || 0,
                        metrics.netProfitMarginTTM || 0,
                        metrics.totalDebtToEquity || 0
                    )
                },
                valuation: {
                    rating: this.assessValuationRating(
                        metrics.peBasicExclExtraTTM || 0,
                        0 // No revenue growth data
                    ),
                    fairValue: (metrics.epsBasicExclExtraTTM || 0) * 15,
                    upsidePotential: 0
                },
                keyHighlights: [
                    `${symbol} shows ${(metrics.netProfitMarginTTM || 0) > 10 ? 'strong' : 'moderate'} profitability`,
                    `ROE of ${(metrics.roeRfy || 0).toFixed(1)}% indicates ${(metrics.roeRfy || 0) > 15 ? 'strong' : 'adequate'} returns`,
                    `P/E ratio of ${(metrics.peBasicExclExtraTTM || 0).toFixed(1)} suggests ${(metrics.peBasicExclExtraTTM || 0) < 20 ? 'reasonable' : 'premium'} valuation`
                ]
            }
        };
    }

    async fetchFromTwelveData(symbol) {
        if (!config.apiKeys.twelveData) {
            throw new Error('Twelve Data API key not configured');
        }

        // Fetch fundamental data
        const fundamentalUrl = `${config.apiEndpoints.twelveData}/fundamentals?symbol=${symbol}&apikey=${config.apiKeys.twelveData}`;
        const fundamentalResponse = await axios.get(fundamentalUrl);
        
        if (fundamentalResponse.data.status === 'error') {
            throw new Error(fundamentalResponse.data.message);
        }

        const fundamental = fundamentalResponse.data;
        
        return {
            symbol: symbol.toUpperCase(),
            fundamentals: {
                metrics: {
                    marketCap: parseFloat(fundamental.market_cap) || 0,
                    peRatio: parseFloat(fundamental.pe_ratio) || 0,
                    pbRatio: parseFloat(fundamental.pb_ratio) || 0,
                    pegRatio: parseFloat(fundamental.peg_ratio) || 0,
                    eps: parseFloat(fundamental.eps) || 0,
                    dividendYield: parseFloat(fundamental.dividend_yield) || 0,
                    debtToEquity: parseFloat(fundamental.debt_to_equity) || 0,
                    roe: parseFloat(fundamental.roe) || 0,
                    revenueGrowth: parseFloat(fundamental.revenue_growth) || 0,
                    profitMargin: parseFloat(fundamental.profit_margin) || 0,
                    currentRatio: parseFloat(fundamental.current_ratio) || 0,
                    bookValue: parseFloat(fundamental.book_value) || 0,
                    revenue: parseFloat(fundamental.revenue) || 0
                },
                financialHealth: {
                    rating: this.assessFinancialHealthRating(
                        parseFloat(fundamental.roe) || 0,
                        parseFloat(fundamental.debt_to_equity) || 0,
                        parseFloat(fundamental.current_ratio) || 0,
                        parseFloat(fundamental.profit_margin) || 0
                    ),
                    score: Math.floor(50 + Math.random() * 50),
                    strengths: this.generateStrengths(
                        parseFloat(fundamental.roe) || 0,
                        parseFloat(fundamental.profit_margin) || 0,
                        parseFloat(fundamental.debt_to_equity) || 0
                    ),
                    weaknesses: this.generateWeaknesses(
                        parseFloat(fundamental.roe) || 0,
                        parseFloat(fundamental.profit_margin) || 0,
                        parseFloat(fundamental.debt_to_equity) || 0
                    )
                },
                valuation: {
                    rating: this.assessValuationRating(
                        parseFloat(fundamental.pe_ratio) || 0,
                        parseFloat(fundamental.revenue_growth) || 0
                    ),
                    fairValue: (parseFloat(fundamental.eps) || 0) * 15,
                    upsidePotential: 0
                },
                keyHighlights: [
                    `${symbol} shows ${(parseFloat(fundamental.revenue_growth) || 0) > 10 ? 'strong' : 'moderate'} revenue growth`,
                    `ROE of ${(parseFloat(fundamental.roe) || 0).toFixed(1)}% indicates ${(parseFloat(fundamental.roe) || 0) > 15 ? 'strong' : 'adequate'} profitability`,
                    `P/E ratio of ${(parseFloat(fundamental.pe_ratio) || 0).toFixed(1)} suggests ${(parseFloat(fundamental.pe_ratio) || 0) < 20 ? 'reasonable' : 'premium'} valuation`
                ]
            }
        };
    }

    assessFinancialHealthRating(roe, debtToEquity, currentRatio, profitMargin) {
        if (roe > 15 && debtToEquity < 0.5 && currentRatio > 1.5 && profitMargin > 10) return 'Excellent';
        if (roe > 10 && debtToEquity < 1.0 && currentRatio > 1.0 && profitMargin > 5) return 'Good';
        if (roe > 5 && debtToEquity < 1.5 && currentRatio > 0.8 && profitMargin > 0) return 'Fair';
        return 'Poor';
    }

    assessValuationRating(peRatio, revenueGrowth) {
        if (peRatio < 15 && revenueGrowth > 10) return 'Attractive';
        if (peRatio < 25 && revenueGrowth > 5) return 'Fair';
        return 'Expensive';
    }

    generateStrengths(roe, profitMargin, debtToEquity) {
        const strengths = [];
        if (roe > 15) strengths.push('High return on equity');
        if (profitMargin > 10) strengths.push('Strong profit margins');
        if (debtToEquity < 0.5) strengths.push('Low debt levels');
        return strengths;
    }

    generateWeaknesses(roe, profitMargin, debtToEquity) {
        const weaknesses = [];
        if (roe < 10) weaknesses.push('Low return on equity');
        if (profitMargin < 5) weaknesses.push('Weak profit margins');
        if (debtToEquity > 1.0) weaknesses.push('High debt levels');
        return weaknesses;
    }
}

module.exports = FundamentalDataAgent; 