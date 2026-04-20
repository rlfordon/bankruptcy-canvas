import { describe, it, expect } from 'vitest';
import { resolveRef } from '../../scripts/build-data/resolveRef';

describe('resolveRef', () => {
  it('parses a bare section href', () => {
    expect(resolveRef('/us/usc/t11/s547')).toEqual({
      kind: 'internal', section: '547',
    });
  });

  it('parses a subsection href', () => {
    expect(resolveRef('/us/usc/t11/s546/a/1/A')).toEqual({
      kind: 'internal', section: '546', subsection: 'a', paragraph: '1', subparagraph: 'A',
    });
  });

  it('marks non-Title-11 href as external', () => {
    expect(resolveRef('/us/usc/t26/s1234')).toEqual({ kind: 'external', href: '/us/usc/t26/s1234' });
  });

  it('marks malformed href as external', () => {
    expect(resolveRef('/us/pl/95/598')).toEqual({ kind: 'external', href: '/us/pl/95/598' });
  });
});
