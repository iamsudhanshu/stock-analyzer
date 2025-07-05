import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  BarChart3,
  Activity,
  Newspaper,
  DollarSign,
  Shield,
  Target,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Clock,
  Star,
  Calendar,
  Minus,
  Zap,
  Eye,
  Settings,
  Award,
  PieChart,
  LineChart,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Users,
  Bug,
  Database,
  Code,
  FileText
} from 'lucide-react';
import DebugModal from './DebugModal';

const AnalysisResults = ({ data }) => {
  const [expandedSections, setExpandedSections] = useState({
    technical: true,
    sentiment: true,
    risk: true,
    recommendations: true,
    timeHorizons: true,
    scenarios: true,
    monitoring: true,
    insights: true,
    llmWarning: true,
    fundamental: true,
    competitive: true,
    enhanced: true,
    advancedTechnical: true,
    report: true
  });

  const [debugModal, setDebugModal] = useState({
    isOpen: false,
    agentData: null
  });

  if (!data || !data.analysis) {
    return (
      <div className="p-6 text-center">
        <Info className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No analysis data available</p>
      </div>
    );
  }

  const {
    symbol,
    analysis,
    stockData,
    newsSentiment,
    recommendation,
    rawData
  } = data;

  // Check if LLM analysis failed - removed since all agents are now LLM-based
  const hasAnalysisWarning = analysis.analysisWarning;
  const llmFailureReason = analysis.llmFailureReason;

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const openDebugModal = (agentType, inputData, outputData, status = 'success') => {
    setDebugModal({
      isOpen: true,
      agentData: {
        agentType,
        inputData,
        outputData,
        timestamp: analysis.generatedAt,
        status
      }
    });
  };

  const closeDebugModal = () => {
    setDebugModal({
      isOpen: false,
      agentData: null
    });
  };

  // Helper function to get status color classes
  const getStatusColor = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
      case 'bullish':
      case 'buy':
      case 'strong_buy':
        return 'text-green-700 bg-gradient-to-r from-green-50 to-emerald-100 border-green-300';
      case 'negative':
      case 'bearish':
      case 'sell':
      case 'strong_sell':
        return 'text-red-700 bg-gradient-to-r from-red-50 to-rose-100 border-red-300';
      case 'neutral':
      case 'hold':
        return 'text-yellow-700 bg-gradient-to-r from-yellow-50 to-amber-100 border-yellow-300';
      default:
        return 'text-gray-700 bg-gradient-to-r from-gray-50 to-slate-100 border-gray-300';
    }
  };

  // Helper function to get recommendation icon
  const getRecommendationIcon = (action) => {
    switch (action?.toLowerCase()) {
      case 'strong_buy':
        return <ArrowUp className="h-6 w-6 text-green-600" />;
      case 'buy':
        return <TrendingUp className="h-6 w-6 text-green-600" />;
      case 'hold':
        return <Minus className="h-6 w-6 text-yellow-600" />;
      case 'sell':
        return <TrendingDown className="h-6 w-6 text-red-600" />;
      case 'strong_sell':
        return <ArrowDown className="h-6 w-6 text-red-600" />;
      default:
        return <Target className="h-6 w-6 text-gray-600" />;
    }
  };

  // Helper function to get trend icon
  const getTrendIcon = (trend) => {
    if (trend?.toLowerCase().includes('up') || trend?.toLowerCase().includes('positive')) {
      return <TrendingUp className="h-5 w-5 text-green-600" />;
    } else if (trend?.toLowerCase().includes('down') || trend?.toLowerCase().includes('negative')) {
      return <TrendingDown className="h-5 w-5 text-red-600" />;
    }
    return <Activity className="h-5 w-5 text-gray-600" />;
  };

  const formatCurrency = (value) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toLocaleString()}`;
  };

  const formatPercentage = (value) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Debug button component
  const DebugButton = ({ agentType, inputData, outputData, status, icon, color }) => (
    <button
      onClick={() => openDebugModal(agentType, inputData, outputData, status)}
      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 ${color}`}
      title={`Debug ${agentType} data`}
    >
      {icon}
      <span>Debug {agentType.replace('Agent', '')}</span>
      <Bug className="h-4 w-4" />
    </button>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Debug Modal */}
      <DebugModal 
        isOpen={debugModal.isOpen}
        onClose={closeDebugModal}
        agentData={debugModal.agentData}
      />

      {/* Debug Panel */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Bug className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Agent Debug Panel</h3>
          </div>
          <span className="text-sm text-gray-600">Click to inspect agent data</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <DebugButton
            agentType="StockDataAgent"
            inputData={{ symbol }}
            outputData={rawData?.stockData}
            status={rawData?.stockData ? 'success' : 'error'}
            icon={<Activity className="h-4 w-4" />}
            color="bg-blue-100 text-blue-700 hover:bg-blue-200"
          />
          
          <DebugButton
            agentType="NewsSentimentAgent"
            inputData={{ symbol }}
            outputData={rawData?.newsData}
            status={rawData?.newsData ? 'success' : 'error'}
            icon={<FileText className="h-4 w-4" />}
            color="bg-green-100 text-green-700 hover:bg-green-200"
          />
          
          <DebugButton
            agentType="FundamentalDataAgent"
            inputData={{ symbol }}
            outputData={rawData?.fundamentalData}
            status={rawData?.fundamentalData ? 'success' : 'error'}
            icon={<Database className="h-4 w-4" />}
            color="bg-purple-100 text-purple-700 hover:bg-purple-200"
          />
          
          <DebugButton
            agentType="CompetitiveAgent"
            inputData={{ symbol }}
            outputData={rawData?.competitiveData}
            status={rawData?.competitiveData ? 'success' : 'error'}
            icon={<Code className="h-4 w-4" />}
            color="bg-orange-100 text-orange-700 hover:bg-orange-200"
          />
          
          <DebugButton
            agentType="AnalysisAgent"
            inputData={rawData}
            outputData={analysis}
            status={analysis ? 'success' : 'error'}
            icon={<Activity className="h-4 w-4" />}
            color="bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
          />
          
          <DebugButton
            agentType="EnhancedDataAgent"
            inputData={{ symbol }}
            outputData={rawData?.enhancedData}
            status={rawData?.enhancedData ? 'success' : 'error'}
            icon={<Database className="h-4 w-4" />}
            color="bg-teal-100 text-teal-700 hover:bg-teal-200"
          />
          
          <DebugButton
            agentType="AdvancedTechnicalAgent"
            inputData={{ symbol }}
            outputData={rawData?.advancedTechnicalData}
            status={rawData?.advancedTechnicalData ? 'success' : 'error'}
            icon={<LineChart className="h-4 w-4" />}
            color="bg-pink-100 text-pink-700 hover:bg-pink-200"
          />
          
          <DebugButton
            agentType="ReportGeneratorAgent"
            inputData={rawData}
            outputData={rawData?.reportData}
            status={rawData?.reportData ? 'success' : 'error'}
            icon={<FileText className="h-4 w-4" />}
            color="bg-cyan-100 text-cyan-700 hover:bg-cyan-200"
          />
        </div>
        
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2 text-sm text-yellow-800">
            <Info className="h-4 w-4" />
            <span>
              <strong>Debug Info:</strong> Use these buttons to inspect what data each agent received and produced. 
              This helps identify why some analysis sections might be missing.
            </span>
          </div>
        </div>
      </div>

      {/* Agent Data Status */}
      {analysis.agentDataStatus && (
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <Activity className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Agent Data Status</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(analysis.agentDataStatus).map(([agentName, status]) => (
              <div 
                key={agentName}
                className={`p-4 rounded-lg border-2 ${
                  status.status === 'success' 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">
                    {agentName.replace('Agent', '')}
                  </h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    status.status === 'success' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {status.status}
                  </span>
                </div>
                
                <div className="text-sm text-gray-600 space-y-1">
                  <div>
                    <span className="font-medium">Data:</span> {status.hasData ? 'Available' : 'Missing'}
                  </div>
                  {status.hasData && (
                    <>
                      <div>
                        <span className="font-medium">Keys:</span> {status.dataKeys.length}
                      </div>
                      <div className="text-xs text-gray-500">
                        {status.dataKeys.slice(0, 3).join(', ')}
                        {status.dataKeys.length > 3 && '...'}
                      </div>
                    </>
                  )}
                  {status.timestamp && (
                    <div className="text-xs text-gray-500">
                      {new Date(status.timestamp).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {Object.values(analysis.agentDataStatus).some(s => s.status === 'missing') && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2 text-sm text-red-800">
                <AlertTriangle className="h-4 w-4" />
                <span>
                  <strong>Warning:</strong> Some agents are missing data. This may cause incomplete analysis sections.
                  Check the debug buttons above to inspect the data flow.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Critical Error Banner - Only shown when LLM fails */}
      {hasAnalysisWarning && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-600 mr-4" />
            <div className="flex-grow">
              <h2 className="text-xl font-bold text-red-800 mb-1">
                ⚠️ AI Analysis Failed - Using Fallback Traditional Analysis
              </h2>
              <p className="text-red-700 text-sm">
                The advanced AI analysis could not be completed{llmFailureReason && ` due to: ${llmFailureReason}`}. 
                This analysis uses basic mathematical models and may be less accurate. 
                <span className="font-semibold"> See detailed error information below.</span>
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                Traditional Analysis
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Header with Analysis Type and Timestamp */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {symbol} Investment Analysis
              </h1>
              <div className="flex items-center space-x-4 mt-1">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isLLMFailed 
                    ? 'bg-amber-100 text-amber-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {analysis.analysisType || 'Standard Analysis'}
                </span>
                <span className="text-gray-500 text-sm">
                  Generated: {analysis.generatedAt ? new Date(analysis.generatedAt).toLocaleString() : 'Just now'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LLM Failure Warning - Prominent Alert */}
      {hasAnalysisWarning && (
        <div className="bg-amber-50 border-l-4 border-amber-400 rounded-lg shadow-md">
          <div className="p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <div className="ml-3 flex-grow">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-amber-800">
                    {hasAnalysisWarning.title}
                  </h3>
                  <button
                    onClick={() => toggleSection('llmWarning')}
                    className="text-amber-600 hover:text-amber-800 transition-colors"
                  >
                    {expandedSections.llmWarning ? 
                      <ChevronUp className="h-5 w-5" /> : 
                      <ChevronDown className="h-5 w-5" />
                    }
                  </button>
                </div>
                
                <p className="mt-2 text-amber-700 font-medium">
                  {hasAnalysisWarning.message}
                </p>
                
                {/* Show specific error reason if available */}
                {llmFailureReason && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="font-semibold text-red-800 mb-1">Error Details:</h4>
                    <p className="text-red-700 text-sm font-mono">
                      {llmFailureReason}
                    </p>
                  </div>
                )}
                
                {expandedSections.llmWarning && (
                  <div className="mt-4 space-y-3">
                    <div className="bg-amber-100 rounded-lg p-4">
                      <h4 className="font-semibold text-amber-800 mb-2">Impact on Analysis Quality:</h4>
                      <p className="text-amber-700 text-sm">
                        {hasAnalysisWarning.impact}
                      </p>
                    </div>
                    
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-800 mb-2">How to Fix This:</h4>
                      <ul className="text-blue-700 text-sm space-y-1">
                        <li>• Ensure Ollama is running: <code className="bg-blue-100 px-1 rounded">ollama serve</code></li>
                        <li>• Check if the model is available: <code className="bg-blue-100 px-1 rounded">ollama pull llama3.1:8b</code></li>
                        <li>• Verify Ollama is accessible at: <code className="bg-blue-100 px-1 rounded">http://localhost:11434</code></li>
                        <li>• Restart the backend service after fixing Ollama</li>
                        <li>• Try analyzing {symbol} again after fixing the issue</li>
                      </ul>
                    </div>
                    
                    <div className="bg-gray-100 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-2">What This Means for Your Analysis:</h4>
                      <ul className="text-gray-700 text-sm space-y-1">
                        <li>• Recommendations may be less specific to {symbol}</li>
                        <li>• Limited integration of recent market news</li>
                        <li>• Generic price targets instead of contextual analysis</li>
                        <li>• Reduced accuracy for current market conditions</li>
                        <li>• Mathematical models used instead of AI reasoning</li>
                      </ul>
                    </div>
                    
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="font-semibold text-green-800 mb-2">Next Steps:</h4>
                      <div className="text-green-700 text-sm space-y-2">
                        <p>1. <strong>Fix the LLM service</strong> using the steps above</p>
                        <p>2. <strong>Refresh your browser</strong> and search for {symbol} again</p>
                        <p>3. <strong>Look for the green "AI-Powered Analysis Complete" banner</strong> to confirm AI is working</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI-Powered Analysis Indicator - Always shown since all agents are LLM-based */}
      {!hasAnalysisWarning && (
        <div className="bg-green-50 border-l-4 border-green-400 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-green-800">
                AI-Powered Analysis Complete
              </h3>
              <p className="text-green-700 text-sm mt-1">
                This analysis was generated using advanced AI models for maximum accuracy and contextual insights.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-white/20 rounded-xl mr-4">
                <Target className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">
                  {symbol?.toUpperCase()} Analysis
                </h2>
                <p className="text-blue-100 mt-1">AI-Powered Investment Intelligence</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center text-blue-100 mb-1">
                <Clock className="h-4 w-4 mr-1" />
                <span className="text-sm">
                  {analysis.generatedAt ? new Date(analysis.generatedAt).toLocaleString() : 'Just now'}
                </span>
              </div>
              <div className="flex items-center text-blue-200">
                <Sparkles className="h-4 w-4 mr-1" />
                <span className="text-xs">AI Analysis Complete</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Overall Recommendation */}
        {recommendation && (
          <div className="p-8">
            <div className={`p-6 rounded-2xl border-2 shadow-lg ${getStatusColor(recommendation.action)}`}>
              <div className="flex items-start">
                <div className="p-2 bg-white rounded-lg mr-4 shadow-sm">
                  {getRecommendationIcon(recommendation.action)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-2xl font-bold">
                      {recommendation.action?.toUpperCase() || 'HOLD'}
                    </h3>
                    {recommendation.confidence && (
                      <div className="flex items-center">
                        <Star className="h-5 w-5 text-yellow-500 mr-1" />
                        <span className="font-semibold">
                          {Math.round(recommendation.confidence * 100)}% Confidence
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-lg leading-relaxed">
                    {recommendation.summary || 'Analysis complete with mixed signals.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Investment Recommendations */}
      {analysis?.recommendations && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div 
            className="p-6 bg-gradient-to-r from-green-50 to-blue-100 border-b border-gray-200 cursor-pointer hover:bg-gradient-to-r hover:from-green-100 hover:to-blue-200 transition-all duration-300"
            onClick={() => toggleSection('recommendations')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-green-600 rounded-lg mr-3">
                  <Award className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Investment Recommendations</h3>
              </div>
              {expandedSections.recommendations ? (
                <ChevronUp className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-600" />
              )}
            </div>
          </div>
          
          {expandedSections.recommendations && (
            <div className="p-6 slide-up">
              {/* Executive Summary */}
              {analysis.recommendations.executiveSummary && (
                <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <Sparkles className="h-5 w-5 mr-2 text-blue-600" />
                    Executive Summary
                  </h4>
                  <p className="text-lg leading-relaxed text-gray-700">
                    {analysis.recommendations.executiveSummary}
                  </p>
                  {analysis.recommendations.overallRating && (
                    <div className="mt-4 flex items-center">
                      <div className={`px-4 py-2 rounded-lg font-semibold ${getStatusColor(analysis.recommendations.overallRating)}`}>
                        Overall Rating: {analysis.recommendations.overallRating}
                      </div>
                      {analysis.recommendations.overallConfidence && (
                        <span className="ml-3 text-sm text-gray-600">
                          {formatPercentage(analysis.recommendations.overallConfidence)} confidence
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Time Horizon Analysis */}
              <div className="mb-8">
                <div 
                  className="flex items-center justify-between mb-4 cursor-pointer"
                  onClick={() => toggleSection('timeHorizons')}
                >
                  <h4 className="text-lg font-semibold text-gray-800 flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-purple-600" />
                    Time Horizon Analysis
                  </h4>
                  {expandedSections.timeHorizons ? (
                    <ChevronUp className="h-5 w-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-600" />
                  )}
                </div>
                
                {expandedSections.timeHorizons && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Short Term */}
                    {analysis.recommendations.shortTerm && (
                      <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
                        <div className="flex items-center mb-4">
                          <Zap className="h-6 w-6 text-orange-600 mr-2" />
                          <h5 className="text-lg font-semibold text-gray-800">Short-Term (1-4 weeks)</h5>
                        </div>
                        
                        <div className={`p-4 rounded-lg mb-4 ${getStatusColor(analysis.recommendations.shortTerm.recommendation)}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-lg">{analysis.recommendations.shortTerm.recommendation}</span>
                            <span className="text-sm">{formatPercentage(analysis.recommendations.shortTerm.confidence)} confidence</span>
                          </div>
                        </div>
                        
                        {/* LLM Limitation Warning for Short Term */}
                        {analysis.recommendations.shortTerm.limitationsWarning && (
                          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-start space-x-2">
                              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                              <p className="text-amber-700 text-sm">
                                {analysis.recommendations.shortTerm.limitationsWarning}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        <div className="space-y-3">
                          {analysis.recommendations.shortTerm.priceTargets && (
                            <div className="bg-white rounded-lg p-3">
                              <div className="text-sm font-semibold text-gray-700 mb-1">Price Targets</div>
                              <div className="text-sm text-gray-600">
                                Primary: ${analysis.recommendations.shortTerm.priceTargets.primary}
                                {analysis.recommendations.shortTerm.priceTargets.secondary && 
                                  ` | Secondary: $${analysis.recommendations.shortTerm.priceTargets.secondary}`}
                              </div>
                            </div>
                          )}
                          
                          {analysis.recommendations.shortTerm.stopLoss && (
                            <div className="bg-white rounded-lg p-3">
                              <div className="text-sm font-semibold text-gray-700 mb-1">Stop Loss</div>
                              <div className="text-sm text-gray-600">${analysis.recommendations.shortTerm.stopLoss.level}</div>
                            </div>
                          )}
                          
                          {analysis.recommendations.shortTerm.actionItems && (
                            <div className="bg-white rounded-lg p-3">
                              <div className="text-sm font-semibold text-gray-700 mb-2">Action Items</div>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {analysis.recommendations.shortTerm.actionItems.map((item, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <CheckSquare className="h-3 w-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Mid Term */}
                    {analysis.recommendations.midTerm && (
                      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                        <div className="flex items-center mb-4">
                          <LineChart className="h-6 w-6 text-blue-600 mr-2" />
                          <h5 className="text-lg font-semibold text-gray-800">Mid-Term (1-6 months)</h5>
                        </div>
                        
                        <div className={`p-4 rounded-lg mb-4 ${getStatusColor(analysis.recommendations.midTerm.recommendation)}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-lg">{analysis.recommendations.midTerm.recommendation}</span>
                            <span className="text-sm">{formatPercentage(analysis.recommendations.midTerm.confidence)} confidence</span>
                          </div>
                        </div>
                        
                        {/* LLM Limitation Warning for Mid Term */}
                        {analysis.recommendations.midTerm.limitationsWarning && (
                          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-start space-x-2">
                              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                              <p className="text-amber-700 text-sm">
                                {analysis.recommendations.midTerm.limitationsWarning}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        <div className="space-y-3">
                          {analysis.recommendations.midTerm.priceTargets && (
                            <div className="bg-white rounded-lg p-3">
                              <div className="text-sm font-semibold text-gray-700 mb-1">Price Targets</div>
                              <div className="text-sm text-gray-600">
                                Conservative: ${analysis.recommendations.midTerm.priceTargets.conservative}
                                {analysis.recommendations.midTerm.priceTargets.optimistic && 
                                  ` | Optimistic: $${analysis.recommendations.midTerm.priceTargets.optimistic}`}
                              </div>
                            </div>
                          )}
                          
                          {analysis.recommendations.midTerm.keyMilestones && (
                            <div className="bg-white rounded-lg p-3">
                              <div className="text-sm font-semibold text-gray-700 mb-2">Key Milestones</div>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {analysis.recommendations.midTerm.keyMilestones.map((milestone, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <Calendar className="h-3 w-3 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                                    {milestone}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {analysis.recommendations.midTerm.actionItems && (
                            <div className="bg-white rounded-lg p-3">
                              <div className="text-sm font-semibold text-gray-700 mb-2">Action Items</div>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {analysis.recommendations.midTerm.actionItems.map((item, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <CheckSquare className="h-3 w-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Long Term */}
                    {analysis.recommendations.longTerm && (
                      <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-6 border border-green-200">
                        <div className="flex items-center mb-4">
                          <TrendingUp className="h-6 w-6 text-green-600 mr-2" />
                          <h5 className="text-lg font-semibold text-gray-800">Long-Term (6+ months)</h5>
                        </div>
                        
                        <div className={`p-4 rounded-lg mb-4 ${getStatusColor(analysis.recommendations.longTerm.recommendation)}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-lg">{analysis.recommendations.longTerm.recommendation}</span>
                            <span className="text-sm">{formatPercentage(analysis.recommendations.longTerm.confidence)} confidence</span>
                          </div>
                        </div>
                        
                        {/* LLM Limitation Warning for Long Term */}
                        {analysis.recommendations.longTerm.limitationsWarning && (
                          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-start space-x-2">
                              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                              <p className="text-amber-700 text-sm">
                                {analysis.recommendations.longTerm.limitationsWarning}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        <div className="space-y-3">
                          {analysis.recommendations.longTerm.fairValueAssessment && (
                            <div className="bg-white rounded-lg p-3">
                              <div className="text-sm font-semibold text-gray-700 mb-1">Fair Value Assessment</div>
                              <div className="text-sm text-gray-600">
                                Intrinsic Value: ${analysis.recommendations.longTerm.fairValueAssessment.intrinsicValue}
                                {analysis.recommendations.longTerm.fairValueAssessment.currentDiscount && 
                                  ` | Discount: ${analysis.recommendations.longTerm.fairValueAssessment.currentDiscount}`}
                              </div>
                            </div>
                          )}
                          
                          {analysis.recommendations.longTerm.growthDrivers && (
                            <div className="bg-white rounded-lg p-3">
                              <div className="text-sm font-semibold text-gray-700 mb-2">Growth Drivers</div>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {analysis.recommendations.longTerm.growthDrivers.map((driver, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <ArrowUp className="h-3 w-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                    {driver}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {analysis.recommendations.longTerm.actionItems && (
                            <div className="bg-white rounded-lg p-3">
                              <div className="text-sm font-semibold text-gray-700 mb-2">Action Items</div>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {analysis.recommendations.longTerm.actionItems.map((item, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <CheckSquare className="h-3 w-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Scenario Analysis */}
              {analysis.recommendations.scenarioAnalysis && (
                <div className="mb-8">
                  <div 
                    className="flex items-center justify-between mb-4 cursor-pointer"
                    onClick={() => toggleSection('scenarios')}
                  >
                    <h4 className="text-lg font-semibold text-gray-800 flex items-center">
                      <PieChart className="h-5 w-5 mr-2 text-indigo-600" />
                      Scenario Analysis
                    </h4>
                    {expandedSections.scenarios ? (
                      <ChevronUp className="h-5 w-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-600" />
                    )}
                  </div>
                  
                  {expandedSections.scenarios && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Bull Case */}
                      {analysis.recommendations.scenarioAnalysis.bullCase && (
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                          <div className="flex items-center mb-3">
                            <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                            <h5 className="font-semibold text-gray-800">Bull Case</h5>
                            <span className="ml-auto text-sm text-green-600 font-medium">
                              {formatPercentage(analysis.recommendations.scenarioAnalysis.bullCase.probability)}
                            </span>
                          </div>
                          <div className="text-2xl font-bold text-green-700 mb-2">
                            ${analysis.recommendations.scenarioAnalysis.bullCase.priceTarget}
                          </div>
                          <p className="text-sm text-gray-600">
                            {analysis.recommendations.scenarioAnalysis.bullCase.description}
                          </p>
                        </div>
                      )}

                      {/* Base Case */}
                      {analysis.recommendations.scenarioAnalysis.baseCase && (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                                                     <div className="flex items-center mb-3">
                             <Minus className="h-5 w-5 text-blue-600 mr-2" />
                             <h5 className="font-semibold text-gray-800">Base Case</h5>
                            <span className="ml-auto text-sm text-blue-600 font-medium">
                              {formatPercentage(analysis.recommendations.scenarioAnalysis.baseCase.probability)}
                            </span>
                          </div>
                          <div className="text-2xl font-bold text-blue-700 mb-2">
                            ${analysis.recommendations.scenarioAnalysis.baseCase.priceTarget}
                          </div>
                          <p className="text-sm text-gray-600">
                            {analysis.recommendations.scenarioAnalysis.baseCase.description}
                          </p>
                        </div>
                      )}

                      {/* Bear Case */}
                      {analysis.recommendations.scenarioAnalysis.bearCase && (
                        <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-6 border border-red-200">
                          <div className="flex items-center mb-3">
                            <TrendingDown className="h-5 w-5 text-red-600 mr-2" />
                            <h5 className="font-semibold text-gray-800">Bear Case</h5>
                            <span className="ml-auto text-sm text-red-600 font-medium">
                              {formatPercentage(analysis.recommendations.scenarioAnalysis.bearCase.probability)}
                            </span>
                          </div>
                          <div className="text-2xl font-bold text-red-700 mb-2">
                            ${analysis.recommendations.scenarioAnalysis.bearCase.priceTarget}
                          </div>
                          <p className="text-sm text-gray-600">
                            {analysis.recommendations.scenarioAnalysis.bearCase.description}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Monitoring Metrics */}
              {analysis.recommendations.monitoringMetrics && (
                <div className="mb-8">
                  <div 
                    className="flex items-center justify-between mb-4 cursor-pointer"
                    onClick={() => toggleSection('monitoring')}
                  >
                    <h4 className="text-lg font-semibold text-gray-800 flex items-center">
                      <Eye className="h-5 w-5 mr-2 text-purple-600" />
                      Key Monitoring Metrics
                    </h4>
                    {expandedSections.monitoring ? (
                      <ChevronUp className="h-5 w-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-600" />
                    )}
                  </div>
                  
                  {expandedSections.monitoring && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {analysis.recommendations.monitoringMetrics.map((metric, idx) => (
                        <div key={idx} className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                          <div className="flex items-center">
                            <Settings className="h-4 w-4 text-purple-600 mr-2" />
                            <span className="text-sm font-medium text-gray-700">{metric}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Key Insights */}
              {analysis.recommendations.keyInsights && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                    <Sparkles className="h-5 w-5 mr-2 text-indigo-600" />
                    Key Insights
                  </h4>
                  <div className="space-y-3">
                    {analysis.recommendations.keyInsights.map((insight, idx) => (
                      <div key={idx} className="flex items-start p-4 bg-white rounded-lg shadow-sm">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3 flex-shrink-0 mt-3"></div>
                        <span className="text-sm text-gray-700 leading-relaxed">{insight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Technical Analysis Section */}
      {stockData && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div 
            className="p-6 bg-gradient-to-r from-blue-50 to-indigo-100 border-b border-gray-200 cursor-pointer hover:bg-gradient-to-r hover:from-blue-100 hover:to-indigo-200 transition-all duration-300"
            onClick={() => toggleSection('technical')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-blue-600 rounded-lg mr-3">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Technical Analysis</h3>
              </div>
              {expandedSections.technical ? (
                <ChevronUp className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-600" />
              )}
            </div>
          </div>
          
          {expandedSections.technical && (
            <div className="p-6 slide-up">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {stockData.currentPrice && (
                  <div className="metric-card hover-lift">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-700">Current Price</h4>
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900 mb-1">
                      ${stockData.currentPrice.toFixed(2)}
                    </p>
                    {stockData.priceChange && (
                      <p className={`text-sm font-medium ${stockData.priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stockData.priceChange >= 0 ? '+' : ''}{stockData.priceChange.toFixed(2)}
                        {stockData.priceChangePercent && ` (${stockData.priceChangePercent.toFixed(2)}%)`}
                      </p>
                    )}
                  </div>
                )}

                {stockData.volume && (
                  <div className="metric-card hover-lift">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-700">Volume</h4>
                      <Activity className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {stockData.volume.toLocaleString()}
                    </p>
                  </div>
                )}

                {stockData.marketCap && (
                  <div className="metric-card hover-lift">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-700">Market Cap</h4>
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(stockData.marketCap)}
                    </p>
                  </div>
                )}
              </div>

              {/* Technical Indicators */}
              {stockData.technicalIndicators && (
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                    Technical Indicators
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(stockData.technicalIndicators).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
                        <span className="font-medium text-gray-700">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </span>
                        <span className="text-gray-900 font-semibold">
                          {typeof value === 'number' ? value.toFixed(2) : value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* News Sentiment Section */}
      {newsSentiment && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div 
            className="p-6 bg-gradient-to-r from-purple-50 to-pink-100 border-b border-gray-200 cursor-pointer hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-200 transition-all duration-300"
            onClick={() => toggleSection('sentiment')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-purple-600 rounded-lg mr-3">
                  <Newspaper className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">News Sentiment Analysis</h3>
              </div>
              {expandedSections.sentiment ? (
                <ChevronUp className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-600" />
              )}
            </div>
          </div>
          
          {expandedSections.sentiment && (
            <div className="p-6 slide-up">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className={`p-6 rounded-xl border-2 shadow-lg hover-lift ${getStatusColor(newsSentiment.overall)}`}>
                  <div className="flex items-center">
                    {getTrendIcon(newsSentiment.overall)}
                    <div className="ml-3">
                      <h4 className="text-lg font-semibold">
                        Overall Sentiment: {newsSentiment.overall?.toUpperCase() || 'NEUTRAL'}
                      </h4>
                      {newsSentiment.score && (
                        <p className="text-sm font-medium mt-1">
                          Sentiment Score: {newsSentiment.score.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                {newsSentiment.summary && (
                  <div className="metric-card hover-lift">
                    <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                      <Info className="h-5 w-5 mr-2 text-blue-600" />
                      Key Insights
                    </h4>
                    <p className="text-gray-600 leading-relaxed">
                      {newsSentiment.summary}
                    </p>
                  </div>
                )}
              </div>

              {/* Recent News */}
              {newsSentiment.recentNews && newsSentiment.recentNews.length > 0 && (
                <div className="bg-gradient-to-r from-gray-50 to-purple-50 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                    <Newspaper className="h-5 w-5 mr-2 text-purple-600" />
                    Recent News Headlines
                  </h4>
                  <div className="space-y-4">
                    {newsSentiment.recentNews.slice(0, 3).map((news, index) => (
                      <div key={index} className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100">
                        <h5 className="font-semibold text-gray-800 mb-2">{news.title}</h5>
                        <p className="text-sm text-gray-600 mb-3 leading-relaxed">{news.summary}</p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 font-medium">{news.source}</span>
                          {news.sentiment && (
                            <span className={`px-2 py-1 rounded-full font-medium ${getStatusColor(news.sentiment).split(' ')[0]} ${getStatusColor(news.sentiment).split(' ')[1]}`}>
                              {news.sentiment}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Fundamental Analysis Section */}
      {data.rawData?.fundamentalData && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div 
            className="p-6 bg-gradient-to-r from-green-50 to-emerald-100 border-b border-gray-200 cursor-pointer hover:bg-gradient-to-r hover:from-green-100 hover:to-emerald-200 transition-all duration-300"
            onClick={() => toggleSection('fundamental')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-green-600 rounded-lg mr-3">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Fundamental Analysis</h3>
              </div>
              {expandedSections.fundamental ? (
                <ChevronUp className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-600" />
              )}
            </div>
          </div>
          
          {expandedSections.fundamental && (
            <div className="p-6 slide-up">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Key Financial Metrics */}
                {data.rawData.fundamentalData.financialMetrics && (
                  <div className="md:col-span-2 bg-gradient-to-r from-gray-50 to-green-50 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                      <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                      Key Financial Metrics
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries(data.rawData.fundamentalData.financialMetrics).map(([key, value]) => (
                        <div key={key} className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
                          <h5 className="font-medium text-gray-700 text-sm mb-1">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </h5>
                          <p className="text-lg font-bold text-gray-900">
                            {typeof value === 'number' ? (value >= 1e9 ? `$${(value / 1e9).toFixed(2)}B` : 
                              value >= 1e6 ? `$${(value / 1e6).toFixed(2)}M` : 
                              value >= 1e3 ? `$${(value / 1e3).toFixed(2)}K` : 
                              value.toFixed(2)) : value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Valuation Ratios */}
                {data.rawData.fundamentalData.valuationRatios && (
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                      <PieChart className="h-5 w-5 mr-2 text-blue-600" />
                      Valuation Ratios
                    </h4>
                    <div className="space-y-3">
                      {Object.entries(data.rawData.fundamentalData.valuationRatios).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                          <span className="font-medium text-gray-700 text-sm">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </span>
                          <span className="text-gray-900 font-semibold">
                            {typeof value === 'number' ? value.toFixed(2) : value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Financial Statements Summary */}
              {data.rawData.fundamentalData.financialStatements && (
                <div className="bg-gradient-to-r from-gray-50 to-indigo-50 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                    <LineChart className="h-5 w-5 mr-2 text-indigo-600" />
                    Financial Performance Summary
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(data.rawData.fundamentalData.financialStatements).map(([statement, data]) => (
                      <div key={statement} className="p-4 bg-white rounded-lg shadow-sm">
                        <h5 className="font-semibold text-gray-800 mb-3">
                          {statement.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </h5>
                        <div className="space-y-2">
                          {Object.entries(data).slice(0, 5).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-sm">
                              <span className="text-gray-600">{key.replace(/([A-Z])/g, ' $1')}</span>
                              <span className="font-medium text-gray-900">
                                {typeof value === 'number' ? (value >= 1e9 ? `$${(value / 1e9).toFixed(2)}B` : 
                                  value >= 1e6 ? `$${(value / 1e6).toFixed(2)}M` : 
                                  value >= 1e3 ? `$${(value / 1e3).toFixed(2)}K` : 
                                  value.toFixed(2)) : value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Competitive Analysis Section */}
      {data.rawData?.competitiveData && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div 
            className="p-6 bg-gradient-to-r from-orange-50 to-amber-100 border-b border-gray-200 cursor-pointer hover:bg-gradient-to-r hover:from-orange-100 hover:to-amber-200 transition-all duration-300"
            onClick={() => toggleSection('competitive')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-orange-600 rounded-lg mr-3">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Competitive Analysis</h3>
              </div>
              {expandedSections.competitive ? (
                <ChevronUp className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-600" />
              )}
            </div>
          </div>
          
          {expandedSections.competitive && (
            <div className="p-6 slide-up">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Market Position */}
                {data.rawData.competitiveData.marketPosition && (
                  <div className="bg-gradient-to-r from-gray-50 to-orange-50 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                      <Award className="h-5 w-5 mr-2 text-orange-600" />
                      Market Position
                    </h4>
                    <div className="space-y-4">
                      <div className="p-4 bg-white rounded-lg shadow-sm">
                        <h5 className="font-semibold text-gray-800 mb-2">Market Share</h5>
                        <p className="text-2xl font-bold text-gray-900">
                          {data.rawData.competitiveData.marketPosition.marketShare || 'N/A'}
                        </p>
                      </div>
                      <div className="p-4 bg-white rounded-lg shadow-sm">
                        <h5 className="font-semibold text-gray-800 mb-2">Competitive Position</h5>
                        <p className="text-lg font-semibold text-gray-900">
                          {data.rawData.competitiveData.marketPosition.position || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Competitive Advantages */}
                {data.rawData.competitiveData.competitiveAdvantages && (
                  <div className="bg-gradient-to-r from-gray-50 to-green-50 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                      <Star className="h-5 w-5 mr-2 text-green-600" />
                      Competitive Advantages
                    </h4>
                    <div className="space-y-3">
                      {data.rawData.competitiveData.competitiveAdvantages.map((advantage, index) => (
                        <div key={index} className="flex items-start p-3 bg-white rounded-lg shadow-sm">
                          <Star className="h-4 w-4 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-700">{advantage}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Competitors Analysis */}
              {data.rawData.competitiveData.competitors && (
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                    <Users className="h-5 w-5 mr-2 text-blue-600" />
                    Key Competitors
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.rawData.competitiveData.competitors.map((competitor, index) => (
                      <div key={index} className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
                        <h5 className="font-semibold text-gray-800 mb-2">{competitor.name}</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Market Cap:</span>
                            <span className="font-medium text-gray-900">{formatCurrency(competitor.marketCap)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">P/E Ratio:</span>
                            <span className="font-medium text-gray-900">{competitor.peRatio?.toFixed(2) || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Revenue:</span>
                            <span className="font-medium text-gray-900">{formatCurrency(competitor.revenue)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SWOT Analysis */}
              {data.rawData.competitiveData.swotAnalysis && (
                <div className="bg-gradient-to-r from-gray-50 to-purple-50 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                    <Target className="h-5 w-5 mr-2 text-purple-600" />
                    SWOT Analysis
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(data.rawData.competitiveData.swotAnalysis).map(([category, items]) => (
                      <div key={category} className="p-4 bg-white rounded-lg shadow-sm">
                        <h5 className="font-semibold text-gray-800 mb-3 capitalize">{category}</h5>
                        <div className="space-y-2">
                          {items.map((item, index) => (
                            <div key={index} className="flex items-start text-sm">
                              <div className={`w-2 h-2 rounded-full mt-2 mr-3 flex-shrink-0 ${
                                category === 'strengths' ? 'bg-green-500' :
                                category === 'weaknesses' ? 'bg-red-500' :
                                category === 'opportunities' ? 'bg-blue-500' :
                                'bg-purple-500'
                              }`} />
                              <span className="text-gray-700">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Risk Assessment Section */}
      {analysis?.riskAssessment && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div 
            className="p-6 bg-gradient-to-r from-orange-50 to-red-100 border-b border-gray-200 cursor-pointer hover:bg-gradient-to-r hover:from-orange-100 hover:to-red-200 transition-all duration-300"
            onClick={() => toggleSection('risk')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-orange-600 rounded-lg mr-3">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Risk Assessment</h3>
              </div>
              {expandedSections.risk ? (
                <ChevronUp className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-600" />
              )}
            </div>
          </div>
          
          {expandedSections.risk && (
            <div className="p-6 slide-up">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {analysis.riskAssessment.level && (
                  <div className={`p-6 rounded-xl border-2 shadow-lg hover-lift ${getStatusColor(analysis.riskAssessment.level)}`}>
                    <h4 className="text-lg font-semibold mb-2">Risk Level</h4>
                    <p className="text-2xl font-bold">{analysis.riskAssessment.level.toUpperCase()}</p>
                  </div>
                )}

                {analysis.riskAssessment.factors && (
                  <div className="md:col-span-2 bg-gradient-to-r from-gray-50 to-orange-50 rounded-xl p-6">
                    <h4 className="font-semibold text-gray-700 mb-4 flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
                      Risk Factors
                    </h4>
                    <div className="space-y-2">
                      {analysis.riskAssessment.factors.map((factor, index) => (
                        <div key={index} className="flex items-start p-3 bg-white rounded-lg shadow-sm">
                          <AlertTriangle className="h-4 w-4 text-orange-500 mr-3 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-700">{factor}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Additional Analysis Details */}
      {analysis && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-indigo-50 to-blue-100 border-b border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-600 rounded-lg mr-3">
                <Info className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800">Additional Insights</h3>
            </div>
          </div>
          
          <div className="p-6">
            <div className="prose prose-lg max-w-none text-gray-700">
              {analysis.summary && (
                <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <Sparkles className="h-5 w-5 mr-2 text-blue-600" />
                    AI Summary
                  </h4>
                  <p className="leading-relaxed">{analysis.summary}</p>
                </div>
              )}
              
              {analysis.keyPoints && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                    Key Points
                  </h4>
                  <div className="space-y-3">
                    {analysis.keyPoints.map((point, index) => (
                      <div key={index} className="flex items-start p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 flex-shrink-0 mt-3"></div>
                        <span className="leading-relaxed">{point}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {analysis.disclaimer && (
                <div className="p-6 bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-400 rounded-lg">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-yellow-800 mb-1">Important Disclaimer</p>
                      <p className="text-sm text-yellow-700 leading-relaxed">{analysis.disclaimer}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI-Generated Fundamental Analysis Summary */}
      {analysis.fundamentalSummary && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div 
            className="p-6 bg-gradient-to-r from-purple-50 to-indigo-100 border-b border-gray-200 cursor-pointer hover:bg-gradient-to-r hover:from-purple-100 hover:to-indigo-200 transition-all duration-300"
            onClick={() => toggleSection('fundamental')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-purple-600 rounded-lg mr-3">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">AI-Generated Fundamental Analysis</h3>
              </div>
              {expandedSections.fundamental ? (
                <ChevronUp className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-600" />
              )}
            </div>
          </div>
          
          {expandedSections.fundamental && (
            <div className="p-6 slide-up">
              <div className="prose prose-lg max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {analysis.fundamentalSummary}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI-Generated Competitive Analysis Summary */}
      {analysis.competitiveSummary && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div 
            className="p-6 bg-gradient-to-r from-amber-50 to-orange-100 border-b border-gray-200 cursor-pointer hover:bg-gradient-to-r hover:from-amber-100 hover:to-orange-200 transition-all duration-300"
            onClick={() => toggleSection('competitive')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-amber-600 rounded-lg mr-3">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">AI-Generated Competitive Analysis</h3>
              </div>
              {expandedSections.competitive ? (
                <ChevronUp className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-600" />
              )}
            </div>
          </div>
          
          {expandedSections.competitive && (
            <div className="p-6 slide-up">
              <div className="prose prose-lg max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {analysis.competitiveSummary}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Data Analysis Section */}
      {rawData?.enhancedData && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div 
            className="p-6 bg-gradient-to-r from-teal-50 to-cyan-100 border-b border-gray-200 cursor-pointer hover:bg-gradient-to-r hover:from-teal-100 hover:to-cyan-200 transition-all duration-300"
            onClick={() => toggleSection('enhanced')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-teal-600 rounded-lg mr-3">
                  <Database className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Enhanced Market Data</h3>
              </div>
              {expandedSections.enhanced ? (
                <ChevronUp className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-600" />
              )}
            </div>
          </div>
          
          {expandedSections.enhanced && (
            <div className="p-6 slide-up">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Options Data */}
                {rawData.enhancedData.optionsData && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                      <Activity className="h-5 w-5 mr-2 text-blue-600" />
                      Options Analysis
                    </h4>
                    <div className="space-y-3">
                      {rawData.enhancedData.optionsData.putCallRatio && (
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                          <span className="text-sm font-medium text-gray-700">Put/Call Ratio</span>
                          <span className="text-lg font-bold text-blue-600">
                            {rawData.enhancedData.optionsData.putCallRatio.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {rawData.enhancedData.optionsData.ivRank && (
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                          <span className="text-sm font-medium text-gray-700">IV Rank</span>
                          <span className="text-lg font-bold text-purple-600">
                            {formatPercentage(rawData.enhancedData.optionsData.ivRank)}
                          </span>
                        </div>
                      )}
                      {rawData.enhancedData.optionsData.ivPercentile && (
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                          <span className="text-sm font-medium text-gray-700">IV Percentile</span>
                          <span className="text-lg font-bold text-indigo-600">
                            {formatPercentage(rawData.enhancedData.optionsData.ivPercentile)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Institutional Holdings */}
                {rawData.enhancedData.institutionalHoldings && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6">
                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                      <Users className="h-5 w-5 mr-2 text-green-600" />
                      Institutional Holdings
                    </h4>
                    <div className="space-y-3">
                      {rawData.enhancedData.institutionalHoldings.percentage && (
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                          <span className="text-sm font-medium text-gray-700">Institutional %</span>
                          <span className="text-lg font-bold text-green-600">
                            {formatPercentage(rawData.enhancedData.institutionalHoldings.percentage)}
                          </span>
                        </div>
                      )}
                      {rawData.enhancedData.institutionalHoldings.holders && (
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                          <span className="text-sm font-medium text-gray-700">Holders</span>
                          <span className="text-lg font-bold text-emerald-600">
                            {rawData.enhancedData.institutionalHoldings.holders}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Insider Trading */}
                {rawData.enhancedData.insiderTrading && (
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-6">
                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                      <Eye className="h-5 w-5 mr-2 text-orange-600" />
                      Insider Trading
                    </h4>
                    <div className="space-y-3">
                      {rawData.enhancedData.insiderTrading.netActivity && (
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                          <span className="text-sm font-medium text-gray-700">Net Activity</span>
                          <span className={`text-lg font-bold ${
                            rawData.enhancedData.insiderTrading.netActivity > 0 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {rawData.enhancedData.insiderTrading.netActivity > 0 ? '+' : ''}
                            {formatCurrency(rawData.enhancedData.insiderTrading.netActivity)}
                          </span>
                        </div>
                      )}
                      {rawData.enhancedData.insiderTrading.transactions && (
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                          <span className="text-sm font-medium text-gray-700">Transactions</span>
                          <span className="text-lg font-bold text-amber-600">
                            {rawData.enhancedData.insiderTrading.transactions}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Analyst Ratings */}
                {rawData.enhancedData.analystRatings && (
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6">
                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                      <Star className="h-5 w-5 mr-2 text-purple-600" />
                      Analyst Ratings
                    </h4>
                    <div className="space-y-3">
                      {rawData.enhancedData.analystRatings.consensus && (
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                          <span className="text-sm font-medium text-gray-700">Consensus</span>
                          <span className="text-lg font-bold text-purple-600">
                            {rawData.enhancedData.analystRatings.consensus}
                          </span>
                        </div>
                      )}
                      {rawData.enhancedData.analystRatings.priceTarget && (
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                          <span className="text-sm font-medium text-gray-700">Price Target</span>
                          <span className="text-lg font-bold text-pink-600">
                            {formatCurrency(rawData.enhancedData.analystRatings.priceTarget)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Advanced Technical Analysis Section */}
      {rawData?.advancedTechnicalData && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div 
            className="p-6 bg-gradient-to-r from-pink-50 to-rose-100 border-b border-gray-200 cursor-pointer hover:bg-gradient-to-r hover:from-pink-100 hover:to-rose-200 transition-all duration-300"
            onClick={() => toggleSection('advancedTechnical')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-pink-600 rounded-lg mr-3">
                  <LineChart className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Advanced Technical Analysis</h3>
              </div>
              {expandedSections.advancedTechnical ? (
                <ChevronUp className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-600" />
              )}
            </div>
          </div>
          
          {expandedSections.advancedTechnical && (
            <div className="p-6 slide-up">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Elliott Wave Analysis */}
                {rawData.advancedTechnicalData.elliottWave && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                      <Zap className="h-5 w-5 mr-2 text-blue-600" />
                      Elliott Wave Analysis
                    </h4>
                    <div className="space-y-3">
                      {rawData.advancedTechnicalData.elliottWave.currentWave && (
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                          <span className="text-sm font-medium text-gray-700">Current Wave</span>
                          <span className="text-lg font-bold text-blue-600">
                            {rawData.advancedTechnicalData.elliottWave.currentWave}
                          </span>
                        </div>
                      )}
                      {rawData.advancedTechnicalData.elliottWave.pattern && (
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                          <span className="text-sm font-medium text-gray-700">Pattern</span>
                          <span className="text-lg font-bold text-indigo-600">
                            {rawData.advancedTechnicalData.elliottWave.pattern}
                          </span>
                        </div>
                      )}
                      {rawData.advancedTechnicalData.elliottWave.target && (
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                          <span className="text-sm font-medium text-gray-700">Target</span>
                          <span className="text-lg font-bold text-purple-600">
                            {formatCurrency(rawData.advancedTechnicalData.elliottWave.target)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Fibonacci Retracements */}
                {rawData.advancedTechnicalData.fibonacci && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6">
                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                      <Target className="h-5 w-5 mr-2 text-green-600" />
                      Fibonacci Retracements
                    </h4>
                    <div className="space-y-3">
                      {rawData.advancedTechnicalData.fibonacci.levels && (
                        <div className="space-y-2">
                          {Object.entries(rawData.advancedTechnicalData.fibonacci.levels).map(([level, price]) => (
                            <div key={level} className="flex justify-between items-center p-3 bg-white rounded-lg">
                              <span className="text-sm font-medium text-gray-700">{level}</span>
                              <span className="text-lg font-bold text-green-600">
                                {formatCurrency(price)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Market Structure */}
                {rawData.advancedTechnicalData.marketStructure && (
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-6">
                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2 text-orange-600" />
                      Market Structure
                    </h4>
                    <div className="space-y-3">
                      {rawData.advancedTechnicalData.marketStructure.trend && (
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                          <span className="text-sm font-medium text-gray-700">Trend</span>
                          <span className="text-lg font-bold text-orange-600">
                            {rawData.advancedTechnicalData.marketStructure.trend}
                          </span>
                        </div>
                      )}
                      {rawData.advancedTechnicalData.marketStructure.support && (
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                          <span className="text-sm font-medium text-gray-700">Support</span>
                          <span className="text-lg font-bold text-amber-600">
                            {formatCurrency(rawData.advancedTechnicalData.marketStructure.support)}
                          </span>
                        </div>
                      )}
                      {rawData.advancedTechnicalData.marketStructure.resistance && (
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                          <span className="text-sm font-medium text-gray-700">Resistance</span>
                          <span className="text-lg font-bold text-red-600">
                            {formatCurrency(rawData.advancedTechnicalData.marketStructure.resistance)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Chart Patterns */}
                {rawData.advancedTechnicalData.chartPatterns && (
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6">
                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                      <PieChart className="h-5 w-5 mr-2 text-purple-600" />
                      Chart Patterns
                    </h4>
                    <div className="space-y-3">
                      {rawData.advancedTechnicalData.chartPatterns.patterns && (
                        <div className="space-y-2">
                          {rawData.advancedTechnicalData.chartPatterns.patterns.map((pattern, index) => (
                            <div key={index} className="flex justify-between items-center p-3 bg-white rounded-lg">
                              <span className="text-sm font-medium text-gray-700">{pattern.name}</span>
                              <span className={`text-sm font-bold px-2 py-1 rounded ${
                                pattern.sentiment === 'bullish' ? 'bg-green-100 text-green-800' :
                                pattern.sentiment === 'bearish' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {pattern.sentiment}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Professional Report Section */}
      {rawData?.reportData && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div 
            className="p-6 bg-gradient-to-r from-cyan-50 to-blue-100 border-b border-gray-200 cursor-pointer hover:bg-gradient-to-r hover:from-cyan-100 hover:to-blue-200 transition-all duration-300"
            onClick={() => toggleSection('report')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-cyan-600 rounded-lg mr-3">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Professional Analysis Report</h3>
              </div>
              {expandedSections.report ? (
                <ChevronUp className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-600" />
              )}
            </div>
          </div>
          
          {expandedSections.report && (
            <div className="p-6 slide-up">
              <div className="prose prose-lg max-w-none">
                {/* Executive Summary */}
                {rawData.reportData.executiveSummary && (
                  <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                    <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                      <Award className="h-6 w-6 mr-2 text-blue-600" />
                      Executive Summary
                    </h4>
                    <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                      {rawData.reportData.executiveSummary}
                    </div>
                  </div>
                )}

                {/* Investment Thesis */}
                {rawData.reportData.investmentThesis && (
                  <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                    <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                      <Target className="h-6 w-6 mr-2 text-green-600" />
                      Investment Thesis
                    </h4>
                    <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                      {rawData.reportData.investmentThesis}
                    </div>
                  </div>
                )}

                {/* Risk Assessment */}
                {rawData.reportData.riskAssessment && (
                  <div className="mb-8 p-6 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl">
                    <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                      <Shield className="h-6 w-6 mr-2 text-red-600" />
                      Risk Assessment
                    </h4>
                    <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                      {rawData.reportData.riskAssessment}
                    </div>
                  </div>
                )}

                {/* Valuation Analysis */}
                {rawData.reportData.valuationAnalysis && (
                  <div className="mb-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                    <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                      <DollarSign className="h-6 w-6 mr-2 text-purple-600" />
                      Valuation Analysis
                    </h4>
                    <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                      {rawData.reportData.valuationAnalysis}
                    </div>
                  </div>
                )}

                {/* Technical Outlook */}
                {rawData.reportData.technicalOutlook && (
                  <div className="mb-8 p-6 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl">
                    <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                      <LineChart className="h-6 w-6 mr-2 text-amber-600" />
                      Technical Outlook
                    </h4>
                    <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                      {rawData.reportData.technicalOutlook}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {rawData.reportData.recommendations && (
                  <div className="mb-8 p-6 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl">
                    <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                      <CheckSquare className="h-6 w-6 mr-2 text-teal-600" />
                      Recommendations
                    </h4>
                    <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                      {rawData.reportData.recommendations}
                    </div>
                  </div>
                )}

                {/* Export Button */}
                <div className="mt-8 text-center">
                  <button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center mx-auto">
                    <FileText className="h-5 w-5 mr-2" />
                    Export Full Report (PDF)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalysisResults; 