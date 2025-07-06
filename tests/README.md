# Stock Analysis App - Test Suite

This directory contains all the test files for the Stock Analysis App, organized by functionality and complexity.

## 📁 Test Structure

### Basic Tests
- **`test-ollama-model-version.js`** - Verifies Ollama model availability and version
- **`test-ollama-simple.js`** - Basic Ollama service functionality test

### LLM Tests
- **`test-llm-only.js`** - Verifies LLM-only mode without fallbacks
- **`test-llm-no-fallback.js`** - Ensures no mock data fallbacks exist
- **`test-llm-enhanced-report.js`** - Tests LLM-enhanced report generation

### Agent Tests
- **`test-all-llm-agents.js`** - Comprehensive test of all LLM agents
- **`test-enhanced-agents.js`** - Tests enhanced data agents
- **`test-individual-agents-adbe.js`** - Individual agent testing with ADBE

### Feature Tests
- **`test-valuation-analysis.js`** - Tests valuation analysis functionality
- **`test-competitive-analysis.js`** - Tests competitive analysis features
- **`test-analyst-data.js`** - Tests analyst data fetching and processing

### Comprehensive Tests
- **`test-adbe-agents.js`** - Full ADBE agent testing suite
- **`test-adbe-services-simple.js`** - Simple ADBE services test
- **`test-adbe-services-comprehensive.js`** - Comprehensive ADBE services test

## 🚀 Running Tests

### Option 1: Comprehensive Test Runner (Recommended)

Run all tests with detailed reporting:

```bash
# From project root directory
node tests/run-all-tests.js
```

### Option 2: Shell Script Runner

Run tests with various options:

```bash
# From project root directory
./tests/run-tests.sh [OPTIONS]
```

**Options:**
- `--all` or `-a` - Run all tests (default)
- `--basic` or `-b` - Run basic tests only
- `--llm` or `-l` - Run LLM tests only
- `--agents` or `-g` - Run agent tests only
- `--features` or `-f` - Run feature tests only
- `--comprehensive` or `-c` - Run comprehensive tests only
- `--help` or `-h` - Show help message

**Examples:**
```bash
./tests/run-tests.sh                    # Run all tests
./tests/run-tests.sh --basic            # Run only basic tests
./tests/run-tests.sh --llm --agents     # Run LLM and agent tests
```

### Option 3: Individual Test Files

Run specific test files directly:

```bash
# From project root directory
node tests/test-ollama-simple.js
node tests/test-llm-only.js
node tests/test-all-llm-agents.js
```

## 📊 Test Categories

### Basic Tests
Quick verification of core functionality:
- Ollama service availability
- Model loading and basic operations
- **Expected Duration**: 30-60 seconds

### LLM Tests
Verification of LLM-only functionality:
- No fallback to mock data
- Proper error handling
- LLM-enhanced features
- **Expected Duration**: 2-5 minutes

### Agent Tests
Comprehensive agent functionality testing:
- All agent types (Stock, News, Fundamental, etc.)
- Agent communication
- Data processing
- **Expected Duration**: 5-15 minutes

### Feature Tests
Specific feature verification:
- Valuation calculations
- Competitive analysis
- Analyst data processing
- **Expected Duration**: 2-8 minutes

### Comprehensive Tests
Full system integration testing:
- End-to-end workflows
- Multi-agent coordination
- Performance testing
- **Expected Duration**: 10-30 minutes

## ⚙️ Prerequisites

Before running tests, ensure:

1. **Project Setup**: You're in the project root directory (`stock-analysis-app`)
2. **Dependencies**: All npm dependencies are installed
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```
3. **Services**: Required services are running
   - Redis server
   - Ollama service with `llama3.1:8b` model
4. **Environment**: Environment variables are configured (see `backend/config.example`)

## 🔧 Configuration

### Timeouts
- **Individual Test Timeout**: 5 minutes per test
- **LLM Operations**: 3 minutes
- **API Calls**: 10 seconds

### Environment Variables
Tests use the same environment configuration as the main application. Ensure your `.env` file is properly configured in the `backend` directory.

## 📈 Test Results

The comprehensive test runner provides:

- **Overall Results**: Total tests, passed, failed, success rate
- **Category Results**: Breakdown by test category
- **Detailed Logs**: Individual test output and error messages
- **Duration Tracking**: Total execution time
- **Exit Codes**: Proper exit codes for CI/CD integration

## 🐛 Troubleshooting

### Common Issues

1. **"Tests must be run from the project root directory"**
   - Ensure you're in the `stock-analysis-app` directory
   - Check that `backend/` and `tests/` directories exist

2. **"Ollama service not available"**
   - Start Ollama: `ollama serve`
   - Verify model is loaded: `ollama list`
   - Check Ollama is accessible at `http://localhost:11434`

3. **"Redis connection failed"**
   - Start Redis server: `redis-server`
   - Check Redis is running on port 6379

4. **"API key not configured"**
   - Copy `backend/config.example` to `backend/.env`
   - Add your API keys to the `.env` file

5. **"Test timeout"**
   - Increase timeout in test runner if needed
   - Check system resources (CPU, memory)
   - Verify Ollama model is loaded and responsive

### Debug Mode

For detailed debugging, run individual tests with verbose output:

```bash
DEBUG=* node tests/test-ollama-simple.js
```

## 📝 Adding New Tests

When adding new test files:

1. **Naming Convention**: Use `test-*.js` prefix
2. **Category Assignment**: Add to appropriate category in `run-all-tests.js`
3. **Documentation**: Update this README with test description
4. **Dependencies**: Ensure test has proper error handling and timeouts

### Test Template

```javascript
#!/usr/bin/env node

/**
 * Test Description
 * Brief description of what this test verifies
 */

const config = require('../backend/src/config');

class TestName {
  constructor() {
    this.name = 'Test Description';
  }

  async run() {
    console.log(`🧪 Running ${this.name}...`);
    
    try {
      // Test implementation
      console.log('✅ Test passed');
      return true;
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      return false;
    }
  }
}

// Run test if called directly
if (require.main === module) {
  const test = new TestName();
  test.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = TestName;
```

## 🤝 Contributing

When contributing to tests:

1. **Follow existing patterns** for consistency
2. **Add proper error handling** and timeouts
3. **Update documentation** when adding new test categories
4. **Test your changes** before submitting
5. **Use descriptive names** and comments

## 📞 Support

For test-related issues:

1. Check the troubleshooting section above
2. Review test logs for specific error messages
3. Verify all prerequisites are met
4. Check system resources and service status 