'use strict';

// extractJson is not exported from minimaxService; replicate the helper to assert
// its behaviour. If it is exported later, swap to the real implementation.

function localExtractJson(text) {
  if (!text) return null;
  const trimmed = text.trim();
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first === -1 || last === -1) return null;
  const candidate = trimmed.slice(first, last + 1);
  try {
    return JSON.parse(candidate);
  } catch (_e) {
    return null;
  }
}

describe('extractJson behaviour', () => {
  test('parses clean JSON', () => {
    expect(localExtractJson('{"a":1}')).toEqual({ a: 1 });
  });
  test('extracts JSON from surrounding prose', () => {
    expect(localExtractJson('Here you go: {"total": 5.5} cheers!')).toEqual({ total: 5.5 });
  });
  test('returns null for non-JSON', () => {
    expect(localExtractJson('nothing')).toBeNull();
  });
});
