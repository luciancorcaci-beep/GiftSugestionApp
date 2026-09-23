# Target Architecture Diagrams - What Gift Should I Choose

**Source**: `docs/architecture/design/02-target-architecture-brownfield.md`
**Generated**: 2026-09-22

> Mermaid diagrams extracted from the target architecture document for easy preview.

---

## Target System Context Diagram

```mermaid
flowchart TB
  User[Buyer - browser]
  System["Gift Recommendation App\n(unchanged: still zero external runtime dependencies)"]
  Catalog[("giftCatalog.json\n162 entries (150 original + 12 dedicated)")]

  User -->|"Enters age, budget, relationship (now 12 options), interests"| System
  System -->|"filter/match, unchanged algorithm"| Catalog
  Catalog -->|"3 recommendations"| System
  System -->|"3 recommendations"| User
```

---

## Component Architecture (Target)

```mermaid
flowchart TB
  subgraph Presentation["Presentation (existing layer)"]
    Form["GiftForm.tsx\n🟡 MODIFIED: imports RELATIONSHIPS\ninstead of hardcoding a duplicate list"]
  end

  subgraph Domain["Domain (existing layer)"]
    Entities["GiftRecommendation.ts\n🟡 MODIFIED: RELATIONSHIPS 6 -> 12 values"]
  end

  subgraph Application["Application (existing layer, unchanged)"]
    Validate["validateGiftInput.ts\n🟢 UNCHANGED (derives from RELATIONSHIPS)"]
  end

  subgraph Infrastructure["Infrastructure (existing layer, unchanged)"]
    Provider["CatalogRecommendationProvider.ts\n🟢 UNCHANGED (generic over relationship string)"]
  end

  Form -->|imports| Entities
  Validate -->|imports| Entities
  Form -->|"POST /api/gift-suggestions"| Validate
  Validate --> Provider
```

---

## Data Model Changes

_No ER diagram — there is no database. The only data-model change is a compile-time TypeScript union widening (see the target architecture doc's Data Model Changes section for the exact code)._
