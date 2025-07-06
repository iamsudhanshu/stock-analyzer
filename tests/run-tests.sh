#!/bin/bash

# Stock Analysis App - Test Runner Script
# This script provides an easy way to run all tests or specific test categories

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    echo -e "${2}${1}${NC}"
}

# Function to show usage
show_usage() {
    echo "Stock Analysis App - Test Runner"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -a, --all           Run all tests (default)"
    echo "  -b, --basic         Run basic tests only"
    echo "  -l, --llm           Run LLM tests only"
    echo "  -g, --agents        Run agent tests only"
    echo "  -f, --features      Run feature tests only"
    echo "  -c, --comprehensive Run comprehensive tests only"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                  # Run all tests"
    echo "  $0 --basic          # Run only basic tests"
    echo "  $0 --llm --agents   # Run LLM and agent tests"
    echo ""
}

# Function to check prerequisites
check_prerequisites() {
    print_color "🔍 Checking prerequisites..." "$CYAN"
    
    # Check if we're in the right directory
    if [ ! -d "backend" ]; then
        print_color "❌ Error: Must be run from the project root directory" "$RED"
        print_color "   Current directory: $(pwd)" "$YELLOW"
        print_color "   Expected: stock-analysis-app directory" "$YELLOW"
        exit 1
    fi
    
    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        print_color "❌ Error: Node.js is not installed or not in PATH" "$RED"
        exit 1
    fi
    
    # Check if tests directory exists
    if [ ! -d "tests" ]; then
        print_color "❌ Error: Tests directory not found" "$RED"
        exit 1
    fi
    
    print_color "✅ Prerequisites check passed" "$GREEN"
}

# Function to run specific test category
run_test_category() {
    local category=$1
    local test_files=()
    
    case $category in
        "basic")
            test_files=("test-ollama-model-version.js" "test-ollama-simple.js")
            ;;
        "llm")
            test_files=("test-llm-only.js" "test-llm-no-fallback.js" "test-llm-enhanced-report.js")
            ;;
        "agents")
            test_files=("test-all-llm-agents.js" "test-enhanced-agents.js" "test-individual-agents-adbe.js")
            ;;
        "features")
            test_files=("test-valuation-analysis.js" "test-competitive-analysis.js" "test-analyst-data.js")
            ;;
        "comprehensive")
            test_files=("test-adbe-agents.js" "test-adbe-services-simple.js" "test-adbe-services-comprehensive.js")
            ;;
        *)
            print_color "❌ Unknown test category: $category" "$RED"
            exit 1
            ;;
    esac
    
    print_color "🧪 Running $category tests..." "$BLUE"
    
    for test_file in "${test_files[@]}"; do
        if [ -f "tests/$test_file" ]; then
            print_color "  Running: $test_file" "$CYAN"
            if node "tests/$test_file"; then
                print_color "  ✅ $test_file passed" "$GREEN"
            else
                print_color "  ❌ $test_file failed" "$RED"
                return 1
            fi
        else
            print_color "  ⚠️  Test file not found: $test_file" "$YELLOW"
        fi
    done
    
    print_color "✅ $category tests completed" "$GREEN"
}

# Main execution
main() {
    print_color "🚀 Stock Analysis App - Test Runner" "$BLUE"
    print_color "=====================================" "$BLUE"
    
    # Check prerequisites
    check_prerequisites
    
    # Parse command line arguments
    if [ $# -eq 0 ]; then
        # No arguments, run all tests using the comprehensive runner
        print_color "🧪 Running all tests with comprehensive test runner..." "$CYAN"
        node tests/run-all-tests.js
        return $?
    fi
    
    # Parse options
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -a|--all)
                print_color "🧪 Running all tests with comprehensive test runner..." "$CYAN"
                node tests/run-all-tests.js
                return $?
                ;;
            -b|--basic)
                run_test_category "basic"
                ;;
            -l|--llm)
                run_test_category "llm"
                ;;
            -g|--agents)
                run_test_category "agents"
                ;;
            -f|--features)
                run_test_category "features"
                ;;
            -c|--comprehensive)
                run_test_category "comprehensive"
                ;;
            *)
                print_color "❌ Unknown option: $1" "$RED"
                show_usage
                exit 1
                ;;
        esac
        shift
    done
}

# Run main function with all arguments
main "$@" 