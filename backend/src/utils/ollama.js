const axios = require('axios');
const logger = require('./logger');

class OllamaService {
    constructor(config = {}) {
        this.baseUrl = config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        this.defaultModel = config.model || process.env.OLLAMA_MODEL || 'llama3.1:8b';
        this.timeout = config.timeout || 30000;
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
        const prompt = `As an expert financial analyst, provide investment recommendations based on the following comprehensive stock analysis:

TECHNICAL ANALYSIS:
- Technical Score: ${analysisData.technical?.score || 'N/A'}
- Key Indicators: ${JSON.stringify(analysisData.technical?.indicators || {})}
- Price Trend: ${analysisData.technical?.trend || 'N/A'}

SENTIMENT ANALYSIS:
- Sentiment Score: ${analysisData.sentiment?.score || 'N/A'}
- News Sentiment: ${analysisData.sentiment?.newsSentiment || 'N/A'}
- Social Sentiment: ${analysisData.sentiment?.socialSentiment || 'N/A'}

ECONOMIC CONTEXT:
- Economic Regime: ${analysisData.economic?.regime || 'N/A'}
- Key Indicators: ${JSON.stringify(analysisData.economic?.indicators || {})}

Please provide detailed recommendations for:
1. Short-term (1-4 weeks)
2. Mid-term (1-6 months)
3. Long-term (6+ months)

Format as JSON:
{
    "shortTerm": {
        "recommendation": "buy|sell|hold",
        "confidence": 0.85,
        "reasoning": "Detailed explanation",
        "risks": ["risk1", "risk2"],
        "targetPrice": 150.00,
        "timeframe": "2-4 weeks"
    },
    "midTerm": { ... },
    "longTerm": { ... },
    "overallAssessment": "Comprehensive market outlook",
    "keyFactors": ["factor1", "factor2"],
    "riskLevel": "low|medium|high"
}`;

        try {
            const response = await this.generate(prompt, {
                temperature: 0.4,
                maxTokens: 2500
            });

            return this.parseJsonResponse(response.text, {
                shortTerm: { recommendation: 'hold', confidence: 0.5, reasoning: 'Insufficient data' },
                midTerm: { recommendation: 'hold', confidence: 0.5, reasoning: 'Insufficient data' },
                longTerm: { recommendation: 'hold', confidence: 0.5, reasoning: 'Insufficient data' },
                overallAssessment: 'Analysis unavailable',
                keyFactors: [],
                riskLevel: 'medium'
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
}

module.exports = OllamaService; 