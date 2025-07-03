import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
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
  Star
} from 'lucide-react';

const AnalysisResults = ({ data }) => {
  const [expandedSections, setExpandedSections] = useState({
    technical: true,
    sentiment: true,
    risk: true
  });

  if (!data) {
    return null;
  }

  const {
    symbol,
    analysis,
    stockData,
    newsSentiment,
    recommendation,
    timestamp
  } = data;

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Helper function to get status color classes
  const getStatusColor = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
      case 'bullish':
      case 'buy':
        return 'text-green-700 bg-gradient-to-r from-green-50 to-emerald-100 border-green-300';
      case 'negative':
      case 'bearish':
      case 'sell':
        return 'text-red-700 bg-gradient-to-r from-red-50 to-rose-100 border-red-300';
      case 'neutral':
      case 'hold':
        return 'text-yellow-700 bg-gradient-to-r from-yellow-50 to-amber-100 border-yellow-300';
      default:
        return 'text-gray-700 bg-gradient-to-r from-gray-50 to-slate-100 border-gray-300';
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

  return (
    <div className="space-y-8 fade-in">
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
                  {timestamp ? new Date(timestamp).toLocaleString() : 'Just now'}
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
                  <Target className="h-6 w-6 text-gray-700" />
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
    </div>
  );
};

export default AnalysisResults; 