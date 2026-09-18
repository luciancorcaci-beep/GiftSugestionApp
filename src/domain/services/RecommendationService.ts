import type { GiftSuggestionRequest } from '@/application/dto/GiftSuggestionRequest';
import { validateGiftInput } from '@/application/validation/validateGiftInput';
import type { GiftRecommendation } from '@/domain/entities/GiftRecommendation';
import { RecommendationProviderError, RecommendationServiceError } from '@/lib/errors';
import { logger as defaultLogger, type Logger } from '@/lib/logger';
import { isTrustedProductUrl, resolveTrustedProductDomains } from '@/lib/productUrl';

export interface RecommendationProvider {
  generate(input: GiftSuggestionRequest): Promise<unknown>;
}

function isRecommendation(value: unknown): value is GiftRecommendation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const recommendation = value as Record<string, unknown>;
  const requiredFields = ['id', 'title', 'description', 'rationale', 'priceRange', 'relationshipFit'];
  const hasValidProductUrlShape = recommendation.productUrl === undefined || typeof recommendation.productUrl === 'string';
  return requiredFields.every((field) => typeof recommendation[field] === 'string' && recommendation[field] !== '')
    && hasValidProductUrlShape;
}

function sanitizeProductUrl(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;

  const trustedDomains = resolveTrustedProductDomains(process.env.TRUSTED_PRODUCT_DOMAINS);
  return isTrustedProductUrl(value, trustedDomains) ? value : undefined;
}

function validateProviderOutput(output: unknown): GiftRecommendation[] {
  if (!Array.isArray(output) || output.length !== 3 || !output.every(isRecommendation)) {
    throw new RecommendationServiceError();
  }

  return (output as GiftRecommendation[]).map((recommendation) => ({
    ...recommendation,
    productUrl: sanitizeProductUrl(recommendation.productUrl),
  }));
}

export class RecommendationService {
  constructor(
    private readonly provider: RecommendationProvider,
    private readonly logger: Logger = defaultLogger,
  ) {}

  async generate(input: unknown): Promise<GiftRecommendation[]> {
    const request = validateGiftInput(input);

    try {
      const output = await this.provider.generate(request);
      return validateProviderOutput(output);
    } catch (error) {
      if (error instanceof RecommendationProviderError) {
        this.logger.error({ code: error.code, relationship: request.relationship }, 'AI provider request failed');
        throw new RecommendationServiceError(undefined, error.statusCode);
      }

      if (error instanceof RecommendationServiceError) {
        this.logger.error({ code: error.code, relationship: request.relationship }, 'AI provider returned invalid data');
        throw error;
      }

      this.logger.error({ relationship: request.relationship }, 'AI recommendation generation failed');
      throw new RecommendationServiceError();
    }
  }
}