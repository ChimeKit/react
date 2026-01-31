# Contributing to ChimeKit React

Thank you for your interest in contributing to ChimeKit React! This document provides guidelines and instructions for contributing.

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/ChimeKit/react.git
   cd react
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development mode:
   ```bash
   npm run dev
   ```

4. Run tests:
   ```bash
   npm run test
   ```

5. Build the library:
   ```bash
   npm run build
   ```

## Project Structure

```
src/
├── components/     # React components (Bell, Feed, Inbox, etc.)
├── hooks/          # Custom React hooks
├── provider/       # ChimeKitProvider context
├── utils/          # Utility functions
├── styles/         # Component CSS files
├── types.ts        # TypeScript type definitions
└── index.ts        # Public exports
```

## Code Style

- We use TypeScript with strict mode enabled
- Run `npm run lint` before committing
- Follow existing code patterns and naming conventions
- Use meaningful variable and function names

## Pull Request Process

1. Fork the repository and create a feature branch
2. Make your changes with clear, descriptive commits
3. Ensure all tests pass: `npm run test`
4. Ensure linting passes: `npm run lint`
5. Update documentation if needed
6. Submit a pull request with a clear description of changes

## Reporting Issues

- Use GitHub Issues to report bugs or request features
- Include reproduction steps for bugs
- Provide environment details (React version, browser, OS)

## Code of Conduct

Be respectful and constructive in all interactions. We're all here to build great software together.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
