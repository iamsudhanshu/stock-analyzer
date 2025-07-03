const BaseAgent = require('./BaseAgent');
const axios = require('axios');

class FundamentalDataAgent extends BaseAgent {
    constructor() {
        super(
            'FundamentalDataAgent',
            ['fundamental_data_queue'],
            ['analysis_queue']
        );
        this.API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
        this.BASE_URL = 'https://www.alphavantage.co/query';
    }

    async handleRequest(payload, requestId) {
        const { symbol } = payload;
        
        console.log(`📊 [FundamentalDataAgent] Received request for ${symbol} (requestId: ${requestId})`);
        try {
            await this.sendProgress(requestId, 10, `Fetching fundamental data for ${symbol}...`);

            // For demo, we'll use mock data
            const fundamentalData = await this.getFundamentalData(symbol);
            
            await this.sendProgress(requestId, 100, 'Fundamental analysis complete');

            console.log(`📤 [FundamentalDataAgent] Sending result for ${symbol} (requestId: ${requestId}) to analysis queue`);
            return fundamentalData;

        } catch (error) {
            console.error(`❌ [FundamentalDataAgent] Error processing ${symbol} (requestId: ${requestId}):`, error);
            throw error;
        }
    }

    async getFundamentalData(symbol) {
        // For demo purposes, return comprehensive mock data
        const mockData = {
            'AAPL': {
                marketCap: 3000000000000,
                peRatio: 28.5,
                pegRatio: 2.8,
                eps: 6.15,
                dividendYield: 0.44,
                priceToBook: 40.5,
                debtToEquity: 1.95,
                currentRatio: 0.99,
                quickRatio: 0.95,
                grossMargin: 43.1,
                operatingMargin: 30.2,
                netMargin: 25.3,
                roe: 147.9,
                roa: 28.2,
                revenueGrowth: 2.0,
                earningsGrowth: 5.0,
                freeCashFlow: 90000000000,
                beta: 1.25
            },
            'GOOGL': {
                marketCap: 1800000000000,
                peRatio: 25.2,
                pegRatio: 1.5,
                eps: 5.80,
                dividendYield: 0,
                priceToBook: 6.5,
                debtToEquity: 0.12,
                currentRatio: 2.35,
                quickRatio: 2.31,
                grossMargin: 55.5,
                operatingMargin: 27.5,
                netMargin: 21.5,
                roe: 28.5,
                roa: 14.5,
                revenueGrowth: 7.0,
                earningsGrowth: 15.0,
                freeCashFlow: 60000000000,
                beta: 1.05
            },
            'MSFT': {
                marketCap: 2800000000000,
                peRatio: 35.2,
                pegRatio: 2.1,
                eps: 11.20,
                dividendYield: 0.72,
                priceToBook: 15.2,
                debtToEquity: 0.47,
                currentRatio: 1.84,
                quickRatio: 1.81,
                grossMargin: 69.0,
                operatingMargin: 42.0,
                netMargin: 36.5,
                roe: 47.2,
                roa: 20.3,
                revenueGrowth: 12.0,
                earningsGrowth: 10.0,
                freeCashFlow: 65000000000,
                beta: 0.93
            }
        };

        const data = mockData[symbol] || {
            marketCap: 50000000000,
            peRatio: 20.0,
            pegRatio: 1.5,
            eps: 3.50,
            dividendYield: 2.0,
            priceToBook: 3.0,
            debtToEquity: 0.5,
            currentRatio: 1.5,
            quickRatio: 1.2,
            grossMargin: 35.0,
            operatingMargin: 20.0,
            netMargin: 15.0,
            roe: 20.0,
            roa: 10.0,
            revenueGrowth: 8.0,
            earningsGrowth: 10.0,
            freeCashFlow: 5000000000,
            beta: 1.0
        };

        // Calculate financial health score
        const healthScore = this.calculateFinancialHealth(data);
        const valuation = this.assessValuation(data);

        return {
            symbol,
            fundamentals: {
                metrics: data,
                financialHealth: healthScore,
                valuation: valuation,
                keyHighlights: this.generateKeyHighlights(data, healthScore, valuation)
            },
            lastUpdated: new Date().toISOString()
        };
    }

    calculateFinancialHealth(metrics) {
        let score = 0;
        const factors = [];

        // Profitability
        if (metrics.roe > 15) {
            score += 20;
            factors.push({ name: 'Strong ROE', positive: true });
        } else if (metrics.roe > 10) {
            score += 10;
        }

        // Liquidity
        if (metrics.currentRatio > 1.5) {
            score += 15;
            factors.push({ name: 'Good liquidity', positive: true });
        } else if (metrics.currentRatio < 1) {
            score -= 10;
            factors.push({ name: 'Liquidity concerns', positive: false });
        }

        // Debt
        if (metrics.debtToEquity < 0.5) {
            score += 15;
            factors.push({ name: 'Low debt levels', positive: true });
        } else if (metrics.debtToEquity > 2) {
            score -= 10;
            factors.push({ name: 'High debt levels', positive: false });
        }

        // Margins
        if (metrics.netMargin > 20) {
            score += 20;
            factors.push({ name: 'Excellent margins', positive: true });
        } else if (metrics.netMargin > 10) {
            score += 10;
        }

        // Growth
        if (metrics.revenueGrowth > 10) {
            score += 15;
            factors.push({ name: 'Strong revenue growth', positive: true });
        }

        // Free Cash Flow
        if (metrics.freeCashFlow > 10000000000) {
            score += 15;
            factors.push({ name: 'Strong cash generation', positive: true });
        }

        const rating = score >= 80 ? 'Excellent' :
                      score >= 60 ? 'Good' :
                      score >= 40 ? 'Fair' : 'Poor';

        return {
            score: Math.max(0, Math.min(100, score)),
            rating,
            factors
        };
    }

    assessValuation(metrics) {
        const industryAvgPE = 22; // Simplified
        const peRatio = metrics.peRatio || 20;
        
        let assessment = 'Fair Value';
        const factors = [];

        if (peRatio < industryAvgPE * 0.8) {
            assessment = 'Undervalued';
            factors.push('Trading below industry average P/E');
        } else if (peRatio > industryAvgPE * 1.2) {
            assessment = 'Overvalued';
            factors.push('Trading above industry average P/E');
        }

        if (metrics.pegRatio && metrics.pegRatio < 1) {
            factors.push('PEG ratio suggests growth at reasonable price');
        } else if (metrics.pegRatio > 2) {
            factors.push('PEG ratio indicates expensive growth');
        }

        return {
            assessment,
            currentPE: peRatio,
            industryAvgPE,
            factors
        };
    }

    generateKeyHighlights(metrics, health, valuation) {
        const highlights = [];

        // Add top positive highlights
        if (health.score >= 80) {
            highlights.push({
                type: 'positive',
                text: `Excellent financial health (${health.score}/100)`,
                icon: 'trophy'
            });
        }

        if (metrics.revenueGrowth > 15) {
            highlights.push({
                type: 'positive',
                text: `Strong revenue growth: ${metrics.revenueGrowth}%`,
                icon: 'trending-up'
            });
        }

        if (valuation.assessment === 'Undervalued') {
            highlights.push({
                type: 'positive',
                text: 'Stock appears undervalued',
                icon: 'dollar-sign'
            });
        }

        // Add any concerns
        if (metrics.debtToEquity > 2) {
            highlights.push({
                type: 'warning',
                text: 'High debt levels',
                icon: 'alert-triangle'
            });
        }

        if (metrics.currentRatio < 1) {
            highlights.push({
                type: 'warning',
                text: 'Potential liquidity issues',
                icon: 'alert-circle'
            });
        }

        return highlights;
    }
}

module.exports = FundamentalDataAgent; 