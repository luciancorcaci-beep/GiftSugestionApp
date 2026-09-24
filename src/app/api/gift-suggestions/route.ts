import { createGiftSuggestionsHandler } from '@/app/api/gift-suggestions/handler';
import { CatalogRecommendationProvider } from '@/infrastructure/catalog/CatalogRecommendationProvider';

// Composition root: this is the one place a concrete RecommendationProvider is
// named. The handler itself only depends on the RecommendationProvider
// interface, so swapping providers (or A/B-testing one) only ever touches
// this file.
export const POST = createGiftSuggestionsHandler({ provider: new CatalogRecommendationProvider() });
