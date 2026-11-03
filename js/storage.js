// chrome.storage wrapper. Reads always go through schema normalization;
// writes are serialized so two quick changes can never land out of order.

import {
  SCHEMA_VERSION, LEGACY_KEYS, STORAGE_KEYS, migrateLegacy, normalizeState, toStorage,
} from './schema.js';

const area = chrome.storage.local;
// Identifies writes made by this panel so we can ignore our own change events.
const SESSION = crypto.randomUUID();
let revision = 0;
let writeQueue = Promise.resolve();

export async function loadState(opts) {
  const raw = await area.get(null);

  if (raw.schemaVersion === SCHEMA_VERSION) {
    return normalizeState(raw, opts);
  }

  // First run of v2: migrate data left by v1 (or start fresh).
  const state = migrateLegacy(raw, opts);
  const hasLegacy = Array.isArray(raw.prompts) || Array.isArray(raw.categories);
  const payload = toStorage(state);
  if (hasLegacy && !raw.legacyBackupV1) {
    // Keep an untouched copy of the old data, just in case.
    const backup = {};
    for (const key of LEGACY_KEYS) if (key in raw) backup[key] = raw[key];
    payload.legacyBackupV1 = backup;
  }
  await area.set(payload);
  await area.remove(LEGACY_KEYS.filter((k) => !STORAGE_KEYS.includes(k)));
  return state;
}

export function saveState(state) {
  const payload = { ...toStorage(state), writer: { id: SESSION, rev: ++revision } };
  writeQueue = writeQueue.catch(() => {}).then(() => area.set(payload));
  return writeQueue;
}

/** Calls `callback` when another panel (e.g. in another window) changes the data. */
export function onExternalChange(callback) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    if (changes.writer?.newValue?.id === SESSION) return;
    if (STORAGE_KEYS.some((k) => k in changes)) callback();
  });
}
