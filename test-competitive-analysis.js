const axios = require('axios');

async function testCompetitiveAnalysis() {
    console.log('🧪 Testing Competitive Analysis with Real Competitor Names\n');
    
    const testStocks = ['AAPL', 'MSFT', 'JPM', 'XOM', 'JNJ'];
    
    for (const symbol of testStocks) {
        try {
            console.log(`📊 Testing ${symbol} competitive analysis...`);
            
            const response = await axios.post(`http://localhost:3001/api/analyze/${symbol}`, {
                analysisType: 'comprehensive'
            }, {
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.data && response.data.competitive) {
                const competitors = response.data.competitive.peers || [];
                const hasRealNames = competitors.some(comp => 
                    !comp.includes('Competitor') && comp.length <= 5
                );
                
                console.log(`✅ ${symbol}: Found ${competitors.length} competitors`);
                console.log(`   Competitors: ${competitors.join(', ')}`);
                console.log(`   Real names: ${hasRealNames ? '✅ YES' : '❌ NO'}`);
                
                if (hasRealNames) {
                    console.log(`   ✅ SUCCESS: ${symbol} uses real competitor names!\n`);
                } else {
                    console.log(`   ❌ FAILED: ${symbol} still uses generic names\n`);
                }
            } else {
                console.log(`❌ ${symbol}: No competitive data found\n`);
            }
            
        } catch (error) {
            console.log(`❌ ${symbol}: Error - ${error.message}\n`);
        }
        
        // Wait between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('🏁 Competitive analysis test completed!');
}

// Run the test
testCompetitiveAnalysis().catch(console.error); 