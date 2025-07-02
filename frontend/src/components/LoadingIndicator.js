import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { Activity, TrendingUp, Newspaper, DollarSign, BarChart3 } from 'lucide-react';

const LoadingIndicator = ({ symbol }) => {
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('Initializing analysis...');
  const [stages, setStages] = useState([
    { name: 'Stock Data', icon: TrendingUp, completed: false, progress: 0 },
    { name: 'News Sentiment', icon: Newspaper, completed: false, progress: 0 },
    { name: 'Economic Data', icon: DollarSign, completed: false, progress: 0 },
    { name: 'Analysis', icon: BarChart3, completed: false, progress: 0 }
  ]);

  const { subscribeToAnalysis } = useSocket();

  useEffect(() => {
    // Subscribe to progress updates for any active analysis
    // This component doesn't have a specific requestId, so it listens to all progress
    const handleProgress = (data) => {
      setProgress(data.progress || 0);
      setCurrentMessage(data.message || 'Processing...');
      
      // Update stage progress based on message content
      updateStageProgress(data.message, data.progress);
    };

    // Listen for progress events on the socket directly
    const { socket } = useSocket();
    if (socket) {
      socket.on('progress', handleProgress);
      
      return () => {
        socket.off('progress', handleProgress);
      };
    }
  }, []);

  const updateStageProgress = (message, totalProgress) => {
    setStages(prevStages => {
      const newStages = [...prevStages];
      
      // Determine which stage is active based on message content
      if (message?.includes('stock') || message?.includes('price') || message?.includes('technical')) {
        newStages[0].progress = Math.min(100, totalProgress * 3); // Stock data is roughly first 33%
        if (totalProgress >= 30) newStages[0].completed = true;
      }
      
      if (message?.includes('news') || message?.includes('sentiment')) {
        newStages[1].progress = Math.max(0, Math.min(100, (totalProgress - 25) * 2)); // News is roughly 25-60%
        if (totalProgress >= 60) newStages[1].completed = true;
      }
      
      if (message?.includes('economic') || message?.includes('regime')) {
        newStages[2].progress = Math.max(0, Math.min(100, (totalProgress - 55) * 3)); // Economic is roughly 55-80%
        if (totalProgress >= 80) newStages[2].completed = true;
      }
      
      if (message?.includes('analysis') || message?.includes('recommendation')) {
        newStages[3].progress = Math.max(0, Math.min(100, (totalProgress - 80) * 5)); // Analysis is final 20%
        if (totalProgress >= 95) newStages[3].completed = true;
      }
      
      return newStages;
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center mb-3">
          <Activity className="h-8 w-8 text-blue-600 mr-3 animate-pulse" />
          <h3 className="text-xl font-semibold text-gray-800">
            Analyzing {symbol}
          </h3>
        </div>
        <p className="text-gray-600 mb-4">{currentMessage}</p>
        
        {/* Overall Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-500">{Math.round(progress)}% Complete</p>
      </div>

      {/* Stage Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          return (
            <div
              key={stage.name}
              className={`flex items-center p-4 rounded-lg border-2 transition-all duration-300 ${
                stage.completed
                  ? 'border-green-200 bg-green-50'
                  : stage.progress > 0
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex-shrink-0 mr-3">
                <Icon
                  className={`h-6 w-6 ${
                    stage.completed
                      ? 'text-green-600'
                      : stage.progress > 0
                      ? 'text-blue-600'
                      : 'text-gray-400'
                  }`}
                />
              </div>
              <div className="flex-1">
                <h4 className={`font-medium ${
                  stage.completed
                    ? 'text-green-800'
                    : stage.progress > 0
                    ? 'text-blue-800'
                    : 'text-gray-700'
                }`}>
                  {stage.name}
                </h4>
                <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      stage.completed
                        ? 'bg-green-600'
                        : stage.progress > 0
                        ? 'bg-blue-600'
                        : 'bg-gray-400'
                    }`}
                    style={{ width: `${stage.progress}%` }}
                  ></div>
                </div>
              </div>
              {stage.completed && (
                <div className="flex-shrink-0 ml-2">
                  <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Processing Details */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-800 mb-2">What we're analyzing:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Real-time stock price and technical indicators</li>
          <li>• Latest news sentiment and social media signals</li>
          <li>• Economic conditions and market regime</li>
          <li>• Multi-horizon investment recommendations</li>
        </ul>
      </div>

      {/* Estimated Time */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-500">
          Estimated completion: {Math.max(5, 30 - Math.round(progress * 0.3))} seconds
        </p>
      </div>
    </div>
  );
};

export default LoadingIndicator; 