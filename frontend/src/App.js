import React, { useState, useEffect } from 'react';
import StockSearchForm from './components/StockSearchForm';
import AnalysisResults from './components/AnalysisResults';
import LoadingIndicator from './components/LoadingIndicator';
import { SocketProvider } from './contexts/SocketContext';
import { AlertCircle, TrendingUp, Sparkles, Brain, Zap, BarChart3, Star, Layers } from 'lucide-react';
import './App.css';

function App() {
  const [analysisData, setAnalysisData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentSymbol, setCurrentSymbol] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);

  const handleAnalysisStart = (symbol) => {
    console.log('🎯 [App] Analysis started for symbol:', symbol);
    setCurrentSymbol(symbol);
    setIsLoading(true);
    setError(null);
    setAnalysisData(null);
    setShowWelcome(false);
    console.log('📊 [App] State updated - loading started');
  };

  const handleAnalysisComplete = (data) => {
    console.log('🎉 [App] Analysis completed with data:', data);
    console.log('📋 [App] Data structure received:', {
      hasSymbol: !!data?.symbol,
      hasAnalysis: !!data?.analysis,
      hasStockData: !!data?.stockData,
      hasNewsSentiment: !!data?.newsSentiment,
      hasEconomicData: !!data?.economicData,
      hasRecommendation: !!data?.recommendation,
      timestamp: data?.timestamp
    });
    
    setAnalysisData(data);
    setIsLoading(false);
    console.log('✅ [App] State updated - analysis completed');
  };

  const handleAnalysisError = (errorMessage) => {
    console.error('💥 [App] Analysis error:', errorMessage);
    setError(errorMessage);
    setIsLoading(false);
    console.log('❌ [App] State updated - error occurred');
  };

  const handleReset = () => {
    console.log('🔄 [App] Reset triggered');
    setAnalysisData(null);
    setIsLoading(false);
    setError(null);
    setCurrentSymbol('');
    setShowWelcome(true);
    console.log('✅ [App] State reset completed');
  };

  // Auto-hide welcome after some time if no interaction
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showWelcome && !isLoading && !analysisData && !error) {
        console.log('⏰ [App] Auto-hiding welcome screen after timeout');
        setShowWelcome(false);
      }
    }, 30000); // 30 seconds

    return () => clearTimeout(timer);
  }, [showWelcome, isLoading, analysisData, error]);

  // Debug current app state
  useEffect(() => {
    console.log('📊 [App] Current state:', {
      isLoading,
      hasError: !!error,
      hasAnalysisData: !!analysisData,
      currentSymbol,
      showWelcome
    });
  }, [isLoading, error, analysisData, currentSymbol, showWelcome]);

  return (
    <SocketProvider>
      <div className="min-h-screen relative overflow-hidden pattern-dots">
        {/* Premium animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse float"></div>
          <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-gradient-to-tr from-pink-400/20 to-yellow-400/20 rounded-full blur-3xl animate-pulse float-delayed"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-indigo-400/10 to-purple-400/10 rounded-full blur-2xl"></div>
        </div>

        <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
          {/* Premium Header */}
          <header className="text-center mb-16 fade-in">
            <div className="flex items-center justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur opacity-75 animate-pulse"></div>
                <div className="relative p-6 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-3xl shadow-2xl transform hover:scale-105 transition-transform duration-300">
                  <Brain className="h-14 w-14 text-white" />
                </div>
                <div className="absolute -top-2 -right-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>
              <div className="ml-8 text-left">
                <h1 className="text-6xl font-black text-gradient mb-2">
                  AI Stock Analysis
                </h1>
                <div className="flex items-center text-xl text-gray-600 font-medium">
                  <Star className="h-5 w-5 text-yellow-500 mr-2" />
                  <span>Intelligent Investment Advisory Platform</span>
                </div>
              </div>
            </div>
            
            <div className="max-w-5xl mx-auto">
              <p className="text-xl text-gray-700 leading-relaxed mb-8 font-medium">
                Experience next-generation investment analysis powered by multi-agent AI technology. 
                Get comprehensive insights covering technical indicators, market sentiment, and economic factors.
              </p>
              
              {/* Feature highlights */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="glass-card p-4 rounded-2xl transform hover:scale-105 transition-all duration-300 hover-lift">
                  <BarChart3 className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <span className="text-sm font-semibold text-gray-700">Technical Analysis</span>
                </div>
                <div className="glass-card p-4 rounded-2xl transform hover:scale-105 transition-all duration-300 hover-lift">
                  <Brain className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                  <span className="text-sm font-semibold text-gray-700">AI Sentiment</span>
                </div>
                <div className="glass-card p-4 rounded-2xl transform hover:scale-105 transition-all duration-300 hover-lift">
                  <TrendingUp className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <span className="text-sm font-semibold text-gray-700">Market Intelligence</span>
                </div>
                <div className="glass-card p-4 rounded-2xl transform hover:scale-105 transition-all duration-300 hover-lift">
                  <Zap className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                  <span className="text-sm font-semibold text-gray-700">Real-time Data</span>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="space-y-12">
            {/* Search Form */}
            <div className="slide-up">
              <StockSearchForm
                onAnalysisStart={handleAnalysisStart}
                onAnalysisComplete={handleAnalysisComplete}
                onAnalysisError={handleAnalysisError}
                isLoading={isLoading}
                onReset={handleReset}
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="slide-up">
                <div className="glass-card rounded-3xl overflow-hidden border border-red-200/50 shadow-2xl">
                  <div className="bg-gradient-to-r from-red-500 to-pink-600 p-6 text-white">
                    <div className="flex items-center">
                      <div className="p-3 bg-white/20 rounded-2xl mr-4">
                        <AlertCircle className="h-8 w-8" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold">Analysis Failed</h3>
                        <p className="text-red-100">Something went wrong during the analysis</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-8">
                    <p className="text-gray-700 mb-6 leading-relaxed text-lg">{error}</p>
                    <button
                      onClick={handleReset}
                      className="btn-modern px-8 py-4 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-bold rounded-2xl shadow-lg transform transition-all duration-300"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="slide-up">
                <LoadingIndicator symbol={currentSymbol} />
              </div>
            )}

            {/* Analysis Results */}
            {analysisData && !isLoading && (
              <div className="slide-up">
                <AnalysisResults data={analysisData} />
              </div>
            )}

            {/* Premium Welcome State */}
            {showWelcome && !analysisData && !isLoading && !error && (
              <div className="slide-up">
                <div className="text-center py-20">
                  <div className="max-w-4xl mx-auto">
                    {/* Hero animation */}
                    <div className="relative mb-12">
                      <div className="w-40 h-40 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full mx-auto flex items-center justify-center shadow-2xl float">
                        <TrendingUp className="h-20 w-20 text-white" />
                      </div>
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-4">
                        <div className="flex space-x-2">
                          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
                          <div className="w-3 h-3 bg-blue-400 rounded-full animate-ping" style={{animationDelay: '0.2s'}}></div>
                          <div className="w-3 h-3 bg-purple-400 rounded-full animate-ping" style={{animationDelay: '0.4s'}}></div>
                        </div>
                      </div>
                    </div>
                    
                    <h2 className="text-5xl font-black text-gradient mb-6">
                      Ready to Analyze Stocks
                    </h2>
                    <p className="text-xl text-gray-700 mb-12 leading-relaxed font-medium">
                      Enter a stock symbol above to unlock comprehensive AI-powered investment analysis. 
                      Get technical insights, sentiment analysis, and intelligent recommendations in seconds.
                    </p>
                    
                    {/* Feature grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                      <div className="glass-card p-8 rounded-3xl hover-lift card-stack">
                        <div className="flex items-center mb-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mr-4">
                            <BarChart3 className="h-6 w-6 text-white" />
                          </div>
                          <span className="text-xl font-bold text-gray-800">Technical Analysis</span>
                        </div>
                        <p className="text-gray-600 leading-relaxed">
                          Real-time price data, advanced chart patterns, and comprehensive technical indicators
                        </p>
                      </div>
                      
                      <div className="glass-card p-8 rounded-3xl hover-lift card-stack">
                        <div className="flex items-center mb-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mr-4">
                            <Brain className="h-6 w-6 text-white" />
                          </div>
                          <span className="text-xl font-bold text-gray-800">AI Sentiment Analysis</span>
                        </div>
                        <p className="text-gray-600 leading-relaxed">
                          News sentiment and social media analysis powered by advanced AI models
                        </p>
                      </div>
                      
                      <div className="glass-card p-8 rounded-3xl hover-lift card-stack">
                        <div className="flex items-center mb-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center mr-4">
                            <Layers className="h-6 w-6 text-white" />
                          </div>
                          <span className="text-xl font-bold text-gray-800">Economic Context</span>
                        </div>
                        <p className="text-gray-600 leading-relaxed">
                          Market regime assessment and comprehensive economic indicator analysis
                        </p>
                      </div>
                      
                      <div className="glass-card p-8 rounded-3xl hover-lift card-stack">
                        <div className="flex items-center mb-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mr-4">
                            <Star className="h-6 w-6 text-white" />
                          </div>
                          <span className="text-xl font-bold text-gray-800">Smart Recommendations</span>
                        </div>
                        <p className="text-gray-600 leading-relaxed">
                          Multi-horizon investment recommendations with confidence scores and risk assessment
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* Premium Footer */}
          <footer className="text-center mt-24 py-16 border-t border-gray-200/60 backdrop-blur-sm">
            <div className="space-y-6">
              <div className="flex items-center justify-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-gray-600 to-gray-700 rounded-xl">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <p className="text-gray-600 font-semibold text-lg">
                  Stock Analysis Platform - Powered by Multi-Agent AI
                </p>
              </div>
              <p className="text-gray-500 max-w-3xl mx-auto leading-relaxed">
                This is a demonstration application leveraging artificial intelligence for educational purposes. 
                All analysis and recommendations are generated by AI models and should not be considered as professional financial advice.
              </p>
              <div className="flex items-center justify-center space-x-8 text-sm text-gray-400">
                <span className="font-medium">© 2024 AI Stock Analysis</span>
                <span>•</span>
                <span className="flex items-center">
                  <Zap className="h-4 w-4 mr-1" />
                  Powered by Ollama
                </span>
                <span>•</span>
                <span>Educational Use Only</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </SocketProvider>
  );
}

export default App; 