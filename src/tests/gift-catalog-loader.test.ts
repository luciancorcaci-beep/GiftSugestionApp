import { describe, expect, it } from 'vitest';

import { loadGiftCatalog, type GiftCatalogEntry } from '@/infrastructure/catalog/giftCatalogLoader';

const RELATIONSHIP_TAG_VALUES = new Set([
  'All',
  'Friend',
  'Partner',
  'Parent',
  'Child',
  'Sibling',
  'Colleague',
]);

describe('loadGiftCatalog', () => {
  it('returns exactly 150 entries', () => {
    expect(loadGiftCatalog()).toHaveLength(150);
  });

  it('has unique giftId values across all entries', () => {
    const ids = loadGiftCatalog().map((entry) => entry.giftId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('normalizes RelationshipTags "All" into a single-element array', () => {
    const allEntry = loadGiftCatalog().find(
      (entry) => entry.relationshipTags.length === 1 && entry.relationshipTags[0] === 'All',
    );
    expect(allEntry).toBeDefined();
  });

  it('returns the same 150 entries on repeat calls (no mutation, no persistent state)', () => {
    const first = loadGiftCatalog();
    const second = loadGiftCatalog();
    expect(second).toHaveLength(first.length);
    expect(second.map((entry) => entry.giftId)).toEqual(first.map((entry) => entry.giftId));
  });

  it('gives every entry the fields already shown on a recommendation card: name, description, price range', () => {
    for (const entry of loadGiftCatalog()) {
      expect(typeof entry.name).toBe('string');
      expect(entry.name.length).toBeGreaterThan(0);
      expect(typeof entry.description).toBe('string');
      expect(entry.description.length).toBeGreaterThan(0);
      expect(typeof entry.priceRangeUsd).toBe('string');
      expect(entry.priceRangeUsd).toMatch(/^\$\d+-\$\d+$/);
    }
  });

  it('gives every entry a well-formed shape matching the GiftCatalogEntry contract', () => {
    const entries: GiftCatalogEntry[] = loadGiftCatalog();
    for (const entry of entries) {
      expect(entry.giftId).toMatch(/^G\d{3}$/);
      expect(typeof entry.interestCategory).toBe('string');
      expect(entry.interestCategory.length).toBeGreaterThan(0);

      expect(Array.isArray(entry.keywords)).toBe(true);
      expect(entry.keywords.length).toBeGreaterThan(0);
      for (const keyword of entry.keywords) {
        expect(typeof keyword).toBe('string');
        expect(keyword).toBe(keyword.trim());
        expect(keyword.length).toBeGreaterThan(0);
      }

      expect(Number.isInteger(entry.minRecipientAge)).toBe(true);
      expect(Number.isInteger(entry.maxRecipientAge)).toBe(true);
      expect(entry.minRecipientAge).toBeLessThanOrEqual(entry.maxRecipientAge);

      expect(Array.isArray(entry.relationshipTags)).toBe(true);
      expect(entry.relationshipTags.length).toBeGreaterThan(0);
      for (const tag of entry.relationshipTags) {
        expect(RELATIONSHIP_TAG_VALUES.has(tag)).toBe(true);
      }
      if (entry.relationshipTags.includes('All')) {
        expect(entry.relationshipTags).toEqual(['All']);
      }
    }
  });
});
