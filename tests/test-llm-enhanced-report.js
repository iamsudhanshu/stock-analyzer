const axios = require('axios');

async function testLLMEnhancedReport() {
    console.log('🧪 Testing LLM-Enhanced Report - No Mock Data Fallback\n');
    
    const testStocks = ['AAPL', 'MSFT', 'JPM'];
    
    for (const symbol of testStocks) {
        try {
            console.log(`📊 Testing ${symbol} LLM-enhanced report...`);
            
            const response = await axios.post(`http://localhost:3001/api/analyze/${symbol}`, {
                analysisType: 'comprehensive'
            }, {
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.data) {
                const reportData = response.data.reportData;
                const llmInsights = response.data.llmInsights;
                
                console.log(`✅ ${symbol}: Report data found`);
                
                // Check if LLM-enhanced report was generated
                if (llmInsights && reportData?.llmEnhanced) {
                    console.log(`   ✅ SUCCESS: LLM-enhanced report generated`);
                    console.log(`   LLM Insights: ${llmInsights.investmentThesis?.primaryThesis || 'N/A'}`);
                    console.log(`   Valuation: ${llmInsights.valuationAnalysis?.fairValue || 'N/A'}`);
                    console.log(`   Recommendation: ${llmInsights.recommendations?.action || 'N/A'}`);
                } else {
                    console.log(`   ⚠️  Standard report generated (no LLM enhancement)`);
                }
                
                // Check for mock data indicators
                const hasMockData = 
                    reportData?.executiveSummary?.recommendation?.targetPrice === '225' ||
                    reportData?.fundamentalAnalysis?.valuation?.assessment === 'Fairly valued relative to peers' ||
                    llmInsights?.valuationAnalysis?.fairValue === '225' ||
                    llmInsights?.recommendations?.targetPrice === '225';
                
                if (hasMockData) {
                    console.log(`   ❌ FAILED: ${symbol} still contains mock data\n`);
                } else {
                    console.log(`   ✅ SUCCESS: ${symbol} uses real data!\n`);
                }
            } else {
                console.log(`❌ ${symbol}: No report data found\n`);
            }
            
        } catch (error) {
            if (error.response?.status === 500) {
                console.log(`❌ ${symbol}: Server error - LLM may not be available`);
                console.log(`   Error: ${error.response.data?.message || error.message}\n`);
            } else {
                console.log(`❌ ${symbol}: Error - ${error.message}\n`);
            }
        }
        
        // Wait between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('🏁 LLM-enhanced report test completed!');
    console.log('\n📋 Expected Behavior:');
    console.log('- If LLM is available: Generate real LLM-enhanced reports');
    console.log('- If LLM is not available: Fail with clear error message');
    console.log('- No fallback to mock data in LLM-enhanced reports');
}

// Run the test
testLLMEnhancedReport().catch(console.error); 