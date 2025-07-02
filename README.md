# 📈 AI-Powered Stock Analysis Application

A sophisticated **AI-enhanced multi-agent system** that provides institutional-quality stock analysis by combining traditional financial algorithms with **local Large Language Models (LLMs)**. Built for privacy-preserving AI intelligence with **Ollama integration**.

## 🌟 AI Transformation

This application has been **revolutionized with Ollama integration**, transforming from traditional algorithmic analysis into an **intelligent financial advisor**:

- 🧠 **Chart Pattern AI**: Advanced pattern recognition beyond traditional indicators
- 📰 **Context-Aware Sentiment**: Market-specific language understanding and theme extraction  
- 📊 **Economic Intelligence**: Forward-looking economic scenario analysis
- 💡 **Natural Language Reasoning**: Investment recommendations with detailed explanations
- 🎯 **Risk Assessment AI**: Sophisticated risk analysis with mitigation strategies
- 🔐 **Complete Privacy**: All AI processing runs locally on your machine

## 🏗️ Architecture Overview

This application implements an **AI-enhanced multi-agent architecture** where specialized agents work collaboratively with **local LLMs** to analyze stocks from different perspectives:

- **AI-Enhanced Data Agents**: Fetch and intelligently analyze market data, news, and economic indicators
- **AI-Powered Analysis Agent**: Consolidates insights and generates AI-reasoned investment recommendations  
- **UI Agent**: Manages web interface and real-time communication
- **Ollama AI Layer**: Local LLM processing for enhanced intelligence
- **Message Bus**: Redis pub/sub enables seamless inter-agent and AI communication

## 🎯 Key Features

✅ **Multi-Source Data Integration** - Real-time stock data, financial news, economic indicators  
✅ **Advanced Technical Analysis** - 20+ technical indicators (SMA, RSI, MACD, Bollinger Bands)  
✅ **Sentiment Analysis** - News and social media sentiment using VADER and NLP  
✅ **Economic Context** - Macroeconomic regime analysis (expansion/contraction/neutral)  
✅ **AI-Powered Recommendations** - Investment advice for short/mid/long-term horizons  
✅ **Real-Time Updates** - Live progress tracking via WebSocket  
✅ **Professional UI** - Modern, responsive React interface  
✅ **Robust Architecture** - Error handling, rate limiting, caching, fallback mechanisms  
🧠 **AI-Powered Intelligence** - Local LLM integration with Ollama for enhanced analysis  
🔐 **Complete Privacy** - All AI processing runs locally, no data sharing  
⚡ **No Rate Limits** - Unlimited AI analysis with local models  
💰 **Zero AI Costs** - No per-request charges for AI features  

## 🏛️ System Architecture (AI-Enhanced)

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[React Frontend]
        WS[WebSocket Client]
    end
    
    subgraph "Backend Layer"
        UIAgent[UI Agent<br/>Express + Socket.io]
        Redis[(Redis<br/>Message Bus + AI Cache)]
    end
    
    subgraph "🧠 Local AI Layer"
        Ollama[Ollama Service<br/>Local LLM Server]
        LLaMA[llama3.1:8b<br/>Financial Analysis Model]
        Mistral[mistral:7b<br/>Fast Processing Model]
        AICache[(AI Response Cache)]
    end
    
    subgraph "AI-Enhanced Analysis Layer"
        AnalysisAgent[Analysis Agent<br/>🤖 AI-Powered Investment Logic]
        AIAnalysis[Market Context AI<br/>Investment Reasoning<br/>Risk Assessment]
    end
    
    subgraph "AI-Enhanced Data Agents"
        StockAgent[Stock Data Agent<br/>📈 Technical Analysis + AI Patterns]
        StockAI[Chart Pattern AI<br/>Support/Resistance<br/>Signal Analysis]
        
        NewsAgent[News Sentiment Agent<br/>📰 NLP + AI Context Analysis]
        NewsAI[Sentiment AI<br/>Market Context<br/>Theme Extraction]
        
        EconAgent[Economic Indicator Agent<br/>📊 Macro Analysis + AI Insights]
        EconAI[Economic AI<br/>Regime Analysis<br/>Forward Outlook]
    end
    
    subgraph "External APIs"
        StockAPIs[Stock APIs<br/>Alpha Vantage<br/>Finnhub<br/>Twelve Data]
        NewsAPIs[News APIs<br/>NewsAPI<br/>NewsData<br/>Webz.io]
        EconAPIs[Economic APIs<br/>FRED<br/>World Bank]
        SocialAPIs[Social APIs<br/>StockTwits<br/>Twitter]
    end
    
    UI --> UIAgent
    WS -.-> UIAgent
    UIAgent --> Redis
    Redis --> StockAgent
    Redis --> NewsAgent
    Redis --> EconAgent
    Redis --> AnalysisAgent
    
    StockAgent --> StockAPIs
    StockAgent --> StockAI
    StockAI --> Ollama
    
    NewsAgent --> NewsAPIs
    NewsAgent --> SocialAPIs
    NewsAgent --> NewsAI
    NewsAI --> Ollama
    
    EconAgent --> EconAPIs
    EconAgent --> EconAI
    EconAI --> Ollama
    
    AnalysisAgent --> AIAnalysis
    AIAnalysis --> Ollama
    AnalysisAgent --> UIAgent
    
    Ollama --> LLaMA
    Ollama --> Mistral
    Ollama --> AICache
    AICache --> Redis
    
    style Ollama fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    style StockAI fill:#f3e5f5,stroke:#4a148c
    style NewsAI fill:#f3e5f5,stroke:#4a148c
    style EconAI fill:#f3e5f5,stroke:#4a148c
    style AIAnalysis fill:#f3e5f5,stroke:#4a148c
    style LLaMA fill:#e8f5e8,stroke:#1b5e20
    style Mistral fill:#e8f5e8,stroke:#1b5e20
```

## 🔄 AI-Enhanced Application Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant UIAgent
    participant Redis
    participant StockAgent
    participant NewsAgent
    participant EconAgent
    participant Ollama
    participant AnalysisAgent
    
    User->>Frontend: Enter stock symbol (e.g., AAPL)
    Frontend->>UIAgent: POST /api/analyze
    UIAgent->>Redis: Publish analysis request
    
    Note over Redis: AI Check: Ollama Available?
    
    par Parallel Data Fetching & AI Enhancement
        Redis->>StockAgent: Stock data request
        Redis->>NewsAgent: News sentiment request  
        Redis->>EconAgent: Economic data request
    end
    
    par Traditional + AI Processing
        StockAgent->>StockAgent: Fetch price data<br/>Calculate indicators
        StockAgent->>Ollama: 🧠 AI chart pattern analysis<br/>Support/resistance detection
        Ollama-->>StockAgent: Enhanced technical insights
        
        NewsAgent->>NewsAgent: Fetch news<br/>Basic sentiment (VADER)
        NewsAgent->>Ollama: 🧠 AI context analysis<br/>Theme extraction
        Ollama-->>NewsAgent: Market context insights
        
        EconAgent->>EconAgent: Fetch macro data<br/>Regime classification
        EconAgent->>Ollama: 🧠 AI economic analysis<br/>Forward outlook
        Ollama-->>EconAgent: Enhanced regime insights
    end
    
    par Publish AI-Enhanced Results
        StockAgent->>Redis: Technical analysis + AI patterns
        NewsAgent->>Redis: Sentiment + AI context
        EconAgent->>Redis: Economic + AI insights
    end
    
    Redis->>AnalysisAgent: Consolidated AI-enhanced data
    AnalysisAgent->>AnalysisAgent: Calculate composite scores
    AnalysisAgent->>Ollama: 🧠 AI investment recommendations<br/>Risk assessment<br/>Market context
    Ollama-->>AnalysisAgent: Natural language reasoning
    AnalysisAgent->>Redis: Final AI-enhanced analysis
    Redis->>UIAgent: Analysis complete
    UIAgent->>Frontend: Real-time updates via WebSocket
    Frontend->>User: Display comprehensive AI-powered report
    
    Note over User,AnalysisAgent: 🎯 Result: Traditional algorithms + AI insights<br/>for institutional-quality analysis
```

## 📊 AI-Enhanced Data Processing Pipeline

```mermaid
flowchart LR
    subgraph "Input Stage"
        A[Stock Symbol] --> B[Request Validation]
    end
    
    subgraph "AI-Enhanced Data Collection"
        B --> C[Stock Data Agent]
        B --> D[News Sentiment Agent]
        B --> E[Economic Indicator Agent]
        
        C --> C1[Price/Volume Data]
        C --> C2[Technical Indicators]
        C --> C3[🧠 AI Chart Patterns<br/>Support/Resistance]
        
        D --> D1[News Articles]
        D --> D2[Social Media]
        D --> D3[Basic Sentiment]
        D --> D4[🧠 AI Context Analysis<br/>Theme Extraction]
        
        E --> E1[GDP, CPI, Rates]
        E --> E2[Economic Regime]
        E --> E3[🧠 AI Economic Insights<br/>Forward Outlook]
    end
    
    subgraph "🧠 Local AI Processing"
        AI[Ollama LLM Service]
        AI1[Pattern Recognition]
        AI2[Sentiment Context]
        AI3[Economic Analysis]
        AI4[Investment Reasoning]
        
        C3 --> AI1
        D4 --> AI2
        E3 --> AI3
        AI1 & AI2 & AI3 --> AI4
    end
    
    subgraph "Hybrid Analysis Engine"
        C1 & C2 & C3 --> F[Technical Score<br/>📈 40% Weight<br/>+ AI Patterns]
        D1 & D2 & D3 & D4 --> G[Sentiment Score<br/>📰 30% Weight<br/>+ AI Context]
        E1 & E2 & E3 --> H[Economic Score<br/>📊 30% Weight<br/>+ AI Insights]
        
        F & G & H --> I[AI-Enhanced<br/>Composite Analysis]
    end
    
    subgraph "AI-Powered Output Generation"
        I --> I1[🧠 Market Context Analysis]
        I1 --> J[Short-term<br/>Recommendation<br/>+ AI Reasoning]
        I1 --> K[Mid-term<br/>Recommendation<br/>+ AI Reasoning]
        I1 --> L[Long-term<br/>Recommendation<br/>+ AI Reasoning]
        
        J & K & L --> M[🧠 AI Risk Assessment<br/>+ Mitigation Strategies]
        M --> N[📋 Comprehensive<br/>AI-Enhanced Report]
    end
    
    subgraph "Intelligence Layers"
        IL1[Traditional Algorithms]
        IL2[🧠 Local AI Enhancement]
        IL3[Natural Language Explanations]
    end
    
    AI --> C3 & D4 & E3 & I1 & M
    
    style AI fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    style C3 fill:#f3e5f5,stroke:#4a148c
    style D4 fill:#f3e5f5,stroke:#4a148c
    style E3 fill:#f3e5f5,stroke:#4a148c
    style I1 fill:#f3e5f5,stroke:#4a148c
    style M fill:#f3e5f5,stroke:#4a148c
    style N fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
```

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.io** - Real-time communication
- **Redis** - Message broker and caching
- **Winston** - Structured logging
- **Axios** - HTTP client for API calls
- **VADER Sentiment** - NLP sentiment analysis
- **Technical Indicators** - Financial calculations
- **Ollama** - Local LLM inference for AI-powered analysis

### Frontend  
- **React** - UI framework
- **Socket.io Client** - Real-time updates
- **Recharts** - Data visualization
- **Tailwind CSS** - Styling framework
- **Lucide React** - Icon library

### External APIs
- **Stock Data**: Alpha Vantage, Finnhub, Twelve Data
- **News**: NewsAPI, NewsData.io, Webz.io
- **Economic**: FRED API, World Bank API
- **Social**: StockTwits, Twitter API v2

## 📁 Project Structure

```
stock-analysis-app/
├── 📂 backend/                     # Node.js backend service
│   ├── 📂 src/
│   │   ├── 📂 agents/             # Multi-agent system
│   │   │   ├── BaseAgent.js        # Abstract base class for all agents
│   │   │   ├── stockDataAgent.js   # Stock data & technical analysis
│   │   │   ├── newsSentimentAgent.js # News & sentiment processing
│   │   │   ├── economicIndicatorAgent.js # Economic data analysis
│   │   │   ├── analysisAgent.js    # Investment recommendations engine
│   │   │   └── uiAgent.js         # REST API & WebSocket management
│   │   ├── 📂 config/             # Configuration management
│   │   │   └── index.js           # Environment-based config loader
│   │   ├── 📂 utils/              # Shared utilities
│   │   │   ├── redis.js           # Redis client & pub/sub messaging
│   │   │   ├── logger.js          # Winston structured logging
│   │   │   └── ollama.js          # Ollama LLM service integration
│   │   └── index.js               # Application entry point & manager
│   ├── config.example             # Environment variables template
│   ├── package.json               # Backend dependencies & scripts
│   └── 📂 logs/                   # Application logs (generated)
├── 📂 frontend/                    # React frontend application
│   ├── 📂 src/
│   │   ├── 📂 components/         # React components
│   │   │   ├── StockSearchForm.js  # Stock symbol input & validation
│   │   │   └── LoadingIndicator.js # Real-time progress tracking
│   │   ├── 📂 contexts/           # React context providers
│   │   │   └── SocketContext.js   # WebSocket connection management
│   │   ├── App.js                 # Main application component
│   │   └── index.js               # React app entry point
│   ├── package.json               # Frontend dependencies & scripts
│   └── 📂 public/                 # Static assets
├── 📄 README.md                   # Project documentation
├── 📄 context.html                # Project requirements (formatted)
├── 📄 intent.html                 # Original requirements document
├── package.json                   # Root project configuration
└── 📂 docs/                       # Additional documentation (optional)
```

### 🗂️ Directory Breakdown

#### **Backend (`/backend/`)**
The multi-agent backend system built with Node.js and Express.

**🤖 Agents (`/backend/src/agents/`)**
- **`BaseAgent.js`** - Abstract base class providing common functionality:
  - Redis pub/sub messaging
  - Logging and error handling
  - Rate limiting and caching
  - Configuration management

- **`stockDataAgent.js`** - AI-Enhanced Stock Data Agent:
  - Fetches real-time and historical stock data
  - Calculates technical indicators (SMA, EMA, RSI, MACD, Bollinger Bands, Stochastic)
  - 🧠 **AI Chart Pattern Recognition**: Identifies triangles, flags, head & shoulders patterns
  - 🧠 **AI Support/Resistance Analysis**: Intelligent level detection with reasoning
  - 🧠 **AI Volume Pattern Analysis**: Price-volume relationship insights
  - Integrates with Alpha Vantage, Finnhub, Twelve Data APIs
  - Implements fallback mechanisms and mock data

- **`newsSentimentAgent.js`** - AI-Enhanced News Sentiment Agent:
  - Retrieves financial news from multiple sources (NewsAPI, NewsData, Webz)
  - Performs traditional sentiment analysis using VADER library
  - 🧠 **AI Context Analysis**: Market-specific financial language understanding
  - 🧠 **AI Theme Extraction**: Identifies key market themes and trends
  - 🧠 **AI Sector Impact**: Industry and sector-specific sentiment insights
  - 🧠 **AI Forward-Looking Analysis**: Sentiment implications and market impact
  - Processes social media signals with enhanced AI context

- **`economicIndicatorAgent.js`** - AI-Enhanced Economic Indicator Agent:
  - Fetches macroeconomic data from FRED API and World Bank
  - Traditional economic regime analysis (expansion/contraction/neutral)
  - 🧠 **AI Economic Context**: Nuanced regime analysis with confidence scoring
  - 🧠 **AI Sector Impact**: Economic implications for different sectors
  - 🧠 **AI Forward Outlook**: Economic scenario modeling and predictions
  - Processes GDP, CPI, interest rates, unemployment with AI insights

- **`analysisAgent.js`** - AI-Powered Analysis Agent:
  - Consolidates data from all specialist agents
  - Applies composite scoring algorithm (40% technical, 30% sentiment, 30% economic)
  - 🧠 **AI Investment Recommendations**: Natural language reasoning for all time horizons
  - 🧠 **AI Market Context**: Comprehensive market analysis and positioning
  - 🧠 **AI Risk Assessment**: Detailed risk analysis with mitigation strategies
  - 🧠 **AI Investment Thesis**: Forward-looking scenario analysis
  - Produces enhanced confidence scores with AI-powered explanations

- **`uiAgent.js`** - UI Agent:
  - Serves REST API endpoints
  - Manages WebSocket connections for real-time updates
  - Handles request routing and response formatting
  - Coordinates agent communication

**⚙️ Configuration (`/backend/src/config/`)**
- **`index.js`** - Centralized configuration management:
  - Environment variable loading and validation
  - API key management
  - Default settings and fallbacks
  - Development vs production configurations

**🔧 Utilities (`/backend/src/utils/`)**
- **`redis.js`** - Redis client and messaging:
  - Pub/sub message broker for inter-agent communication
  - Caching layer for API responses
  - Request tracking and session management
  - Connection pooling and error handling

- **`logger.js`** - Structured logging:
  - Winston-based logging system
  - Multiple log levels (error, warn, info, debug)
  - File and console output
  - Request correlation and agent identification

- **`ollama.js`** - LLM service integration:
  - Local Ollama API client
  - Model management and selection
  - Prompt engineering for financial analysis
  - JSON response parsing and fallback handling
  - Specialized methods for sentiment, technical, and economic analysis

#### **Frontend (`/frontend/`)**
Modern React application with real-time capabilities.

**⚛️ Components (`/frontend/src/components/`)**
- **`StockSearchForm.js`** - Stock symbol input interface:
  - Input validation and autocomplete
  - Popular stock symbol shortcuts
  - Form submission handling
  - Error state management

- **`LoadingIndicator.js`** - Real-time progress display:
  - WebSocket progress updates
  - Agent activity indicators
  - Animated loading states
  - Error and completion notifications

**🔗 Contexts (`/frontend/src/contexts/`)**
- **`SocketContext.js`** - WebSocket connection management:
  - Real-time communication with backend
  - Connection status monitoring
  - Automatic reconnection logic
  - Event subscription and cleanup

#### **Root Level Files**
- **`package.json`** - Root project configuration:
  - Development and build scripts
  - Cross-platform compatibility
  - Workspace management commands

- **`README.md`** - Comprehensive project documentation
- **`context.html`** - Formatted project requirements and specifications
- **`intent.html`** - Original Microsoft Word requirements document

### 🏗️ Architecture Benefits

This structure supports the multi-agent architecture by:

1. **🔄 Modularity** - Each agent is self-contained with clear responsibilities
2. **⚡ Scalability** - Agents can be deployed independently or scaled horizontally
3. **🛡️ Reliability** - Isolated failure domains with graceful degradation
4. **🔧 Maintainability** - Clear separation of concerns and standardized interfaces
5. **🚀 Development** - Parallel development of different agents and features

### 📋 Key Configuration Files

| File | Purpose | Required |
|------|---------|----------|
| `backend/.env` | API keys and environment variables | Yes |
| `backend/config.example` | Template for environment setup | Reference |
| `package.json` (root) | Project scripts and metadata | Yes |
| `backend/package.json` | Backend dependencies | Yes |
| `frontend/package.json` | Frontend dependencies | Yes |

### 🔍 Finding Your Way Around

- **🚀 Start here**: `README.md` for setup instructions
- **⚙️ Configuration**: `backend/config.example` for environment setup
- **🤖 Agents**: `backend/src/agents/` for core business logic
- **🖥️ UI Components**: `frontend/src/components/` for user interface
- **📊 Real-time**: `frontend/src/contexts/SocketContext.js` for live updates
- **🔧 Utilities**: `backend/src/utils/` for shared functionality

## 📋 Prerequisites

Before running the application, ensure you have:

### System Requirements
- **Node.js** (v18.0.0 or higher)
- **npm** (v8.0.0 or higher) 
- **Redis** (v6.0 or higher)
- **Git**
- **Ollama** (recommended for AI-powered analysis)

### 🧠 AI Enhancement with Ollama

The application now supports **Ollama** for local LLM-powered analysis, providing:
- ✨ Advanced sentiment analysis with market context
- 📈 Intelligent chart pattern recognition  
- 💡 Natural language investment reasoning
- 🎯 Enhanced risk assessment with detailed explanations
- 📊 Market context analysis and forward-looking insights

**Benefits of using Ollama:**
- 🔐 **Privacy**: All AI processing runs locally
- ⚡ **Speed**: No API rate limits or network delays
- 💰 **Cost**: No per-request charges
- 🔧 **Customizable**: Use different models for different tasks

### API Keys (Optional but Recommended)
The application works with mock data, but for real analysis you'll need:

| Service | Free Tier | Purpose |
|---------|-----------|---------|
| [Alpha Vantage](https://www.alphavantage.co/) | 5 req/min, 500/day | Stock data & indicators |
| [Finnhub](https://finnhub.io/) | 60 req/min, 30k/month | Real-time quotes & fundamentals |
| [Twelve Data](https://twelvedata.com/) | 800 req/day | Multi-asset data |
| [NewsAPI](https://newsapi.org/) | 100 req/day | Global news headlines |
| [NewsData.io](https://newsdata.io/) | 2000 req/day | News with advanced filtering |
| [FRED API](https://fred.stlouisfed.org/) | Free | US economic indicators |

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd stock-analysis-app
```

### 2. Install Dependencies
```bash
# Install all dependencies (root, backend, frontend)
npm run install:all
```

### 3. Set Up Redis
```bash
# Option 1: Using Docker (Recommended)
docker run -d --name redis-stock-app -p 6379:6379 redis:alpine

# Option 2: Install locally on macOS
brew install redis
brew services start redis

# Option 3: Install locally on Ubuntu/Debian
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
```

### 4. Install Ollama (Recommended for AI Features)

**Option 1: Quick Install (Linux/macOS)**
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
ollama serve

# In a new terminal, pull the recommended model
ollama pull llama3.1:8b
```

**Option 2: Manual Installation**
```bash
# Download from https://ollama.ai/download
# Or use package managers:

# macOS with Homebrew
brew install ollama

# Windows - Download installer from website

# Start Ollama
ollama serve
```

**Recommended Models for Stock Analysis:**
```bash
# Primary model (best balance of speed/quality)
ollama pull llama3.1:8b

# Alternative options:
ollama pull mistral:7b       # Fast and efficient
ollama pull phi3:medium      # Microsoft's lightweight model
ollama pull qwen2:7b         # Good for financial analysis

# High-performance (requires more RAM):
ollama pull llama3.1:70b     # Best quality, needs 40GB+ RAM
```

**Model Requirements:**
- `llama3.1:8b`: ~5GB RAM, good balance
- `mistral:7b`: ~4GB RAM, fast
- `phi3:medium`: ~8GB RAM, specialized
- `llama3.1:70b`: ~40GB RAM, best quality

**Verify Ollama Installation:**
```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# Test a model
ollama run llama3.1:8b "Analyze the stock market trend for tech companies"
```

### 5. Configure Environment Variables
```bash
# Copy the example configuration
cp backend/config.example backend/.env

# Edit the configuration file
nano backend/.env
```

**Minimum Configuration** (app works with defaults):
```env
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
REDIS_HOST=localhost
REDIS_PORT=6379

# Ollama Configuration (optional)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_ENABLED=true
```

**Full Configuration** (for production use):
```env
# API Keys
ALPHA_VANTAGE_API_KEY=your_key_here
FINNHUB_API_KEY=your_key_here
NEWS_API_KEY=your_key_here
NEWSDATA_API_KEY=your_key_here
WEBZ_API_KEY=your_key_here
FRED_API_KEY=your_key_here

# Server Configuration  
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password

# Ollama Configuration (AI Enhancement)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_SENTIMENT_MODEL=llama3.1:8b
OLLAMA_ANALYSIS_MODEL=llama3.1:8b
OLLAMA_TECHNICAL_MODEL=llama3.1:8b
OLLAMA_ECONOMIC_MODEL=llama3.1:8b
OLLAMA_TIMEOUT=30000
OLLAMA_MAX_RETRIES=3
OLLAMA_ENABLED=true

# Cache Configuration
CACHE_TTL_SECONDS=300
STOCK_DATA_CACHE_TTL=60
NEWS_CACHE_TTL=1800
ECONOMIC_DATA_CACHE_TTL=3600
```

### 6. Verify Installation
```bash
# Check Node.js version
node --version

# Check Redis connection
redis-cli ping
# Should return: PONG

# Check Ollama (if installed)
curl http://localhost:11434/api/tags
# Should return JSON with installed models
```

## 💻 Running the Application

### 🚀 Quick Start (Recommended)
```bash
# Use the automated startup script (Linux/macOS)
./scripts/start-with-ollama.sh
```
This script will:
- ✅ Check all prerequisites 
- 🔄 Start Redis and Ollama automatically
- 📦 Install dependencies if needed
- ⚙️ Create configuration files
- 🧠 Download AI models if missing
- 🚀 Start both backend and frontend
- 📊 Display service URLs and status

### Manual Development Mode
```bash
# Terminal 1 - Start Ollama (if using AI features)
ollama serve

# Terminal 2 - Start Redis
redis-server

# Terminal 3 - Start backend and frontend
npm run dev

# Or start individually:
# Terminal 3 - Backend
cd backend && npm run dev

# Terminal 4 - Frontend  
cd frontend && npm start
```

### Production Mode
```bash
# Build and start production version
npm run build
npm start
```

### Using Docker (Coming Soon)
```bash
# Start with Docker Compose
docker-compose up

# Or for development
docker-compose -f docker-compose.dev.yml up
```

## 🌐 Accessing the Application

Once running, access the application at:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

## 📡 API Endpoints

### Core Endpoints
```
POST /api/analyze/:symbol     # Start stock analysis
GET  /api/health             # Health check
GET  /api/status             # System status
```

### WebSocket Events
```
connect                      # Client connection
analysis:progress           # Real-time progress updates  
analysis:complete           # Final results
analysis:error              # Error notifications
disconnect                  # Client disconnection
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Test backend only
npm run test:backend

# Test frontend only  
npm run test:frontend
```

## 📈 Usage Examples

### Basic Analysis
1. Open http://localhost:3000
2. Enter a stock symbol (e.g., "AAPL", "TSLA", "GOOGL")
3. Click "Analyze Stock"
4. Watch real-time progress updates
5. Review comprehensive analysis report

### Sample Symbols to Try
- **Tech**: ADBE, AAPL, GOOGL, MSFT, TSLA
- **Finance**: JPM, BAC, GS, WFC  
- **Healthcare**: JNJ, PFE, UNH, ABBV
- **Energy**: XOM, CVX, COP, EOG

## 🔧 Configuration Options

### Agent Configuration
```javascript
// backend/src/config/index.js
module.exports = {
  analysis: {
    sentimentWeight: 0.3,    // News sentiment influence
    technicalWeight: 0.4,   // Technical analysis influence  
    economicWeight: 0.3,    // Economic factors influence
    confidenceThreshold: 0.6 // Minimum confidence for recommendations
  }
}
```

### Cache Settings
```env
CACHE_TTL_SECONDS=300           # General cache TTL
STOCK_DATA_CACHE_TTL=60         # Stock data cache (1 minute)
NEWS_CACHE_TTL=1800             # News cache (30 minutes)  
ECONOMIC_DATA_CACHE_TTL=3600    # Economic data cache (1 hour)
```

## 🐛 Troubleshooting

### Common Issues

**Redis Connection Error**
```bash
# Check if Redis is running
redis-cli ping

# Start Redis if needed
redis-server
```

**API Rate Limits**
- The app gracefully handles rate limits with exponential backoff
- Uses mock data when APIs are unavailable
- Check logs for specific API errors

**Port Already in Use**
```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>
```

**Module Not Found Errors**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm run install:all
```

### Logs Location
- **Backend**: `backend/logs/`
- **Console**: Real-time logs in terminal
- **Browser**: Network tab for API calls

## 🧠 AI Enhancement Summary

This stock analysis application has been **completely transformed** with Ollama integration, providing:

### **Traditional vs. AI-Enhanced Comparison**

| Aspect | Traditional | 🧠 AI-Enhanced |
|--------|-------------|----------------|
| **Technical Analysis** | Mathematical indicators only | Indicators + Pattern Recognition + Natural Language Explanations |
| **Sentiment Analysis** | VADER scores | VADER + Market Context + Theme Extraction + Sector Impact |
| **Economic Analysis** | Regime classification | Regime + Forward Outlook + Scenario Modeling |
| **Investment Recommendations** | Rule-based scoring | Scoring + Natural Language Reasoning + Risk Strategies |
| **Explanations** | Basic rule descriptions | Detailed AI-powered investment thesis |
| **Market Context** | Limited | Comprehensive narrative with forward-looking insights |

### **🔬 Technical Implementation**

- **Local AI Processing**: Complete privacy with zero external dependencies
- **Model Flexibility**: Support for multiple LLM models (llama3.1, mistral, phi3)
- **Graceful Fallbacks**: Full functionality with or without AI
- **Performance Optimized**: AI response caching and intelligent retry logic
- **Enterprise Ready**: Configurable models and prompts for different use cases

### **📊 Real-World Impact**

When analyzing a stock like **AAPL**, the AI enhancement provides:

- **Traditional**: "Technical score: 75.2, Sentiment: 68.5, Recommendation: BUY"
- **AI-Enhanced**: "Strong bullish convergence detected with ascending triangle breakout at $185 resistance. Positive earnings sentiment driven by AI narrative and emerging market iPhone demand. Technical momentum confirmed by 40% above-average volume. Recommended entry: $187-190 with stop-loss at $175. Investment thesis: AI integration cycle driving next growth phase while maintaining strong cash generation..."

### **📚 Additional Resources**

- **[OLLAMA_ENHANCEMENT.md](./OLLAMA_ENHANCEMENT.md)** - Comprehensive AI enhancement documentation
- **[scripts/start-with-ollama.sh](./scripts/start-with-ollama.sh)** - Automated setup script
- **[Ollama Official Documentation](https://ollama.ai/docs)** - LLM setup and model management

---

*🎯 **Result**: A sophisticated AI-powered financial advisor that combines the reliability of traditional algorithms with the intelligence of Large Language Models, providing institutional-quality insights with complete privacy and local control.*

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section above
- Review the application logs for detailed error information

---

**Built with ❤️ using Node.js, React, and Redis** 