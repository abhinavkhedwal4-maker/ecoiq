# Contributing to EcoIQ

Thank you for your interest in contributing to EcoIQ! This document provides guidelines and instructions for contributing to the project.

## 🌱 Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful and constructive in all interactions.

## 🚀 Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- A Groq API key ([console.groq.com](https://console.groq.com))
- A Firebase project ([console.firebase.google.com](https://console.firebase.google.com))

### Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/ecoiq.git`
3. Install dependencies: `npm install`
4. Copy `.env.example` to `.env` and add your API keys
5. Run tests: `npm test`
6. Start dev server: `npm start`

## 📝 Development Guidelines

### Code Style

- **JavaScript**: ES2022+ with ES modules
- **Formatting**: Use consistent indentation (2 spaces)
- **Naming**: camelCase for variables/functions, UPPER_SNAKE_CASE for constants
- **Comments**: JSDoc for all exported functions

### Code Quality Standards

1. **Documentation**
   - Add JSDoc comments to all exported functions
   - Include `@param`, `@returns`, `@throws` tags
   - Provide usage examples for complex functions

2. **Type Safety**
   - Use JSDoc type annotations: `@param {string} name`
   - Define object shapes with `@typedef`
   - Validate inputs at function boundaries

3. **Constants**
   - Extract magic numbers to named constants
   - Document the source/rationale for each constant
   - Group related constants together

4. **Error Handling**
   - Validate all user inputs
   - Provide meaningful error messages
   - Log errors with context

5. **Security**
   - Sanitize all user inputs (use `sanitizeString`)
   - Never expose API keys in client code
   - Validate data on both client and server

### Testing

- Write tests for all new features
- Ensure existing tests pass: `npm test`
- Test edge cases and error conditions
- Aim for high code coverage

### Commit Messages

Use conventional commit format:

```
type(scope): subject

body (optional)

footer (optional)
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples**:
- `feat(calculator): add renewable energy option`
- `fix(tracker): correct streak calculation logic`
- `docs(readme): update installation instructions`

## 🔄 Pull Request Process

1. **Create a feature branch**: `git checkout -b feat/your-feature-name`
2. **Make your changes**: Follow the code style guidelines
3. **Test thoroughly**: Run `npm test` and manual testing
4. **Commit with clear messages**: Use conventional commit format
5. **Push to your fork**: `git push origin feat/your-feature-name`
6. **Open a Pull Request**: Provide a clear description of changes

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] All tests pass (`npm test`)
- [ ] New features have tests
- [ ] Documentation is updated
- [ ] No console errors or warnings
- [ ] Commit messages follow conventional format

## 🐛 Reporting Bugs

When reporting bugs, please include:

1. **Description**: Clear description of the issue
2. **Steps to Reproduce**: Detailed steps to reproduce the bug
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Environment**: Browser, OS, Node.js version
6. **Screenshots**: If applicable

## 💡 Suggesting Features

Feature suggestions are welcome! Please:

1. Check if the feature already exists or is planned
2. Describe the feature and its benefits
3. Explain the use case
4. Consider implementation complexity

## 📚 Project Structure

```
ecoiq/
├── api/              # Vercel serverless functions
├── css/              # Page-specific stylesheets
├── js/               # Frontend JavaScript modules
├── pages/            # HTML pages
├── tests/            # Test suite
├── .github/          # GitHub Actions CI
├── index.html        # Landing page
├── server.js         # Local development server
└── package.json      # Dependencies and scripts
```

## 🔍 Code Review Process

All contributions go through code review:

1. Maintainers review for code quality, security, and alignment
2. Feedback is provided via PR comments
3. Address feedback and push updates
4. Once approved, changes are merged

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Thank You

Your contributions help make EcoIQ better for everyone working toward a sustainable future!

---

**Questions?** Open an issue or reach out to the maintainers.