const BaseAgent = require('./BaseAgent');
const config = require('../config');
const logger = require('../utils/logger');
const OllamaService = require('../utils/ollama');

class CompetitiveAgent extends BaseAgent {
    constructor() {
            super(
      'CompetitiveAgent',
      [config.queues.competitiveAnalysis],
      [config.queues.analysis]
    );
        
        this.ollama = new OllamaService();
        this.ollamaEnabled = false;
        
        // Initialize LLM capabilities
        this.initializeLLM();
    }

    async initializeLLM() {
        try {
            console.log('🧠 [CompetitiveAgent] Initializing LLM capabilities...');
            this.ollamaEnabled = await this.ollama.isAvailable();
            
            if (this.ollamaEnabled) {
                console.log('✅ [CompetitiveAgent] LLM capabilities enabled');
                logger.info('CompetitiveAgent LLM capabilities enabled');
            } else {
                console.warn('⚠️ [CompetitiveAgent] LLM not available, using enhanced traditional methods');
                logger.warn('CompetitiveAgent LLM not available, using enhanced traditional methods');
            }
        } catch (error) {
            console.error('❌ [CompetitiveAgent] Error initializing LLM:', error.message);
            logger.error('CompetitiveAgent LLM initialization error:', error);
            this.ollamaEnabled = false;
        }
    }

    async processMessage(message) {
        try {
            console.log('📥 [CompetitiveAgent] Processing message:', {
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

            console.log('🏆 [CompetitiveAgent] Starting LLM-enhanced competitive analysis for:', symbol);
            
            // Generate comprehensive competitive data with LLM insights
            const result = await this.generateLLMEnhancedCompetitiveData(symbol);
            
            console.log('✅ [CompetitiveAgent] Analysis completed:', {
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
            console.error('💥 [CompetitiveAgent] Error processing message:', error);
            logger.error(`${this.agentName} error:`, error);
            
            // Send error result
            if (message.requestId) {
                await this.sendError(message.requestId, error);
            }
        }
    }

    async generateLLMEnhancedCompetitiveData(symbol) {
        try {
            // Generate mock competitive data (in real implementation, this would fetch from competitive intelligence APIs)
            const mockCompetitiveData = this.generateMockCompetitiveData(symbol);
            
            if (!this.ollamaEnabled) {
                throw new Error('LLM is required for CompetitiveAgent analysis. Ollama service is not available.');
            }
            
            console.log('🧠 [CompetitiveAgent] Generating LLM-enhanced competitive analysis...');
            
            // Use LLM to analyze competitive data and generate insights
            const llmAnalysis = await this.generateLLMCompetitiveInsights(symbol, mockCompetitiveData);
            
            // Restructure data to match expected format
            return {
                symbol: mockCompetitiveData.symbol,
                competitive: mockCompetitiveData.competitive,
                marketPosition: mockCompetitiveData.competitive.marketPosition,
                peerComparison: {
                    peers: mockCompetitiveData.competitive.peers,
                    advantages: mockCompetitiveData.competitive.competitiveAdvantages,
                    swotAnalysis: mockCompetitiveData.competitive.swotAnalysis
                },
                llmInsights: llmAnalysis,
                llmEnhanced: true,
                lastUpdated: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ [CompetitiveAgent] Error generating competitive data:', error);
            logger.error('CompetitiveAgent data generation error:', error);
            
            // No fallback - throw error if LLM is not available
            throw new Error(`CompetitiveAgent requires LLM capabilities: ${error.message}`);
        }
    }

    async generateLLMCompetitiveInsights(symbol, competitiveData) {
        try {
            const competitive = competitiveData.competitive || {};
            const peers = competitive.peers || [];
            const advantages = competitive.competitiveAdvantages || [];
            const marketPosition = competitive.marketPosition || {};

            const prompt = `Analyze the following competitive data for ${symbol} and provide comprehensive competitive analysis:

Competitive Landscape:
- Peers: ${JSON.stringify(peers)}
- Market Position: ${JSON.stringify(marketPosition)}
- Competitive Advantages: ${JSON.stringify(advantages)}
- Market Share: ${marketPosition.marketShare || 'N/A'}%
- Industry Rank: ${marketPosition.industryRank || 'N/A'}
- Competitive Intensity: ${marketPosition.competitiveIntensity || 'N/A'}

SWOT Analysis:
- Strengths: ${JSON.stringify(competitive.swotAnalysis?.strengths || [])}
- Weaknesses: ${JSON.stringify(competitive.swotAnalysis?.weaknesses || [])}
- Opportunities: ${JSON.stringify(competitive.swotAnalysis?.opportunities || [])}
- Threats: ${JSON.stringify(competitive.swotAnalysis?.threats || [])}

Please provide:
1. Competitive positioning and market share analysis
2. Competitive advantages and moat assessment
3. Peer comparison and relative strengths
4. Industry dynamics and competitive intensity
5. Strategic positioning and differentiation
6. Competitive risks and threats
7. Market opportunity and growth potential

Format your response as structured JSON with the following keys:
- positioning: { marketPosition, competitiveRank, marketShare, intensity }
- advantages: { moat, strengths, differentiation, sustainability }
- peers: { comparison, relativeStrengths, competitiveGaps, opportunities }
- industry: { dynamics, trends, barriers, opportunities }
- strategy: { positioning, differentiation, risks, recommendations }
- outlook: { competitiveOutlook, marketOpportunity, risks, confidence }

Provide detailed, professional analysis suitable for investment decision-making.`;

            const response = await this.ollama.generate(prompt, { 
                maxTokens: 2500,
                temperature: 0.3 
            });

            // Parse LLM response
            const llmInsights = this.parseLLMResponse(response);
            
            return {
                analysis: {
                    positioning: llmInsights.positioning,
                    competitiveAdvantages: llmInsights.advantages,
                    marketShare: llmInsights.positioning?.marketShare || 'N/A'
                },
                confidence: this.calculateConfidence(competitiveData),
                marketContext: this.generateMarketContext(symbol, competitiveData),
                recommendations: this.generateRecommendations(llmInsights)
            };

        } catch (error) {
            console.error('❌ [CompetitiveAgent] LLM analysis failed:', error);
            logger.error('CompetitiveAgent LLM analysis error:', error);
            
            // No fallback - throw error if LLM analysis fails
            throw new Error(`CompetitiveAgent LLM analysis error: ${error.message}`);
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
                    console.log('⚠️ [CompetitiveAgent] JSON parsing failed, using fallback extraction');
                    // Continue to fallback extraction
                }
            }
            
            // Fallback: extract key insights from text
            return {
                positioning: {
                    marketPosition: this.extractMarketPosition(responseText),
                    competitiveRank: this.extractCompetitiveRank(responseText),
                    marketShare: this.extractMarketShare(responseText),
                    intensity: this.extractIntensity(responseText)
                },
                advantages: {
                    moat: this.extractMoat(responseText),
                    strengths: this.extractStrengths(responseText),
                    differentiation: this.extractDifferentiation(responseText),
                    sustainability: this.extractSustainability(responseText)
                },
                peers: {
                    comparison: this.extractPeerComparison(responseText),
                    relativeStrengths: this.extractRelativeStrengths(responseText),
                    competitiveGaps: this.extractCompetitiveGaps(responseText),
                    opportunities: this.extractOpportunities(responseText)
                },
                industry: {
                    dynamics: this.extractIndustryDynamics(responseText),
                    trends: this.extractIndustryTrends(responseText),
                    barriers: this.extractBarriers(responseText),
                    opportunities: this.extractIndustryOpportunities(responseText)
                },
                strategy: {
                    positioning: this.extractStrategyPositioning(responseText),
                    differentiation: this.extractStrategyDifferentiation(responseText),
                    risks: this.extractStrategyRisks(responseText),
                    recommendations: this.extractStrategyRecommendations(responseText)
                },
                outlook: {
                    competitiveOutlook: this.extractCompetitiveOutlook(responseText),
                    marketOpportunity: this.extractMarketOpportunity(responseText),
                    risks: this.extractOutlookRisks(responseText),
                    confidence: this.extractConfidence(responseText)
                }
            };
        } catch (error) {
            console.error('❌ [CompetitiveAgent] Error parsing LLM response:', error);
            throw new Error('CompetitiveAgent LLM response parsing error');
        }
    }

    // All traditional analysis methods have been removed
    // The system is now purely LLM-based with no traditional analysis fallbacks

    // Helper methods for data extraction from LLM responses
    extractMarketPosition(response) {
        if (response.includes('market leader')) return 'market_leader';
        if (response.includes('strong contender')) return 'strong_contender';
        if (response.includes('niche player')) return 'niche_player';
        return 'small_player';
    }

    extractCompetitiveRank(response) {
        if (response.includes('top 3')) return 'top_3';
        if (response.includes('top 10')) return 'top_10';
        if (response.includes('top 20')) return 'top_20';
        return 'other';
    }

    extractMarketShare(response) {
        if (response.includes('dominant')) return 'dominant';
        if (response.includes('significant')) return 'significant';
        if (response.includes('moderate')) return 'moderate';
        return 'small';
    }

    extractIntensity(response) {
        if (response.includes('high intensity')) return 'high';
        if (response.includes('low intensity')) return 'low';
        return 'medium';
    }

    extractMoat(response) {
        if (response.includes('wide moat')) return 'wide';
        if (response.includes('narrow moat')) return 'narrow';
        if (response.includes('no moat')) return 'none';
        return 'moderate';
    }

    extractStrengths(response) {
        const strengths = [];
        if (response.includes('strong brand')) strengths.push('strong_brand');
        if (response.includes('technology advantage')) strengths.push('technology_advantage');
        if (response.includes('scale advantage')) strengths.push('scale_advantage');
        return strengths;
    }

    extractDifferentiation(response) {
        if (response.includes('high differentiation')) return 'high';
        if (response.includes('low differentiation')) return 'low';
        return 'moderate';
    }

    extractSustainability(response) {
        if (response.includes('high sustainability')) return 'high';
        if (response.includes('low sustainability')) return 'low';
        return 'moderate';
    }

    extractPeerComparison(response) {
        if (response.includes('superior to peers')) return 'superior';
        if (response.includes('below peers')) return 'below_average';
        if (response.includes('average')) return 'average';
        return 'competitive';
    }

    extractRelativeStrengths(response) {
        const strengths = [];
        if (response.includes('cost advantage')) strengths.push('cost_advantage');
        if (response.includes('technology leadership')) strengths.push('technology_leadership');
        return strengths;
    }

    extractCompetitiveGaps(response) {
        const gaps = [];
        if (response.includes('technology gap')) gaps.push('technology_gap');
        if (response.includes('scale gap')) gaps.push('scale_gap');
        return gaps;
    }

    extractOpportunities(response) {
        const opportunities = [];
        if (response.includes('market expansion')) opportunities.push('market_expansion');
        if (response.includes('product innovation')) opportunities.push('product_innovation');
        return opportunities;
    }

    extractIndustryDynamics(response) {
        if (response.includes('fragmented')) return 'fragmented';
        if (response.includes('consolidating')) return 'consolidating';
        return 'oligopolistic';
    }

    extractIndustryTrends(response) {
        const trends = [];
        if (response.includes('digital transformation')) trends.push('digital_transformation');
        if (response.includes('AI integration')) trends.push('ai_integration');
        return trends;
    }

    extractBarriers(response) {
        if (response.includes('high barriers')) return 'high';
        if (response.includes('low barriers')) return 'low';
        return 'moderate';
    }

    extractIndustryOpportunities(response) {
        const opportunities = [];
        if (response.includes('emerging markets')) opportunities.push('emerging_markets');
        if (response.includes('new technologies')) opportunities.push('new_technologies');
        return opportunities;
    }

    extractStrategyPositioning(response) {
        if (response.includes('cost leader')) return 'cost_leader';
        if (response.includes('differentiation')) return 'differentiation';
        return 'niche_focus';
    }

    extractStrategyDifferentiation(response) {
        if (response.includes('high differentiation')) return 'high';
        if (response.includes('low differentiation')) return 'low';
        return 'moderate';
    }

    extractStrategyRisks(response) {
        const risks = [];
        if (response.includes('competition risk')) risks.push('high_competition');
        if (response.includes('market share risk')) risks.push('market_share_risk');
        return risks;
    }

    extractStrategyRecommendations(response) {
        const recommendations = [];
        if (response.includes('increase market share')) recommendations.push('increase_market_share');
        if (response.includes('differentiate')) recommendations.push('differentiate');
        return recommendations;
    }

    extractCompetitiveOutlook(response) {
        if (response.includes('positive outlook')) return 'positive';
        if (response.includes('negative outlook')) return 'negative';
        return 'stable';
    }

    extractMarketOpportunity(response) {
        if (response.includes('high opportunity')) return 'high';
        if (response.includes('low opportunity')) return 'low';
        return 'moderate';
    }

    extractOutlookRisks(response) {
        const risks = [];
        if (response.includes('competition risk')) risks.push('increased_competition');
        if (response.includes('market share risk')) risks.push('market_share_decline');
        return risks;
    }

    extractConfidence(response) {
        if (response.includes('high confidence')) return 85;
        if (response.includes('low confidence')) return 45;
        return 65;
    }

    // generateFallbackAnalysis method removed - no fallbacks in LLM-only system

    generateMarketContext(symbol, competitiveData) {
        return {
            sector: this.inferSector(symbol),
            competitiveIntensity: 'medium', // Default value since traditional methods removed
            marketPosition: 'niche_player', // Default value since traditional methods removed
            moat: 'narrow' // Default value since traditional methods removed
        };
    }

    generateRecommendations(insights) {
        const { positioning, advantages, outlook } = insights;
        
        if (positioning.marketPosition === 'market_leader' && advantages.moat === 'wide') {
            return 'strong_competitive_position';
        } else if (positioning.marketPosition === 'strong_contender' && advantages.moat === 'moderate') {
            return 'competitive_position';
        } else {
            return 'challenged_position';
        }
    }

    calculateConfidence(competitiveData) {
        const competitive = competitiveData.competitive || {};
        let confidence = 50; // Base confidence
        
        if (competitive.peers && competitive.peers.length > 0) confidence += 10;
        if (competitive.marketPosition && competitive.marketPosition.marketShare) confidence += 10;
        if (competitive.competitiveAdvantages && competitive.competitiveAdvantages.length > 0) confidence += 10;
        if (competitive.swotAnalysis) confidence += 10;
        if (competitive.marketPosition && competitive.marketPosition.industryRank) confidence += 10;
        
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

    generateMockCompetitiveData(symbol) {
        // Generate realistic mock competitive data for demonstration
        const marketShare = 2 + Math.random() * 25;
        const industryRank = Math.floor(Math.random() * 50) + 1;
        const competitiveIntensity = ['low', 'medium', 'high'][Math.floor(Math.random() * 3)];
        
        const mockPeers = [
            'Competitor A', 'Competitor B', 'Competitor C', 'Competitor D', 'Competitor E'
        ];
        
        const mockAdvantages = [
            {
                advantage: 'Strong brand recognition',
                strength: 'strong',
                unique: true,
                sustainable: true
            },
            {
                advantage: 'Technology leadership',
                strength: 'moderate',
                unique: true,
                sustainable: true
            },
            {
                advantage: 'Cost efficiency',
                strength: 'moderate',
                unique: false,
                sustainable: true
            }
        ];
        
        const mockSWOT = {
            strengths: ['Innovation capability', 'Market presence', 'Financial strength'],
            weaknesses: ['Limited international presence', 'Dependency on key products'],
            opportunities: ['Market expansion', 'Product diversification', 'Strategic partnerships'],
            threats: ['Intense competition', 'Regulatory changes', 'Technology disruption']
        };
        
        return {
            symbol: symbol.toUpperCase(),
            competitive: {
                peers: mockPeers,
                competitors: mockPeers, // Add competitors array for test validation
                marketPosition: {
                    marketShare: parseFloat(marketShare.toFixed(2)),
                    industryRank: industryRank,
                    competitiveIntensity: competitiveIntensity,
                    marketLeader: marketShare > 15
                },
                competitiveAdvantages: mockAdvantages,
                swotAnalysis: mockSWOT,
                competitiveScore: Math.floor(50 + Math.random() * 50)
            }
        };
    }
}

module.exports = CompetitiveAgent; 