import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Reads the report source directly so the CSS structure can be checked without
// a database. The regression this guards against: the base `.status-*` rules
// were physically trapped inside a `@media (max-width: 700px)` block, so the
// payment-status box rendered as unstyled text on desktop.
const source = readFileSync(new URL('../src/routes/reports.js', import.meta.url), 'utf8');

const styleMatch = source.match(/<style>([\s\S]*?)<\/style>/);
assert.ok(styleMatch, 'monthly report should embed a <style> block');
const css = styleMatch[1];

const stripTopLevelMedia = value => {
  let out = '';
  let i = 0;

  while (i < value.length) {
    if (value.startsWith('@media', i)) {
      const open = value.indexOf('{', i);
      if (open === -1) break;

      let depth = 0;
      let j = open;
      for (; j < value.length; j += 1) {
        if (value[j] === '{') depth += 1;
        else if (value[j] === '}') {
          depth -= 1;
          if (depth === 0) { j += 1; break; }
        }
      }

      i = j;
      continue;
    }

    out += value[i];
    i += 1;
  }

  return out;
};

test('monthly report CSS has balanced braces', () => {
  const opens = (css.match(/\{/g) || []).length;
  const closes = (css.match(/\}/g) || []).length;
  assert.equal(opens, closes);
});

test('monthly report keeps the payment status styles at the top level', () => {
  const topLevel = stripTopLevelMedia(css);

  for (const selector of ['.status-box {', '.status-label {', '.status-value {', '.status-dot {', '.status-note {']) {
    assert.ok(topLevel.includes(selector), `${selector} must apply outside a media query`);
  }

  assert.ok(topLevel.includes('.status-box.status-paid {'), 'paid variant should be a base style');
  assert.ok(topLevel.includes('.status-box.status-pending {'), 'pending variant should be a base style');
});

test('monthly report does not duplicate carryover base styles', () => {
  const topLevel = stripTopLevelMedia(css);
  const count = (topLevel.match(/\.carryover-box\s*\{/g) || []).length;
  assert.equal(count, 1);
});

test('monthly report keeps a single responsive and print media query', () => {
  const responsive = (css.match(/@media \(max-width: 700px\)/g) || []).length;
  assert.equal(responsive, 2);

  const print = (css.match(/@media print/g) || []).length;
  assert.equal(print, 2);
});

test('monthly report renders both payment status states', () => {
  assert.ok(source.includes('class="status-box status-paid"'));
  assert.ok(source.includes('class="status-box status-pending"'));
  assert.ok(source.includes('Payment status'));
});

test('monthly report lists a ticket number column', () => {
  assert.ok(source.includes('<th>Ticket</th>'), 'report header should include Ticket');
  assert.ok(source.includes('escapeHtml(row.ticketNo)'), 'report rows should render the ticket number');
  assert.ok(source.includes('colspan="8"'), 'empty state should span the eight columns');
});
