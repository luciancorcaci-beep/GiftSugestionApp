import { describe, expect, it } from 'vitest';

import type { GiftSuggestionRequest } from '@/application/dto/GiftSuggestionRequest';
import {
  CatalogRecommendationProvider,
  isAgeEligible,
  isRelationshipEligible,
  matchesInterest,
} from '@/infrastructure/catalog/CatalogRecommendationProvider';
import type { GiftCatalogEntry } from '@/infrastructure/catalog/giftCatalogLoader';
import { loadGiftCatalog } from '@/infrastructure/catalog/giftCatalogLoader';
import { RecommendationServiceError } from '@/lib/errors';

function makeEntry(overrides: Partial<GiftCatalogEntry> = {}): GiftCatalogEntry {
  return {
    giftId: 'G000',
    name: 'Test Gift',
    description: 'A test gift description.',
    interestCategory: 'Music',
    keywords: ['guitar', 'song'],
    minRecipientAge: 1,
    maxRecipientAge: 99,
    relationshipTags: ['Friend'],
    priceRangeUsd: '$10-$20',
    ...overrides,
  };
}

const validInput: GiftSuggestionRequest = {
  recipientAge: 30,
  budget: 50,
  relationship: 'Friend',
  interests: 'music',
};

describe('isAgeEligible (pure filter function)', () => {
  it('is inclusive at the exact minimum boundary', () => {
    const entry = makeEntry({ minRecipientAge: 8, maxRecipientAge: 60 });
    expect(isAgeEligible(entry, 8)).toBe(true);
  });

  it('is inclusive at the exact maximum boundary', () => {
    const entry = makeEntry({ minRecipientAge: 8, maxRecipientAge: 60 });
    expect(isAgeEligible(entry, 60)).toBe(true);
  });

  it('excludes an age just below the minimum', () => {
    const entry = makeEntry({ minRecipientAge: 8, maxRecipientAge: 60 });
    expect(isAgeEligible(entry, 7)).toBe(false);
  });

  it('excludes an age just above the maximum', () => {
    const entry = makeEntry({ minRecipientAge: 8, maxRecipientAge: 60 });
    expect(isAgeEligible(entry, 61)).toBe(false);
  });
});

describe('isRelationshipEligible (pure filter function)', () => {
  it('includes an entry tagged for the exact relationship', () => {
    const entry = makeEntry({ relationshipTags: ['Friend'] });
    expect(isRelationshipEligible(entry, 'Friend')).toBe(true);
  });

  it('includes an entry tagged "All" regardless of relationship', () => {
    const entry = makeEntry({ relationshipTags: ['All'] });
    expect(isRelationshipEligible(entry, 'Colleague')).toBe(true);
  });

  it('excludes an entry tagged for a different, specific relationship', () => {
    const entry = makeEntry({ relationshipTags: ['Parent'] });
    expect(isRelationshipEligible(entry, 'Friend')).toBe(false);
  });
});

describe('matchesInterest (pure scoring function)', () => {
  it('matches case-insensitively against interestCategory', () => {
    const entry = makeEntry({ interestCategory: 'Music', keywords: ['guitar'] });
    expect(matchesInterest(entry, 'MUSIC')).toBe(true);
  });

  it('matches case-insensitively against a keyword', () => {
    const entry = makeEntry({ interestCategory: 'Sports', keywords: ['Basketball'] });
    expect(matchesInterest(entry, 'basketball')).toBe(true);
  });

  it('matches when the entered text contains the catalog token', () => {
    const entry = makeEntry({ interestCategory: 'Music', keywords: [] });
    expect(matchesInterest(entry, 'I love music a lot')).toBe(true);
  });

  it('matches when the catalog token contains the entered text', () => {
    const entry = makeEntry({ interestCategory: 'Gardening & Outdoors', keywords: [] });
    expect(matchesInterest(entry, 'garden')).toBe(true);
  });

  it('does not match unrelated nonsense text', () => {
    const entry = makeEntry({ interestCategory: 'Music', keywords: ['guitar', 'song'] });
    expect(matchesInterest(entry, 'xyzzyx123nomatch')).toBe(false);
  });

  it('does not match empty interest text', () => {
    const entry = makeEntry({ interestCategory: 'Music', keywords: ['guitar'] });
    expect(matchesInterest(entry, '')).toBe(false);
  });
});

describe('CatalogRecommendationProvider (fixture catalog, deterministic scenarios)', () => {
  it('falls back to the relationship-filtered set when fewer than 3 entries interest-match', async () => {
    const catalog: GiftCatalogEntry[] = [
      makeEntry({ giftId: 'G1', interestCategory: 'Music', keywords: ['guitar'], relationshipTags: ['Friend'] }),
      makeEntry({ giftId: 'G2', interestCategory: 'Sports', keywords: ['ball'], relationshipTags: ['All'] }),
      makeEntry({ giftId: 'G3', interestCategory: 'Gaming', keywords: ['console'], relationshipTags: ['Friend', 'Sibling'] }),
      makeEntry({ giftId: 'G4', interestCategory: 'Cooking', keywords: ['recipe'], relationshipTags: ['Parent'] }),
      makeEntry({ giftId: 'G5', interestCategory: 'Travel', keywords: ['passport'], relationshipTags: ['All'] }),
    ];
    const provider = new CatalogRecommendationProvider(catalog);

    const result = await provider.generate({ ...validInput, interests: 'music' });

    expect(result).toHaveLength(3);
    // G4 is relationship-ineligible (Parent only) so it must never appear.
    expect(result.map((r) => r.id)).not.toContain('G4');
    // The fallback pool is exactly [G1, G2, G3, G5]; every pick must come from it.
    const eligibleIds = new Set(['G1', 'G2', 'G3', 'G5']);
    for (const rec of result) {
      expect(eligibleIds.has(rec.id)).toBe(true);
    }
  });

  it('uses the interest-scored set when it has at least 3 matches', async () => {
    const catalog: GiftCatalogEntry[] = [
      makeEntry({ giftId: 'G1', interestCategory: 'Music', keywords: ['guitar'], relationshipTags: ['All'] }),
      makeEntry({ giftId: 'G2', interestCategory: 'Music', keywords: ['piano'], relationshipTags: ['All'] }),
      makeEntry({ giftId: 'G3', interestCategory: 'Music', keywords: ['drums'], relationshipTags: ['All'] }),
      makeEntry({ giftId: 'G4', interestCategory: 'Cooking', keywords: ['recipe'], relationshipTags: ['All'] }),
    ];
    const provider = new CatalogRecommendationProvider(catalog);

    const result = await provider.generate({ ...validInput, interests: 'music' });

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.id)).not.toContain('G4');
    for (const rec of result) {
      expect(rec.rationale.toLowerCase()).toContain('music');
    }
  });

  it('never returns a relationship-ineligible entry', async () => {
    const catalog: GiftCatalogEntry[] = [
      makeEntry({ giftId: 'G1', relationshipTags: ['Friend'] }),
      makeEntry({ giftId: 'G2', relationshipTags: ['All'] }),
      makeEntry({ giftId: 'G3', relationshipTags: ['Friend', 'Sibling'] }),
      makeEntry({ giftId: 'G4', relationshipTags: ['Parent'] }),
      makeEntry({ giftId: 'G5', relationshipTags: ['Colleague'] }),
    ];
    const provider = new CatalogRecommendationProvider(catalog);

    for (let i = 0; i < 10; i += 1) {
      const result = await provider.generate({ ...validInput, relationship: 'Friend', interests: 'nomatch' });
      for (const rec of result) {
        expect(['G1', 'G2', 'G3']).toContain(rec.id);
      }
    }
  });

  it('only returns entries within the recipient age range, inclusive of the boundary', async () => {
    const catalog: GiftCatalogEntry[] = [
      makeEntry({ giftId: 'G1', minRecipientAge: 8, maxRecipientAge: 20, relationshipTags: ['All'] }),
      makeEntry({ giftId: 'G2', minRecipientAge: 8, maxRecipientAge: 20, relationshipTags: ['All'] }),
      makeEntry({ giftId: 'G3', minRecipientAge: 8, maxRecipientAge: 20, relationshipTags: ['All'] }),
      makeEntry({ giftId: 'G4', minRecipientAge: 21, maxRecipientAge: 30, relationshipTags: ['All'] }),
      makeEntry({ giftId: 'G5', minRecipientAge: 1, maxRecipientAge: 7, relationshipTags: ['All'] }),
    ];
    const provider = new CatalogRecommendationProvider(catalog);

    const atMin = await provider.generate({ ...validInput, recipientAge: 8, interests: 'nomatch' });
    expect(atMin.map((r) => r.id).sort()).toEqual(['G1', 'G2', 'G3']);

    const atMax = await provider.generate({ ...validInput, recipientAge: 20, interests: 'nomatch' });
    expect(atMax.map((r) => r.id).sort()).toEqual(['G1', 'G2', 'G3']);

    // Age 7 is only eligible for G5, and the relationship-filtered set (G5 alone)
    // has fewer than 3 entries, so the defensive error path triggers.
    await expect(
      provider.generate({ ...validInput, recipientAge: 7, interests: 'nomatch' }),
    ).rejects.toThrow(RecommendationServiceError);
  });

  it('throws a RecommendationServiceError when fewer than 3 age+relationship-eligible entries exist', async () => {
    const catalog: GiftCatalogEntry[] = [
      makeEntry({ giftId: 'G1', relationshipTags: ['All'] }),
      makeEntry({ giftId: 'G2', relationshipTags: ['All'] }),
    ];
    const provider = new CatalogRecommendationProvider(catalog);

    await expect(provider.generate(validInput)).rejects.toThrow(RecommendationServiceError);
  });

  it('maps catalog fields to the GiftRecommendation contract and omits productUrl', async () => {
    const catalog: GiftCatalogEntry[] = [
      makeEntry({ giftId: 'G1', name: 'Guitar Pick Set', description: 'A set of picks.', priceRangeUsd: '$5-$15', relationshipTags: ['All'] }),
      makeEntry({ giftId: 'G2', relationshipTags: ['All'] }),
      makeEntry({ giftId: 'G3', relationshipTags: ['All'] }),
    ];
    const provider = new CatalogRecommendationProvider(catalog);

    const result = await provider.generate({ ...validInput, interests: 'music' });
    const mapped = result.find((r) => r.id === 'G1');

    expect(mapped).toBeDefined();
    expect(mapped?.title).toBe('Guitar Pick Set');
    expect(mapped?.description).toBe('A set of picks.');
    expect(mapped?.priceRange).toBe('$5-$15');
    expect(mapped?.productUrl).toBeUndefined();
    expect(typeof mapped?.rationale).toBe('string');
    expect(mapped?.rationale.length).toBeGreaterThan(0);
    expect(typeof mapped?.relationshipFit).toBe('string');
    expect(mapped?.relationshipFit.length).toBeGreaterThan(0);
  });

  it('synthesizes rationale and relationshipFit that are not identical across the three results', async () => {
    const catalog: GiftCatalogEntry[] = [
      makeEntry({ giftId: 'G1', name: 'Gift One', interestCategory: 'Music', keywords: ['guitar'], relationshipTags: ['All'] }),
      makeEntry({ giftId: 'G2', name: 'Gift Two', interestCategory: 'Music', keywords: ['piano'], relationshipTags: ['Friend'] }),
      makeEntry({ giftId: 'G3', name: 'Gift Three', interestCategory: 'Music', keywords: ['drums'], relationshipTags: ['Friend'] }),
    ];
    const provider = new CatalogRecommendationProvider(catalog);

    const result = await provider.generate({ ...validInput, interests: 'music' });

    const rationales = new Set(result.map((r) => r.rationale));
    expect(rationales.size).toBe(3);

    const relationshipFits = result.map((r) => r.relationshipFit);
    // At least the "All"-tagged entry's phrasing differs from the Friend-specific ones.
    expect(new Set(relationshipFits).size).toBeGreaterThan(1);
  });

  it('references the matched keyword in the rationale when the match came from a keyword, not the category', async () => {
    const catalog: GiftCatalogEntry[] = [
      makeEntry({ giftId: 'G1', interestCategory: 'Sports', keywords: ['gardening', 'trowel'], relationshipTags: ['All'] }),
      makeEntry({ giftId: 'G2', interestCategory: 'Sports', keywords: ['gardening', 'soil'], relationshipTags: ['All'] }),
      makeEntry({ giftId: 'G3', interestCategory: 'Sports', keywords: ['gardening', 'seeds'], relationshipTags: ['All'] }),
    ];
    const provider = new CatalogRecommendationProvider(catalog);

    const result = await provider.generate({ ...validInput, interests: 'gardening' });

    expect(result).toHaveLength(3);
    for (const rec of result) {
      expect(rec.rationale.toLowerCase()).toContain('gardening');
      expect(rec.rationale.toLowerCase()).not.toContain('sports');
    }
  });

  it('synthesizes a relationship-referencing rationale on the fallback path', async () => {
    const catalog: GiftCatalogEntry[] = [
      makeEntry({ giftId: 'G1', relationshipTags: ['Friend'] }),
      makeEntry({ giftId: 'G2', relationshipTags: ['All'] }),
      makeEntry({ giftId: 'G3', relationshipTags: ['Friend'] }),
    ];
    const provider = new CatalogRecommendationProvider(catalog);

    const result = await provider.generate({ ...validInput, relationship: 'Friend', interests: 'xyzzyx123nomatch' });

    for (const rec of result) {
      expect(rec.rationale).toContain('Friend');
    }
  });

  it('produces a relationship-agnostic relationshipFit phrase for an "All"-tagged entry', async () => {
    const catalog: GiftCatalogEntry[] = [
      makeEntry({ giftId: 'G1', relationshipTags: ['All'] }),
      makeEntry({ giftId: 'G2', relationshipTags: ['All'] }),
      makeEntry({ giftId: 'G3', relationshipTags: ['All'] }),
    ];
    const provider = new CatalogRecommendationProvider(catalog);

    const result = await provider.generate(validInput);

    for (const rec of result) {
      expect(rec.relationshipFit.toLowerCase()).not.toContain('friend');
    }
  });

  it('produces a relationship-specific relationshipFit phrase referencing the relationship', async () => {
    const catalog: GiftCatalogEntry[] = [
      makeEntry({ giftId: 'G1', relationshipTags: ['Colleague'] }),
      makeEntry({ giftId: 'G2', relationshipTags: ['Colleague'] }),
      makeEntry({ giftId: 'G3', relationshipTags: ['Colleague'] }),
    ];
    const provider = new CatalogRecommendationProvider(catalog);

    const result = await provider.generate({ ...validInput, relationship: 'Colleague' });

    for (const rec of result) {
      expect(rec.relationshipFit).toContain('Colleague');
    }
  });
});

describe('CatalogRecommendationProvider (default constructor, real catalog)', () => {
  it('returns exactly three recommendations for a valid request', async () => {
    const provider = new CatalogRecommendationProvider();
    await expect(provider.generate(validInput)).resolves.toHaveLength(3);
  });

  it('falls back to the relationship-filtered set when interests match nothing', async () => {
    const provider = new CatalogRecommendationProvider();
    const result = await provider.generate({ ...validInput, interests: 'xyzzyx123nomatch' });
    expect(result).toHaveLength(3);
  });

  it('never includes a relationship-ineligible entry, cross-checked against the real catalog', async () => {
    const provider = new CatalogRecommendationProvider();
    const catalog = loadGiftCatalog();
    const byId = new Map(catalog.map((entry) => [entry.giftId, entry]));

    const result = await provider.generate({ ...validInput, relationship: 'Colleague', interests: 'gadgets' });
    expect(result).toHaveLength(3);
    for (const rec of result) {
      const source = byId.get(rec.id);
      expect(source).toBeDefined();
      expect(
        source!.relationshipTags.includes('All') || source!.relationshipTags.includes('Colleague'),
      ).toBe(true);
    }
  });

  it('only returns age-eligible entries, cross-checked against the real catalog', async () => {
    const provider = new CatalogRecommendationProvider();
    const catalog = loadGiftCatalog();
    const byId = new Map(catalog.map((entry) => [entry.giftId, entry]));

    const result = await provider.generate({ ...validInput, recipientAge: 8, interests: 'nomatch-xyz' });
    expect(result).toHaveLength(3);
    for (const rec of result) {
      const source = byId.get(rec.id);
      expect(source).toBeDefined();
      expect(source!.minRecipientAge).toBeLessThanOrEqual(8);
      expect(source!.maxRecipientAge).toBeGreaterThanOrEqual(8);
    }
  });

  it('varies the selected 3-of-N set across repeated identical calls (randomization, not first-N-in-file-order)', async () => {
    const provider = new CatalogRecommendationProvider();
    const input: GiftSuggestionRequest = { ...validInput, recipientAge: 30, relationship: 'Friend', interests: 'music' };

    const seenSets = new Set<string>();
    for (let i = 0; i < 20; i += 1) {
      const result = await provider.generate(input);
      seenSets.add(result.map((r) => r.id).sort().join(','));
    }

    expect(seenSets.size).toBeGreaterThan(1);
  });

  it('does not always return the first three catalog entries in file order', async () => {
    const provider = new CatalogRecommendationProvider();
    const catalog = loadGiftCatalog();
    const firstThreeIds = catalog.slice(0, 3).map((e) => e.giftId).sort().join(',');

    let differedAtLeastOnce = false;
    for (let i = 0; i < 20; i += 1) {
      const result = await provider.generate(validInput);
      if (result.map((r) => r.id).sort().join(',') !== firstThreeIds) {
        differedAtLeastOnce = true;
        break;
      }
    }

    expect(differedAtLeastOnce).toBe(true);
  });
});
