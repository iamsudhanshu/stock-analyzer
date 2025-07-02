import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useSocket } from '../contexts/SocketContext';
import { Search, RefreshCw, Wifi, WifiOff } from 'lucide-react';

const StockSearchForm = ({
  onAnalysisStart,
  onAnalysisComplete,
  onAnalysisError,
  isLoading,
  onReset
}) => {
  const [symbol, setSymbol] = useState('');
  const [inputError, setInputError] = useState('');
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
    
    // Clear previous errors
    setInputError('');
    
    // Validate input
    const validation = validateSymbol(symbol);
    if (!validation.isValid) {
      setInputError(validation.error);
      return;
    }

    const cleanSymbol = validation.symbol;

    // Check WebSocket connection
    if (!isConnected) {
      setInputError('No connection to server. Please check your connection.');
      return;
    }

    try {
      // Start analysis
      onAnalysisStart(cleanSymbol);

      // Make API call to trigger analysis
      const response = await axios.post(`/api/analyze/${cleanSymbol}`, {}, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const { requestId } = response.data;

      // Set up WebSocket subscription for real-time updates
      const unsubscribe = subscribeToAnalysis(requestId, {
        onProgress: (data) => {
          console.log('Analysis progress:', data);
          // Progress is handled by LoadingIndicator component
        },
        onCompleted: (data) => {
          console.log('Analysis completed:', data);
          onAnalysisComplete(data.result);
          unsubscribeRef.current = null;
        },
        onError: (data) => {
          console.error('Analysis error:', data);
          onAnalysisError(data.error || 'Analysis failed');
          unsubscribeRef.current = null;
        }
      });

      unsubscribeRef.current = unsubscribe;

    } catch (error) {
      console.error('Error starting analysis:', error);
      
      let errorMessage = 'Failed to start analysis';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout - please try again';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      onAnalysisError(errorMessage);
    }
  };

  const handleReset = () => {
    // Clean up any active subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    setSymbol('');
    setInputError('');
    onReset();
  };

  const handleInputChange = (e) => {
    const value = e.target.value.toUpperCase();
    setSymbol(value);
    
    // Clear input error when user starts typing
    if (inputError) {
      setInputError('');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">
          Stock Analysis
        </h2>
        
        {/* Connection Status */}
        <div className="flex items-center text-sm">
          {isConnected ? (
            <div className="flex items-center text-green-600">
              <Wifi className="h-4 w-4 mr-1" />
              <span>Connected</span>
            </div>
          ) : (
            <div className="flex items-center text-red-600">
              <WifiOff className="h-4 w-4 mr-1" />
              <span>Disconnected</span>
              <button
                onClick={reconnect}
                className="ml-2 text-blue-600 hover:text-blue-800 underline"
              >
                Reconnect
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Connection Error */}
      {connectionError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {connectionError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 mb-2">
            Enter Stock Symbol
          </label>
          <div className="relative">
            <input
              type="text"
              id="symbol"
              value={symbol}
              onChange={handleInputChange}
              placeholder="e.g., AAPL, MSFT, GOOGL"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors ${
                inputError ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              disabled={isLoading}
              maxLength={5}
              autoComplete="off"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
          {inputError && (
            <p className="mt-1 text-sm text-red-600">{inputError}</p>
          )}
        </div>

        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={isLoading || !isConnected}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors ${
              isLoading || !isConnected
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                Analyzing...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <Search className="h-5 w-5 mr-2" />
                Analyze Stock
              </div>
            )}
          </button>

          {(isLoading || symbol) && (
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </form>

      {/* Popular Symbols */}
      {!isLoading && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-3">Popular stocks:</p>
          <div className="flex flex-wrap gap-2">
            {['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX'].map((popularSymbol) => (
              <button
                key={popularSymbol}
                onClick={() => setSymbol(popularSymbol)}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
                disabled={isLoading}
              >
                {popularSymbol}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StockSearchForm; 