# Contributing to @alteriom/webhook-client

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Development Setup

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+
- Git

### Clone and Install

```bash
git clone https://github.com/Alteriom/webhook-client.git
cd webhook-client
npm install
```

### Build

```bash
npm run build
```

### Run Tests

```bash
npm test
npm test -- --coverage
```

### Lint

```bash
npm run lint
npm run lint -- --fix
```

## Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/) for automated versioning and changelog generation.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat:** New feature (minor version bump)
- **fix:** Bug fix (patch version bump)
- **docs:** Documentation changes
- **style:** Code style changes (formatting, etc.)
- **refactor:** Code refactoring
- **perf:** Performance improvements
- **test:** Adding or updating tests
- **chore:** Build process or tooling changes
- **BREAKING CHANGE:** Breaking changes (major version bump)

### Examples

```bash
# Feature (0.0.1 → 0.1.0)
git commit -m "feat(client): add pagination helper methods"

# Bug fix (0.1.0 → 0.1.1)
git commit -m "fix(receiver): handle missing timestamp header gracefully"

# Breaking change (0.1.1 → 1.0.0)
git commit -m "feat(types)!: rename WebhookEvent.github_delivery_id to deliveryId

BREAKING CHANGE: WebhookEvent.github_delivery_id has been renamed to deliveryId for consistency"
```

## Pull Request Process

### 1. Create a Branch

```bash
git checkout -b feat/my-feature
# or
git checkout -b fix/my-bugfix
```

### 2. Make Changes

- Write clean, readable code
- Add tests for new features
- Update documentation
- Run `npm test` and `npm run lint`

### 3. Commit

```bash
git add .
git commit -m "feat(client): add new feature"
```

### 4. Push

```bash
git push origin feat/my-feature
```

### 5. Open Pull Request

- Go to GitHub repository
- Click "New Pull Request"
- Select your branch
- Fill in PR template
- Wait for CI checks to pass
- Request review

## Code Style

### TypeScript

- Use strict TypeScript (`strict: true`)
- Avoid `any` types (use `unknown` instead)
- Document public APIs with JSDoc
- Export types from main entry point
- Use named exports (not default exports)

### Formatting

We use ESLint for linting. Format your code with:

```bash
npm run lint -- --fix
```

### Naming Conventions

- **Classes:** PascalCase (`AlteriomWebhookClient`)
- **Interfaces:** PascalCase (`ClientConfig`)
- **Functions:** camelCase (`generateWebhookSignature`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_PAYLOAD_SIZE`)
- **Files:** kebab-case (`webhook-receiver.ts`)

## Testing Guidelines

### Test Structure

```typescript
describe('AlteriomWebhookClient', () => {
  describe('events.list', () => {
    it('should fetch events with default params', async () => {
      // Arrange
      const client = new AlteriomWebhookClient({ /* ... */ });
      
      // Act
      const result = await client.events.list();
      
      // Assert
      expect(result.data).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
    });
  });
});
```

### Coverage Requirements

- Minimum coverage: 90%
- Focus on critical paths (security, error handling)
- Mock external dependencies (axios, crypto)

### Test Commands

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage

# Single file
npm test -- receiver.test.ts
```

## Documentation

### JSDoc Comments

All public APIs must have JSDoc comments:

```typescript
/**
 * Generate HMAC-SHA256 signature for webhook testing.
 * 
 * @param payload - Webhook payload object
 * @param secret - Webhook secret key
 * @param timestamp - Optional timestamp (defaults to now)
 * @returns Object with signature and timestamp
 * 
 * @example
 * ```typescript
 * const { signature, timestamp } = generateWebhookSignature(
 *   { subscription_id: 'test' },
 *   'my-secret'
 * );
 * ```
 */
export function generateWebhookSignature(
  payload: unknown,
  secret: string,
  timestamp?: string
): { signature: string; timestamp: string } {
  // ...
}
```

### README Updates

When adding features:
1. Update API reference section
2. Add usage examples
3. Update feature list
4. Update changelog

## Release Process

Releases are automated via GitHub Actions when tags are pushed.

### Manual Release

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Commit changes: `git commit -m "chore: release v0.1.0"`
4. Create tag: `git tag v0.1.0`
5. Push tag: `git push origin v0.1.0`
6. GitHub Actions will publish to NPM

### Automatic Release (Recommended)

Use `npm version` to bump version and create tag:

```bash
# Patch (0.0.1 → 0.0.2)
npm version patch

# Minor (0.0.2 → 0.1.0)
npm version minor

# Major (0.1.0 → 1.0.0)
npm version major

# Push tag
git push --follow-tags
```

## Security

### Reporting Vulnerabilities

**DO NOT** open public issues for security vulnerabilities.

Instead, email: security@alteriom.net

We will respond within 48 hours.

### Security Best Practices

- Never commit secrets (API keys, tokens, passwords)
- Use `npm audit` to check dependencies
- Review all third-party dependencies
- Use timing-safe comparisons for signatures
- Validate all user input

## Questions?

- **Discord:** [OpenClaw Community](https://discord.gg/clawd)
- **GitHub Issues:** [Report bugs](https://github.com/Alteriom/webhook-client/issues)
- **Email:** support@alteriom.net

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
