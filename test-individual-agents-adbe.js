#!/usr/bin/env node

const config = require('./backend/src/config');
const logger = require('./backend/src/utils/logger');

// Import all agents
const StockDataAgent = require('./backend/src/agents/stockDataAgent');
const NewsSentimentAgent = require('./backend/src/agents/newsSentimentAgent');
const FundamentalDataAgent = require('./backend/src/agents/fundamentalDataAgent');
const CompetitiveAgent = require('./backend/src/agents/competitiveAgent');
const EnhancedDataAgent = require('./backend/src/agents/enhancedDataAgent');
const AdvancedTechnicalAgent = require('./backend/src/agents/advancedTechnicalAgent');
const ReportGeneratorAgent = require('./backend/src/agents/reportGeneratorAgent');

const TEST_SYMBOL = 'ADBE';

// Test configuration
const TEST_CONFIG = {
  timeout: 30000, // 30 seconds per agent
  minDataKeys: 5, // Minimum expected data keys
  minLLMInsights: 3, // Minimum expected LLM insight keys
  requireLLM: true // Whether LLM is required
};

// Validation functions
const validators = {
  // Generic data structure validation
  validateDataStructure: (data, agentName) => {
    const issues = [];
    
    if (!data) {
      issues.push('No data returned');
      return { valid: false, issues };
    }
    
    if (typeof data !== 'object') {
      issues.push('Data is not an object');
      return { valid: false, issues };
    }
    
    const dataKeys = Object.keys(data);
    if (dataKeys.length < TEST_CONFIG.minDataKeys) {
      issues.push(`Insufficient data keys: ${dataKeys.length} < ${TEST_CONFIG.minDataKeys}`);
    }
    
    return { valid: issues.length === 0, issues, dataKeys };
  },

  // LLM integration validation
  validateLLMIntegration: (data, agentName) => {
    const issues = [];
    
    if (!data.llmEnhanced) {
      issues.push('LLM enhancement flag missing');
    }
    
    if (!data.llmInsights) {
      issues.push('LLM insights missing');
    } else {
      const insightKeys = Object.keys(data.llmInsights);
      if (insightKeys.length < TEST_CONFIG.minLLMInsights) {
        issues.push(`Insufficient LLM insights: ${insightKeys.length} < ${TEST_CONFIG.minLLMInsights}`);
      }
    }
    
    if (!data.lastUpdated) {
      issues.push('Last updated timestamp missing');
    }
    
    return { valid: issues.length === 0, issues };
  },

  // Agent-specific validators
  StockDataAgent: (data) => {
    const issues = [];
    
    // Check for required stock data fields
    const requiredFields = ['currentPrice', 'volume', 'marketCap', 'technicalIndicators'];
    requiredFields.forEach(field => {
      if (!data[field]) {
        issues.push(`Missing required field: ${field}`);
      }
    });
    
    // Validate technical indicators
    if (data.technicalIndicators) {
      const techIndicators = ['rsi', 'macd', 'movingAverages'];
      techIndicators.forEach(indicator => {
        if (!data.technicalIndicators[indicator]) {
          issues.push(`Missing technical indicator: ${indicator}`);
        }
      });
    }
    
    // Validate LLM insights structure
    if (data.llmInsights?.analysis) {
      const analysisFields = ['priceAnalysis', 'technicalAnalysis', 'volumeAnalysis'];
      analysisFields.forEach(field => {
        if (!data.llmInsights.analysis[field]) {
          issues.push(`Missing LLM analysis field: ${field}`);
        }
      });
    }
    
    return { valid: issues.length === 0, issues };
  },

  NewsSentimentAgent: (data) => {
    const issues = [];
    
    // Check for required news data fields
    const requiredFields = ['articles', 'sentimentAnalysis', 'socialSentiment'];
    requiredFields.forEach(field => {
      if (!data[field]) {
        issues.push(`Missing required field: ${field}`);
      }
    });
    
    // Validate articles array
    if (data.articles && (!Array.isArray(data.articles) || data.articles.length === 0)) {
      issues.push('Articles array is empty or invalid');
    }
    
    // Validate sentiment analysis
    if (data.sentimentAnalysis) {
      if (typeof data.sentimentAnalysis.overallScore !== 'number') {
        issues.push('Sentiment overall score is not a number');
      }
    }
    
    // Validate LLM insights structure
    if (data.llmInsights?.analysis) {
      const analysisFields = ['sentimentAnalysis', 'keyThemes', 'marketImpact'];
      analysisFields.forEach(field => {
        if (!data.llmInsights.analysis[field]) {
          issues.push(`Missing LLM analysis field: ${field}`);
        }
      });
    }
    
    return { valid: issues.length === 0, issues };
  },

  FundamentalDataAgent: (data) => {
    const issues = [];
    
    // Check for required fundamental data fields
    const requiredFields = ['fundamentals', 'financialMetrics', 'valuation'];
    requiredFields.forEach(field => {
      if (!data[field]) {
        issues.push(`Missing required field: ${field}`);
      }
    });
    
    // Validate financial metrics
    if (data.financialMetrics) {
      const metrics = ['peRatio', 'pbRatio', 'debtToEquity'];
      metrics.forEach(metric => {
        if (data.financialMetrics[metric] === undefined) {
          issues.push(`Missing financial metric: ${metric}`);
        }
      });
    }
    
    // Validate LLM insights structure
    if (data.llmInsights?.analysis) {
      const analysisFields = ['financialHealth', 'valuationAnalysis', 'growthProspects'];
      analysisFields.forEach(field => {
        if (!data.llmInsights.analysis[field]) {
          issues.push(`Missing LLM analysis field: ${field}`);
        }
      });
    }
    
    return { valid: issues.length === 0, issues };
  },

  CompetitiveAgent: (data) => {
    const issues = [];
    
    // Check for required competitive data fields
    const requiredFields = ['competitive', 'marketPosition', 'peerComparison'];
    requiredFields.forEach(field => {
      if (!data[field]) {
        issues.push(`Missing required field: ${field}`);
      }
    });
    
    // Validate competitive analysis
    if (data.competitive) {
      if (!data.competitive.competitors || !Array.isArray(data.competitive.competitors)) {
        issues.push('Competitors array is missing or invalid');
      }
    }
    
    // Validate LLM insights structure
    if (data.llmInsights?.analysis) {
      const analysisFields = ['positioning', 'competitiveAdvantages', 'marketShare'];
      analysisFields.forEach(field => {
        if (!data.llmInsights.analysis[field]) {
          issues.push(`Missing LLM analysis field: ${field}`);
        }
      });
    }
    
    return { valid: issues.length === 0, issues };
  },

  EnhancedDataAgent: (data) => {
    const issues = [];
    
    // Check for required enhanced data fields
    const requiredFields = ['enhancedData', 'optionsData', 'insiderTrading'];
    requiredFields.forEach(field => {
      if (!data[field]) {
        issues.push(`Missing required field: ${field}`);
      }
    });
    
    // Validate options data
    if (data.optionsData) {
      if (typeof data.optionsData.putCallRatio !== 'number') {
        issues.push('Put-call ratio is not a number');
      }
    }
    
    // Validate LLM insights structure
    if (data.llmInsights?.analysis) {
      const analysisFields = ['optionsAnalysis', 'insiderAnalysis', 'marketSentiment'];
      analysisFields.forEach(field => {
        if (!data.llmInsights.analysis[field]) {
          issues.push(`Missing LLM analysis field: ${field}`);
        }
      });
    }
    
    return { valid: issues.length === 0, issues };
  },

  AdvancedTechnicalAgent: (data) => {
    const issues = [];
    
    // Check for required advanced technical data fields
    const requiredFields = ['advancedTechnical', 'patterns', 'indicators'];
    requiredFields.forEach(field => {
      if (!data[field]) {
        issues.push(`Missing required field: ${field}`);
      }
    });
    
    // Validate patterns array
    if (data.patterns && (!Array.isArray(data.patterns) || data.patterns.length === 0)) {
      issues.push('Patterns array is empty or invalid');
    }
    
    // Validate LLM insights structure
    if (data.llmInsights?.analysis) {
      const analysisFields = ['patternAnalysis', 'technicalOutlook', 'signalStrength'];
      analysisFields.forEach(field => {
        if (!data.llmInsights.analysis[field]) {
          issues.push(`Missing LLM analysis field: ${field}`);
        }
      });
    }
    
    return { valid: issues.length === 0, issues };
  },

  ReportGeneratorAgent: (data) => {
    const issues = [];
    
    // Check for required report data fields
    const requiredFields = ['report', 'executiveSummary', 'detailedAnalysis'];
    requiredFields.forEach(field => {
      if (!data[field]) {
        issues.push(`Missing required field: ${field}`);
      }
    });
    
    // Validate executive summary
    if (data.executiveSummary && typeof data.executiveSummary !== 'string') {
      issues.push('Executive summary is not a string');
    }
    
    // Validate LLM insights structure
    if (data.llmInsights?.analysis) {
      const analysisFields = ['reportAnalysis', 'recommendations', 'riskAssessment'];
      analysisFields.forEach(field => {
        if (!data.llmInsights.analysis[field]) {
          issues.push(`Missing LLM analysis field: ${field}`);
        }
      });
    }
    
    return { valid: issues.length === 0, issues };
  }
};

// Test runner function
async function testIndividualAgent(agentName, AgentClass) {
  console.log(`\n🔍 Testing ${agentName} for ${TEST_SYMBOL}...`);
  
  const startTime = Date.now();
  let agent;
  let result;
  
  try {
    // Create and start agent
    agent = new AgentClass();
    await agent.start();
    
    // Check LLM availability
    const llmStatus = agent.ollamaEnabled ? '✅ Enabled' : '❌ Disabled';
    console.log(`   LLM Status: ${llmStatus}`);
    
    if (TEST_CONFIG.requireLLM && !agent.ollamaEnabled) {
      throw new Error('LLM is required but not available');
    }
    
    // Create test message
    const testMessage = {
      requestId: `test-${agentName}-${Date.now()}`,
      agentType: agentName,
      status: 'request',
      payload: { symbol: TEST_SYMBOL }
    };
    
    // Process message
    await agent.processMessage(testMessage);
    
    // Wait for result (simulate async processing)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get the result from the agent's last processed data
    if (agent.lastProcessedData) {
      result = agent.lastProcessedData;
    } else {
      // Fallback: call the main data generation method directly
      const methodName = `generateLLMEnhanced${agentName.replace('Agent', '')}`;
      if (agent[methodName]) {
        result = await agent[methodName](TEST_SYMBOL);
      } else {
        throw new Error(`No data generation method found for ${agentName}`);
      }
    }
    
    // Validate data structure
    const structureValidation = validators.validateDataStructure(result, agentName);
    console.log(`   Data Structure: ${structureValidation.valid ? '✅ Valid' : '❌ Invalid'}`);
    if (!structureValidation.valid) {
      console.log(`      Issues: ${structureValidation.issues.join(', ')}`);
    }
    
    // Validate LLM integration
    const llmValidation = validators.validateLLMIntegration(result, agentName);
    console.log(`   LLM Integration: ${llmValidation.valid ? '✅ Valid' : '❌ Invalid'}`);
    if (!llmValidation.valid) {
      console.log(`      Issues: ${llmValidation.issues.join(', ')}`);
    }
    
    // Validate agent-specific requirements
    const agentValidator = validators[agentName];
    if (agentValidator) {
      const agentValidation = agentValidator(result);
      console.log(`   Agent-Specific: ${agentValidation.valid ? '✅ Valid' : '❌ Invalid'}`);
      if (!agentValidation.valid) {
        console.log(`      Issues: ${agentValidation.issues.join(', ')}`);
      }
    }
    
    // Display data summary
    console.log(`   Data Keys: ${structureValidation.dataKeys?.length || 0}`);
    console.log(`   LLM Insights: ${result.llmInsights ? Object.keys(result.llmInsights).length : 0}`);
    console.log(`   Processing Time: ${Date.now() - startTime}ms`);
    
    // Overall validation
    const overallValid = structureValidation.valid && llmValidation.valid && 
                        (!agentValidator || agentValidator(result).valid);
    
    console.log(`   Overall Status: ${overallValid ? '✅ PASS' : '❌ FAIL'}`);
    
    return {
      agent: agentName,
      symbol: TEST_SYMBOL,
      valid: overallValid,
      data: result,
      structureValidation,
      llmValidation,
      agentValidation: agentValidator ? agentValidator(result) : null,
      processingTime: Date.now() - startTime
    };
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return {
      agent: agentName,
      symbol: TEST_SYMBOL,
      valid: false,
      error: error.message,
      processingTime: Date.now() - startTime
    };
  } finally {
    if (agent) {
      try {
        await agent.stop();
      } catch (error) {
        console.log(`   ⚠️ Error stopping agent: ${error.message}`);
      }
    }
  }
}

// Main test function
async function testAllIndividualAgents() {
  console.log('🧠 Testing Individual Agents for ADBE Stock Analysis...\n');
  console.log(`📊 Test Symbol: ${TEST_SYMBOL}`);
  console.log(`⏱️ Timeout: ${TEST_CONFIG.timeout}ms per agent`);
  console.log(`📋 Minimum Data Keys: ${TEST_CONFIG.minDataKeys}`);
  console.log(`🧠 Minimum LLM Insights: ${TEST_CONFIG.minLLMInsights}`);
  console.log(`🔒 LLM Required: ${TEST_CONFIG.requireLLM ? 'Yes' : 'No'}`);
  
  const agents = [
    { name: 'StockDataAgent', class: StockDataAgent },
    { name: 'NewsSentimentAgent', class: NewsSentimentAgent },
    { name: 'FundamentalDataAgent', class: FundamentalDataAgent },
    { name: 'CompetitiveAgent', class: CompetitiveAgent },
    { name: 'EnhancedDataAgent', class: EnhancedDataAgent },
    { name: 'AdvancedTechnicalAgent', class: AdvancedTechnicalAgent },
    { name: 'ReportGeneratorAgent', class: ReportGeneratorAgent }
  ];
  
  const results = [];
  const startTime = Date.now();
  
  for (const { name, class: AgentClass } of agents) {
    const result = await testIndividualAgent(name, AgentClass);
    results.push(result);
    
    // Add delay between agents to avoid overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Generate summary report
  console.log('\n📊 Test Summary Report');
  console.log('=' .repeat(50));
  
  const passedTests = results.filter(r => r.valid).length;
  const failedTests = results.filter(r => !r.valid).length;
  const totalTime = Date.now() - startTime;
  
  console.log(`✅ Passed: ${passedTests}/${results.length}`);
  console.log(`❌ Failed: ${failedTests}/${results.length}`);
  console.log(`⏱️ Total Time: ${totalTime}ms`);
  console.log(`📈 Success Rate: ${((passedTests / results.length) * 100).toFixed(1)}%`);
  
  // Detailed results
  console.log('\n📋 Detailed Results:');
  console.log('-'.repeat(50));
  
  results.forEach(result => {
    const status = result.valid ? '✅ PASS' : '❌ FAIL';
    const time = result.processingTime || 0;
    const error = result.error ? ` (${result.error})` : '';
    
    console.log(`${status} ${result.agent} - ${time}ms${error}`);
    
    if (result.data) {
      const dataKeys = Object.keys(result.data).length;
      const llmInsights = result.data.llmInsights ? Object.keys(result.data.llmInsights).length : 0;
      console.log(`   📊 Data Keys: ${dataKeys}, 🧠 LLM Insights: ${llmInsights}`);
    }
  });
  
  // Failed test details
  const failedResults = results.filter(r => !r.valid);
  if (failedResults.length > 0) {
    console.log('\n❌ Failed Test Details:');
    console.log('-'.repeat(50));
    
    failedResults.forEach(result => {
      console.log(`\n${result.agent}:`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.structureValidation && !result.structureValidation.valid) {
        console.log(`   Structure Issues: ${result.structureValidation.issues.join(', ')}`);
      }
      if (result.llmValidation && !result.llmValidation.valid) {
        console.log(`   LLM Issues: ${result.llmValidation.issues.join(', ')}`);
      }
      if (result.agentValidation && !result.agentValidation.valid) {
        console.log(`   Agent Issues: ${result.agentValidation.issues.join(', ')}`);
      }
    });
  }
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  console.log('-'.repeat(50));
  
  if (failedTests === 0) {
    console.log('🎉 All agents are working correctly!');
    console.log('✅ Sufficient content is being generated for ADBE');
    console.log('✅ LLM integration is functioning properly');
    console.log('✅ Data structures are valid and complete');
  } else {
    console.log('⚠️ Some agents need attention:');
    failedResults.forEach(result => {
      console.log(`   • ${result.agent}: ${result.error || 'Validation failed'}`);
    });
    console.log('\n🔧 Suggested Actions:');
    console.log('   • Check Ollama service availability');
    console.log('   • Verify agent data generation methods');
    console.log('   • Review LLM prompt engineering');
    console.log('   • Validate data structure requirements');
  }
  
  return {
    success: failedTests === 0,
    results,
    summary: {
      passed: passedTests,
      failed: failedTests,
      total: results.length,
      successRate: (passedTests / results.length) * 100,
      totalTime
    }
  };
}

// Run the test
testAllIndividualAgents().then((result) => {
  console.log('\n🏁 Test completed');
  process.exit(result.success ? 0 : 1);
}).catch((error) => {
  console.error('💥 Test failed:', error);
  process.exit(1);
}); 