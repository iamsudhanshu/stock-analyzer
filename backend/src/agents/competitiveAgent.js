const BaseAgent = require('./BaseAgent');

class CompetitiveAgent extends BaseAgent {
    constructor() {
        super(
            'CompetitiveAgent',
            ['competitive_data_queue'],
            ['analysis_queue']
        );
        
        // Define peer groups for different companies
        this.peerGroups = {
            'AAPL': ['MSFT', 'GOOGL', 'AMZN', 'SAMSUNG'],
            'ADBE': ['MSFT', 'GOOGL', 'AMZN', 'AUTODESK', 'FIGM.PVT'],
            'GOOGL': ['META', 'MSFT', 'AMZN', 'AAPL'],
            'MSFT': ['AAPL', 'GOOGL', 'AMZN', 'ORCL'],
            'TSLA': ['GM', 'F', 'RIVN', 'NIO'],
            'AMZN': ['WMT', 'TGT', 'GOOGL', 'MSFT'],
            'META': ['GOOGL', 'SNAP', 'TWTR', 'PINS'],
            'NFLX': ['DIS', 'PARA', 'WBD', 'AMZN'],
            'JPM': ['BAC', 'WFC', 'C', 'GS'],
            'WMT': ['TGT', 'COST', 'AMZN', 'HD']
        };
    }

    async handleRequest(payload, requestId) {
        const { symbol } = payload;
        
        console.log(`�� [CompetitiveAgent] Received request for ${symbol} (requestId: ${requestId})`);
        try {
            await this.sendProgress(requestId, 10, `Identifying competitors for ${symbol}...`);
            
            const peers = this.getPeers(symbol);
            await this.sendProgress(requestId, 30, 'Analyzing market position...');
            
            const marketPosition = this.analyzeMarketPosition(symbol, peers);
            await this.sendProgress(requestId, 50, 'Evaluating competitive advantages...');
            
            const competitiveAdvantages = this.evaluateCompetitiveAdvantages(symbol);
            await this.sendProgress(requestId, 70, 'Comparing with industry peers...');
            
            const peerComparison = this.generatePeerComparison(symbol, peers);
            await this.sendProgress(requestId, 90, 'Assessing competitive threats...');
            
            const threats = this.assessThreats(symbol);
            
            await this.sendProgress(requestId, 100, 'Competitive analysis complete');
            
            console.log(`📤 [CompetitiveAgent] Sending result for ${symbol} (requestId: ${requestId}) to analysis queue`);
            return {
                symbol,
                competitive: {
                    peers,
                    marketPosition,
                    competitiveAdvantages,
                    peerComparison,
                    threats,
                    swotAnalysis: this.generateSWOT(symbol, marketPosition, competitiveAdvantages, threats),
                    competitiveScore: this.calculateCompetitiveScore(marketPosition, competitiveAdvantages)
                },
                lastUpdated: new Date().toISOString()
            };
            
        } catch (error) {
            console.error(`❌ [CompetitiveAgent] Error processing ${symbol} (requestId: ${requestId}):`, error);
            throw error;
        }
    }

    getPeers(symbol) {
        return this.peerGroups[symbol] || this.getDefaultPeers(symbol);
    }

    getDefaultPeers(symbol) {
        // Return generic tech peers if not in our defined groups
        return ['AAPL', 'MSFT', 'GOOGL', 'AMZN'].filter(peer => peer !== symbol).slice(0, 3);
    }

    analyzeMarketPosition(symbol, peers) {
        // Mock market position data
        const positions = {
            'AAPL': {
                marketShare: 15.8,
                industryRank: 1,
                marketLeader: true,
                marketTrend: 'stable',
                competitiveIntensity: 'high',
                barriers: ['Brand loyalty', 'Ecosystem lock-in', 'High switching costs'],
                marketGrowth: 5.2
            },
            'GOOGL': {
                marketShare: 28.5,
                industryRank: 1,
                marketLeader: true,
                marketTrend: 'growing',
                competitiveIntensity: 'medium',
                barriers: ['Network effects', 'Data advantage', 'Search dominance'],
                marketGrowth: 8.5
            },
            'MSFT': {
                marketShare: 24.3,
                industryRank: 2,
                marketLeader: true,
                marketTrend: 'growing',
                competitiveIntensity: 'high',
                barriers: ['Enterprise relationships', 'Platform stickiness', 'Cloud infrastructure'],
                marketGrowth: 12.0
            }
        };

        return positions[symbol] || {
            marketShare: 5.0,
            industryRank: 10,
            marketLeader: false,
            marketTrend: 'stable',
            competitiveIntensity: 'medium',
            barriers: ['Innovation', 'Customer service'],
            marketGrowth: 6.0
        };
    }

    evaluateCompetitiveAdvantages(symbol) {
        const advantages = {
            'AAPL': [
                {
                    advantage: 'Brand Power',
                    strength: 95,
                    sustainability: 'Very High',
                    description: 'One of the world\'s most valuable brands with exceptional customer loyalty'
                },
                {
                    advantage: 'Ecosystem Integration',
                    strength: 90,
                    sustainability: 'High',
                    description: 'Seamless integration across devices creates high switching costs'
                },
                {
                    advantage: 'Innovation Culture',
                    strength: 85,
                    sustainability: 'High',
                    description: 'Consistent track record of market-defining product innovations'
                },
                {
                    advantage: 'Premium Pricing Power',
                    strength: 88,
                    sustainability: 'High',
                    description: 'Ability to maintain premium prices due to brand perception'
                }
            ],
            'GOOGL': [
                {
                    advantage: 'Search Dominance',
                    strength: 92,
                    sustainability: 'High',
                    description: '90%+ global search market share with strong network effects'
                },
                {
                    advantage: 'Data Analytics',
                    strength: 95,
                    sustainability: 'Very High',
                    description: 'Unmatched data collection and analysis capabilities'
                },
                {
                    advantage: 'Ad Tech Platform',
                    strength: 90,
                    sustainability: 'High',
                    description: 'Leading digital advertising platform with advanced targeting'
                },
                {
                    advantage: 'Cloud Infrastructure',
                    strength: 75,
                    sustainability: 'Medium',
                    description: 'Growing cloud platform but facing strong competition'
                }
            ],
            'MSFT': [
                {
                    advantage: 'Enterprise Dominance',
                    strength: 93,
                    sustainability: 'Very High',
                    description: 'Deeply embedded in enterprise IT infrastructure globally'
                },
                {
                    advantage: 'Cloud Leadership',
                    strength: 88,
                    sustainability: 'High',
                    description: 'Azure is second-largest cloud platform with rapid growth'
                },
                {
                    advantage: 'Productivity Suite',
                    strength: 91,
                    sustainability: 'High',
                    description: 'Office 365 is the standard for business productivity'
                },
                {
                    advantage: 'Developer Ecosystem',
                    strength: 85,
                    sustainability: 'High',
                    description: 'Strong developer tools and platform with GitHub acquisition'
                }
            ]
        };

        return advantages[symbol] || [
            {
                advantage: 'Market Position',
                strength: 70,
                sustainability: 'Medium',
                description: 'Established player in the market'
            },
            {
                advantage: 'Customer Base',
                strength: 65,
                sustainability: 'Medium',
                description: 'Loyal customer following'
            }
        ];
    }

    generatePeerComparison(symbol, peers) {
        // Mock peer comparison metrics
        const comparisons = {
            'AAPL': {
                revenueGrowthVsPeers: 'Below Average',
                profitabilityVsPeers: 'Above Average',
                innovationVsPeers: 'Leading',
                marketShareTrend: 'Stable',
                valuationVsPeers: 'Premium',
                performanceRank: 1
            },
            'GOOGL': {
                revenueGrowthVsPeers: 'Average',
                profitabilityVsPeers: 'Above Average',
                innovationVsPeers: 'Leading',
                marketShareTrend: 'Growing',
                valuationVsPeers: 'Fair',
                performanceRank: 1
            },
            'MSFT': {
                revenueGrowthVsPeers: 'Above Average',
                profitabilityVsPeers: 'Leading',
                innovationVsPeers: 'Above Average',
                marketShareTrend: 'Growing',
                valuationVsPeers: 'Premium',
                performanceRank: 1
            }
        };

        const comparison = comparisons[symbol] || {
            revenueGrowthVsPeers: 'Average',
            profitabilityVsPeers: 'Average',
            innovationVsPeers: 'Average',
            marketShareTrend: 'Stable',
            valuationVsPeers: 'Fair',
            performanceRank: 5
        };

        // Add peer metrics
        comparison.peerMetrics = peers.map(peer => ({
            symbol: peer,
            marketCap: this.getMockMarketCap(peer),
            peRatio: this.getMockPE(peer),
            revenueGrowth: this.getMockGrowth(peer)
        }));

        return comparison;
    }

    assessThreats(symbol) {
        const threatMatrix = {
            'AAPL': [
                {
                    threat: 'Market Saturation',
                    severity: 'Medium',
                    timeline: 'Near-term',
                    description: 'Smartphone market reaching saturation in developed markets'
                },
                {
                    threat: 'Regulatory Pressure',
                    severity: 'High',
                    timeline: 'Ongoing',
                    description: 'Increasing antitrust scrutiny on App Store practices'
                },
                {
                    threat: 'Supply Chain Risks',
                    severity: 'Medium',
                    timeline: 'Ongoing',
                    description: 'Dependence on Asian manufacturing and geopolitical tensions'
                }
            ],
            'GOOGL': [
                {
                    threat: 'Privacy Regulations',
                    severity: 'High',
                    timeline: 'Ongoing',
                    description: 'GDPR and privacy laws threatening ad targeting capabilities'
                },
                {
                    threat: 'AI Competition',
                    severity: 'Medium',
                    timeline: 'Near-term',
                    description: 'ChatGPT and AI assistants challenging search dominance'
                },
                {
                    threat: 'Antitrust Actions',
                    severity: 'High',
                    timeline: 'Near-term',
                    description: 'Multiple antitrust cases threatening business model'
                }
            ],
            'MSFT': [
                {
                    threat: 'Cloud Competition',
                    severity: 'Medium',
                    timeline: 'Ongoing',
                    description: 'Intense competition from AWS and Google Cloud'
                },
                {
                    threat: 'Security Breaches',
                    severity: 'Medium',
                    timeline: 'Ongoing',
                    description: 'Cybersecurity risks to enterprise customers'
                },
                {
                    threat: 'Open Source Alternatives',
                    severity: 'Low',
                    timeline: 'Long-term',
                    description: 'Growing adoption of open-source productivity tools'
                }
            ]
        };

        return threatMatrix[symbol] || [
            {
                threat: 'Market Competition',
                severity: 'Medium',
                timeline: 'Ongoing',
                description: 'Increasing competition from established and new players'
            },
            {
                threat: 'Technology Disruption',
                severity: 'Medium',
                timeline: 'Long-term',
                description: 'Risk of technological disruption in the industry'
            }
        ];
    }

    generateSWOT(symbol, position, advantages, threats) {
        const strengths = advantages.map(a => a.advantage);
        
        const weaknesses = this.identifyWeaknesses(symbol);
        
        const opportunities = this.identifyOpportunities(symbol, position);
        
        return {
            strengths,
            weaknesses,
            opportunities,
            threats: threats.map(t => t.threat)
        };
    }

    identifyWeaknesses(symbol) {
        const weaknesses = {
            'AAPL': ['High product prices', 'Dependence on iPhone sales', 'Limited customization'],
            'GOOGL': ['Over-reliance on ad revenue', 'Privacy concerns', 'Hardware struggles'],
            'MSFT': ['Mobile platform weakness', 'Consumer brand perception', 'Legacy system debt']
        };

        return weaknesses[symbol] || ['Market share growth', 'Brand recognition'];
    }

    identifyOpportunities(symbol, position) {
        const opportunities = {
            'AAPL': ['Services growth', 'Healthcare expansion', 'AR/VR leadership'],
            'GOOGL': ['Cloud growth potential', 'AI monetization', 'YouTube commerce'],
            'MSFT': ['AI integration in products', 'Gaming expansion', 'Healthcare IT']
        };

        return opportunities[symbol] || ['Digital transformation', 'International expansion'];
    }

    calculateCompetitiveScore(position, advantages) {
        let score = 0;
        
        // Market position scoring (0-40 points)
        if (position.marketLeader) score += 20;
        if (position.marketShare > 20) score += 10;
        else if (position.marketShare > 10) score += 5;
        if (position.marketTrend === 'growing') score += 10;
        else if (position.marketTrend === 'stable') score += 5;
        
        // Competitive advantages scoring (0-60 points)
        const avgAdvantageStrength = advantages.reduce((sum, a) => sum + a.strength, 0) / advantages.length;
        score += (avgAdvantageStrength / 100) * 40;
        
        // Sustainability bonus
        const highSustainability = advantages.filter(a => 
            a.sustainability === 'High' || a.sustainability === 'Very High'
        ).length;
        score += (highSustainability / advantages.length) * 20;
        
        return {
            score: Math.round(score),
            rating: score >= 80 ? 'Dominant' :
                   score >= 60 ? 'Strong' :
                   score >= 40 ? 'Moderate' :
                   'Weak'
        };
    }

    getMockMarketCap(symbol) {
        const caps = {
            'AAPL': 3000,
            'MSFT': 2800,
            'GOOGL': 1800,
            'AMZN': 1600,
            'META': 900,
            'TSLA': 800,
            'SAMSUNG': 400,
            'ORCL': 300
        };
        return caps[symbol] || 100;
    }

    getMockPE(symbol) {
        const pes = {
            'AAPL': 28.5,
            'MSFT': 35.2,
            'GOOGL': 25.2,
            'AMZN': 45.5,
            'META': 23.8,
            'TSLA': 65.2,
            'SAMSUNG': 15.5,
            'ORCL': 18.2
        };
        return pes[symbol] || 20;
    }

    getMockGrowth(symbol) {
        const growth = {
            'AAPL': 2.0,
            'MSFT': 12.0,
            'GOOGL': 7.0,
            'AMZN': 9.5,
            'META': 3.0,
            'TSLA': 25.0,
            'SAMSUNG': -2.0,
            'ORCL': 5.0
        };
        return growth[symbol] || 5;
    }
}

module.exports = CompetitiveAgent; 