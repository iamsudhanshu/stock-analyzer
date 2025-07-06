const axios = require('axios');

async function testValuationAnalysis() {
    console.log('🧪 Testing Valuation Analysis - No More Hard-coded Values\n');
    
    const testStocks = ['AAPL', 'MSFT', 'JPM', 'XOM', 'JNJ'];
    
    for (const symbol of testStocks) {
        try {
            console.log(`📊 Testing ${symbol} valuation analysis...`);
            
            const response = await axios.post(`http://localhost:3001/api/analyze/${symbol}`, {
                analysisType: 'comprehensive'
            }, {
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.data && response.data.fundamentalData) {
                const valuation = response.data.fundamentalData.fundamentals?.valuation;
                const reportData = response.data.reportData;
                
                console.log(`✅ ${symbol}: Valuation data found`);
                
                // Check for hard-coded values
                const hasHardCodedValues = 
                    valuation?.fairValue === '225' ||
                    valuation?.upsidePotential === 15 ||
                    reportData?.executiveSummary?.recommendation?.targetPrice === '225' ||
                    reportData?.fundamentalAnalysis?.valuation?.assessment === 'Fairly valued relative to peers';
                
                console.log(`   Fair Value: ${valuation?.fairValue || 'N/A'}`);
                console.log(`   Upside Potential: ${valuation?.upsidePotential || 'N/A'}%`);
                console.log(`   Target Price: ${reportData?.executiveSummary?.recommendation?.targetPrice || 'N/A'}`);
                console.log(`   Valuation Method: ${valuation?.description || 'N/A'}`);
                
                if (hasHardCodedValues) {
                    console.log(`   ❌ FAILED: ${symbol} still has hard-coded values\n`);
                } else {
                    console.log(`   ✅ SUCCESS: ${symbol} uses calculated values!\n`);
                }
            } else {
                console.log(`❌ ${symbol}: No fundamental data found\n`);
            }
            
        } catch (error) {
            console.log(`❌ ${symbol}: Error - ${error.message}\n`);
        }
        
        // Wait between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('🏁 Valuation analysis test completed!');
}

// Run the test
testValuationAnalysis().catch(console.error); 