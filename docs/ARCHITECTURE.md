# EcoIQ Architecture Documentation

## Overview

EcoIQ is a client-side web application with serverless backend functions, designed for carbon footprint tracking and AI-powered sustainability insights. The architecture prioritizes security, performance, and maintainability.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser Client                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │Calculator│  │ Tracker  │  │ Insights │  │   Quiz   │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │             │              │             │              │
│       └─────────────┴──────────────┴─────────────┘              │
│                          │                                      │
│                    ┌─────▼─────┐                                │
│                    │ shared.js │  ← Common utilities            │
│                    └─────┬─────┘                                │
│                          │                                      │
│                    ┌─────▼─────┐                                │
│                    │ carbon.js │  ← Pure calculation functions  │
│                    └───────────┘                                │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Vercel Edge Network                        │
│  ┌──────────────┐              ┌──────────────────────┐        │
│  │ Static Assets│              │ Serverless Functions │        │
│  │  (HTML/CSS/JS)│              │   /api/chat.js       │        │
│  └──────────────┘              └──────────┬───────────┘        │
└─────────────────────────────────────────────┼───────────────────┘
                                              │
                          ┌───────────────────┼───────────────────┐
                          │                   │                   │
                          ▼                   ▼                   ▼
                   ┌──────────┐        ┌──────────┐      ┌──────────┐
                   │ Groq API │        │ Firebase │      │Firestore │
                   │ (LLaMA)  │        │   Auth   │      │    DB    │
                   └──────────┘        └──────────┘      └──────────┘
```

## Technology Stack

### Frontend
- **Language**: Vanilla JavaScript (ES2022+)
- **Module System**: ES Modules
- **UI Framework**: None (pure DOM manipulation)
- **Charts**: Chart.js 4.4.0
- **Authentication**: Firebase Auth (Google Sign-In)
- **Database**: Firebase Firestore

### Backend
- **Runtime**: Node.js 18+
- **Hosting**: Vercel Serverless Functions
- **AI Model**: Groq LLaMA 3.3 70B Versatile
- **Dev Server**: Custom Node.js HTTP server

### Development
- **Linting**: ESLint 8.57.0
- **Testing**: Custom zero-dependency test framework
- **CI/CD**: GitHub Actions
- **Version Control**: Git

## Module Architecture

### Core Modules

#### 1. `carbon.js` - Pure Calculation Engine
**Purpose**: Emission factor calculations with cited sources

**Exports**:
- `calcTransport(answers)` → Annual transport CO₂e (tonnes)
- `calcFood(answers)` → Annual food CO₂e (tonnes)
- `calcEnergy(answers)` → Annual energy CO₂e (tonnes)
- `calcShopping(answers)` → Annual shopping CO₂e (tonnes)
- `getGrade(total)` → Grade emoji and comparison message

**Design Principles**:
- Pure functions (no side effects)
- All emission factors documented with sources
- Named constants for all magic numbers
- Defensive programming (null checks, defaults)

#### 2. `shared.js` - Common Utilities
**Purpose**: Shared functionality across all modules

**Exports**:
- `sanitizeString(str, maxLength)` → XSS-safe string
- `formatMessage(text)` → Markdown-lite HTML rendering
- `getTodayKey()` → YYYY-MM-DD date string
- `getLevel(points)` → Eco level name and icon
- `toggleChat()` → Chat panel visibility control

**Design Principles**:
- Single Responsibility Principle
- No external dependencies
- Comprehensive input validation

#### 3. `calculator.js` - Multi-Step Wizard
**Purpose**: Carbon footprint calculator UI controller

**Key Functions**:
- `nextStep(step)` → Navigate forward with input sync
- `prevStep(step)` → Navigate backward
- `calculateFootprint()` → Run calculations and render results
- `renderResultChart()` → Chart.js doughnut visualization
- `fetchAITips()` → Personalized reduction recommendations

**State Management**:
- `answers` object stores all user inputs
- `currentStep` tracks wizard position
- `resultChartInstance` manages Chart.js lifecycle

#### 4. `tracker.js` - Action Logging System
**Purpose**: Daily eco-action tracking with gamification

**Key Functions**:
- `logAction(action)` → Record action, update stats
- `updateStreakAndPoints()` → Streak calculation logic
- `renderActions(category)` → Filter and display actions
- `saveData()` → Persist to localStorage + Firestore

**Data Model**:
```javascript
{
  history: [{ id, name, points, co2, timestamp, date }],
  stats: { points, streak, lastDate, totalActions, totalCO2 },
  loggedToday: Set<actionId>
}
```

#### 5. `insights.js` - Data Visualization
**Purpose**: Chart.js dashboards and AI analysis

**Key Functions**:
- `renderDonutChart()` → Category breakdown pie chart
- `renderLineChart()` → 14-day trend line
- `renderWeeklyBars()` → 7-day activity bars
- `loadAIAnalysis()` → Progress insights from Groq

**Chart Management**:
- Destroys old Chart.js instances before re-render
- Responsive design with maintainAspectRatio
- Custom center text plugin for donut chart

#### 6. `quiz.js` - Timed Quiz Engine
**Purpose**: 15-question sustainability quiz

**Key Functions**:
- `startQuiz(difficulty)` → Initialize quiz session
- `loadQuestion()` → Display current question
- `selectAnswer(index)` → Handle answer selection
- `endQuiz()` → Calculate score and show results

**Features**:
- 20-second timer per question
- Difficulty-based question filtering
- Animated score ring (SVG)
- Source-cited explanations

#### 7. `chatbot.js` - AI Chat Interface
**Purpose**: Conversational AI assistant

**Key Functions**:
- `sendMessage()` → Send user message to Groq API
- `appendMessage(role, text)` → Add chat bubble
- `checkClientRateLimit()` → 10 messages/minute limit
- `validateMessage(message)` → Input validation

**Security**:
- Client-side rate limiting
- Message length validation (500 chars)
- XSS sanitization on all inputs
- Server-side proxy (no API key exposure)

### Backend Modules

#### 8. `server.js` - Development Server
**Purpose**: Local HTTPS server with security features

**Features**:
- Static file serving with MIME type detection
- Path traversal prevention
- Rate limiting (30 req/min per IP)
- Security headers (CSP, X-Frame-Options, etc.)
- Groq API proxy endpoint
- File caching for performance

#### 9. `api/chat.js` - Serverless Function
**Purpose**: Production Groq API proxy

**Features**:
- Input validation and sanitization
- Message array validation
- Error handling with meaningful messages
- CORS headers
- Security headers

## Data Flow

### Calculator Flow
```
User Input → Pill Selection → answers object
           → Numeric Inputs → syncNumericInputs()
           → Next Step → transitionStep()
           → Calculate → calcTransport/Food/Energy/Shopping()
           → Render Results → renderGrade() + renderCategoryBar()
           → Fetch AI Tips → /api/chat
           → Save to Firestore (if authenticated)
```

### Tracker Flow
```
User Clicks Action → logAction()
                  → Check if already logged today
                  → Create entry object
                  → Update history array
                  → updateStreakAndPoints()
                  → persistLocally() → localStorage
                  → saveData() → Firestore (if authenticated)
                  → renderAll() → Update UI
```

### Insights Flow
```
Page Load → loadLocalData() → Parse localStorage
         → initAuth() → Load Firestore (if authenticated)
         → renderAll() → renderDonutChart()
                      → renderLineChart()
                      → renderWeeklyBars()
                      → renderCategoryBars()
         → loadAIAnalysis() → /api/chat
```

## Security Architecture

### Input Validation Layers

1. **Client-Side** (`shared.js`)
   - `sanitizeString()` escapes HTML entities
   - Length limits enforced
   - Type checking

2. **Server-Side** (`server.js`, `api/chat.js`)
   - Message array validation
   - Role validation (user/assistant/system)
   - Content sanitization
   - Body size limits (50 KB)

### Rate Limiting

1. **Client-Side** (`chatbot.js`)
   - 10 messages per minute
   - Sliding window implementation
   - User-friendly error messages

2. **Server-Side** (`server.js`)
   - 30 requests per minute per IP
   - Map-based store with auto-cleanup
   - 429 status code on limit exceeded

### API Key Protection

- Groq API key stored in `.env` (never committed)
- Server-side proxy pattern
- No API keys in client code
- Vercel environment variables for production

### Security Headers

```javascript
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## Performance Optimizations

### Frontend

1. **DOM Manipulation**
   - `DocumentFragment` for batch updates
   - `requestAnimationFrame` for smooth scrolling
   - Debounced event handlers

2. **Chart.js**
   - Destroy instances before re-render
   - Lazy loading (only on insights page)
   - Animation duration tuning

3. **Data Storage**
   - localStorage for offline capability
   - Firestore for cross-device sync
   - Optimistic UI updates

### Backend

1. **File Caching**
   - In-memory Map cache for static files
   - Cache-Control headers
   - Conditional requests support

2. **Rate Limit Store**
   - Periodic cleanup (5-minute intervals)
   - Memory-efficient Map structure

## Testing Strategy

### Test Coverage

- **Carbon Calculations**: All emission factors and edge cases
- **Validation**: Input sanitization, message validation
- **Formatting**: Markdown rendering, date utilities
- **Grading**: Quiz and carbon grade boundaries
- **Edge Cases**: Undefined inputs, extreme values

### Test Framework

Custom zero-dependency framework:
- `test(name, fn)` → Individual test
- `describe(name, fn)` → Test suite grouping
- `expect(val)` → Assertion library

### CI Integration

GitHub Actions runs tests on every push to `main`:
```yaml
- npm install
- npm test
```

## Deployment Architecture

### Vercel Configuration

```json
{
  "rewrites": [
    { "source": "/api/chat", "destination": "/api/chat.js" }
  ]
}
```

### Environment Variables

**Development** (`.env`):
```
GROQ_API_KEY=your_key_here
GROQ_MODEL=llama-3.3-70b-versatile
PORT=3000
```

**Production** (Vercel):
- Set via Vercel dashboard
- Encrypted at rest
- Injected at build time

## Accessibility Architecture

### WCAG 2.1 AA Compliance

1. **Semantic HTML**
   - Proper heading hierarchy
   - Landmark roles (navigation, main)
   - Form labels

2. **ARIA Attributes**
   - `aria-label` on interactive elements
   - `aria-live` for dynamic updates
   - `aria-expanded` for toggles
   - `role="progressbar"` for progress indicators

3. **Keyboard Navigation**
   - Tab order follows visual flow
   - Enter/Space on custom controls
   - Focus trap in modal dialogs

4. **Screen Reader Support**
   - Skip links on all pages
   - Descriptive alt text
   - Status announcements

## Future Architecture Considerations

### Scalability
- Consider Redis for rate limiting at scale
- CDN for static assets
- Database indexing for Firestore queries

### Monitoring
- Error tracking (Sentry)
- Performance monitoring (Web Vitals)
- Usage analytics (privacy-respecting)

### Extensibility
- Plugin system for new action types
- Configurable emission factors
- Multi-language support (i18n)

---

**Version**: 1.1.0  
**Last Updated**: 2026-06-21  
**Maintainer**: EcoIQ Team