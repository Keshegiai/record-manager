// Background service worker: side panel behavior and the right-click menu.

import { LIMITS, defaultLang, newId, sanitizeText, sortRecords } from './js/schema.js';
import { defaultCategoryName, locale, setLang, t } from './js/i18n.js';
import { loadState, saveState } from './js/storage.js';
import { insertIntoTab, readSelection } from './js/inserter.js';

const MAX_PER_GROUP = 15;
const MAX_TITLE = 48;

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error('Record Manager: setPanelBehavior failed', err));

function opts() {
  const lang = defaultLang(navigator.language);
  return { lang, defaultCategoryName: defaultCategoryName(lang) };
}

/** Menu labels come from user data: keep them short, single-line and free of the %s placeholder. */
function menuTitle(text) {
  const line = text.replace(/\s+/g, ' ').trim().replace(/%/g, '％');
  return line.length > MAX_TITLE ? `${line.slice(0, MAX_TITLE - 1)}…` : line;
}

// ---------------------------------------------------------------------------
// Menu construction
// ---------------------------------------------------------------------------

let rebuildChain = Promise.resolve();
let rebuildTimer = null;

function scheduleRebuild(delay = 250) {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    rebuildChain = rebuildChain.then(buildMenus).catch((err) => console.error('Record Manager: menu build failed', err));
  }, delay);
}

async function buildMenus() {
  const state = await loadState(opts());
  setLang(state.settings.lang);
  await chrome.contextMenus.removeAll();

  const create = (props) => new Promise((resolve) => {
    chrome.contextMenus.create(props, () => {
      void chrome.runtime.lastError; // ignore duplicate-id races
      resolve();
    });
  });

  // Save selection
  if (state.categories.length === 1) {
    await create({ id: `save:${state.categories[0].id}`, title: t('menuSave'), contexts: ['selection'] });
  } else {
    await create({ id: 'save', title: t('menuSaveTo'), contexts: ['selection'] });
    for (const c of state.categories) {
      await create({ id: `save:${c.id}`, parentId: 'save', title: menuTitle(c.name), contexts: ['selection'] });
    }
  }

  // Insert record
  await create({ id: 'insert', title: t('menuInsert'), contexts: ['editable'] });
  const sorted = sortRecords(state.records, state.settings.sortBy, locale());
  if (!sorted.length) {
    await create({ id: 'insert-empty', parentId: 'insert', title: t('menuEmpty'), enabled: false, contexts: ['editable'] });
    return;
  }
  const groups = state.categories
    .map((c) => ({ c, items: sorted.filter((r) => r.categoryId === c.id).slice(0, MAX_PER_GROUP) }))
    .filter((g) => g.items.length);

  if (groups.length === 1) {
    for (const r of groups[0].items) {
      await create({ id: `ins:${r.id}`, parentId: 'insert', title: menuTitle(r.text), contexts: ['editable'] });
    }
    return;
  }
  for (const { c, items } of groups) {
    const groupId = `grp:${c.id}`;
    await create({ id: groupId, parentId: 'insert', title: menuTitle(c.name), contexts: ['editable'] });
    for (const r of items) {
      await create({ id: `ins:${r.id}`, parentId: groupId, title: menuTitle(r.text), contexts: ['editable'] });
    }
  }
}

chrome.runtime.onInstalled.addListener(() => scheduleRebuild(0));
chrome.runtime.onStartup.addListener(() => scheduleRebuild(0));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && ('records' in changes || 'categories' in changes || 'settings' in changes)) scheduleRebuild();
});

// ---------------------------------------------------------------------------
// Menu actions
// ---------------------------------------------------------------------------

async function flashBadge(tabId, ok) {
  try {
    await chrome.action.setBadgeBackgroundColor({ color: ok ? '#34C759' : '#FF3B30', tabId });
    await chrome.action.setBadgeText({ text: ok ? '✓' : '!', tabId });
    setTimeout(() => chrome.action.setBadgeText({ text: '', tabId }).catch(() => {}), 1800);
  } catch { /* the tab may be gone */ }
}

async function saveSelection(categoryId, info, tab) {
  // Prefer reading the selection from the page (keeps line breaks); the menu click grants activeTab.
  const fromPage = tab?.id ? await readSelection(tab.id, info.frameId ?? 0) : '';
  const text = sanitizeText(fromPage || info.selectionText || '');
  if (!text) return false;

  const state = await loadState(opts());
  if (state.records.length >= LIMITS.records) return false;
  const category = state.categories.find((c) => c.id === categoryId) ?? state.categories[0];
  const now = Date.now();
  state.records.unshift({ id: newId(), text, categoryId: category.id, createdAt: now, updatedAt: now });
  await saveState(state);
  return true;
}

async function insertRecord(recordId, info, tab) {
  if (!tab?.id) return false;
  const state = await loadState(opts());
  const record = state.records.find((r) => r.id === recordId);
  if (!record) return false;
  return (await insertIntoTab(tab.id, record.text, info.frameId ?? 0)) === 'inserted';
}

async function handleMenuClick(info, tab) {
  const id = String(info.menuItemId);
  let ok = false;
  if (id.startsWith('save:')) ok = await saveSelection(id.slice(5), info, tab);
  else if (id.startsWith('ins:')) ok = await insertRecord(id.slice(4), info, tab);
  else return;
  if (tab?.id) flashBadge(tab.id, ok);
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  handleMenuClick(info, tab).catch((err) => console.error('Record Manager: menu action failed', err));
});

// Exposed on the worker's own global so automated tests can drive menu actions.
// Web pages cannot reach the service worker scope.
globalThis.__recordManager = { handleMenuClick, buildMenus };
