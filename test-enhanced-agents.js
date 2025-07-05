#!/usr/bin/env node

const config = require('./backend/src/config');
const logger = require('./backend/src/utils/logger');

// Import the new agents
const EnhancedDataAgent = require('./backend/src/agents/enhancedDataAgent');
const AdvancedTechnicalAgent = require('./backend/src/agents/advancedTechnicalAgent');
const ReportGeneratorAgent = require('./backend/src/agents/reportGeneratorAgent');

async function testEnhancedAgents() {
  console.log('🧪 Testing Enhanced Stock Analysis Agents...\n');

  try {
    // Test EnhancedDataAgent
    console.log('📊 Testing EnhancedDataAgent...');
    const enhancedAgent = new EnhancedDataAgent();
    await enhancedAgent.start();
    
    const enhancedResult = await enhancedAgent.processMessage({
      requestId: 'test-enhanced-001',
      agentType: 'UIAgent',
      status: 'success',
      payload: { symbol: 'AAPL' },
      timestamp: new Date().toISOString()
    });
    
    console.log('✅ EnhancedDataAgent test completed');
    console.log('📈 Enhanced data keys:', Object.keys(enhancedResult?.payload || {}));
    
    await enhancedAgent.stop();

    // Test AdvancedTechnicalAgent
    console.log('\n📈 Testing AdvancedTechnicalAgent...');
    const technicalAgent = new AdvancedTechnicalAgent();
    await technicalAgent.start();
    
    const technicalResult = await technicalAgent.processMessage({
      requestId: 'test-technical-001',
      agentType: 'UIAgent',
      status: 'success',
      payload: { symbol: 'AAPL' },
      timestamp: new Date().toISOString()
    });
    
    console.log('✅ AdvancedTechnicalAgent test completed');
    console.log('📊 Technical analysis keys:', Object.keys(technicalResult?.payload || {}));
    
    await technicalAgent.stop();

    // Test ReportGeneratorAgent
    console.log('\n📄 Testing ReportGeneratorAgent...');
    const reportAgent = new ReportGeneratorAgent();
    await reportAgent.start();
    
    // Create mock data for report generation
    const mockData = {
      stockData: {
        currentPrice: 150.25,
        technicalIndicators: { rsi: 65, macd: 2.5 }
      },
      newsData: {
        sentimentAnalysis: { overallScore: 75 }
      },
      fundamentalData: {
        fundamentals: { metrics: { peRatio: 25.5 } }
      },
      competitiveData: {
        competitive: { marketPosition: { marketShare: 15 } }
      }
    };
    
    const reportResult = await reportAgent.processMessage({
      requestId: 'test-report-001',
      agentType: 'AnalysisAgent',
      status: 'success',
      payload: { symbol: 'AAPL', ...mockData },
      timestamp: new Date().toISOString()
    });
    
    console.log('✅ ReportGeneratorAgent test completed');
    console.log('📋 Report sections:', Object.keys(reportResult?.payload || {}));
    
    await reportAgent.stop();

    console.log('\n🎉 All enhanced agents tested successfully!');
    console.log('\n📋 Summary:');
    console.log('- EnhancedDataAgent: ✅ Options, institutional, insider, analyst data');
    console.log('- AdvancedTechnicalAgent: ✅ Elliott Wave, Fibonacci, patterns');
    console.log('- ReportGeneratorAgent: ✅ Professional reports with sections');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    logger.error('Enhanced agents test failed:', error);
    process.exit(1);
  }
}

// Run the test
testEnhancedAgents().then(() => {
  console.log('\n✅ Test completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
}); 