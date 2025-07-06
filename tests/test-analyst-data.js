const EnhancedDataAgent = require('../backend/src/agents/enhancedDataAgent');
const config = require('../backend/src/config');

async function testAnalystData() {
  console.log('🧪 Testing Analyst Data Fetching\n');
  
  const agent = new EnhancedDataAgent();
  await agent.initialize();
  
  const testSymbol = 'AAPL';
  
  try {
    console.log(`🔍 Testing analyst data fetching for ${testSymbol}...`);
    
    // Test individual API methods
    console.log('\n📊 Testing Alpha Vantage analyst data...');
    try {
      const alphaVantageData = await agent.fetchAnalystDataFromAlphaVantage(testSymbol);
      console.log('✅ Alpha Vantage data:', JSON.stringify(alphaVantageData, null, 2));
    } catch (error) {
      console.log('❌ Alpha Vantage failed:', error.message);
    }
    
    console.log('\n📊 Testing Finnhub analyst data...');
    try {
      const finnhubData = await agent.fetchAnalystDataFromFinnhub(testSymbol);
      console.log('✅ Finnhub data:', JSON.stringify(finnhubData, null, 2));
    } catch (error) {
      console.log('❌ Finnhub failed:', error.message);
    }
    
    console.log('\n📊 Testing Twelve Data analyst data...');
    try {
      const twelveDataData = await agent.fetchAnalystDataFromTwelveData(testSymbol);
      console.log('✅ Twelve Data data:', JSON.stringify(twelveDataData, null, 2));
    } catch (error) {
      console.log('❌ Twelve Data failed:', error.message);
    }
    
    // Test the main fetchRealAnalystData method
    console.log('\n📊 Testing main fetchRealAnalystData method...');
    try {
      const realData = await agent.fetchRealAnalystData(testSymbol);
      console.log('✅ Real analyst data fetched successfully:');
      console.log(JSON.stringify(realData, null, 2));
    } catch (error) {
      console.log('❌ fetchRealAnalystData failed:', error.message);
    }
    
    // Test the full enhanced data generation
    console.log('\n📊 Testing full enhanced data generation...');
    try {
      const enhancedData = await agent.generateLLMEnhancedData(testSymbol);
      console.log('✅ Enhanced data generated successfully');
      console.log('Analyst ratings:', JSON.stringify(enhancedData.enhancedData.analystRatings, null, 2));
    } catch (error) {
      console.log('❌ Enhanced data generation failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAnalystData().catch(console.error); 