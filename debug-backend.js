#!/usr/bin/env node

const config = require('./backend/src/config');
const redisClient = require('./backend/src/utils/redis');

async function debugBackend() {
  console.log('🔍 [Debug] Starting backend debug check...');
  
  try {
    // Check Redis connection
    console.log('🔗 [Debug] Testing Redis connection...');
    await redisClient.connect();
    console.log('✅ [Debug] Redis connected successfully');
    
    // Check configuration
    console.log('📊 [Debug] Configuration check:');
    console.log('  - Port:', config.server.port);
    console.log('  - CORS Origin:', config.server.corsOrigin);
    console.log('  - Queues:', config.queues);
    console.log('  - API Keys configured:', {
      alphaVantage: !!config.apiKeys.alphaVantage,
      finnhub: !!config.apiKeys.finnhub,
      newsApi: !!config.apiKeys.newsApi,
      fred: !!config.apiKeys.fred
    });
    
    // Test Redis pub/sub
    console.log('🔄 [Debug] Testing Redis pub/sub...');
    
    const testMessage = {
      requestId: 'debug-test',
      agentType: 'DebugAgent',
      timestamp: new Date().toISOString(),
      payload: { test: true }
    };
    
    await redisClient.publish(config.queues.ui, testMessage);
    console.log('✅ [Debug] Published test message to UI queue');
    
    await redisClient.disconnect();
    console.log('✅ [Debug] Redis disconnected');
    
    console.log('🎉 [Debug] All backend connectivity checks passed!');
    
  } catch (error) {
    console.error('💥 [Debug] Backend check failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  debugBackend();
}

module.exports = debugBackend; 