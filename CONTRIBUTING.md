# Contributing to Stock Analysis Application

We love your input! We want to make contributing to the Stock Analysis Application as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## 🚀 Quick Start for Contributors

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Set up the development environment** (see below)
4. **Create a feature branch** from `main`
5. **Make your changes** with tests
6. **Submit a pull request**

## 🛠️ Development Setup

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v8.0.0 or higher)
- Redis (v6.0 or higher)
- Git

### Local Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/stock-analysis-app.git
cd stock-analysis-app

# Install dependencies
npm run install:all

# Set up environment variables
cp backend/config.example backend/.env
# Edit backend/.env with your API keys (optional for development)

# Start Redis (using Docker)
docker run -d --name redis-dev -p 6379:6379 redis:alpine

# Start development servers
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## 📋 Development Guidelines

### Code Style
- **JavaScript**: Follow ES6+ standards
- **React**: Use functional components with hooks
- **CSS**: Follow BEM methodology where applicable
- **Formatting**: We use Prettier for code formatting
- **Linting**: ESLint for code quality

### Commit Messages
We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(agents): add new economic indicator for inflation data
fix(ui): resolve WebSocket connection timeout issue
docs(readme): update installation instructions
test(analysis): add unit tests for sentiment scoring
```

### Branch Naming
- `feature/description` - for new features
- `fix/description` - for bug fixes
- `docs/description` - for documentation updates
- `refactor/description` - for code refactoring

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run backend tests only
npm run test:backend

# Run frontend tests only
npm run test:frontend

# Run tests with coverage
npm run test:coverage
```

### Writing Tests
- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test agent interactions and API endpoints
- **E2E Tests**: Test complete user workflows

**Test Files:**
- Backend: `backend/src/**/*.test.js`
- Frontend: `frontend/src/**/*.test.js`

### Test Requirements
- All new features must include tests
- Bug fixes should include regression tests
- Aim for >80% code coverage
- Tests should be fast and reliable

## 🏗️ Architecture Guidelines

### Multi-Agent System
When working with agents:
- Extend the `BaseAgent` class for new agents
- Use Redis pub/sub for inter-agent communication
- Implement proper error handling and logging
- Add graceful degradation for API failures

### API Integration
- Always implement rate limiting
- Provide fallback/mock data
- Use exponential backoff for retries
- Cache responses appropriately

### Frontend Development
- Use React hooks for state management
- Implement proper loading states
- Handle errors gracefully
- Ensure responsive design

## 📝 Pull Request Process

### Before Submitting
1. **Update documentation** if needed
2. **Add or update tests** for your changes
3. **Run the test suite** and ensure all tests pass
4. **Check code formatting** with Prettier
5. **Verify the application works** end-to-end

### PR Requirements
- **Clear title** describing the change
- **Detailed description** explaining what and why
- **Link to related issues** (if applicable)
- **Screenshots** for UI changes
- **Breaking changes** clearly documented

### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work)
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added new tests for this change
- [ ] Manual testing completed

## Screenshots (if applicable)

## Additional Notes
```

## 🐛 Bug Reports

Use GitHub Issues to report bugs. Include:

1. **Bug description** - Clear and concise
2. **Steps to reproduce** - Detailed steps
3. **Expected behavior** - What should happen
4. **Actual behavior** - What actually happens
5. **Environment** - OS, Node.js version, etc.
6. **Screenshots/logs** - If applicable

### Bug Report Template
```markdown
**Bug Description**
A clear description of the bug

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
What you expected to happen

**Screenshots**
If applicable, add screenshots

**Environment:**
- OS: [e.g. macOS, Windows, Linux]
- Node.js Version: [e.g. 18.15.0]
- Browser: [e.g. Chrome, Firefox]
- Application Version: [e.g. 1.0.0]

**Additional Context**
Any other context about the problem
```

## 💡 Feature Requests

We welcome feature suggestions! Use GitHub Issues with:

1. **Feature description** - What you'd like to see
2. **Use case** - Why this would be valuable
3. **Proposed solution** - How it might work
4. **Alternatives considered** - Other approaches

## 🔐 Security Issues

**DO NOT** create public issues for security vulnerabilities.

Instead, please email security@yourproject.com with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## 📚 Documentation

Help improve documentation by:
- Fixing typos and grammar
- Adding examples and use cases
- Updating outdated information
- Creating tutorials or guides

## 🎨 Design Guidelines

### UI/UX Contributions
- Follow the existing design system
- Ensure accessibility (WCAG 2.1 AA)
- Test on multiple screen sizes
- Use consistent spacing and typography

### Agent Development
- Document agent capabilities clearly
- Implement comprehensive error handling
- Add monitoring and metrics
- Follow the established patterns

## 📞 Getting Help

- **Documentation**: Check the README.md first
- **Issues**: Search existing GitHub issues
- **Discussions**: Use GitHub Discussions for questions
- **Community**: Join our community channels (if available)

## 🏆 Recognition

Contributors are recognized in:
- Project README.md
- Release notes
- Hall of Fame (if applicable)

## 📄 License

By contributing, you agree that your contributions will be licensed under the same MIT License that covers the project.

## 🙏 Code of Conduct

Please note that this project is released with a [Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

---

Thank you for contributing to the Stock Analysis Application! 🚀 