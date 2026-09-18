import { describe, expect, it } from 'vitest';

import { isTrustedProductUrl } from '@/lib/productUrl';

describe('isTrustedProductUrl', () => {
  it('accepts an HTTPS link on the default trusted domain', () => {
    expect(isTrustedProductUrl('https://www.amazon.com/dp/B000123')).toBe(true);
  });

  it('accepts an HTTPS link on the bare trusted domain', () => {
    expect(isTrustedProductUrl('https://amazon.com/dp/B000123')).toBe(true);
  });

  it('rejects an HTTP link even on a trusted domain', () => {
    expect(isTrustedProductUrl('http://www.amazon.com/dp/B000123')).toBe(false);
  });

  it('rejects a link on a domain outside the allowlist', () => {
    expect(isTrustedProductUrl('https://example.com/product/1')).toBe(false);
  });

  it('rejects a lookalike domain that merely contains the trusted domain as a substring', () => {
    expect(isTrustedProductUrl('https://amazon.com.evil.example/dp/1')).toBe(false);
  });

  it('rejects a malformed URL', () => {
    expect(isTrustedProductUrl('not-a-url')).toBe(false);
  });

  it('rejects a non-string value', () => {
    expect(isTrustedProductUrl(undefined)).toBe(false);
    expect(isTrustedProductUrl(42)).toBe(false);
  });

  it('honors a custom trusted-domain list', () => {
    expect(isTrustedProductUrl('https://shop.example.com/item', ['example.com'])).toBe(true);
    expect(isTrustedProductUrl('https://www.amazon.com/dp/1', ['example.com'])).toBe(false);
  });
});
