export const DEFAULT_TRUSTED_PRODUCT_DOMAINS = ['amazon.com'];

export function isTrustedProductUrl(value: unknown, trustedDomains: string[] = DEFAULT_TRUSTED_PRODUCT_DOMAINS): value is string {
  if (typeof value !== 'string') return false;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== 'https:') return false;

  return trustedDomains.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
}

export function resolveTrustedProductDomains(configured: string | undefined): string[] {
  if (!configured) return DEFAULT_TRUSTED_PRODUCT_DOMAINS;

  const domains = configured.split(',').map((domain) => domain.trim().toLowerCase()).filter(Boolean);
  return domains.length > 0 ? domains : DEFAULT_TRUSTED_PRODUCT_DOMAINS;
}
