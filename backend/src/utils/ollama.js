const axios = require('axios');
const logger = require('./logger');

class OllamaService {
    constructor(config = {}) {
        this.baseUrl = config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        this.defaultModel = config.model || process.env.OLLAMA_MODEL || 'llama3.1:8b';
        this.timeout = config.timeout || 300000; // 5 minutes for comprehensive analysis
        this.maxRetries = config.maxRetries || 3;
        
        logger.info('OllamaService initialized', {
            baseUrl: this.baseUrl,
            defaultModel: this.defaultModel
        });
    }

    /**
     * Check if Ollama is running and accessible
     */
    async isAvailable() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/tags`, {
                timeout: 5000
            });
            return response.status === 200;
        } catch (error) {
            logger.warn('Ollama not available', { error: error.message });
            return false;
        }
    }

    /**
     * Get list of available models
     */
    async getModels() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/tags`);
            return response.data.models || [];
        } catch (error) {
            logger.error('Failed to get Ollama models', { error: error.message });
            return [];
        }
    }

    /**
     * Generate text completion using Ollama
     */
    async generate(prompt, options = {}) {
        const model = options.model || this.defaultModel;
        const temperature = options.temperature || 0.7;
        const maxTokens = options.maxTokens || 2000;

        const payload = {
            model,
            prompt,
            stream: false,
            options: {
                temperature,
                num_predict: maxTokens,
                top_p: options.topP || 0.9,
                top_k: options.topK || 40,
                repeat_penalty: options.repeatPenalty || 1.1
            }
        };

        let lastError;
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                logger.debug('Ollama generation request', { 
                    model, 
                    promptLength: prompt.length,
                    attempt 
                });

                const response = await axios.post(
                    `${this.baseUrl}/api/generate`,
                    payload,
                    { 
                        timeout: this.timeout,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );

                if (response.data && response.data.response) {
                    logger.debug('Ollama generation successful', {
                        model,
                        responseLength: response.data.response.length,
                        totalDuration: response.data.total_duration
                    });

                    return {
                        text: response.data.response.trim(),
                        model: response.data.model,
                        totalDuration: response.data.total_duration,
                        evalCount: response.data.eval_count,
                        evalDuration: response.data.eval_duration
                    };
                }

                throw new Error('Invalid response format from Ollama');

            } catch (error) {
                lastError = error;
                logger.warn(`Ollama generation attempt ${attempt} failed`, {
                    model,
                    error: error.message,
                    attempt,
                    maxRetries: this.maxRetries
                });

                if (attempt < this.maxRetries) {
                    await this.delay(1000 * attempt); // Exponential backoff
                }
            }
        }

        logger.error('Ollama generation failed after all retries', {
            model,
            error: lastError.message,
            maxRetries: this.maxRetries
        });

        throw new Error(`Ollama generation failed: ${lastError.message}`);
    }

    /**
     * Analyze sentiment using LLM
     */
    async analyzeSentiment(text, context = '') {
        const prompt = `Analyze the sentiment of the following financial text and provide a detailed assessment.

${context ? `Context: ${context}\n` : ''}
Text to analyze: "${text}"

Please provide:
1. Overall sentiment (bullish, bearish, neutral)
2. Confidence score (0-1)
3. Key sentiment indicators
4. Potential market impact
5. Brief reasoning

Format as JSON:
{
    "sentiment": "bullish|bearish|neutral",
    "confidence": 0.85,
    "score": 0.65,
    "indicators": ["positive earnings", "strong guidance"],
    "impact": "moderate positive",
    "reasoning": "Brief explanation"
}`;

        try {
            const response = await this.generate(prompt, {
                temperature: 0.3,
                maxTokens: 1000
            });

            return this.parseJsonResponse(response.text, {
                sentiment: 'neutral',
                confidence: 0.5,
                score: 0.0,
                indicators: [],
                impact: 'minimal',
                reasoning: 'Unable to analyze sentiment'
            });
        } catch (error) {
            logger.error('Sentiment analysis failed', { error: error.message });
            return {
                sentiment: 'neutral',
                confidence: 0.0,
                score: 0.0,
                indicators: [],
                impact: 'minimal',
                reasoning: 'LLM analysis unavailable'
            };
        }
    }

    /**
     * Generate investment recommendations
     */
    async generateInvestmentRecommendation(analysisData) {
        const symbol = analysisData.symbol || 'Unknown';
        const currentPrice = analysisData.technical?.currentPrice?.price || 0;
        const priceChange = analysisData.technical?.currentPrice?.changePercent || 0;
        const marketContext = analysisData.marketContext || {};
        const recentNews = analysisData.sentiment?.recentNews || [];

        const prompt = `As a senior institutional equity analyst with 15+ years of experience, provide a comprehensive investment report for ${symbol}:

═══════════════════════════════════════════════════════════════════════════════
📊 CURRENT MARKET SNAPSHOT FOR ${symbol}
═══════════════════════════════════════════════════════════════════════════════

**STOCK DETAILS:**
• Symbol: ${symbol}
• Current Price: $${currentPrice}
• Today's Performance: ${priceChange > 0 ? '+' : ''}${priceChange}% (${analysisData.technical?.trend || 'neutral'} trend)
• Analysis Date: ${marketContext.currentDate || new Date().toLocaleDateString()}
• Market Conditions: ${marketContext.marketConditions || 'Regular trading'}

**TECHNICAL ANALYSIS:**
• Technical Strength: ${analysisData.technical?.score || 'N/A'}/100
• RSI: ${this.getIndicatorValue(analysisData.technical?.indicators?.rsi)} (${this.interpretRSI(analysisData.technical?.indicators?.rsi)})
• Price vs 20-day SMA: ${this.getIndicatorValue(analysisData.technical?.indicators?.sma?.sma20) ? 
    `$${this.getIndicatorValue(analysisData.technical?.indicators?.sma?.sma20)} (${currentPrice > this.getIndicatorValue(analysisData.technical?.indicators?.sma?.sma20) ? 'Above' : 'Below'})` : 'N/A'}
• Volume Activity: ${analysisData.technical?.volumeAnalysis?.volumeRatio || 1}x normal volume
• Support Level: $${analysisData.technical?.supportResistance?.support || 'N/A'}
• Resistance Level: $${analysisData.technical?.supportResistance?.resistance || 'N/A'}

**SENTIMENT & NEWS ANALYSIS:**
• Sentiment Score: ${analysisData.sentiment?.score || 'N/A'}/100
• News Sentiment: ${analysisData.sentiment?.newsSentiment || 'N/A'}
• Social Sentiment: ${analysisData.sentiment?.socialSentiment || 'N/A'}

**RECENT ${symbol} HEADLINES:**
${recentNews.slice(0, 5).map((article, idx) => 
    `${idx + 1}. "${article.title || article.headline || 'News item'}" (${article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : 'Recent'})`
).join('\n')}

**KEY THEMES:** ${analysisData.sentiment?.keyThemes?.join(', ') || 'No specific themes identified'}

**SECTOR CONTEXT:** ${marketContext.sectorContext || `${symbol} individual analysis`}

═══════════════════════════════════════════════════════════════════════════════
📋 INVESTMENT ANALYSIS REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════

**CRITICAL INSTRUCTIONS:**
1. **BE STOCK-SPECIFIC**: Every insight must be unique to ${symbol} at current price levels
2. **USE ACTUAL DATA**: Reference the specific price of $${currentPrice}, technical levels, and recent news
3. **CONSIDER TIMING**: Factor in current date (${marketContext.currentDate || new Date().toLocaleDateString()}) and market conditions
4. **BE ACTIONABLE**: Provide specific price targets, stop-loss levels, and concrete actions
5. **EXPLAIN REASONING**: Detail WHY these recommendations apply specifically to ${symbol}

**ANALYSIS DEPTH REQUIRED:**
• **Investment Thesis**: What makes ${symbol} unique at $${currentPrice}?
• **Technical Setup**: How do current levels create opportunity/risk for ${symbol}?
• **News Impact**: How do recent headlines specifically affect ${symbol}'s outlook?
• **Sector Positioning**: Where does ${symbol} stand in current market environment?
• **Risk Assessment**: What are the specific risks for ${symbol} at these levels?

═══════════════════════════════════════════════════════════════════════════════
📊 REQUIRED OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Provide comprehensive recommendations in this EXACT JSON structure:

{
    "executiveSummary": "2-3 sentence executive summary specifically about ${symbol} at $${currentPrice} - be specific to current conditions and price level",
    
    "overallRating": "STRONG_BUY|BUY|HOLD|SELL|STRONG_SELL",
    "overallConfidence": 0.85,
    
    "shortTerm": {
        "recommendation": "STRONG_BUY|BUY|HOLD|SELL|STRONG_SELL",
        "confidence": 0.85,
        "reasoning": "Specific 1-4 week outlook for ${symbol} considering current price $${currentPrice}, technical setup, and immediate catalysts",
        "entryStrategy": "Detailed entry strategy with specific price levels for ${symbol}",
        "priceTargets": {
            "primary": 000.00,
            "secondary": 000.00,
            "rationale": "Why these specific price targets make sense for ${symbol} based on technical/fundamental analysis"
        },
        "stopLoss": {
            "level": 000.00,
            "reasoning": "Risk management rationale specific to ${symbol}'s volatility and support levels"
        },
        "catalysts": ["Specific near-term catalyst 1 for ${symbol}", "Specific near-term catalyst 2 for ${symbol}"],
        "risks": ["Specific short-term risk 1 for ${symbol}", "Specific short-term risk 2 for ${symbol}"],
        "positionSizing": "conservative|normal|aggressive",
        "timeframe": "1-4 weeks",
        "actionItems": ["Specific action 1 for ${symbol}", "Specific action 2 for ${symbol}"]
    },
    
    "midTerm": {
        "recommendation": "STRONG_BUY|BUY|HOLD|SELL|STRONG_SELL",
        "confidence": 0.80,
        "reasoning": "Detailed 1-6 month investment thesis for ${symbol} considering sector trends and company fundamentals",
        "investmentThesis": "Core fundamental reasons for position in ${symbol}",
        "priceTargets": {
            "conservative": 000.00,
            "optimistic": 000.00,
            "rationale": "Multiple scenario pricing for ${symbol} based on business fundamentals"
        },
        "stopLoss": {
            "level": 000.00,
            "reasoning": "Risk management for longer hold period in ${symbol}"
        },
        "keyMilestones": ["Specific milestone 1 for ${symbol}", "Specific milestone 2 for ${symbol}"],
        "fundamentalFactors": ["Key fundamental 1 for ${symbol}", "Key fundamental 2 for ${symbol}"],
        "technicalSetup": "How current technical picture supports mid-term thesis for ${symbol}",
        "marketEnvironmentImpact": "How broader market trends specifically affect ${symbol}",
        "actionItems": ["Specific mid-term action 1", "Specific mid-term action 2"]
    },
    
    "longTerm": {
        "recommendation": "STRONG_BUY|BUY|HOLD|SELL|STRONG_SELL",
        "confidence": 0.75,
        "reasoning": "Strategic 6+ month investment case for ${symbol}",
        "strategicThesis": "Long-term value proposition specific to ${symbol}",
        "fairValueAssessment": {
            "intrinsicValue": 000.00,
            "currentDiscount": "X%",
            "methodology": "Valuation approach used for ${symbol}"
        },
        "growthDrivers": ["Specific growth driver 1 for ${symbol}", "Specific growth driver 2 for ${symbol}"],
        "competitivePosition": "How ${symbol} competes in its market/sector",
        "portfolioRole": "How ${symbol} fits in diversified portfolio",
        "riskFactors": ["Long-term risk 1 for ${symbol}", "Long-term risk 2 for ${symbol}"],
        "actionItems": ["Long-term action 1", "Long-term action 2"]
    },
    
    "riskAnalysis": {
        "overallRiskLevel": "LOW|MEDIUM|HIGH",
        "primaryRisks": [
            {
                "risk": "Specific risk to ${symbol}",
                "impact": "HIGH|MEDIUM|LOW",
                "probability": "HIGH|MEDIUM|LOW",
                "mitigation": "Specific mitigation strategy for ${symbol}"
            }
        ],
        "stressScenarios": {
            "marketDownturn": "How ${symbol} performs in 20% market decline",
            "sectorRotation": "Impact of rotation away from ${symbol}'s sector",
            "companySpecific": "Company-specific downside scenario for ${symbol}"
        },
        "correlationRisk": "How ${symbol} correlates with market/sector movements"
    },
    
    "technicalAnalysis": {
        "chartPattern": "Current technical pattern for ${symbol} and implications",
        "momentum": "Momentum indicator analysis for ${symbol}",
        "volumeAnalysis": "Volume trend significance for ${symbol}",
        "supportResistance": {
            "support": [000.00, 000.00],
            "resistance": [000.00, 000.00]
        },
        "technicalRating": 7.5,
        "technicalRationale": "Why this technical rating for ${symbol}"
    },
    
    "marketTiming": {
        "optimalEntryWindow": "Best timing for ${symbol} position entry",
        "phasedEntryStrategy": "How to build ${symbol} position over time",
        "exitStrategy": "When and how to take profits/cut losses in ${symbol}",
        "marketConditions": "How current market environment affects ${symbol}",
        "sectorRotation": "${symbol}'s position in sector rotation cycle"
    },
    
    "scenarioAnalysis": {
        "bullCase": {
            "probability": 0.30,
            "priceTarget": 000.00,
            "description": "Maximum upside scenario for ${symbol} and key drivers"
        },
        "baseCase": {
            "probability": 0.40,
            "priceTarget": 000.00,
            "description": "Most likely scenario for ${symbol}"
        },
        "bearCase": {
            "probability": 0.30,
            "priceTarget": 000.00,
            "description": "Downside scenario for ${symbol} and triggers"
        }
    },
    
    "monitoringMetrics": [
        "Specific metric 1 to track for ${symbol}",
        "Specific metric 2 to track for ${symbol}",
        "Specific metric 3 to track for ${symbol}",
        "Specific metric 4 to track for ${symbol}",
        "Specific metric 5 to track for ${symbol}"
    ],
    
    "keyInsights": [
        "Most important unique insight about ${symbol}",
        "Critical factor that could change ${symbol} thesis", 
        "Unique opportunity/risk not obvious to other investors in ${symbol}"
    ],
    
    "reportGenerated": "${new Date().toISOString()}",
    "analystNote": "Additional context specific to ${symbol} and current market conditions"
}

═══════════════════════════════════════════════════════════════════════════════
⚠️  CRITICAL REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════

• **NO GENERIC STATEMENTS**: Every statement must be specific to ${symbol}
• **USE ACTUAL NUMBERS**: Reference $${currentPrice} and specific technical levels
• **CURRENT RELEVANCE**: Consider today's date and recent news for ${symbol}
• **ACTIONABLE INSIGHTS**: Provide concrete, tradeable recommendations
• **STOCK-SPECIFIC RISKS**: Focus on risks unique to ${symbol}, not general market risks
• **PRICE PRECISION**: All price targets must be realistic relative to $${currentPrice}

Generate this analysis as if you are providing it to institutional investors who need ${symbol}-specific insights they cannot get from generic market analysis.`;

        try {
            const response = await this.generate(prompt, {
                temperature: 0.4,
                maxTokens: 4000
            });

            return this.parseJsonResponse(response.text, {
                executiveSummary: `Comprehensive analysis unavailable for ${symbol}`,
                overallRating: 'HOLD',
                overallConfidence: 0.5,
                shortTerm: { 
                    recommendation: 'HOLD', 
                    confidence: 0.5, 
                    reasoning: `Insufficient data for short-term analysis of ${symbol}`,
                    actionItems: [`Monitor ${symbol} technical indicators`, `Wait for better entry in ${symbol}`]
                },
                midTerm: { 
                    recommendation: 'HOLD', 
                    confidence: 0.5, 
                    reasoning: `Insufficient data for mid-term analysis of ${symbol}`,
                    actionItems: [`Review ${symbol} quarterly earnings`, `Assess ${symbol} sector trends`]
                },
                longTerm: { 
                    recommendation: 'HOLD', 
                    confidence: 0.5, 
                    reasoning: `Insufficient data for long-term analysis of ${symbol}`,
                    actionItems: [`Conduct ${symbol} fundamental analysis`, `Monitor ${symbol} competitive position`]
                },
                riskAnalysis: {
                    overallRiskLevel: 'MEDIUM',
                    primaryRisks: [],
                    stressScenarios: {},
                    correlationRisk: `Unable to assess ${symbol} correlation risk`
                },
                technicalAnalysis: {
                    chartPattern: `Pattern analysis unavailable for ${symbol}`,
                    momentum: `Momentum analysis unavailable for ${symbol}`,
                    volumeAnalysis: `Volume analysis unavailable for ${symbol}`,
                    supportResistance: { support: [], resistance: [] },
                    technicalRating: 5.0,
                    technicalRationale: `Insufficient technical data for ${symbol}`
                },
                marketTiming: {
                    optimalEntryWindow: `Unable to determine optimal timing for ${symbol}`,
                    phasedEntryStrategy: `Standard dollar-cost averaging recommended for ${symbol}`,
                    exitStrategy: `Monitor ${symbol} for technical breakdown`,
                    marketConditions: `Assess broader market impact on ${symbol}`,
                    sectorRotation: `Monitor ${symbol} sector rotation trends`
                },
                scenarioAnalysis: {
                    bullCase: { probability: 0.33, priceTarget: null, description: `Bull case analysis unavailable for ${symbol}` },
                    baseCase: { probability: 0.34, priceTarget: null, description: `Base case analysis unavailable for ${symbol}` },
                    bearCase: { probability: 0.33, priceTarget: null, description: `Bear case analysis unavailable for ${symbol}` }
                },
                monitoringMetrics: [`${symbol} technical indicators`, `${symbol} volume trends`, `${symbol} news sentiment`],
                keyInsights: [`Enhanced analysis not available for ${symbol}`],
                reportGenerated: new Date().toISOString(),
                analystNote: `LLM analysis completed for ${symbol}`
            });
        } catch (error) {
            logger.error('Investment recommendation generation failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Analyze economic indicators with LLM context
     */
    async analyzeEconomicContext(economicData) {
        const prompt = `Analyze the current economic context and its impact on stock market investments:

ECONOMIC INDICATORS:
${Object.entries(economicData).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

Provide analysis on:
1. Current economic regime classification
2. Market implications
3. Sector recommendations
4. Risk factors
5. Timeline for potential changes

Format as JSON:
{
    "regime": "expansion|contraction|neutral",
    "confidence": 0.85,
    "marketImplications": "Detailed analysis",
    "sectorRecommendations": {
        "favored": ["tech", "healthcare"],
        "avoid": ["utilities"]
    },
    "risks": ["inflation", "recession"],
    "outlook": "3-6 month outlook",
    "reasoning": "Economic analysis explanation"
}`;

        try {
            const response = await this.generate(prompt, {
                temperature: 0.3,
                maxTokens: 1500
            });

            return this.parseJsonResponse(response.text, {
                regime: 'neutral',
                confidence: 0.5,
                marketImplications: 'Unable to determine',
                sectorRecommendations: { favored: [], avoid: [] },
                risks: [],
                outlook: 'Uncertain',
                reasoning: 'Economic analysis unavailable'
            });
        } catch (error) {
            logger.error('Economic analysis failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Generate technical analysis insights
     */
    async analyzeTechnicalPatterns(technicalData) {
        const prompt = `Analyze the following technical indicators and provide insights:

TECHNICAL INDICATORS:
${Object.entries(technicalData).map(([key, value]) => `- ${key}: ${JSON.stringify(value)}`).join('\n')}

Identify:
1. Chart patterns
2. Support/resistance levels
3. Momentum indicators
4. Volume analysis
5. Entry/exit points

Format as JSON:
{
    "patterns": ["bullish engulfing", "ascending triangle"],
    "supportLevel": 145.50,
    "resistanceLevel": 152.75,
    "momentum": "bullish|bearish|neutral",
    "volumeAnalysis": "Increasing volume confirms trend",
    "entryPoints": [148.25, 150.00],
    "exitPoints": [155.00, 160.00],
    "confidence": 0.75,
    "reasoning": "Technical analysis explanation"
}`;

        try {
            const response = await this.generate(prompt, {
                temperature: 0.3,
                maxTokens: 1200
            });

            return this.parseJsonResponse(response.text, {
                patterns: [],
                supportLevel: null,
                resistanceLevel: null,
                momentum: 'neutral',
                volumeAnalysis: 'Insufficient data',
                entryPoints: [],
                exitPoints: [],
                confidence: 0.5,
                reasoning: 'Technical analysis unavailable'
            });
        } catch (error) {
            logger.error('Technical analysis failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Parse JSON response with fallback
     */
    parseJsonResponse(text, fallback) {
        try {
            // Extract JSON from response (handle cases where LLM adds extra text)
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            // Try parsing the entire response
            return JSON.parse(text);
        } catch (error) {
            logger.warn('Failed to parse JSON response, using fallback', {
                error: error.message,
                response: text.substring(0, 200)
            });
            return fallback;
        }
    }

    /**
     * Utility method for delays
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get model info
     */
    async getModelInfo(modelName = null) {
        const model = modelName || this.defaultModel;
        try {
            const response = await axios.post(`${this.baseUrl}/api/show`, {
                name: model
            });
            return response.data;
        } catch (error) {
            logger.error('Failed to get model info', { 
                model, 
                error: error.message 
            });
            return null;
        }
    }

    /**
     * Pull/download a model
     */
    async pullModel(modelName) {
        try {
            logger.info('Starting model pull', { model: modelName });
            
            const response = await axios.post(`${this.baseUrl}/api/pull`, {
                name: modelName
            }, {
                timeout: 300000 // 5 minutes for model download
            });

            logger.info('Model pull completed', { 
                model: modelName,
                status: response.data.status 
            });
            
            return response.data;
        } catch (error) {
            logger.error('Model pull failed', { 
                model: modelName, 
                error: error.message 
            });
            throw error;
        }
    }

    // **HELPER METHODS FOR PROMPT ENHANCEMENT**
    getIndicatorValue(indicatorArray) {
        if (!indicatorArray || indicatorArray.length === 0) return null;
        const latest = indicatorArray[indicatorArray.length - 1];
        return typeof latest === 'number' ? latest.toFixed(2) : latest;
    }

    interpretRSI(rsiArray) {
        const rsi = this.getIndicatorValue(rsiArray);
        if (!rsi) return 'N/A';
        const rsiNum = parseFloat(rsi);
        if (rsiNum > 70) return 'Overbought';
        if (rsiNum < 30) return 'Oversold';
        if (rsiNum >= 50) return 'Bullish momentum';
        return 'Bearish momentum';
    }
}

module.exports = OllamaService; 