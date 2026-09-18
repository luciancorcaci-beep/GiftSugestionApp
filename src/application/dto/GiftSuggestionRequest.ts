import type { Relationship } from '@/domain/entities/GiftRecommendation';

export type GiftSuggestionRequest = {
  recipientAge: number;
  budget: number;
  relationship: Relationship;
  interests: string;
};