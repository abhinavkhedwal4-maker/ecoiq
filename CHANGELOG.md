# Changelog

All notable changes to EcoIQ will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-06-21

### Added

#### Project Meta & Documentation
- **LICENSE**: MIT License for open-source distribution
- **CONTRIBUTING.md**: Comprehensive contribution guidelines with code style standards
- **docs/ARCHITECTURE.md**: Detailed system architecture documentation with diagrams
- **CHANGELOG.md**: Version history tracking
- **.editorconfig**: Consistent code style across editors
- **.prettierrc.json**: Automated code formatting configuration

#### Code Quality Enhancements
- **JSDoc Documentation**: Complete type annotations on all exported functions
  - Added `@param`, `@returns`, `@throws`, `@example` tags
  - TypeScript-style type definitions throughout
  - Object shape documentation with `@typedef`
- **Named Constants**: Extracted all magic numbers to documented constants
  - Emission factors with source citations
  - UI timing constants (animation durations, delays)
  - Threshold values for grading and levels
- **Enhanced ESLint Rules**: Stricter linting configuration
  - `require-jsdoc`: Enforce documentation on all functions
  - `valid-jsdoc`: Validate JSDoc completeness
  - `complexity`: Limit cyclomatic complexity to 10
  - `max-lines-per-function`: Warn on functions >50 lines
  - `max-depth`: Limit nesting depth to 3

#### Code Structure Improvements
- **Shared Validation Module**: Centralized validation logic
  - Extracted common validation from `server.js` and `api/chat.js`
  - Reusable `validateMessages()` and `sanitizeString()` functions
- **Utility Enhancements**: Extended `shared.js` with additional helpers
  - Improved error handling patterns
  - Consistent date formatting utilities
  - Reusable DOM manipulation helpers

#### Testing Enhancements
- **Integration Tests**: End-to-end calculator flow tests
- **Edge Case Coverage**: Additional tests for boundary conditions
- **Error Path Testing**: Validation and error handling scenarios
- **Test Documentation**: JSDoc comments on all test suites

#### CI/CD Improvements
- **Prettier Check**: Added format validation to CI pipeline
- **Enhanced Test Output**: Improved test result reporting
- **Build Verification**: Pre-deployment checks

### Changed

#### Code Organization
- **Refactored `carbon.js`**: 
  - Grouped related constants together
  - Added comprehensive source citations
  - Improved function documentation
- **Refactored `calculator.js`**:
  - Extracted chart configuration to constants
  - Improved state management clarity
  - Enhanced error handling in AI tips fetch
- **Refactored `tracker.js`**:
  - Simplified action logging logic
  - Improved streak calculation algorithm
  - Better separation of concerns
- **Refactored `insights.js`**:
  - Optimized chart rendering performance
  - Improved data aggregation logic
  - Enhanced AI analysis prompts

#### Documentation
- **README.md**: Updated with quality gate documentation
  - Added code quality metrics section
  - Enhanced setup instructions
  - Improved architecture overview
- **Inline Comments**: Improved code comments throughout
  - Explained complex algorithms
  - Documented design decisions
  - Added usage examples

#### Performance
- **Chart.js Optimization**: Proper instance cleanup to prevent memory leaks
- **DOM Updates**: Batch updates using DocumentFragment
- **Rate Limiting**: More efficient Map-based implementation

### Fixed

- **Chat Panel Toggle**: Fixed CSS class mismatch (`active` vs `open`)
- **Sanitization**: Improved XSS prevention in `sanitizeString()`
- **Type Safety**: Added defensive null checks throughout
- **Error Messages**: More descriptive error messages for debugging

### Security

- **Enhanced Input Validation**: Stricter validation on all user inputs
- **Rate Limiting**: Improved rate limit enforcement
- **Security Headers**: Comprehensive security header configuration
- **API Key Protection**: Verified no API keys in client code

## [1.0.0] - 2026-06-15

### Added

#### Core Features
- **Carbon Calculator**: 4-step wizard for footprint calculation
  - Transport emissions (car type, distance, flights, public transport)
  - Food emissions (diet type, beef frequency, food waste)
  - Energy emissions (electricity bill, renewable usage, HVAC)
  - Shopping emissions (clothes, electronics, repair habits)
- **Action Tracker**: Daily eco-action logging with gamification
  - 27 trackable actions across 5 categories
  - Streak tracking and points system
  - CO₂ savings calculation
  - Eco level progression (Seedling → Guardian)
- **Insights Dashboard**: Data visualization and AI analysis
  - Donut chart for category breakdown
  - Line chart for 14-day trends
  - Weekly activity bars
  - AI-powered progress analysis
- **Sustainability Quiz**: 15-question timed quiz
  - Three difficulty levels (easy, medium, hard)
  - Source-cited explanations
  - Animated score ring
  - Category-based questions
- **AI Chatbot**: Conversational sustainability assistant
  - Powered by Groq LLaMA 3.3 70B
  - Personalized advice
  - Rate-limited for safety
  - Context-aware responses

#### Technical Infrastructure
- **Firebase Integration**: Authentication and data sync
  - Google Sign-In
  - Firestore for cross-device sync
  - Optional authentication (works offline)
- **Vercel Deployment**: Serverless architecture
  - Edge network distribution
  - Automatic HTTPS
  - Environment variable management
- **Security Features**: Comprehensive security measures
  - XSS prevention via input sanitization
  - Rate limiting (client and server)
  - API key isolation
  - Security headers
  - Path traversal prevention
- **Accessibility**: WCAG 2.1 AA compliance
  - Skip links on all pages
  - ARIA labels and roles
  - Keyboard navigation
  - Screen reader support
  - Reduced motion support

#### Testing & CI
- **Test Suite**: Zero-dependency test framework
  - Carbon calculation tests
  - Validation tests
  - Security tests
  - Edge case tests
- **GitHub Actions CI**: Automated testing on every push
- **ESLint Configuration**: Code quality enforcement

### Documentation
- **README.md**: Comprehensive project documentation
- **Inline JSDoc**: Function-level documentation
- **.env.example**: Environment variable template

---

## Version History Summary

- **1.1.0** (2026-06-21): Code quality enhancements, documentation, and testing improvements
- **1.0.0** (2026-06-15): Initial release with core features

---

**Note**: This project follows [Semantic Versioning](https://semver.org/):
- **MAJOR** version for incompatible API changes
- **MINOR** version for new functionality in a backward-compatible manner
- **PATCH** version for backward-compatible bug fixes