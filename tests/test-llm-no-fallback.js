const AdvancedTechnicalAgent = require('../backend/src/agents/advancedTechnicalAgent');
const EnhancedDataAgent = require('../backend/src/agents/enhancedDataAgent');
const StockDataAgent = require('../backend/src/agents/stockDataAgent');
const FundamentalDataAgent = require('../backend/src/agents/fundamentalDataAgent');
const CompetitiveAgent = require('../backend/src/agents/competitiveAgent');
const NewsSentimentAgent = require('../backend/src/agents/newsSentimentAgent');
const UIAgent = require('../backend/src/agents/uiAgent');
const ReportGeneratorAgent = require('../backend/src/agents/reportGeneratorAgent');

const logger = require('../backend/src/utils/logger');
const config = require('../backend/src/config');

async function testLLMNoFallback() {
  console.log('🧪 Testing LLM No Fallback for All Agents\n');
  
  // Disable Ollama to simulate LLM failure
  const originalOllamaEnabled = config.ollama.enabled;
  config.ollama.enabled = false;
  
  const testSymbol = 'AAPL';
  const agents = [
    { name: 'AdvancedTechnicalAgent', agent: new AdvancedTechnicalAgent(), method: 'generateLLMEnhancedAdvancedTechnicalData' },
    { name: 'EnhancedDataAgent', agent: new EnhancedDataAgent(), method: 'generateLLMEnhancedData' },
    { name: 'StockDataAgent', agent: new StockDataAgent(), method: 'generateLLMEnhancedStockData' },
    { name: 'FundamentalDataAgent', agent: new FundamentalDataAgent(), method: 'generateLLMEnhancedFundamentalData' },
    { name: 'CompetitiveAgent', agent: new CompetitiveAgent(), method: 'generateLLMEnhancedCompetitiveData' },
    { name: 'NewsSentimentAgent', agent: new NewsSentimentAgent(), method: 'generateLLMEnhancedNewsSentiment' },
    { name: 'ReportGeneratorAgent', agent: new ReportGeneratorAgent(), method: 'generateReport' }
  ];

  let allTestsPassed = true;
  const results = [];

  for (const agentInfo of agents) {
    try {
      console.log(`🔍 Testing ${agentInfo.name}...`);
      
      // Initialize the agent
      await agentInfo.agent.initialize();
      
      // Test the LLM method
      let result;
      if (agentInfo.name === 'ReportGeneratorAgent') {
        // ReportGeneratorAgent needs analysis data
        const mockAnalysisData = {
          stockData: { currentPrice: { price: 150 } },
          fundamentalData: { fundamentals: { marketCap: 100000000000 } },
          newsSentiment: { sentimentAnalysis: { overallScore: 60 } },
          competitiveData: { competitive: { peers: [] } },
          enhancedData: { optionsData: {} },
          advancedTechnical: { chartPatterns: {} }
        };
        result = await agentInfo.agent[agentInfo.method](testSymbol, mockAnalysisData);
      } else {
        result = await agentInfo.agent[agentInfo.method](testSymbol);
      }
      
      // If we get here, the agent didn't fail as expected
      console.log(`   ❌ FAILED: ${agentInfo.name} should have failed but returned:`, result);
      allTestsPassed = false;
      results.push({ agent: agentInfo.name, status: 'FAILED', error: 'Should have failed but succeeded' });
      
    } catch (error) {
      // Check if the error message indicates LLM requirement
      if (error.message.includes('LLM is required') || error.message.includes('Ollama service is not available')) {
        console.log(`   ✅ PASSED: ${agentInfo.name} properly failed with LLM requirement`);
        results.push({ agent: agentInfo.name, status: 'PASSED', error: error.message });
      } else {
        console.log(`   ❌ FAILED: ${agentInfo.name} failed with unexpected error:`, error.message);
        allTestsPassed = false;
        results.push({ agent: agentInfo.name, status: 'FAILED', error: error.message });
      }
    }
  }

  // Restore original Ollama setting
  config.ollama.enabled = originalOllamaEnabled;

  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  results.forEach(result => {
    const status = result.status === 'PASSED' ? '✅' : '❌';
    console.log(`${status} ${result.agent}: ${result.status}`);
    if (result.status === 'FAILED') {
      console.log(`   Error: ${result.error}`);
    }
  });

  if (allTestsPassed) {
    console.log('\n✅ All agents properly fail when LLM is not available');
    console.log('✅ No agents fall back to mock data in LLM methods');
  } else {
    console.log('\n❌ SOME TESTS FAILED: Some agents may still fall back to mock data');
  }

  return allTestsPassed;
}

// Run the test
testLLMNoFallback().catch(console.error); 
testLLMNoFallback().catch(console.error); 