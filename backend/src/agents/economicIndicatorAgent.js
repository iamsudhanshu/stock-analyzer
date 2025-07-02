const axios = require('axios');
const moment = require('moment');
const BaseAgent = require('./BaseAgent');
const config = require('../config');
const logger = require('../utils/logger');

class EconomicIndicatorAgent extends BaseAgent {
  constructor() {
    super(
      'EconomicIndicatorAgent',
      [config.queues.economic],
      [config.queues.analysis]
    );
    
    // Key economic indicators to track
    this.indicators = {
      'GDP': 'GDP',
      'UNRATE': 'unemployment_rate',
      'CPIAUCSL': 'inflation_rate',
      'FEDFUNDS': 'federal_funds_rate',
      'DGS10': '10_year_treasury',
      'DGS2': '2_year_treasury',
      'VIXCLS': 'vix_fear_index',
      'DEXUSEU': 'usd_eur_exchange',
      'NASDAQCOM': 'nasdaq_composite'
    };
  }

  async handleRequest(payload, requestId) {
    try {
      const { symbol } = payload;
      
      if (!symbol) {
        throw new Error('Symbol is required');
      }

      await this.sendProgress(requestId, 10, 'Starting economic data collection...');

      // Fetch key economic indicators
      const economicData = await this.fetchEconomicIndicators(requestId);
      
      await this.sendProgress(requestId, 40, 'Analyzing market regime...');

      // Analyze economic regime
      const regimeAnalysis = this.analyzeEconomicRegime(economicData);
      
      await this.sendProgress(requestId, 70, 'Calculating economic impact...');

      // Calculate economic impact on markets
      const marketImpact = this.calculateMarketImpact(economicData, regimeAnalysis);
      
      await this.sendProgress(requestId, 100, 'Economic analysis complete');

      return {
        symbol: symbol.toUpperCase(),
        economicData,
        regimeAnalysis,
        marketImpact,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`EconomicIndicatorAgent error for request ${requestId}:`, error);
      throw error;
    }
  }

  async fetchEconomicIndicators(requestId) {
    const cacheKey = 'economic_indicators';
    
    // Check cache first (cache for 1 hour)
    let cachedData = await this.getCachedData(cacheKey);
    if (cachedData) {
      logger.debug('Using cached economic data');
      return cachedData;
    }

    let economicData = {};

    // If FRED API key is available, fetch real data
    if (config.apiKeys.fred) {
      try {
        economicData = await this.fetchFromFred();
      } catch (error) {
        logger.error('Error fetching from FRED API:', error);
        economicData = this.generateMockEconomicData();
      }
    } else {
      logger.warn('FRED API key not configured, generating mock economic data');
      economicData = this.generateMockEconomicData();
    }

    // Cache the results for 1 hour
    await this.setCachedData(cacheKey, economicData, config.cache.economicDataTTL);
    
    return economicData;
  }

  async fetchFromFred() {
    const endDate = moment().format('YYYY-MM-DD');
    const startDate = moment().subtract(2, 'years').format('YYYY-MM-DD');
    const data = {};

    for (const [fredCode, indicator] of Object.entries(this.indicators)) {
      try {
        const response = await axios.get(`${config.apiEndpoints.fred}/series/observations`, {
          params: {
            series_id: fredCode,
            api_key: config.apiKeys.fred,
            file_type: 'json',
            start_date: startDate,
            end_date: endDate,
            sort_order: 'desc',
            limit: 100
          },
          timeout: 10000
        });

        if (response.data.observations && response.data.observations.length > 0) {
          const observations = response.data.observations
            .filter(obs => obs.value !== '.')
            .map(obs => ({
              date: obs.date,
              value: parseFloat(obs.value)
            }));

          data[indicator] = {
            current: observations[0]?.value || null,
            historical: observations,
            lastUpdated: observations[0]?.date || null
          };
        }

        // Small delay to respect FRED rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        logger.warn(`Error fetching ${indicator} from FRED:`, error.message);
        // Continue with other indicators even if one fails
      }
    }

    return data;
  }

  generateMockEconomicData() {
    return {
      GDP: {
        current: 26800.0 + (Math.random() - 0.5) * 1000,
        historical: this.generateHistoricalData(26800.0, 0.02, 8),
        lastUpdated: moment().subtract(1, 'quarter').format('YYYY-MM-DD')
      },
      unemployment_rate: {
        current: 3.5 + (Math.random() - 0.5) * 1.0,
        historical: this.generateHistoricalData(3.5, 0.1, 24),
        lastUpdated: moment().subtract(1, 'month').format('YYYY-MM-DD')
      },
      inflation_rate: {
        current: 2.1 + (Math.random() - 0.5) * 0.8,
        historical: this.generateHistoricalData(2.1, 0.2, 24),
        lastUpdated: moment().subtract(1, 'month').format('YYYY-MM-DD')
      },
      federal_funds_rate: {
        current: 5.25 + (Math.random() - 0.5) * 0.5,
        historical: this.generateHistoricalData(5.25, 0.3, 24),
        lastUpdated: moment().format('YYYY-MM-DD')
      },
      '10_year_treasury': {
        current: 4.2 + (Math.random() - 0.5) * 0.4,
        historical: this.generateHistoricalData(4.2, 0.2, 52),
        lastUpdated: moment().format('YYYY-MM-DD')
      },
      '2_year_treasury': {
        current: 4.8 + (Math.random() - 0.5) * 0.4,
        historical: this.generateHistoricalData(4.8, 0.3, 52),
        lastUpdated: moment().format('YYYY-MM-DD')
      },
      vix_fear_index: {
        current: 18.5 + (Math.random() - 0.5) * 8.0,
        historical: this.generateHistoricalData(18.5, 0.5, 52),
        lastUpdated: moment().format('YYYY-MM-DD')
      },
      usd_eur_exchange: {
        current: 1.08 + (Math.random() - 0.5) * 0.1,
        historical: this.generateHistoricalData(1.08, 0.02, 52),
        lastUpdated: moment().format('YYYY-MM-DD')
      }
    };
  }

  generateHistoricalData(baseValue, volatility, periods) {
    const data = [];
    let currentValue = baseValue;
    
    for (let i = periods; i >= 0; i--) {
      const date = moment().subtract(i, 'weeks').format('YYYY-MM-DD');
      
      // Add some realistic variation
      const change = (Math.random() - 0.5) * volatility;
      currentValue = Math.max(0, currentValue * (1 + change));
      
      data.push({
        date,
        value: parseFloat(currentValue.toFixed(2))
      });
    }
    
    return data.reverse(); // Most recent first
  }

  analyzeEconomicRegime(economicData) {
    try {
      const analysis = {
        regime: 'neutral',
        confidence: 0.5,
        indicators: {},
        riskFactors: [],
        opportunities: []
      };

      // Analyze unemployment rate
      if (economicData.unemployment_rate?.current) {
        const unemployment = economicData.unemployment_rate.current;
        analysis.indicators.unemployment = {
          value: unemployment,
          status: unemployment < 4 ? 'low' : unemployment > 6 ? 'high' : 'normal',
          impact: unemployment < 4 ? 'positive' : unemployment > 6 ? 'negative' : 'neutral'
        };
      }

      // Analyze inflation
      if (economicData.inflation_rate?.current) {
        const inflation = economicData.inflation_rate.current;
        analysis.indicators.inflation = {
          value: inflation,
          status: inflation < 2 ? 'low' : inflation > 3 ? 'high' : 'target',
          impact: inflation > 4 ? 'negative' : inflation < 1 ? 'deflationary_risk' : 'neutral'
        };
      }

      // Analyze interest rates
      if (economicData.federal_funds_rate?.current) {
        const fedRate = economicData.federal_funds_rate.current;
        analysis.indicators.interest_rates = {
          value: fedRate,
          status: fedRate < 2 ? 'accommodative' : fedRate > 5 ? 'restrictive' : 'neutral',
          impact: fedRate > 6 ? 'negative' : fedRate < 1 ? 'stimulative' : 'neutral'
        };
      }

      // Analyze yield curve
      if (economicData['10_year_treasury']?.current && economicData['2_year_treasury']?.current) {
        const yieldSpread = economicData['10_year_treasury'].current - economicData['2_year_treasury'].current;
        analysis.indicators.yield_curve = {
          spread: yieldSpread,
          status: yieldSpread < 0 ? 'inverted' : yieldSpread > 2 ? 'steep' : 'normal',
          impact: yieldSpread < -0.5 ? 'recession_warning' : 'neutral'
        };

        if (yieldSpread < 0) {
          analysis.riskFactors.push('Inverted yield curve signals potential recession');
        }
      }

      // Analyze VIX (fear index)
      if (economicData.vix_fear_index?.current) {
        const vix = economicData.vix_fear_index.current;
        analysis.indicators.market_volatility = {
          value: vix,
          status: vix < 15 ? 'low' : vix > 25 ? 'high' : 'normal',
          impact: vix > 30 ? 'high_fear' : vix < 12 ? 'complacency' : 'neutral'
        };

        if (vix > 30) {
          analysis.riskFactors.push('High market volatility indicates investor fear');
        } else if (vix < 12) {
          analysis.riskFactors.push('Very low volatility may indicate market complacency');
        }
      }

      // Determine overall regime
      const positiveFactors = Object.values(analysis.indicators).filter(i => i.impact === 'positive').length;
      const negativeFactors = Object.values(analysis.indicators).filter(i => i.impact === 'negative').length;
      
      if (positiveFactors > negativeFactors + 1) {
        analysis.regime = 'expansionary';
        analysis.confidence = Math.min(0.9, 0.5 + (positiveFactors - negativeFactors) * 0.1);
        analysis.opportunities.push('Economic conditions favor growth stocks');
      } else if (negativeFactors > positiveFactors + 1) {
        analysis.regime = 'contractionary';
        analysis.confidence = Math.min(0.9, 0.5 + (negativeFactors - positiveFactors) * 0.1);
        analysis.riskFactors.push('Economic conditions suggest defensive positioning');
      } else {
        analysis.regime = 'neutral';
        analysis.confidence = 0.6;
      }

      return analysis;

    } catch (error) {
      logger.error('Error analyzing economic regime:', error);
      return {
        regime: 'unknown',
        confidence: 0,
        indicators: {},
        riskFactors: ['Unable to analyze economic conditions'],
        opportunities: []
      };
    }
  }

  calculateMarketImpact(economicData, regimeAnalysis) {
    const impact = {
      overall: 'neutral',
      sectors: {},
      assetClasses: {},
      timeHorizons: {}
    };

    try {
      // Sector impact based on economic regime
      switch (regimeAnalysis.regime) {
        case 'expansionary':
          impact.sectors = {
            technology: 'positive',
            consumer_discretionary: 'positive',
            financials: 'positive',
            energy: 'neutral',
            utilities: 'negative',
            consumer_staples: 'neutral'
          };
          impact.overall = 'positive';
          break;

        case 'contractionary':
          impact.sectors = {
            technology: 'negative',
            consumer_discretionary: 'negative',
            financials: 'negative',
            energy: 'negative',
            utilities: 'positive',
            consumer_staples: 'positive'
          };
          impact.overall = 'negative';
          break;

        default:
          impact.sectors = {
            technology: 'neutral',
            consumer_discretionary: 'neutral',
            financials: 'neutral',
            energy: 'neutral',
            utilities: 'neutral',
            consumer_staples: 'neutral'
          };
      }

      // Asset class impact
      const isHighInflation = economicData.inflation_rate?.current > 3;
      const isHighRates = economicData.federal_funds_rate?.current > 5;
      
      impact.assetClasses = {
        stocks: regimeAnalysis.regime === 'expansionary' ? 'positive' : 'negative',
        bonds: isHighRates ? 'negative' : 'neutral',
        real_estate: isHighRates ? 'negative' : 'positive',
        commodities: isHighInflation ? 'positive' : 'neutral',
        cash: isHighRates ? 'positive' : 'negative'
      };

      // Time horizon impact
      impact.timeHorizons = {
        short_term: this.getShortTermImpact(economicData),
        medium_term: this.getMediumTermImpact(regimeAnalysis),
        long_term: this.getLongTermImpact(economicData, regimeAnalysis)
      };

    } catch (error) {
      logger.error('Error calculating market impact:', error);
    }

    return impact;
  }

  getShortTermImpact(economicData) {
    // Short-term impact based on recent volatility and immediate indicators
    const vix = economicData.vix_fear_index?.current || 20;
    
    if (vix > 25) return 'volatile_negative';
    if (vix < 15) return 'stable_positive';
    return 'neutral';
  }

  getMediumTermImpact(regimeAnalysis) {
    // Medium-term impact based on economic regime
    switch (regimeAnalysis.regime) {
      case 'expansionary': return 'positive';
      case 'contractionary': return 'negative';
      default: return 'neutral';
    }
  }

  getLongTermImpact(economicData, regimeAnalysis) {
    // Long-term impact based on structural indicators
    const unemployment = economicData.unemployment_rate?.current || 4;
    const inflation = economicData.inflation_rate?.current || 2;
    
    if (unemployment < 4 && inflation > 2 && inflation < 4) {
      return 'positive'; // Goldilocks economy
    }
    
    if (unemployment > 6 || inflation > 5) {
      return 'negative'; // Structural challenges
    }
    
    return 'neutral';
  }
}

// Start the agent if this file is run directly
if (require.main === module) {
  const agent = new EconomicIndicatorAgent();
  agent.start().catch(error => {
    logger.error('Failed to start EconomicIndicatorAgent:', error);
    process.exit(1);
  });
}

module.exports = EconomicIndicatorAgent; 