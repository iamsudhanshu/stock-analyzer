const BaseAgent = require('./BaseAgent');
const config = require('../config');
const logger = require('../utils/logger');
const OllamaService = require('../utils/ollama');

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
            // Generate mock fundamental data (in real implementation, this would fetch from financial APIs)
            const mockFundamentalData = this.generateMockFundamentalData(symbol);
            
            if (this.ollamaEnabled) {
                console.log('🧠 [FundamentalDataAgent] Generating LLM-enhanced fundamental analysis...');
                
                // Use LLM to analyze fundamental data and generate insights
                const llmAnalysis = await this.generateLLMFundamentalInsights(symbol, mockFundamentalData);
                
                // Restructure data to match expected format
                return {
                    symbol: mockFundamentalData.symbol,
                    fundamentals: mockFundamentalData.fundamentals,
                    financialMetrics: mockFundamentalData.fundamentals.metrics,
                    valuation: mockFundamentalData.fundamentals.valuation,
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
        // Generate realistic mock fundamental data for demonstration
        const marketCap = 50000000000 + Math.random() * 500000000000;
        const eps = 1 + Math.random() * 10;
        const peRatio = 10 + Math.random() * 30;
        const revenueGrowth = -5 + Math.random() * 25;
        const roe = 5 + Math.random() * 25;
        const profitMargin = 2 + Math.random() * 18;
        const debtToEquity = Math.random() * 2;
        const currentRatio = 0.5 + Math.random() * 2.5;
        
        return {
            symbol: symbol.toUpperCase(),
            fundamentals: {
                metrics: {
                    marketCap: Math.floor(marketCap),
                    peRatio: parseFloat(peRatio.toFixed(2)),
                    pbRatio: parseFloat((peRatio / 2).toFixed(2)), // Price-to-book ratio
                    pegRatio: parseFloat((peRatio / Math.max(revenueGrowth, 1)).toFixed(2)),
                    eps: parseFloat(eps.toFixed(2)),
                    dividendYield: parseFloat((Math.random() * 5).toFixed(2)),
                    debtToEquity: parseFloat(debtToEquity.toFixed(2)),
                    roe: parseFloat(roe.toFixed(2)),
                    revenueGrowth: parseFloat(revenueGrowth.toFixed(2)),
                    profitMargin: parseFloat(profitMargin.toFixed(2)),
                    currentRatio: parseFloat(currentRatio.toFixed(2)),
                    bookValue: parseFloat((eps * 2).toFixed(2)),
                    revenue: Math.floor(marketCap / peRatio * 1000000)
                },
                financialHealth: {
                    rating: this.assessFinancialHealthRating(roe, debtToEquity, currentRatio, profitMargin),
                    score: Math.floor(50 + Math.random() * 50),
                    strengths: this.generateStrengths(roe, profitMargin, debtToEquity),
                    weaknesses: this.generateWeaknesses(roe, profitMargin, debtToEquity)
                },
                valuation: {
                    rating: this.assessValuationRating(peRatio, revenueGrowth),
                    fairValue: parseFloat((eps * 15).toFixed(2)),
                    upsidePotential: parseFloat((Math.random() * 50 - 10).toFixed(2))
                },
                keyHighlights: [
                    `${symbol} shows ${revenueGrowth > 10 ? 'strong' : 'moderate'} revenue growth`,
                    `ROE of ${roe.toFixed(1)}% indicates ${roe > 15 ? 'strong' : 'adequate'} profitability`,
                    `P/E ratio of ${peRatio.toFixed(1)} suggests ${peRatio < 20 ? 'reasonable' : 'premium'} valuation`
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