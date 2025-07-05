#!/usr/bin/env node

const config = require('./backend/src/config');
const logger = require('./backend/src/utils/logger');
const OllamaService = require('./backend/src/utils/ollama');

// Import agents
const StockDataAgent = require('./backend/src/agents/stockDataAgent');
const NewsSentimentAgent = require('./backend/src/agents/newsSentimentAgent');

const TEST_SYMBOL = 'ADBE';

// Test results
let passed = 0;
let failed = 0;

function logTest(testName, status, details = '') {
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${testName}: ${status}${details ? ` - ${details}` : ''}`);
  if (status === 'PASS') passed++;
  else failed++;
}

async function testOllamaService() {
  console.log('\n🔍 Testing Ollama Service...');
  
  try {
    const ollama = new OllamaService();
    
    // Test availability
    const isAvailable = await ollama.isAvailable();
    if (!isAvailable) {
      logTest('Ollama Availability', 'FAIL', 'Service not available');
      return false;
    }
    logTest('Ollama Availability', 'PASS');
    
    // Test models
    const models = await ollama.getModels();
    if (!Array.isArray(models) || models.length === 0) {
      logTest('Ollama Models', 'FAIL', 'No models available');
      return false;
    }
    logTest('Ollama Models', 'PASS', `${models.length} models`);
    
    // Test generation
    const response = await ollama.generate('Test message for ADBE', { maxTokens: 20 });
    if (!response || !response.text) {
      logTest('Ollama Generation', 'FAIL', 'No response');
      return false;
    }
    logTest('Ollama Generation', 'PASS', `${response.text.length} chars`);
    
    return true;
  } catch (error) {
    logTest('Ollama Service', 'FAIL', error.message);
    return false;
  }
}

async function testStockDataAgent() {
  console.log('\n📊 Testing StockDataAgent...');
  
  try {
    const agent = new StockDataAgent();
    
    // Test LLM initialization
    await agent.initializeLLM();
    if (!agent.ollamaEnabled) {
      logTest('StockDataAgent LLM', 'FAIL', 'LLM not enabled');
      return false;
    }
    logTest('StockDataAgent LLM', 'PASS');
    
    // Test data generation
    const data = await agent.generateLLMEnhancedStockData(TEST_SYMBOL);
    if (!data || typeof data !== 'object') {
      logTest('StockDataAgent Data', 'FAIL', 'No data returned');
      return false;
    }
    
    // Check required fields
    const requiredFields = ['currentPrice', 'volume', 'marketCap', 'technicalIndicators'];
    for (const field of requiredFields) {
      if (!data[field]) {
        logTest(`StockDataAgent ${field}`, 'FAIL', 'Missing field');
        return false;
      }
    }
    logTest('StockDataAgent Data', 'PASS', `${Object.keys(data).length} fields`);
    
    // Check LLM insights
    if (!data.llmInsights) {
      logTest('StockDataAgent LLM Insights', 'FAIL', 'No LLM insights');
      return false;
    }
    logTest('StockDataAgent LLM Insights', 'PASS');
    
    return true;
  } catch (error) {
    logTest('StockDataAgent', 'FAIL', error.message);
    return false;
  }
}

async function testNewsSentimentAgent() {
  console.log('\n📰 Testing NewsSentimentAgent...');
  
  try {
    const agent = new NewsSentimentAgent();
    
    // Test LLM initialization
    await agent.initializeLLM();
    if (!agent.ollamaEnabled) {
      logTest('NewsSentimentAgent LLM', 'FAIL', 'LLM not enabled');
      return false;
    }
    logTest('NewsSentimentAgent LLM', 'PASS');
    
    // Test data generation
    const data = await agent.generateLLMEnhancedNewsSentiment(TEST_SYMBOL);
    if (!data || typeof data !== 'object') {
      logTest('NewsSentimentAgent Data', 'FAIL', 'No data returned');
      return false;
    }
    
    // Check required fields
    const requiredFields = ['articles', 'sentimentAnalysis', 'socialSentiment'];
    for (const field of requiredFields) {
      if (!data[field]) {
        logTest(`NewsSentimentAgent ${field}`, 'FAIL', 'Missing field');
        return false;
      }
    }
    logTest('NewsSentimentAgent Data', 'PASS', `${Object.keys(data).length} fields`);
    
    // Check articles
    if (!Array.isArray(data.articles) || data.articles.length === 0) {
      logTest('NewsSentimentAgent Articles', 'FAIL', 'No articles');
      return false;
    }
    logTest('NewsSentimentAgent Articles', 'PASS', `${data.articles.length} articles`);
    
    // Check LLM insights
    if (!data.llmInsights) {
      logTest('NewsSentimentAgent LLM Insights', 'FAIL', 'No LLM insights');
      return false;
    }
    logTest('NewsSentimentAgent LLM Insights', 'PASS');
    
    return true;
  } catch (error) {
    logTest('NewsSentimentAgent', 'FAIL', error.message);
    return false;
  }
}

async function testAPIKeys() {
  console.log('\n🔑 Testing API Keys...');
  
  const keys = config.apiKeys;
  const requiredKeys = ['alphaVantage', 'newsApi'];
  
  for (const key of requiredKeys) {
    if (!keys[key] || keys[key] === `your_${key}_api_key_here`) {
      logTest(`API Key: ${key}`, 'FAIL', 'Missing or placeholder');
    } else {
      logTest(`API Key: ${key}`, 'PASS', 'Present');
    }
  }
  
  return true;
}

async function runAllTests() {
  console.log('🧪 ADBE Services Test Suite');
  console.log('=' .repeat(50));
  console.log(`Test Symbol: ${TEST_SYMBOL}`);
  console.log('=' .repeat(50));
  
  const startTime = Date.now();
  
  try {
    await testOllamaService();
    await testAPIKeys();
    await testStockDataAgent();
    await testNewsSentimentAgent();
  } catch (error) {
    console.error('💥 Test error:', error);
  }
  
  const duration = (Date.now() - startTime) / 1000;
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️ Duration: ${duration.toFixed(2)}s`);
  console.log(`🎯 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(50));
  
  process.exit(failed > 0 ? 1 : 0);
}

if (require.main === module) {
  runAllTests().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  testOllamaService,
  testStockDataAgent,
  testNewsSentimentAgent,
  testAPIKeys
}; 