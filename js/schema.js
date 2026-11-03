// Data model, validation and migration.
//
// Every piece of data that enters the app — from chrome.storage, from an
// imported file, or from the UI — passes through the sanitizers in this file.
// Nothing outside this module trusts the shape of stored data.
//
// This module is pure (no DOM, no chrome.* APIs) so it can be unit-tested in Node.

export const SCHEMA_VERSION = 2;

export const LIMITS = Object.freeze({
  text: 20000,          // characters per record
  records: 5000,        // records in total
  categories: 50,       // categories in total
  categoryName: 32,     // characters per category name
  importBytes: 5 * 1024 * 1024,
  query: 200,
});

export const COLORS = Object.freeze([
  'blue', 'green', 'indigo', 'orange', 'pink', 'purple', 'red', 'teal', 'yellow', 'gray',
]);
export const THEMES = Object.freeze(['system', 'light', 'dark']);
export const LANGS = Object.freeze(['ru', 'kk', 'en']);
export const SORTS = Object.freeze(['date-desc', 'date-asc', 'alpha-asc', 'alpha-desc']);
export const CLICK_ACTIONS = Object.freeze(['insert', 'copy']);

export const STORAGE_KEYS = Object.freeze(['schemaVersion', 'categories', 'records', 'settings']);
export const LEGACY_KEYS = Object.freeze(['prompts', 'categories', 'theme', 'lang', 'sortBy']);

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const HEX_RE = /^#?([0-9a-f]{6})$/i;

// C0/C1 control characters except tab, newline and carriage return.
const TEXT_CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
// For single-line labels: all control characters, zero-width characters and
// bidirectional overrides/isolates (prevents "Trojan Source"-style spoofing).
const NAME_UNSAFE_RE = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\u2060-\u2069\uFEFF]/g;

// Colors used by version 1 of the extension, mapped to the new palette.
const LEGACY_HEX = Object.freeze({
  '3b82f6': 'blue', '10b981': 'green', 'f59e0b': 'orange', 'ef4444': 'red',
  '8b5cf6': 'purple', 'ec4899': 'pink', '06b6d4': 'teal', '84cc16': 'green',
});
const PALETTE_RGB = Object.freeze({
  blue: [0, 122, 255], green: [52, 199, 89], indigo: [88, 86, 214], orange: [255, 149, 0],
  pink: [255, 45, 85], purple: [175, 82, 222], red: [255, 59, 48], teal: [48, 176, 199],
  yellow: [255, 204, 0], gray: [142, 142, 147],
});
// Category names version 1 used for the "All" pseudo-category.
const LEGACY_ALL_NAMES = new Set(['Общее', 'All', 'Все', 'Барлығы']);

export class ImportError extends Error {
  constructor(code) {
    super(code);
    this.name = 'ImportError';
    this.code = code;
  }
}

export function newId() {
  return globalThis.crypto.randomUUID();
}

const isPlainObject = (v) =>
  v !== null && typeof v === 'object' && !Array.isArray(v) &&
  (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);

// ---------------------------------------------------------------------------
// Field sanitizers. Each returns a clean value or null when the input is unusable.
// ---------------------------------------------------------------------------

export function sanitizeText(value) {
  if (typeof value !== 'string') return null;
  const text = value
    .replace(/\r\n?/g, '\n')
    .replace(TEXT_CONTROL_RE, '')
    .trim()
    .slice(0, LIMITS.text);
  return text.length ? text : null;
}

export function sanitizeName(value) {
  if (typeof value !== 'string') return null;
  const name = value
    .replace(NAME_UNSAFE_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Slice by code points so a surrogate pair (emoji) is never cut in half.
  const clipped = Array.from(name).slice(0, LIMITS.categoryName).join('').trim();
  return clipped.length ? clipped : null;
}

export function sanitizeId(value) {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return String(value);
  if (typeof value === 'string' && ID_RE.test(value)) return value;
  return null;
}

export function sanitizeColor(value) {
  if (typeof value !== 'string') return null;
  if (COLORS.includes(value)) return value;
  const hex = HEX_RE.exec(value.trim());
  if (!hex) return null;
  const key = hex[1].toLowerCase();
  if (LEGACY_HEX[key]) return LEGACY_HEX[key];
  return nearestColor(key);
}

function nearestColor(hex) {
  const rgb = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  let best = 'blue';
  let bestDist = Infinity;
  for (const [name, ref] of Object.entries(PALETTE_RGB)) {
    const d = (rgb[0] - ref[0]) ** 2 + (rgb[1] - ref[1]) ** 2 + (rgb[2] - ref[2]) ** 2;
    if (d < bestDist) { bestDist = d; best = name; }
  }
  return best;
}

export function sanitizeTimestamp(value, fallback) {
  // Accept anything from 2000-01-01 up to one day in the future.
  const max = Date.now() + 86400000;
  if (typeof value === 'number' && Number.isFinite(value) && value >= 946684800000 && value <= max) {
    return Math.floor(value);
  }
  return fallback;
}

const pick = (list, value, fallback) => (list.includes(value) ? value : fallback);

export function defaultLang(navigatorLanguage = '') {
  const l = String(navigatorLanguage).toLowerCase();
  if (l.startsWith('ru')) return 'ru';
  if (l.startsWith('kk')) return 'kk';
  return 'en';
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

function normalizeCategories(list) {
  const out = [];
  const ids = new Set();
  const names = new Set();
  if (!Array.isArray(list)) return out;
  for (const raw of list) {
    if (out.length >= LIMITS.categories) break;
    if (!isPlainObject(raw)) continue;
    const name = sanitizeName(raw.name);
    if (!name) continue;
    const nameKey = name.toLocaleLowerCase();
    if (names.has(nameKey)) continue;
    let id = sanitizeId(raw.id);
    if (!id || ids.has(id)) id = newId();
    ids.add(id);
    names.add(nameKey);
    out.push({ id, name, color: sanitizeColor(raw.color) ?? COLORS[out.length % COLORS.length] });
  }
  return out;
}

function normalizeRecords(list, categoryIds, fallbackCategoryId) {
  const out = [];
  const ids = new Set();
  if (!Array.isArray(list)) return out;
  const now = Date.now();
  for (const raw of list) {
    if (out.length >= LIMITS.records) break;
    if (!isPlainObject(raw)) continue;
    const text = sanitizeText(raw.text);
    if (!text) continue;
    let id = sanitizeId(raw.id);
    if (!id || ids.has(id)) id = newId();
    ids.add(id);
    const createdAt = sanitizeTimestamp(raw.createdAt, now);
    const categoryId = categoryIds.has(raw.categoryId) ? raw.categoryId : fallbackCategoryId;
    out.push({
      id,
      text,
      categoryId,
      createdAt,
      updatedAt: Math.max(createdAt, sanitizeTimestamp(raw.updatedAt, createdAt)),
    });
  }
  return out;
}

function normalizeSettings(raw, opts) {
  const s = isPlainObject(raw) ? raw : {};
  return {
    theme: pick(THEMES, s.theme, 'system'),
    lang: pick(LANGS, s.lang, opts.lang ?? 'en'),
    sortBy: pick(SORTS, s.sortBy, 'date-desc'),
    clickAction: pick(CLICK_ACTIONS, s.clickAction, 'insert'),
    glass: typeof s.glass === 'boolean' ? s.glass : true,
  };
}

function ensureCategory(categories, opts) {
  if (categories.length) return categories;
  return [{ id: newId(), name: sanitizeName(opts.defaultCategoryName) ?? 'Personal', color: 'blue' }];
}

// ---------------------------------------------------------------------------
// Whole-state operations
// ---------------------------------------------------------------------------

/** Normalizes data stored in the current (v2) format. */
export function normalizeState(raw, opts = {}) {
  const src = isPlainObject(raw) ? raw : {};
  const categories = ensureCategory(normalizeCategories(src.categories), opts);
  const ids = new Set(categories.map((c) => c.id));
  return {
    categories,
    records: normalizeRecords(src.records, ids, categories[0].id),
    settings: normalizeSettings(src.settings, opts),
  };
}

/** Converts data saved by version 1 of the extension (or nothing at all) into the v2 shape. */
export function migrateLegacy(raw, opts = {}) {
  const src = isPlainObject(raw) ? raw : {};

  const legacyCats = Array.isArray(src.categories) ? src.categories : [];
  const catInput = legacyCats
    .map((c, i) => (typeof c === 'string'
      ? { name: c, color: COLORS[i % COLORS.length] }
      : isPlainObject(c) ? { name: c.name, color: c.color } : null))
    .filter((c) => c && !LEGACY_ALL_NAMES.has(c.name));

  const categories = normalizeCategories(catInput);
  const byName = new Map(categories.map((c) => [c.name.toLocaleLowerCase(), c.id]));

  // Version 1 linked records to categories by name. Recreate any category a
  // record still points to so no record silently changes its category.
  const records = [];
  for (const p of Array.isArray(src.prompts) ? src.prompts : []) {
    if (!isPlainObject(p)) continue;
    const name = sanitizeName(p.category);
    let categoryId;
    if (name) {
      const key = name.toLocaleLowerCase();
      if (!byName.has(key) && categories.length < LIMITS.categories) {
        const cat = { id: newId(), name, color: COLORS[categories.length % COLORS.length] };
        categories.push(cat);
        byName.set(key, cat.id);
      }
      categoryId = byName.get(key);
    }
    records.push({ id: p.id, text: p.text, categoryId, createdAt: p.createdAt ?? p.id });
  }

  const finalCats = ensureCategory(categories, opts);
  const ids = new Set(finalCats.map((c) => c.id));
  return {
    categories: finalCats,
    records: normalizeRecords(records, ids, finalCats[0].id),
    settings: normalizeSettings({ theme: src.theme, lang: src.lang, sortBy: src.sortBy }, opts),
  };
}

export function toStorage(state) {
  return {
    schemaVersion: SCHEMA_VERSION,
    categories: state.categories,
    records: state.records,
    settings: state.settings,
  };
}

// ---------------------------------------------------------------------------
// Import / export
// ---------------------------------------------------------------------------

export function buildExport(state, now = new Date()) {
  return {
    app: 'record-manager',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    categories: state.categories,
    records: state.records,
  };
}

/** Parses an import file (v2 export or v1 backup). Throws ImportError on bad input. */
export function parseImport(text, opts = {}) {
  if (typeof text !== 'string') throw new ImportError('invalid');
  if (text.length > LIMITS.importBytes) throw new ImportError('tooLarge');
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError('invalid');
  }
  if (!isPlainObject(data)) throw new ImportError('invalid');

  let parsed;
  if (Array.isArray(data.records)) {
    parsed = normalizeState({ categories: data.categories, records: data.records }, opts);
  } else if (Array.isArray(data.prompts)) {
    parsed = migrateLegacy({ categories: data.categories, prompts: data.prompts }, opts);
  } else {
    throw new ImportError('invalid');
  }
  return { categories: parsed.categories, records: parsed.records };
}

/**
 * Merges imported data into the current state without overwriting anything.
 * Categories are matched by name, duplicate records (same id, or same text in
 * the same category) are skipped. Returns a new state and the number of added records.
 */
export function mergeImport(current, incoming) {
  const categories = current.categories.map((c) => ({ ...c }));
  const byName = new Map(categories.map((c) => [c.name.toLocaleLowerCase(), c.id]));
  const catIds = new Set(categories.map((c) => c.id));
  const idMap = new Map();

  for (const cat of incoming.categories) {
    const key = cat.name.toLocaleLowerCase();
    if (byName.has(key)) {
      idMap.set(cat.id, byName.get(key));
    } else if (categories.length < LIMITS.categories) {
      const id = catIds.has(cat.id) ? newId() : cat.id;
      categories.push({ id, name: cat.name, color: cat.color });
      byName.set(key, id);
      catIds.add(id);
      idMap.set(cat.id, id);
    } else {
      idMap.set(cat.id, categories[0].id);
    }
  }

  const records = current.records.slice();
  const recIds = new Set(records.map((r) => r.id));
  const seen = new Set(records.map((r) => `${r.categoryId}\u0000${r.text}`));
  let added = 0;

  for (const rec of incoming.records) {
    if (records.length >= LIMITS.records) break;
    if (recIds.has(rec.id)) continue;
    const categoryId = idMap.get(rec.categoryId) ?? categories[0].id;
    const key = `${categoryId}\u0000${rec.text}`;
    if (seen.has(key)) continue;
    records.push({ ...rec, categoryId });
    recIds.add(rec.id);
    seen.add(key);
    added++;
  }

  return { state: { ...current, categories, records }, added };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function filterRecords(records, categories, { filter = 'all', query = '' } = {}) {
  const q = query.trim().toLocaleLowerCase();
  const names = new Map(categories.map((c) => [c.id, c.name.toLocaleLowerCase()]));
  return records.filter((r) => {
    if (filter !== 'all' && r.categoryId !== filter) return false;
    if (!q) return true;
    return r.text.toLocaleLowerCase().includes(q) || (names.get(r.categoryId) ?? '').includes(q);
  });
}

export function sortRecords(records, sortBy, locale = 'en') {
  const sorted = records.slice();
  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });
  switch (sortBy) {
    case 'date-asc': return sorted.sort((a, b) => a.createdAt - b.createdAt);
    case 'alpha-asc': return sorted.sort((a, b) => collator.compare(a.text, b.text));
    case 'alpha-desc': return sorted.sort((a, b) => collator.compare(b.text, a.text));
    case 'date-desc':
    default: return sorted.sort((a, b) => b.createdAt - a.createdAt);
  }
}
