import type { GiftSuggestionRequest } from '@/application/dto/GiftSuggestionRequest';
import type { GiftRecommendation } from '@/domain/entities/GiftRecommendation';
import type { RecommendationProvider } from '@/domain/services/RecommendationService';
import { loadGiftCatalog, type GiftCatalogEntry } from '@/infrastructure/catalog/giftCatalogLoader';
import { RecommendationServiceError } from '@/lib/errors';

/**
 * Implements the catalog matching algorithm documented in the source
 * spreadsheet's README sheet ("Suggested matching logic for 'give me 3 gift
 * ideas'"): filter by age -> filter by relationship -> score by interest
 * text -> fall back to the relationship-filtered set when interest scoring
 * leaves too few candidates -> randomly pick 3.
 *
 * Budget is intentionally never used for filtering or scoring here (it is
 * validated/displayed upstream only), matching the spreadsheet's own
 * documented algorithm.
 */
const SELECTION_COUNT = 3;
const MINIMUM_CANDIDATES = 3;

/** Step 1: age is eligible when it falls within the entry's range, inclusive on both bounds. */
export function isAgeEligible(entry: GiftCatalogEntry, age: number): boolean {
  return age >= entry.minRecipientAge && age <= entry.maxRecipientAge;
}

/** Step 2: an entry is relationship-eligible when tagged "All" or tagged for the given relationship. */
export function isRelationshipEligible(entry: GiftCatalogEntry, relationship: string): boolean {
  return entry.relationshipTags.includes('All') || entry.relationshipTags.includes(relationship);
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function isPartialMatch(interests: string, candidate: string): boolean {
  const normalizedInterests = normalize(interests);
  const normalizedCandidate = normalize(candidate);
  if (!normalizedInterests || !normalizedCandidate) return false;
  return normalizedInterests.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedInterests);
}

/**
 * Step 3: case-insensitive partial match of the entered interest text against
 * `interestCategory` and each `keywords` entry. The entered text may either
 * contain a token or be contained by it.
 */
export function matchesInterest(entry: GiftCatalogEntry, interests: string): boolean {
  return isPartialMatch(interests, entry.interestCategory) || entry.keywords.some((keyword) => isPartialMatch(interests, keyword));
}

/** Finds the specific interestCategory/keyword token that matched, for use in a synthesized rationale. */
function findMatchedInterestTerm(entry: GiftCatalogEntry, interests: string): string {
  if (isPartialMatch(interests, entry.interestCategory)) {
    return entry.interestCategory;
  }
  const matchedKeyword = entry.keywords.find((keyword) => isPartialMatch(interests, keyword));
  return matchedKeyword ?? entry.interestCategory;
}

/** Fisher-Yates shuffle so repeated selection over the same candidate set varies across calls. */
function shuffle<T>(items: readonly T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function selectRandom<T>(items: readonly T[], count: number): T[] {
  return shuffle(items).slice(0, count);
}

function isRelationshipAgnostic(entry: GiftCatalogEntry): boolean {
  return entry.relationshipTags.length === 1 && entry.relationshipTags[0] === 'All';
}

function synthesizeRelationshipFit(entry: GiftCatalogEntry, relationship: string): string {
  if (isRelationshipAgnostic(entry)) {
    return 'A versatile pick that suits nearly any recipient, regardless of relationship.';
  }
  return `A good fit for a ${relationship}.`;
}

function synthesizeRationale(
  entry: GiftCatalogEntry,
  input: GiftSuggestionRequest,
  usedInterestMatch: boolean,
): string {
  if (usedInterestMatch) {
    const matchedTerm = findMatchedInterestTerm(entry, input.interests);
    return `${entry.name} relates to the recipient's interest in ${matchedTerm}, making it a relevant idea.`;
  }
  return `${entry.name} was chosen because it suits a ${input.relationship} in the ${entry.minRecipientAge}-${entry.maxRecipientAge} age range, since no closer interest match was found.`;
}

function toRecommendation(
  entry: GiftCatalogEntry,
  input: GiftSuggestionRequest,
  usedInterestMatch: boolean,
): GiftRecommendation {
  return {
    id: entry.giftId,
    title: entry.name,
    description: entry.description,
    rationale: synthesizeRationale(entry, input, usedInterestMatch),
    priceRange: entry.priceRangeUsd,
    relationshipFit: synthesizeRelationshipFit(entry, input.relationship),
  };
}

export class CatalogRecommendationProvider implements RecommendationProvider {
  private readonly catalog: GiftCatalogEntry[];

  constructor(catalog: GiftCatalogEntry[] = loadGiftCatalog()) {
    this.catalog = catalog;
  }

  async generate(input: GiftSuggestionRequest): Promise<GiftRecommendation[]> {
    const ageEligible = this.catalog.filter((entry) => isAgeEligible(entry, input.recipientAge));
    const relationshipEligible = ageEligible.filter((entry) => isRelationshipEligible(entry, input.relationship));
    const interestScored = relationshipEligible.filter((entry) => matchesInterest(entry, input.interests));

    const usedInterestMatch = interestScored.length >= MINIMUM_CANDIDATES;
    const candidates = usedInterestMatch ? interestScored : relationshipEligible;

    if (candidates.length < MINIMUM_CANDIDATES) {
      throw new RecommendationServiceError(
        'Not enough catalog entries match the recipient age and relationship to generate suggestions.',
      );
    }

    const selected = selectRandom(candidates, SELECTION_COUNT);
    return selected.map((entry) => toRecommendation(entry, input, usedInterestMatch));
  }
}
