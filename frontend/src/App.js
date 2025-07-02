import React, { useState, useEffect } from 'react';
import StockSearchForm from './components/StockSearchForm';
import AnalysisResults from './components/AnalysisResults';
import LoadingIndicator from './components/LoadingIndicator';
import { SocketProvider } from './contexts/SocketContext';
import { AlertCircle, TrendingUp } from 'lucide-react';
import './App.css';

function App() {
  const [analysisData, setAnalysisData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentSymbol, setCurrentSymbol] = useState('');

  const handleAnalysisStart = (symbol) => {
    setCurrentSymbol(symbol);
    setIsLoading(true);
    setError(null);
    setAnalysisData(null);
  };

  const handleAnalysisComplete = (data) => {
    setAnalysisData(data);
    setIsLoading(false);
  };

  const handleAnalysisError = (errorMessage) => {
    setError(errorMessage);
    setIsLoading(false);
  };

  const handleReset = () => {
    setAnalysisData(null);
    setIsLoading(false);
    setError(null);
    setCurrentSymbol('');
  };

  return (
    <SocketProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <header className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <TrendingUp className="h-12 w-12 text-blue-600 mr-3" />
              <h1 className="text-4xl font-bold text-gray-800">
                AI Stock Analysis Platform
              </h1>
            </div>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get comprehensive investment recommendations powered by multi-agent AI analysis 
              covering technical indicators, market sentiment, and economic factors.
            </p>
          </header>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto">
            {/* Search Form - Always visible */}
            <div className="mb-8">
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
              <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center">
                  <AlertCircle className="h-6 w-6 text-red-500 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-red-800">
                      Analysis Failed
                    </h3>
                    <p className="text-red-700 mt-1">{error}</p>
                    <button
                      onClick={handleReset}
                      className="mt-3 text-red-600 hover:text-red-800 font-medium underline"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="mb-8">
                <LoadingIndicator symbol={currentSymbol} />
              </div>
            )}

            {/* Analysis Results */}
            {analysisData && !isLoading && (
              <div className="mb-8">
                <AnalysisResults data={analysisData} />
              </div>
            )}

            {/* Welcome State */}
            {!analysisData && !isLoading && !error && (
              <div className="text-center py-16">
                <div className="max-w-md mx-auto">
                  <TrendingUp className="h-24 w-24 text-gray-300 mx-auto mb-6" />
                  <h2 className="text-2xl font-semibold text-gray-700 mb-3">
                    Ready to Analyze
                  </h2>
                  <p className="text-gray-500 mb-6">
                    Enter a stock symbol above to get started with AI-powered investment analysis.
                  </p>
                  <div className="text-left space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                      <span>Technical indicator analysis</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      <span>News sentiment analysis</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                      <span>Economic regime assessment</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                      <span>Multi-horizon recommendations</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* Footer */}
          <footer className="text-center mt-16 py-8 border-t border-gray-200">
            <p className="text-gray-500 text-sm">
              Stock Analysis Platform - Powered by Multi-Agent AI
            </p>
            <p className="text-gray-400 text-xs mt-2">
              This is a demonstration application. Not financial advice.
            </p>
          </footer>
        </div>
      </div>
    </SocketProvider>
  );
}

export default App; 