# Patterns & Standards - What Gift Should I Choose

**Date**: 2026-09-16  
**Author**: ARCHITECT  
**Status**: Approved  
**Version**: 1.0

---

## Overview

This document defines the implementation standards for the gift recommendation application. The goal is simple: keep the codebase easy to reason about, test, and extend while keeping the MVP lean.

The project follows a layered architecture: presentation, application, domain, and infrastructure. All code must respect those boundaries and keep business rules away from the UI and external APIs.

---

## Project Structure

```text
src/
├── app/
│   ├── api/
│   │   └── gift-suggestions/
│   │       ├── route.ts
│   │       └── schema.ts
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── forms/
│   │   └── GiftForm.tsx
│   ├── results/
│   │   └── GiftResults.tsx
│   └── shared/
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Card.tsx
├── domain/
│   ├── entities/
│   │   └── GiftRecommendation.ts
│   ├── services/
│   │   └── RecommendationService.ts
│   └── value-objects/
│       └── Relationship.ts
├── application/
│   ├── use-cases/
│   │   └── GenerateGiftSuggestions.ts
│   ├── dto/
│   │   └── GiftSuggestionRequest.ts
│   └── validation/
│       └── validateGiftInput.ts
├── infrastructure/
│   ├── ai/
│   │   └── ClaudeRecommendationClient.ts
│   ├── product/
│   │   └── ProductLinkClient.ts
│   └── persistence/
│       └── recommendationCache.ts
├── lib/
│   ├── logger.ts
│   ├── errors.ts
│   └── formatters.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

### Rules
- Keep feature logic inside the app or domain layer, not inside UI components.
- Shared UI components must live under `components/shared` and be reusable across multiple screens.
- Feature-specific components belong in feature folders such as `components/forms` and `components/results`.
- The domain and application layers must not import browser-only code or external provider SDKs.
- File names use kebab-case for folders and PascalCase for React components; TypeScript files use kebab-case or camelCase based on usage, but keep naming consistent.

---

## UI Primitive Catalogue

This project has a frontend UI layer. Shared visual primitives are required to live in the shared library; if a component is reusable across two or more features, it is a primitive and must be created in `src/components/shared`.

### Required Shared Primitives
- `Button`
- `Input`
- `Select`
- `Card`
- `Badge`
- `TextArea`
- `LoadingState`
- `EmptyState`

### Rule
- If a component contains no business logic and is reused in more than one place, it is a primitive and must be shared.
- Feature-only UI elements such as a gift form or results panel belong in feature folders, not in the shared library.

### Recommended Tooling
- Storybook should be used to document and visually verify the primitive catalogue during implementation.

---

## Error Handling Pattern

### Standard
All application errors must be explicit, typed, and handled at the boundary.

```ts
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class RecommendationServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecommendationServiceError';
  }
}
```

### DO
```ts
try {
  const suggestions = await generateGiftSuggestions(input);
  return { recommendations: suggestions };
} catch (error) {
  if (error instanceof ValidationError) {
    return { status: 400, message: error.message };
  }

  logger.error({ error, input }, 'Gift generation failed');
  return { status: 500, message: 'Unable to generate gift suggestions right now.' };
}
```

### DON'T
```ts
try {
  // bad: swallowing errors silently
  return await generateGiftSuggestions(input);
} catch {
  return null;
}
```

### Rules
- Do not swallow exceptions.
- Map domain and provider errors into user-safe API errors.
- Error messages shown to the user must be safe and not leak internal provider details.

---

## Logging Pattern

### Log Format
Use structured logs with request metadata, error context, and correlation IDs.

```ts
logger.info({
  requestId: req.id,
  relationship: body.relationship,
  budget: body.budget,
  count: 3,
}, 'Gift recommendations requested');
```

### Log Levels
- `info`: successful requests and feature flows
- `warn`: invalid user input or degraded external calls
- `error`: failed generation, provider errors, or unexpected exceptions

### DO
```ts
logger.error({ requestId, relationship, error }, 'AI recommendation failed');
```

### DON'T
```ts
logger.error(JSON.stringify({ password: secret }));
```

### Rules
- Never log secrets, API keys, or raw user tokens.
- Prefer structured objects, not string concatenation.
- Include request context for debugging but avoid storing personal data unnecessarily.

---

## Database Access Pattern

This project is an MVP and does not require a complex data layer. If persistence is added, it must be isolated behind a repository interface.

```ts
export interface RecommendationRepository {
  save(request: GiftRequest): Promise<void>;
  getRecent(): Promise<GiftRequest[]>;
}
```

### DO
```ts
const repo = new SqliteRecommendationRepository(db);
await repo.save(request);
```

### DON'T
```ts
const query = `INSERT INTO gifts VALUES (${request.age}, ${request.budget})`;
```

### Rules
- Do not put SQL or database calls directly inside the UI or the use case layer.
- Use repositories to isolate persistence concerns.
- Avoid shared global database access without dependency injection.
- Keep transaction handling explicit and limited to writes that must be atomic.

---

## API Design Pattern

### Request Validation
All API requests validate required fields before business logic executes.

```ts
const schema = {
  recipientAge: z.number().int().min(0),
  budget: z.number().positive(),
  relationship: z.enum(['Friend', 'Partner', 'Parent', 'Child', 'Sibling', 'Colleague']),
  interests: z.string().min(1).max(500),
};
```

### Response Contract
```json
{
  "recommendations": [
    {
      "title": "Example gift",
      "description": "Explanation",
      "rationale": "Why it fits",
      "priceRange": "$40-$80",
      "productUrl": "https://example.com"
    }
  ]
}
```

### DO
```ts
return NextResponse.json({ recommendations }, { status: 200 });
```

### DON'T
```ts
return NextResponse.json({ result: 'ok' });
```

### Rules
- API responses must be consistent and explicit.
- Validation errors must be returned as structured validation failures.
- Authentication is not required for the MVP; only the buyer persona is supported.

---

## Configuration Pattern

### Standard
Use environment variables only for external configuration such as API keys and environment selection.

```env
CLAUDE_API_KEY=your-key
NEXT_PUBLIC_APP_ENV=development
```

### DO
```ts
const apiKey = process.env.CLAUDE_API_KEY;
if (!apiKey) {
  throw new Error('Missing CLAUDE_API_KEY');
}
```

### DON'T
```ts
const apiKey = 'hardcoded-secret';
```

### Rules
- Never hardcode secrets in the source tree.
- Keep defaults explicit and documented.
- Use `.env.example` for required keys and environment references.

---

## Testing Pattern

### Unit Tests
Unit tests cover isolated logic and validation rules.

```ts
describe('validateGiftInput', () => {
  it('rejects unsupported relationship', () => {
    expect(() => validateGiftInput({
      recipientAge: 30,
      budget: 50,
      relationship: 'Boss',
      interests: 'books',
    })).toThrow();
  });
});
```

### Integration Tests
Integration tests validate end-to-end request handling and the recommendation API flow.

```ts
it('returns three recommendations for valid payload', async () => {
  const response = await request(app).post('/api/gift-suggestions').send({
    recipientAge: 25,
    budget: 80,
    relationship: 'Friend',
    interests: 'music, travel',
  });

  expect(response.status).toBe(200);
  expect(response.body.recommendations).toHaveLength(3);
});
```

### Coverage Requirements
- Minimum code coverage: 85%
- Cover validation, AI provider adapter, and result formatting logic
- Skip trivial config and generated files
- Prefer real behavior over mock-heavy tests

---

## Documentation Standards

- Code comments should explain intent and rationale, not restate obvious logic.
- Public modules should have brief documentation comments.
- Each major feature should have a README section or inline API usage examples.
- API behaviors must be documented in the architecture and story docs.

---

## File / Module Boundary Map

This is the authoritative ownership map for the project.

| Concern | Owning Files / Globs |
|---------|----------------------|
| UI shell and layout | `src/app/**`, `src/components/**` |
| Form and recommendation input handling | `src/components/forms/**`, `src/app/api/gift-suggestions/**` |
| Recommendation business logic | `src/application/**`, `src/domain/**` |
| AI provider integration | `src/infrastructure/ai/**` |
| Product lookup | `src/infrastructure/product/**` |
| Shared UI primitives | `src/components/shared/**` |
| Logging and common utilities | `src/lib/**` |
| Configuration and environment | `.env.example`, `src/config/**` |
| Tests | `src/tests/**` |

### Shared Files
These are the files that multiple concerns may touch and therefore require coordination:
- `src/app/api/gift-suggestions/route.ts`
- `src/lib/logger.ts`
- `src/lib/errors.ts`
- `src/app/page.tsx`
- `package.json`
- `tsconfig.json`

### Cross-Concern Notes
- The API route acts as the boundary between UI and backend logic, so it touches many concerns.
- The common utility and logging files are intentionally centralized so that all feature code follows the same contract.

---

## Quality Checklist

- [ ] Shared UI primitives live in `components/shared`
- [ ] Business logic stays out of UI components
- [ ] API layer validates input before use case execution
- [ ] Errors are typed and mapped to safe responses
- [ ] Logs are structured and secrets are excluded
- [ ] Persistence is isolated behind repository interfaces
- [ ] Unit and integration tests exist for the recommendation flow
- [ ] Coverage target is at least 85%

---

## Approval

These standards define the expected coding conventions and implementation boundaries for the gift recommendation application.
