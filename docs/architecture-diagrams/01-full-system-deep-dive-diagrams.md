# Full System Deep-Dive Diagrams - What Gift Should I Choose (Current State)

**Source**: `docs/architecture/current/01-full-system-deep-dive.md`
**Date**: 2026-09-22

---

## Workflow: POST /api/gift-suggestions (happy path)

```mermaid
sequenceDiagram
  participant Client as Browser (GiftForm)
  participant MW as Edge middleware
  participant Route as route.ts / handler.ts
  participant RL as FixedWindowRateLimiter
  participant Body as readBoundedJson
  participant Valid as validateGiftInput
  participant Svc as RecommendationService
  participant Prov as CatalogRecommendationProvider
  participant Cat as giftCatalog.json

  Client->>MW: POST /api/gift-suggestions
  MW->>MW: generate nonce, set CSP/security headers
  MW->>Route: forward request
  Route->>RL: tryAcquire(clientKey)
  RL-->>Route: allowed
  Route->>Body: readBoundedJson(request, 16384)
  Body-->>Route: parsed JSON
  Route->>Valid: parseGiftSuggestionRequest(body)
  Valid-->>Route: GiftSuggestionRequest
  Route->>Svc: generate(request)
  Svc->>Valid: validateGiftInput(input) (defense in depth)
  Svc->>Prov: generate(request)
  Prov->>Cat: filter by age -> relationship -> interest keywords
  Cat-->>Prov: candidate entries
  Prov-->>Svc: 3 GiftRecommendation (random pick)
  Svc->>Svc: validate output shape + sanitize productUrl
  Svc-->>Route: GiftRecommendation[3]
  Route-->>Client: 200 { recommendations: [...] }
```

---

## Workflow: POST /api/gift-suggestions (rate-limited / error path)

```mermaid
sequenceDiagram
  participant Client
  participant Route as handler.ts
  participant RL as FixedWindowRateLimiter
  participant Err as toErrorResponse

  Client->>Route: POST /api/gift-suggestions
  Route->>RL: tryAcquire(clientKey)
  RL-->>Route: false (limit exceeded)
  Route->>Route: throw TooManyRequestsError(retryAfterSeconds)
  Route->>Err: toErrorResponse(error)
  Err-->>Route: { status: 429, body: { error: { code: 'RATE_LIMITED', ... } } }
  Route-->>Client: 429 + Retry-After header
```

---

## Workflow: Client-side page load (health check)

```mermaid
sequenceDiagram
  participant Browser
  participant Page as page.tsx
  participant Health as /api/health

  Browser->>Page: mount HomePage
  Page->>Health: GET /api/health (5s timeout via AbortController)
  alt healthy
    Health-->>Page: 200 { status: 'ok' }
    Page-->>Browser: "Backend connected"
  else timeout / non-200 / bad payload
    Health-->>Page: error or bad response
    Page-->>Browser: "Backend unavailable: <message>"
  end
```
