#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Stock Analysis App
 * Runs all tests in the tests directory with proper categorization and reporting
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Test categories
const testCategories = {
  'Basic Tests': [
    'test-ollama-model-version.js',
    'test-ollama-simple.js'
  ],
  'LLM Tests': [
    'test-llm-only.js',
    'test-llm-no-fallback.js',
    'test-llm-enhanced-report.js'
  ],
  'Agent Tests': [
    'test-all-llm-agents.js',
    'test-enhanced-agents.js',
    'test-individual-agents-adbe.js'
  ],
  'Feature Tests': [
    'test-valuation-analysis.js',
    'test-competitive-analysis.js',
    'test-analyst-data.js'
  ],
  'Comprehensive Tests': [
    'test-adbe-agents.js',
    'test-adbe-services-simple.js',
    'test-adbe-services-comprehensive.js'
  ]
};

class TestRunner {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      startTime: Date.now(),
      categories: {}
    };
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  logHeader(message) {
    this.log(`\n${'='.repeat(60)}`, 'bright');
    this.log(`  ${message}`, 'bright');
    this.log(`${'='.repeat(60)}`, 'bright');
  }

  logSubHeader(message) {
    this.log(`\n${'-'.repeat(40)}`, 'blue');
    this.log(`  ${message}`, 'blue');
    this.log(`${'-'.repeat(40)}`, 'blue');
  }

  async runTest(testFile) {
    const testPath = path.join(__dirname, testFile);
    
    if (!fs.existsSync(testPath)) {
      this.log(`❌ Test file not found: ${testFile}`, 'red');
      return { success: false, error: 'File not found' };
    }

    try {
      this.log(`🧪 Running: ${testFile}`, 'cyan');
      
      // Run the test with a timeout
      const result = execSync(`node "${testPath}"`, {
        cwd: path.dirname(__dirname), // Run from project root
        timeout: 300000, // 5 minutes timeout per test
        encoding: 'utf8'
      });
      
      this.log(`✅ ${testFile} completed successfully`, 'green');
      return { success: true, output: result };
      
    } catch (error) {
      if (error.signal === 'SIGTERM') {
        this.log(`⏰ ${testFile} timed out`, 'yellow');
        return { success: false, error: 'Timeout' };
      } else {
        this.log(`❌ ${testFile} failed: ${error.message}`, 'red');
        return { success: false, error: error.message, output: error.stdout || error.stderr };
      }
    }
  }

  async runCategory(categoryName, testFiles) {
    this.logSubHeader(`Running ${categoryName}`);
    
    this.results.categories[categoryName] = {
      total: testFiles.length,
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: {}
    };

    for (const testFile of testFiles) {
      this.results.total++;
      this.results.categories[categoryName].total++;
      
      const result = await this.runTest(testFile);
      
      if (result.success) {
        this.results.passed++;
        this.results.categories[categoryName].passed++;
        this.results.categories[categoryName].tests[testFile] = { status: 'passed' };
      } else {
        this.results.failed++;
        this.results.categories[categoryName].failed++;
        this.results.categories[categoryName].tests[testFile] = { 
          status: 'failed', 
          error: result.error 
        };
      }
    }
  }

  printResults() {
    const duration = Date.now() - this.results.startTime;
    
    this.logHeader('TEST RESULTS SUMMARY');
    
    // Overall results
    this.log(`\n📊 Overall Results:`, 'bright');
    this.log(`   Total Tests: ${this.results.total}`, 'cyan');
    this.log(`   ✅ Passed: ${this.results.passed}`, 'green');
    this.log(`   ❌ Failed: ${this.results.failed}`, 'red');
    this.log(`   ⏭️  Skipped: ${this.results.skipped}`, 'yellow');
    this.log(`   ⏱️  Duration: ${(duration / 1000).toFixed(2)}s`, 'cyan');
    
    const successRate = this.results.total > 0 ? (this.results.passed / this.results.total * 100).toFixed(1) : 0;
    this.log(`   📈 Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : successRate >= 60 ? 'yellow' : 'red');
    
    // Category results
    this.log(`\n📋 Category Results:`, 'bright');
    for (const [category, stats] of Object.entries(this.results.categories)) {
      const categorySuccessRate = stats.total > 0 ? (stats.passed / stats.total * 100).toFixed(1) : 0;
      const color = categorySuccessRate >= 80 ? 'green' : categorySuccessRate >= 60 ? 'yellow' : 'red';
      
      this.log(`   ${category}:`, 'cyan');
      this.log(`     ✅ ${stats.passed}/${stats.total} passed (${categorySuccessRate}%)`, color);
      
      // Show failed tests in this category
      if (stats.failed > 0) {
        this.log(`     ❌ Failed tests:`, 'red');
        for (const [testFile, testResult] of Object.entries(stats.tests)) {
          if (testResult.status === 'failed') {
            this.log(`       - ${testFile}: ${testResult.error}`, 'red');
          }
        }
      }
    }
    
    // Final status
    this.log(`\n${'='.repeat(60)}`, 'bright');
    if (this.results.failed === 0) {
      this.log(`🎉 ALL TESTS PASSED!`, 'green');
    } else {
      this.log(`⚠️  ${this.results.failed} test(s) failed. Please review the results above.`, 'yellow');
    }
    this.log(`${'='.repeat(60)}`, 'bright');
  }

  async runAllTests() {
    this.logHeader('STOCK ANALYSIS APP - COMPREHENSIVE TEST SUITE');
    this.log(`🚀 Starting test execution at ${new Date().toLocaleString()}`, 'cyan');
    
    // Check if we're in the right directory
    if (!fs.existsSync(path.join(__dirname, '..', 'backend'))) {
      this.log('❌ Error: Tests must be run from the project root directory', 'red');
      this.log('   Please run: node tests/run-all-tests.js', 'yellow');
      process.exit(1);
    }
    
    // Run tests by category
    for (const [categoryName, testFiles] of Object.entries(testCategories)) {
      await this.runCategory(categoryName, testFiles);
    }
    
    // Print results
    this.printResults();
    
    // Exit with appropriate code
    process.exit(this.results.failed > 0 ? 1 : 0);
  }
}

// Run the tests
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAllTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = TestRunner; 