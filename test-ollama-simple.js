#!/usr/bin/env node

const OllamaService = require('./backend/src/utils/ollama');

async function testOllama() {
  console.log('🧠 Testing Ollama Service...\n');
  
  try {
    const ollama = new OllamaService();
    
    console.log('📡 Checking Ollama availability...');
    const isAvailable = await ollama.isAvailable();
    console.log(`   Available: ${isAvailable ? '✅ Yes' : '❌ No'}`);
    
    if (isAvailable) {
      console.log('\n📋 Getting available models...');
      const models = await ollama.getModels();
      console.log(`   Models found: ${models.length}`);
      models.forEach(model => {
        console.log(`   • ${model.name} (${model.details?.parameter_size || 'Unknown size'})`);
      });
      
      console.log('\n🧪 Testing simple generation...');
      const response = await ollama.generate('Hello, this is a test. Please respond with "Test successful"', {
        maxTokens: 50,
        temperature: 0.1
      });
      
      console.log(`   Response: ${response.text}`);
      console.log(`   Model used: ${response.model}`);
      console.log(`   Duration: ${response.totalDuration}ms`);
      
      console.log('\n✅ Ollama service is working correctly!');
    } else {
      console.log('\n❌ Ollama service is not available');
      console.log('   Please check if Ollama is running: ollama serve');
    }
    
  } catch (error) {
    console.error('💥 Error testing Ollama:', error.message);
  }
}

testOllama().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test failed:', error);
  process.exit(1);
}); 