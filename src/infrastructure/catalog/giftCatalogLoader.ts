import catalogData from '@/data/giftCatalog.json';

/**
 * Shape of a single row from the curated gift catalog, produced once by
 * scripts/convert-gift-catalog.py from Gift_Ideas_Database.xlsx and
 * committed as src/data/giftCatalog.json. This is a thin data source:
 * derived fields such as a match rationale are synthesized at match time
 * (Story 3.2), not stored here.
 */
export interface GiftCatalogEntry {
  giftId: string;
  name: string;
  description: string;
  interestCategory: string;
  keywords: string[];
  minRecipientAge: number;
  maxRecipientAge: number;
  relationshipTags: string[];
  priceRangeUsd: string;
}

/**
 * Returns the bundled gift catalog as typed entries.
 *
 * The catalog JSON is loaded via a static import, so it is type-checked
 * and bundled at build time rather than read from disk at request time.
 * A malformed or missing catalog file fails at module-load time (build
 * or server start), never silently as an empty catalog at request time.
 */
export function loadGiftCatalog(): GiftCatalogEntry[] {
  return catalogData as GiftCatalogEntry[];
}
