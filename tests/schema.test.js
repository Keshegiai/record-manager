import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ImportError, LIMITS, buildExport, filterRecords, mergeImport, migrateLegacy, normalizeState,
  parseImport, sanitizeColor, sanitizeId, sanitizeName, sanitizeText, sortRecords,
} from '../js/schema.js';

const opts = { lang: 'ru', defaultCategoryName: 'Личное' };

test('sanitizeText trims, strips control characters and enforces the length limit', () => {
  assert.equal(sanitizeText('  hi\u0000 there\r\n '), 'hi there');
  assert.equal(sanitizeText('a\tb\nc'), 'a\tb\nc');
  assert.equal(sanitizeText('   '), null);
  assert.equal(sanitizeText(42), null);
  assert.equal(sanitizeText({ toString: () => 'x' }), null);
  assert.equal(sanitizeText('x'.repeat(LIMITS.text + 50)).length, LIMITS.text);
});

test('sanitizeName removes bidi overrides, zero-width chars and newlines', () => {
  assert.equal(sanitizeName('Work\u202Egpj.exe'), 'Work gpj.exe');
  assert.equal(sanitizeName('a\u200Bb\nc'), 'a b c');
  assert.equal(sanitizeName('   '), null);
  assert.equal(Array.from(sanitizeName('😀'.repeat(40))).length, LIMITS.categoryName);
});

test('sanitizeId accepts safe ids only', () => {
  assert.equal(sanitizeId(1700000000000), '1700000000000');
  assert.equal(sanitizeId('abc-DEF_123'), 'abc-DEF_123');
  assert.equal(sanitizeId('<script>'), null);
  assert.equal(sanitizeId('__proto__'), '__proto__'); // harmless: ids are never used as object keys
  assert.equal(sanitizeId(-1), null);
  assert.equal(sanitizeId(1.5), null);
});

test('sanitizeColor maps to the fixed palette and rejects CSS injection', () => {
  assert.equal(sanitizeColor('blue'), 'blue');
  assert.equal(sanitizeColor('#10b981'), 'green');
  assert.equal(sanitizeColor('#ff0000'), 'red');
  assert.equal(sanitizeColor('red; background:url(https://evil)'), null);
  assert.equal(sanitizeColor('url(x)'), null);
});

test('migrateLegacy converts v1 data without losing records', () => {
  const v1 = {
    prompts: [
      { id: 1700000000001, text: 'Hello', category: 'Work', createdAt: 1700000000001 },
      { id: 1700000000002, text: 'Orphan', category: 'Deleted category' },
      { text: 'No id' },
      { id: 3, text: '' },
      'garbage',
    ],
    categories: [{ name: 'Work', color: '#ef4444' }, { name: 'Все', color: '#000000' }],
    theme: 'light',
    lang: 'kk',
    sortBy: 'alpha-asc',
  };
  const state = migrateLegacy(v1, opts);
  assert.deepEqual(state.categories.map((c) => c.name), ['Work', 'Deleted category']);
  assert.equal(state.categories[0].color, 'red');
  assert.equal(state.records.length, 3);
  const work = state.categories[0].id;
  assert.equal(state.records[0].categoryId, work);
  assert.equal(state.records[0].id, '1700000000001');
  assert.equal(state.records[1].categoryId, state.categories[1].id);
  assert.deepEqual(state.settings, { theme: 'light', lang: 'kk', sortBy: 'alpha-asc' });
});

test('migrateLegacy handles string categories and an empty store', () => {
  const state = migrateLegacy({ categories: ['Общее', 'Kamiqr'] }, opts);
  assert.deepEqual(state.categories.map((c) => c.name), ['Kamiqr']);
  const fresh = migrateLegacy({}, opts);
  assert.equal(fresh.categories.length, 1);
  assert.equal(fresh.categories[0].name, 'Личное');
  assert.equal(fresh.settings.theme, 'system');
  assert.equal(fresh.settings.lang, 'ru');
});

test('normalizeState repairs broken data', () => {
  const state = normalizeState({
    categories: [{ id: 'a', name: 'A', color: 'blue' }, { id: 'a', name: 'B', color: 'nope' }, { name: 'a' }],
    records: [
      { id: 'r1', text: 'x', categoryId: 'missing', createdAt: 'yesterday' },
      { id: 'r1', text: 'dup id', categoryId: 'a' },
      { id: 'r2', text: null },
    ],
    settings: { theme: 'neon', lang: 'fr', sortBy: 'random' },
  }, opts);
  assert.equal(state.categories.length, 2);
  assert.notEqual(state.categories[1].id, 'a');
  assert.equal(state.records.length, 2);
  assert.equal(state.records[0].categoryId, 'a');
  assert.notEqual(state.records[1].id, 'r1');
  assert.equal(typeof state.records[0].createdAt, 'number');
  assert.deepEqual(state.settings, { theme: 'system', lang: 'ru', sortBy: 'date-desc' });
});

test('parseImport rejects malformed input', () => {
  for (const bad of ['', 'not json', '[]', 'null', '{"foo":1}', '"str"']) {
    assert.throws(() => parseImport(bad, opts), ImportError, bad);
  }
  assert.throws(() => parseImport('x'.repeat(LIMITS.importBytes + 1), opts), (e) => e.code === 'tooLarge');
});

test('parseImport neutralizes hostile category names and colors', () => {
  const evil = JSON.stringify({
    prompts: [{ id: 1, text: '<img src=x onerror=alert(1)>', category: '<b onmouseover=alert(1)>x</b>' }],
    categories: [{ name: '<b onmouseover=alert(1)>x</b>', color: 'red;background:url(//evil)' }],
  }).replace(/^\{/, '{"__proto__":{"polluted":true},');
  const parsed = parseImport(evil, opts);
  assert.equal({}.polluted, undefined);
  assert.equal(parsed.categories[0].name, '<b onmouseover=alert(1)>x</b>'); // kept as plain text, rendered via textContent
  assert.ok(['blue', 'green', 'indigo', 'orange', 'pink', 'purple', 'red', 'teal', 'yellow', 'gray'].includes(parsed.categories[0].color));
  assert.equal(parsed.records[0].text, '<img src=x onerror=alert(1)>');
});

test('export → import round-trip adds nothing new', () => {
  const state = migrateLegacy({ prompts: [{ id: 1, text: 'a', category: 'W' }], categories: [{ name: 'W' }] }, opts);
  const file = JSON.stringify(buildExport(state));
  const { added, state: merged } = mergeImport(state, parseImport(file, opts));
  assert.equal(added, 0);
  assert.equal(merged.records.length, 1);
});

test('mergeImport matches categories by name and skips duplicates', () => {
  const current = normalizeState({
    categories: [{ id: 'w', name: 'Work', color: 'blue' }],
    records: [{ id: 'r1', text: 'same', categoryId: 'w', createdAt: 1700000000000 }],
  }, opts);
  const incoming = normalizeState({
    categories: [{ id: 'x', name: 'work', color: 'red' }, { id: 'w', name: 'Home', color: 'green' }],
    records: [
      { id: 'n1', text: 'same', categoryId: 'x' },      // duplicate text in matched category
      { id: 'n2', text: 'new', categoryId: 'x' },
      { id: 'n3', text: 'home', categoryId: 'w' },      // incoming id "w" collides with current "Work"
    ],
  }, opts);
  const { state, added } = mergeImport(current, incoming);
  assert.equal(added, 2);
  assert.deepEqual(state.categories.map((c) => c.name), ['Work', 'Home']);
  const home = state.categories[1];
  assert.notEqual(home.id, 'w');
  assert.equal(state.records.find((r) => r.id === 'n2').categoryId, 'w');
  assert.equal(state.records.find((r) => r.id === 'n3').categoryId, home.id);
});

test('filterRecords searches text and category name; sortRecords sorts', () => {
  const cats = [{ id: 'a', name: 'Work' }, { id: 'b', name: 'Home' }];
  const recs = [
    { id: '1', text: 'banana', categoryId: 'a', createdAt: 1 },
    { id: '2', text: 'Apple', categoryId: 'b', createdAt: 2 },
    { id: '3', text: 'cherry', categoryId: 'b', createdAt: 3 },
  ];
  assert.deepEqual(filterRecords(recs, cats, { query: 'work' }).map((r) => r.id), ['1']);
  assert.deepEqual(filterRecords(recs, cats, { filter: 'b', query: 'APP' }).map((r) => r.id), ['2']);
  assert.deepEqual(sortRecords(recs, 'alpha-asc').map((r) => r.text), ['Apple', 'banana', 'cherry']);
  assert.deepEqual(sortRecords(recs, 'date-desc').map((r) => r.id), ['3', '2', '1']);
  assert.deepEqual(sortRecords(recs, 'date-asc').map((r) => r.id), ['1', '2', '3']);
});
