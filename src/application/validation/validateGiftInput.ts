import { ValidationError } from '@/lib/errors';
import type { GiftSuggestionRequest } from '@/application/dto/GiftSuggestionRequest';
import { RELATIONSHIPS, type Relationship } from '@/domain/entities/GiftRecommendation';

type GiftInput = {
  recipientAge?: unknown;
  budget?: unknown;
  relationship?: unknown;
  interests?: unknown;
};

const RELATIONSHIP_MESSAGE = `Relationship must be one of: ${RELATIONSHIPS.join(', ')}`;
const ALLOWED_FIELDS = ['recipientAge', 'budget', 'relationship', 'interests'];

function isRecord(value: unknown): value is GiftInput {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseNumber(value: unknown, missingMessage: string): number {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    throw new ValidationError(missingMessage);
  }

  if (typeof value !== 'number' && typeof value !== 'string') {
    throw new ValidationError('Numeric input is invalid');
  }

  const parsedValue = typeof value === 'string' ? Number(value.trim()) : value;
  if (!Number.isFinite(parsedValue)) {
    throw new ValidationError('Numeric input is invalid');
  }

  return parsedValue;
}

function parseAge(value: unknown): number {
  const age = parseNumber(value, 'Age is required');
  if (!Number.isInteger(age) || age < 0) {
    throw new ValidationError('Age must be a whole number of 0 or greater');
  }

  return age;
}

function parseBudget(value: unknown): number {
  const budget = parseNumber(value, 'Budget is required');
  if (budget <= 0) {
    throw new ValidationError('Budget must be greater than zero');
  }

  return budget;
}

function parseRelationship(value: unknown): Relationship {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError('Relationship is required');
  }

  if (typeof value !== 'string' || !RELATIONSHIPS.includes(value as Relationship)) {
    throw new ValidationError(RELATIONSHIP_MESSAGE);
  }

  return value as Relationship;
}

function parseInterests(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError('Interests are required');
  }

  const interests = value.trim();
  if (interests.length > 500) {
    throw new ValidationError('Interests must be 500 characters or fewer');
  }

  return interests;
}

export function validateGiftInput(input: unknown): GiftSuggestionRequest {
  if (!isRecord(input)) {
    throw new ValidationError('Gift input must be an object');
  }

  const unsupportedFields = Object.keys(input).filter((key) => !ALLOWED_FIELDS.includes(key));
  if (unsupportedFields.length > 0) {
    throw new ValidationError(`Unsupported field(s): ${unsupportedFields.join(', ')}`);
  }

  return {
    recipientAge: parseAge(input.recipientAge),
    budget: parseBudget(input.budget),
    relationship: parseRelationship(input.relationship),
    interests: parseInterests(input.interests),
  };
}