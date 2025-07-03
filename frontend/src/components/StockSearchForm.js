import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useSocket } from '../contexts/SocketContext';
import { Search, RefreshCw, Wifi, WifiOff, Sparkles, TrendingUp } from 'lucide-react';

const StockSearchForm = ({
  onAnalysisStart,
  onAnalysisComplete,
  onAnalysisError,
  onProgressUpdate,
  isLoading,
  onReset
}) => {
  const [symbol, setSymbol] = useState('');
  const [inputError, setInputError] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const { subscribeToAnalysis, isConnected, connectionError, reconnect } = useSocket();
  const unsubscribeRef = useRef(null);

  const validateSymbol = (input) => {
    const cleaned = input.toUpperCase().trim();
    
    if (!cleaned) {
      return { isValid: false, error: 'Please enter a stock symbol' };
    }
    
    if (!/^[A-Z]{1,5}$/.test(cleaned)) {
      return { isValid: false, error: 'Invalid symbol format (1-5 letters only)' };
    }
    
    return { isValid: true, symbol: cleaned };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('🚀 [StockSearchForm] Form submitted with symbol:', symbol);
    
    setInputError('');
    
    const validation = validateSymbol(symbol);
    console.log('✅ [StockSearchForm] Symbol validation result:', validation);
    
    if (!validation.isValid) {
      console.log('❌ [StockSearchForm] Invalid symbol:', validation.error);
      setInputError(validation.error);
      return;
    }

    const cleanSymbol = validation.symbol;
    console.log('🔍 [StockSearchForm] Clean symbol for analysis:', cleanSymbol);

    if (!isConnected) {
      console.log('❌ [StockSearchForm] WebSocket not connected');
      setInputError('No connection to server. Please check your connection.');
      return;
    }

    console.log('✅ [StockSearchForm] WebSocket connected, proceeding with analysis');

    try {
      console.log('📡 [StockSearchForm] Starting analysis for symbol:', cleanSymbol);
      onAnalysisStart(cleanSymbol);

      console.log('📤 [StockSearchForm] Making API call to /api/analyze/' + cleanSymbol);
      
      const response = await axios.post(`/api/analyze/${cleanSymbol}`, {}, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('📥 [StockSearchForm] API response received:', response.data);
      const { requestId } = response.data;
      
      if (!requestId) {
        console.error('❌ [StockSearchForm] No requestId in response:', response.data);
        onAnalysisError('Invalid response from server - no request ID');
        return;
      }

      console.log('🔔 [StockSearchForm] Setting up WebSocket subscription for requestId:', requestId);

      const unsubscribe = subscribeToAnalysis(requestId, {
        onProgress: (data) => {
          console.log('📊 [StockSearchForm] Progress update:', data);
          onProgressUpdate(data);
        },
        onCompleted: (data) => {
          console.log('✅ [StockSearchForm] Analysis completed successfully:', data);
          if (data.result) {
            console.log('📋 [StockSearchForm] Analysis result data:', data.result);
            onAnalysisComplete(data.result);
          } else {
            console.error('❌ [StockSearchForm] No result data in completion:', data);
            onAnalysisError('Analysis completed but no result data received');
          }
          unsubscribeRef.current = null;
        },
        onError: (data) => {
          console.error('❌ [StockSearchForm] Analysis error received:', data);
          onAnalysisError(data.error || 'Analysis failed');
          unsubscribeRef.current = null;
        }
      });

      unsubscribeRef.current = unsubscribe;
      console.log('✅ [StockSearchForm] WebSocket subscription set up successfully');

    } catch (error) {
      console.error('💥 [StockSearchForm] Error in analysis request:', error);
      console.error('💥 [StockSearchForm] Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });
      
      let errorMessage = 'Failed to start analysis';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
        console.log('📝 [StockSearchForm] Using server error message:', errorMessage);
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout - please try again';
        console.log('⏰ [StockSearchForm] Request timeout occurred');
      } else if (error.message) {
        errorMessage = error.message;
        console.log('📝 [StockSearchForm] Using error message:', errorMessage);
      }
      
      onAnalysisError(errorMessage);
    }
  };

  const handleReset = () => {
    console.log('🔄 [StockSearchForm] Reset triggered');
    
    if (unsubscribeRef.current) {
      console.log('🔕 [StockSearchForm] Cleaning up active subscription');
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    setSymbol('');
    setInputError('');
    onReset();
    console.log('✅ [StockSearchForm] Reset completed');
  };

  const handleInputChange = (e) => {
    const value = e.target.value.toUpperCase();
    console.log('⌨️ [StockSearchForm] Input changed to:', value);
    setSymbol(value);
    
    if (inputError) {
      console.log('🧹 [StockSearchForm] Clearing input error');
      setInputError('');
    }
  };

  const popularStocks = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft' },
    { symbol: 'GOOGL', name: 'Alphabet' },
    { symbol: 'AMZN', name: 'Amazon' },
    { symbol: 'TSLA', name: 'Tesla' },
    { symbol: 'NVDA', name: 'NVIDIA' },
    { symbol: 'META', name: 'Meta' },
    { symbol: 'NFLX', name: 'Netflix' }
  ];

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden backdrop-blur-sm">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="p-2 bg-white/20 rounded-lg mr-3">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                AI Stock Analysis
              </h2>
              <p className="text-blue-100 text-sm">Powered by multi-agent intelligence</p>
            </div>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center text-sm">
            {isConnected ? (
              <div className="flex items-center text-green-200 bg-green-500/20 px-3 py-1 rounded-full">
                <Wifi className="h-4 w-4 mr-1" />
                <span>Connected</span>
              </div>
            ) : (
              <div className="flex items-center text-red-200 bg-red-500/20 px-3 py-1 rounded-full">
                <WifiOff className="h-4 w-4 mr-1" />
                <span>Disconnected</span>
                <button
                  onClick={reconnect}
                  className="ml-2 text-white hover:text-blue-200 underline"
                >
                  Reconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connection Error */}
      {connectionError && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
            {connectionError}
          </div>
        </div>
      )}

      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="symbol" className="block text-sm font-semibold text-gray-700 mb-3">
              Enter Stock Symbol
            </label>
            <div className="relative">
              <div className={`relative transition-all duration-300 ${
                isInputFocused ? 'transform scale-[1.02]' : ''
              }`}>
                <input
                  type="text"
                  id="symbol"
                  value={symbol}
                  onChange={handleInputChange}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  placeholder="e.g., AAPL, MSFT, GOOGL"
                  className={`w-full px-4 py-4 text-lg border-2 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-300 ${
                    inputError ? 'border-red-300 bg-red-50' : 
                    isInputFocused ? 'border-blue-400 bg-blue-50/50' : 'border-gray-200 bg-gray-50'
                  } ${isLoading ? 'cursor-not-allowed opacity-60' : ''}`}
                  disabled={isLoading}
                  maxLength={5}
                  autoComplete="off"
                />
                <div className={`absolute right-4 top-1/2 transform -translate-y-1/2 transition-all duration-300 ${
                  isInputFocused ? 'text-blue-500 scale-110' : 'text-gray-400'
                }`}>
                  <Search className="h-6 w-6" />
                </div>
              </div>
            </div>
            {inputError && (
              <div className="mt-2 flex items-center text-red-600">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                <p className="text-sm">{inputError}</p>
              </div>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={isLoading || !isConnected}
              className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all duration-300 transform ${
                isLoading || !isConnected
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Analyzing...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Sparkles className="h-5 w-5 mr-2" />
                  Start AI Analysis
                </div>
              )}
            </button>

            {(isLoading || symbol) && (
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-4 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Reset
              </button>
            )}
          </div>
        </form>

        {/* Popular Symbols */}
        {!isLoading && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center mb-4">
              <TrendingUp className="h-5 w-5 text-gray-600 mr-2" />
              <p className="text-sm font-semibold text-gray-700">Popular Stocks</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {popularStocks.map((stock) => (
                <button
                  key={stock.symbol}
                  onClick={() => setSymbol(stock.symbol)}
                  className="group p-3 text-left bg-gradient-to-br from-gray-50 to-gray-100 hover:from-blue-50 hover:to-indigo-100 border border-gray-200 hover:border-blue-300 rounded-lg transition-all duration-300"
                  disabled={isLoading}
                >
                  <div className="font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">
                    {stock.symbol}
                  </div>
                  <div className="text-xs text-gray-600 group-hover:text-blue-600 transition-colors mt-1">
                    {stock.name}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Features */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">What you'll get:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-700">
            <div className="flex items-center">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
              <span>Real-time technical analysis</span>
            </div>
            <div className="flex items-center">
              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></div>
              <span>AI-powered sentiment analysis</span>
            </div>
            <div className="flex items-center">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></div>
              <span>Comprehensive market intelligence</span>
            </div>
            <div className="flex items-center">
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-2"></div>
              <span>Investment recommendations</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockSearchForm; 