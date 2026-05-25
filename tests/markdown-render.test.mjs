// Tests for renderMarkdown — the CDN-marked wrapper in js/markdown.js.
// SPEC.md §L: empty input → "No description provided." placeholder; when
// marked is unavailable, fall back to an escaped <pre> block.
//
// We run under Node where `marked` is undefined, so the fallback path is the
// observed behavior. The marked-present branch can't be exercised here without
// loading the library — that's covered by the browser smoke test.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { renderMarkdown } from '../js/markdown.js';

test('renderMarkdown: empty string → "No description provided." placeholder', () => {
  const html = renderMarkdown('');
  assert.match(html, /No description provided\./);
  assert.match(html, /<em\b/);
});

test('renderMarkdown: null → "No description provided." placeholder', () => {
  assert.match(renderMarkdown(null), /No description provided\./);
});

test('renderMarkdown: undefined → "No description provided." placeholder', () => {
  assert.match(renderMarkdown(undefined), /No description provided\./);
});

test('renderMarkdown: text fallback wraps content in <pre> when marked is unavailable', () => {
  const html = renderMarkdown('hello world');
  assert.match(html, /<pre[^>]*>hello world<\/pre>/);
});

test('renderMarkdown: fallback escapes HTML-special characters', () => {
  const html = renderMarkdown('<script>alert("xss")</script>');
  assert.ok(!html.includes('<script>'), 'raw <script> must be escaped');
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&quot;/, 'double-quote should be escaped');
});

test('renderMarkdown: fallback escapes ampersand', () => {
  const html = renderMarkdown('a & b');
  assert.match(html, /a &amp; b/);
});
