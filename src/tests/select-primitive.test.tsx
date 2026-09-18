import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Select } from '@/components/shared/Select';

describe('Select', () => {
  it('renders an accessible label bound to the control and every option', () => {
    const markup = renderToStaticMarkup(
      <Select
        id="relationship"
        label="Relationship"
        name="relationship"
        placeholder="Choose a relationship"
        options={[{ label: 'Friend', value: 'Friend' }, { label: 'Partner', value: 'Partner' }]}
        value=""
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('for="relationship"');
    expect(markup).toContain('>Relationship<');
    expect(markup).toContain('>Choose a relationship<');
    expect(markup).toContain('>Friend<');
    expect(markup).toContain('>Partner<');
  });

  it('omits the placeholder option when none is provided', () => {
    const markup = renderToStaticMarkup(
      <Select
        id="relationship"
        label="Relationship"
        options={[{ label: 'Friend', value: 'Friend' }]}
        value="Friend"
        onChange={() => undefined}
      />,
    );

    expect(markup).not.toContain('value=""');
  });
});
