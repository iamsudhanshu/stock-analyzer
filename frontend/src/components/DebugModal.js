import React from 'react';
import { X, Database, ArrowRight, Code, FileText, Activity } from 'lucide-react';

const DebugModal = ({ isOpen, onClose, agentData }) => {
  if (!isOpen || !agentData) return null;

  const { agentType, inputData, outputData, timestamp, status } = agentData;

  const formatData = (data) => {
    if (!data) return 'No data available';
    
    try {
      if (typeof data === 'string') {
        return data;
      }
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return 'Error formatting data: ' + error.message;
    }
  };

  const getAgentIcon = (type) => {
    switch (type) {
      case 'StockDataAgent':
        return <Activity className="h-5 w-5 text-blue-600" />;
      case 'NewsSentimentAgent':
        return <FileText className="h-5 w-5 text-green-600" />;
      case 'FundamentalDataAgent':
        return <Database className="h-5 w-5 text-purple-600" />;
      case 'CompetitiveAgent':
        return <Code className="h-5 w-5 text-orange-600" />;
      case 'AnalysisAgent':
        return <Activity className="h-5 w-5 text-indigo-600" />;
      default:
        return <Database className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getAgentIcon(agentType)}
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {agentType} Debug Data
                </h2>
                <p className="text-sm text-gray-600">
                  {timestamp ? new Date(timestamp).toLocaleString() : 'No timestamp'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(status)}`}>
                {status || 'Unknown'}
              </span>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col lg:flex-row h-[calc(90vh-120px)]">
          {/* Input Data */}
          <div className="flex-1 border-r border-gray-200">
            <div className="p-6 h-full flex flex-col">
              <div className="flex items-center space-x-2 mb-4">
                <Database className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Input Data</h3>
              </div>
              <div className="flex-1 bg-gray-50 rounded-lg p-4 overflow-auto">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                  {formatData(inputData)}
                </pre>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="hidden lg:flex items-center justify-center px-4">
            <ArrowRight className="h-8 w-8 text-gray-400" />
          </div>

          {/* Output Data */}
          <div className="flex-1">
            <div className="p-6 h-full flex flex-col">
              <div className="flex items-center space-x-2 mb-4">
                <Code className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Output Data</h3>
              </div>
              <div className="flex-1 bg-gray-50 rounded-lg p-4 overflow-auto">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                  {formatData(outputData)}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              <span className="font-medium">Agent:</span> {agentType}
            </div>
            <div>
              <span className="font-medium">Status:</span> {status || 'Unknown'}
            </div>
            <div>
              <span className="font-medium">Data Size:</span> {
                outputData ? 
                  `${JSON.stringify(outputData).length} characters` : 
                  'No output data'
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugModal; 