import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, Newspaper, Brain, Zap, Clock } from 'lucide-react';

const LoadingIndicator = ({ symbol, progress, message }) => {
  const [displayProgress, setDisplayProgress] = useState(progress || 0);
  const [currentMessage, setCurrentMessage] = useState(message || 'Initializing AI analysis...');
  const [startTime] = useState(new Date());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [stages, setStages] = useState([
    { 
      name: 'Stock Data Collection', 
      icon: TrendingUp, 
      completed: false, 
      progress: 0, 
      description: 'Fetching real-time price data and technical indicators',
      status: 'pending'
    },
    { 
      name: 'News Sentiment Analysis', 
      icon: Newspaper, 
      completed: false, 
      progress: 0, 
      description: 'Processing latest news and social media sentiment',
      status: 'pending'
    },
    { 
      name: 'AI Analysis & Recommendations', 
      icon: Brain, 
      completed: false, 
      progress: 0, 
      description: 'Generating intelligent investment recommendations',
      status: 'pending'
    }
  ]);

  // Update elapsed time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((new Date() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  // Update progress when props change
  useEffect(() => {
    if (progress !== undefined) {
      setDisplayProgress(progress);
      updateStageProgress(message, progress);
    }
    if (message !== undefined) {
      setCurrentMessage(message);
    }
  }, [progress, message]);

  const updateStageProgress = (message, totalProgress, stageName) => {
    setStages(prevStages => {
      const newStages = [...prevStages];
      
      // Reset all stages to pending if starting over
      if (totalProgress < 10) {
        newStages.forEach(stage => {
          stage.status = 'pending';
          stage.progress = 0;
          stage.completed = false;
        });
      }
      
      // Stage 0: Stock Data (0-33%)
      if (totalProgress >= 0 && totalProgress < 33) {
        newStages[0].status = 'active';
        newStages[0].progress = Math.min(100, (totalProgress / 33) * 100);
      } else if (totalProgress >= 33) {
        newStages[0].completed = true;
        newStages[0].progress = 100;
        newStages[0].status = 'completed';
      }
      
      // Stage 1: News Sentiment (33-66%)
      if (totalProgress >= 33 && totalProgress < 66) {
        newStages[1].status = 'active';
        newStages[1].progress = Math.min(100, ((totalProgress - 33) / 33) * 100);
      } else if (totalProgress >= 66) {
        newStages[1].completed = true;
        newStages[1].progress = 100;
        newStages[1].status = 'completed';
      }
      
      // Stage 2: AI Analysis (66-100%)
      if (totalProgress >= 66) {
        newStages[2].status = 'active';
        newStages[2].progress = Math.min(100, ((totalProgress - 66) / 34) * 100);
        if (totalProgress >= 95) {
          newStages[2].completed = true;
          newStages[2].progress = 100;
          newStages[2].status = 'completed';
        }
      }
      
      return newStages;
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStageStatusStyles = (stage) => {
    switch (stage.status) {
      case 'completed':
        return 'border-green-300 bg-gradient-to-r from-green-50 to-green-100 shadow-green-100';
      case 'active':
        return 'border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-100 shadow-blue-100 animate-pulse';
      default:
        return 'border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100';
    }
  };

  const getIconStyles = (stage) => {
    switch (stage.status) {
      case 'completed':
        return 'text-green-600';
      case 'active':
        return 'text-blue-600 animate-spin';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header with animated gradient */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="relative">
              <Activity className="h-8 w-8 animate-pulse" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
            </div>
            <div className="ml-4">
              <h3 className="text-xl font-semibold">
                Analyzing {symbol}
              </h3>
              <p className="text-blue-100 text-sm">AI-Powered Stock Analysis</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center text-blue-100">
              <Clock className="h-4 w-4 mr-1" />
              <span className="text-sm">{formatTime(elapsedTime)}</span>
            </div>
          </div>
        </div>
        
        {/* Overall Progress */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-blue-100">Overall Progress</span>
            <span className="text-sm font-semibold">{Math.round(displayProgress)}%</span>
          </div>
          <div className="w-full bg-blue-800/30 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-white to-yellow-300 h-2 rounded-full transition-all duration-700 ease-out shadow-sm"
              style={{ width: `${displayProgress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Current Status */}
      <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-100">
        <div className="flex items-center">
          <Zap className="h-5 w-5 text-yellow-500 mr-2 animate-bounce" />
          <span className="text-gray-700 font-medium">{currentMessage}</span>
        </div>
      </div>

      {/* Stage Progress */}
      <div className="p-6">
        <div className="space-y-4">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.name}
                className={`p-4 rounded-lg border-2 transition-all duration-500 shadow-sm ${getStageStatusStyles(stage)}`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 mr-4">
                    {stage.completed ? (
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center shadow-md">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className={`p-1.5 rounded-full ${stage.status === 'active' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        <Icon className={`h-5 w-5 ${getIconStyles(stage)}`} />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={`font-semibold ${
                        stage.completed ? 'text-green-800' : 
                        stage.status === 'active' ? 'text-blue-800' : 'text-gray-700'
                      }`}>
                        {stage.name}
                      </h4>
                      <span className={`text-sm font-medium ${
                        stage.completed ? 'text-green-600' : 
                        stage.status === 'active' ? 'text-blue-600' : 'text-gray-500'
                      }`}>
                        {stage.completed ? 'Complete' : stage.status === 'active' ? 'In Progress' : 'Pending'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{stage.description}</p>
                    
                    {/* Stage Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          stage.completed ? 'bg-gradient-to-r from-green-500 to-green-600' :
                          stage.status === 'active' ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gray-300'
                        }`}
                        style={{ width: `${stage.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Processing Info */}
        <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
          <div className="flex items-start">
            <Brain className="h-6 w-6 text-purple-600 mr-3 flex-shrink-0 animate-pulse" />
            <div>
              <h4 className="font-semibold text-purple-800 mb-2">AI Analysis in Progress</h4>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>• Processing real-time market data with machine learning models</li>
                <li>• Analyzing sentiment patterns from news and social media</li>
                <li>• Combining technical and sentiment analysis for comprehensive insights</li>
                <li>• Generating personalized investment recommendations</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Estimated Completion */}
        <div className="mt-4 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-gray-100 rounded-full">
            <Clock className="h-4 w-4 text-gray-500 mr-2" />
            <span className="text-sm text-gray-700">
              Estimated completion: {Math.max(5, 45 - Math.round(displayProgress * 0.4))} seconds
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingIndicator; 