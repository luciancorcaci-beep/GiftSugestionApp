export const RELATIONSHIPS = [
  'Friend',
  'Partner',
  'Parent',
  'Child',
  'Sibling',
  'Colleague',
  'Mortal Enemy',
  'Frenemy',
  'Coworker I Tolerate',
  'Secret Santa Victim',
  'Boss I Need to Impress',
  'Person Whose Name I Forgot',
] as const;

export type Relationship = (typeof RELATIONSHIPS)[number];

export type GiftRecommendation = {
  id: string;
  title: string;
  description: string;
  rationale: string;
  priceRange: string;
  relationshipFit: string;
  productUrl?: string;
};

export type GiftRecommendationResponse = {
  recommendations: GiftRecommendation[];
};