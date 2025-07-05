const http = require('http');

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const MODEL_NAME = 'llama4:maverick';

function getOllamaModels() {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/tags', OLLAMA_URL);
    const req = http.request(url, { method: 'GET' }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.models || json.tags || []);
        } catch (e) {
          reject(new Error('Failed to parse Ollama response: ' + e.message));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  try {
    const models = await getOllamaModels();
    const found = models.some(m => (m.name || m.model || '').toLowerCase().includes(MODEL_NAME));
    if (found) {
      console.log(`✅ Ollama model '${MODEL_NAME}' is available.`);
      process.exit(0);
    } else {
      console.error(`❌ Ollama model '${MODEL_NAME}' is NOT available.`);
      console.error('Available models:', models.map(m => m.name || m.model).join(', '));
      process.exit(1);
    }
  } catch (err) {
    console.error('Error checking Ollama models:', err.message);
    process.exit(2);
  }
})(); 