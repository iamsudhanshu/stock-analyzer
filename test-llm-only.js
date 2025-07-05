#!/usr/bin/env node

/**
 * Test Script: LLM-Only Agent Verification
 * 
 * This script tests that all agents are now purely LLM-based with no fallbacks
 * to traditional analysis methods. It verifies that:
 * 1. All agents require LLM capabilities
 * 2. No fallback methods are called
 * 3. Errors are thrown when LLM is not available
 * 4. All analysis is LLM-enhanced
 */

const StockDataAgent = require('./backend/src/agents/stockDataAgent');
const NewsSentimentAgent = require('./backend/src/agents/newsSentimentAgent');
const FundamentalDataAgent = require('./backend/src/agents/fundamentalDataAgent');
const CompetitiveAgent = require('./backend/src/agents/competitiveAgent');
const UIAgent = require('./backend/src/agents/uiAgent');

const logger = require('./backend/src/utils/logger');

class LLMOnlyTester {
  constructor() {
    this.results = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      errors: []
    };
  }

  async runTests() {
    console.log('🧪 [LLM-Only Tester] Starting LLM-only verification tests...\n');

    try {
      // Test 1: Verify agents throw errors when LLM is not available
      await this.testLLMRequired();
      
      // Test 2: Verify no fallback methods exist
      await this.testNoFallbackMethods();
      
      // Test 3: Verify all analysis is LLM-enhanced
      await this.testLLMEnhancedAnalysis();
      
      // Test 4: Verify error handling without fallbacks
      await this.testErrorHandling();

    } catch (error) {
      console.error('❌ [LLM-Only Tester] Test suite error:', error);
      this.results.errors.push(error.message);
    }

    this.printResults();
  }

  async testLLMRequired() {
    console.log('📋 [Test 1] Verifying LLM requirement...');
    
    const agents = [
      { name: 'StockDataAgent', class: StockDataAgent, method: 'generateLLMEnhancedStockData' },
      { name: 'NewsSentimentAgent', class: NewsSentimentAgent, method: 'generateLLMEnhancedNewsSentiment' },
      { name: 'FundamentalDataAgent', class: FundamentalDataAgent, method: 'generateLLMEnhancedFundamentalData' },
      { name: 'CompetitiveAgent', class: CompetitiveAgent, method: 'generateLLMEnhancedCompetitiveData' },
      { name: 'UIAgent', class: UIAgent, method: 'generateLLMEnhancedUIRecommendations' }
    ];

    for (const agentInfo of agents) {
      try {
        const agent = new agentInfo.class();
        
        // Disable LLM to simulate unavailability
        agent.ollamaEnabled = false;
        
        // Try to generate data - should throw error
        if (agentInfo.name === 'UIAgent') {
          await agent[agentInfo.method]('AAPL', {});
        } else {
          await agent[agentInfo.method]('AAPL');
        }
        
        // If we get here, the test failed
        this.recordTestFailure(`${agentInfo.name} should require LLM but didn't throw error`);
        
      } catch (error) {
        if (error.message.includes('LLM is required') || error.message.includes('Ollama service is not available')) {
          this.recordTestSuccess(`${agentInfo.name} correctly requires LLM`);
        } else {
          this.recordTestFailure(`${agentInfo.name} threw unexpected error: ${error.message}`);
        }
      }
    }
  }

  async testNoFallbackMethods() {
    console.log('📋 [Test 2] Verifying no fallback methods exist...');
    
    const agents = [
      { name: 'StockDataAgent', class: StockDataAgent },
      { name: 'NewsSentimentAgent', class: NewsSentimentAgent },
      { name: 'FundamentalDataAgent', class: FundamentalDataAgent },
      { name: 'CompetitiveAgent', class: CompetitiveAgent },
      { name: 'UIAgent', class: UIAgent }
    ];

    for (const agentInfo of agents) {
      const agent = new agentInfo.class();
      
      // Check for fallback method names
      const fallbackMethods = [
        'generateFallbackAnalysis',
        'generateEnhancedTraditionalAnalysis',
        'generateEnhancedTraditionalSentiment',
        'generateEnhancedTraditionalFundamentals',
        'generateEnhancedTraditionalCompetitive',
        'generateEnhancedTraditionalUI'
      ];

      for (const methodName of fallbackMethods) {
        if (typeof agent[methodName] === 'function') {
          this.recordTestFailure(`${agentInfo.name} still has fallback method: ${methodName}`);
        } else {
          this.recordTestSuccess(`${agentInfo.name} has no fallback method: ${methodName}`);
        }
      }
    }
  }

  async testLLMEnhancedAnalysis() {
    console.log('📋 [Test 3] Verifying LLM-enhanced analysis...');
    
    const agents = [
      { name: 'StockDataAgent', class: StockDataAgent },
      { name: 'NewsSentimentAgent', class: NewsSentimentAgent },
      { name: 'FundamentalDataAgent', class: FundamentalDataAgent },
      { name: 'CompetitiveAgent', class: CompetitiveAgent },
      { name: 'UIAgent', class: UIAgent }
    ];

    for (const agentInfo of agents) {
      try {
        const agent = new agentInfo.class();
        
        // Mock LLM to return valid response
        agent.ollamaEnabled = true;
        agent.ollama = {
          generate: async () => JSON.stringify({
            analysis: 'test_analysis',
            confidence: 75,
            insights: 'test_insights'
          })
        };
        
        // Test the main analysis method
        let result;
        switch (agentInfo.name) {
          case 'StockDataAgent':
            result = await agent.generateLLMEnhancedStockData('AAPL');
            break;
          case 'NewsSentimentAgent':
            result = await agent.generateLLMEnhancedNewsSentiment('AAPL');
            break;
          case 'FundamentalDataAgent':
            result = await agent.generateLLMEnhancedFundamentalData('AAPL');
            break;
          case 'CompetitiveAgent':
            result = await agent.generateLLMEnhancedCompetitiveData('AAPL');
            break;
          case 'UIAgent':
            result = await agent.generateLLMEnhancedUIRecommendations('AAPL', {});
            break;
        }
        
        // Test LLM analysis - all agents should be LLM-based
        if (result && result.llmInsights) {
          console.log(`   ✅ ${agentInfo.name} LLM analysis successful`);
          this.recordTestSuccess(`${agentInfo.name} produces LLM-enhanced analysis`);
        } else {
          this.recordTestFailure(`${agentInfo.name} does not produce LLM-enhanced analysis`);
        }
        
      } catch (error) {
        this.recordTestFailure(`${agentInfo.name} error in LLM analysis: ${error.message}`);
      }
    }
  }

  async testErrorHandling() {
    console.log('📋 [Test 4] Verifying error handling without fallbacks...');
    
    const agents = [
      { name: 'StockDataAgent', class: StockDataAgent },
      { name: 'NewsSentimentAgent', class: NewsSentimentAgent },
      { name: 'FundamentalDataAgent', class: FundamentalDataAgent },
      { name: 'CompetitiveAgent', class: CompetitiveAgent },
      { name: 'UIAgent', class: UIAgent }
    ];

    for (const agentInfo of agents) {
      try {
        const agent = new agentInfo.class();
        
        // Mock LLM to throw error
        agent.ollamaEnabled = true;
        agent.ollama = {
          generate: async () => { throw new Error('LLM service error'); }
        };
        
        // Try to generate data - should throw error instead of falling back
        if (agentInfo.name === 'UIAgent') {
          await agent.generateLLMEnhancedUIRecommendations('AAPL', {});
        } else if (agentInfo.name === 'StockDataAgent') {
          await agent.generateLLMEnhancedStockData('AAPL');
        } else if (agentInfo.name === 'NewsSentimentAgent') {
          await agent.generateLLMEnhancedNewsSentiment('AAPL');
        } else if (agentInfo.name === 'FundamentalDataAgent') {
          await agent.generateLLMEnhancedFundamentalData('AAPL');
        } else if (agentInfo.name === 'CompetitiveAgent') {
          await agent.generateLLMEnhancedCompetitiveData('AAPL');
        }
        
        // If we get here, the test failed
        this.recordTestFailure(`${agentInfo.name} should throw error but didn't`);
        
      } catch (error) {
        if (error.message.includes('LLM analysis error') || error.message.includes('LLM service error')) {
          this.recordTestSuccess(`${agentInfo.name} correctly throws error without fallback`);
        } else {
          this.recordTestFailure(`${agentInfo.name} threw unexpected error: ${error.message}`);
        }
      }
    }
  }

  recordTestSuccess(message) {
    this.results.totalTests++;
    this.results.passedTests++;
    console.log(`✅ ${message}`);
  }

  recordTestFailure(message) {
    this.results.totalTests++;
    this.results.failedTests++;
    console.log(`❌ ${message}`);
  }

  printResults() {
    console.log('\n📊 [LLM-Only Tester] Test Results:');
    console.log('=====================================');
    console.log(`Total Tests: ${this.results.totalTests}`);
    console.log(`Passed: ${this.results.passedTests}`);
    console.log(`Failed: ${this.results.failedTests}`);
    console.log(`Success Rate: ${((this.results.passedTests / this.results.totalTests) * 100).toFixed(1)}%`);
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.results.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (this.results.failedTests === 0) {
      console.log('\n🎉 All tests passed! Agents are purely LLM-based.');
    } else {
      console.log('\n⚠️  Some tests failed. Review the results above.');
    }
  }
}

// Run the tests
if (require.main === module) {
  const tester = new LLMOnlyTester();
  tester.runTests().catch(error => {
    console.error('❌ Test runner error:', error);
    process.exit(1);
  });
}

module.exports = LLMOnlyTester; 