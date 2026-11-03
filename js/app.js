// Side panel / pop-out window UI.
//
// Security rules followed throughout this file:
//  * No innerHTML / outerHTML / insertAdjacentHTML — user data is only ever set via textContent.
//  * Colors are applied with whitelisted CSS classes (see COLORS), never from data.
//  * All stored or imported data goes through schema.js before it is used.
//  * Host access for inserting is optional and requested only after an explicit click.

import {
  CLICK_ACTIONS, COLORS, LIMITS, LANGS, SORTS, THEMES, ImportError, buildExport, defaultLang,
  filterRecords, mergeImport, newId, parseImport, sanitizeName, sanitizeText, sortRecords,
} from './schema.js';
import {
  colorName, defaultCategoryName, formatCount, formatDate, locale, setLang, t,
} from './i18n.js';
import { loadState, onExternalChange, saveState } from './storage.js';
import { HOST_ACCESS, hasHostAccess, insertIntoActiveTab } from './inserter.js';

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

const $ = (id) => document.getElementById(id);
const SVG_NS = 'http://www.w3.org/2000/svg';
const ALLOWED_PROPS = new Set(['type', 'disabled', 'value', 'selected', 'tabIndex', 'title', 'dateTime']);

/** Creates an element. Only safe properties can be set; text goes through textContent. */
function h(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('aria-') || key.startsWith('data-') || key === 'role') node.setAttribute(key, String(value));
    else if (ALLOWED_PROPS.has(key)) node[key] = value;
    else throw new Error(`h(): property "${key}" is not allowed`);
  }
  for (const child of [].concat(children)) if (child) node.append(child);
  return node;
}

function icon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
}

function setColor(node, color) {
  for (const c of COLORS) node.classList.remove(`c-${c}`);
  node.classList.add(`c-${COLORS.includes(color) ? color : 'gray'}`);
}

const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
const modKey = (e) => (isMac ? e.metaKey : e.ctrlKey);
const WINDOW_MODE = document.documentElement.dataset.mode === 'window';
const darkQuery = matchMedia('(prefers-color-scheme: dark)');

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let data = null; // { categories, records, settings } — always normalized
const ui = {
  filter: 'all',
  query: '',
  composerCategory: null,
  newColor: COLORS[0],
  editingId: null,
  snack: { kind: null, items: [], onAction: null, timer: null },
  lastNormalWindowId: null,
  firstRender: true,
};

const el = {};
for (const id of [
  'mainView', 'settingsView', 'settingsBtn', 'backBtn', 'windowBtn', 'windowBtn2', 'dockBtn',
  'recordCount', 'toolbar', 'searchInput', 'clearSearchBtn', 'sortBtn', 'sortMenu', 'filters',
  'composerInput', 'composerCategory', 'composerDot', 'charCount', 'saveBtn',
  'recordList', 'emptyState', 'emptyTitle', 'emptyDesc',
  'themeControl', 'glassSwitch', 'clickControl', 'langControl', 'accessStatus', 'accessBtn',
  'categoryList', 'newCategoryInput', 'addCategoryBtn', 'swatches',
  'exportBtn', 'importBtn', 'importFile', 'versionLabel',
  'editDialog', 'editCancel', 'editDone', 'editCategory', 'editDot', 'editInput', 'editCount',
  'confirmDialog', 'confirmTitle', 'confirmMessage', 'confirmCancel', 'confirmOk',
  'toast', 'toastText', 'snackbar', 'snackText', 'snackBtn',
]) el[id] = $(id);

const categoryById = (id) => data.categories.find((c) => c.id === id);
const recordById = (id) => data.records.find((r) => r.id === id);

async function commit() {
  try {
    await saveState(data);
  } catch (err) {
    console.error('Record Manager: save failed', err);
    toast(t('saveFailed'), false);
  }
}

// ---------------------------------------------------------------------------
// Feedback: toast and snackbar
// ---------------------------------------------------------------------------

let toastTimer = null;
function toast(message, ok = true) {
  el.toastText.textContent = message;
  el.toast.querySelector('use').setAttribute('href', ok ? '#i-check' : '#i-xmark');
  el.toast.classList.toggle('error', !ok);
  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2000);
}

/** A bar with one action button: used for "Undo" and for "Allow inserting". */
function showSnack({ kind, text, action, onAction, timeout = 6000 }) {
  if (ui.snack.kind !== kind) ui.snack.items = [];
  ui.snack.kind = kind;
  ui.snack.onAction = onAction;
  el.snackText.textContent = text;
  el.snackBtn.textContent = action;
  el.snackbar.hidden = false;
  document.body.classList.add('has-snackbar');
  clearTimeout(ui.snack.timer);
  ui.snack.timer = setTimeout(hideSnack, timeout);
}

function hideSnack() {
  clearTimeout(ui.snack.timer);
  ui.snack = { kind: null, items: [], onAction: null, timer: null };
  el.snackbar.hidden = true;
  document.body.classList.remove('has-snackbar');
}

// ---------------------------------------------------------------------------
// Appearance
// ---------------------------------------------------------------------------

function applyAppearance() {
  const { theme, glass } = data.settings;
  const dark = theme === 'dark' || (theme === 'system' && darkQuery.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.dataset.glass = glass ? 'on' : 'off';
  try {
    localStorage.setItem('rm-theme', theme);
    localStorage.setItem('rm-glass', glass ? 'on' : 'off');
  } catch { /* ignore */ }
}

function applyTexts() {
  document.documentElement.lang = data.settings.lang;
  for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n);
  for (const node of document.querySelectorAll('[data-i18n-placeholder]')) node.placeholder = t(node.dataset.i18nPlaceholder);
  for (const node of document.querySelectorAll('[data-i18n-label]')) {
    const label = t(node.dataset.i18nLabel);
    node.setAttribute('aria-label', label);
    if (node.tagName === 'BUTTON') node.title = label;
  }
  el.versionLabel.textContent = t('version', { v: chrome.runtime.getManifest().version });
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function renderAll() {
  el.recordCount.textContent = formatCount(data.records.length);
  renderFilters();
  renderCategorySelect(el.composerCategory, el.composerDot, ui.composerCategory);
  renderList();
  renderSortMenu();
  renderSettings();
}

function renderFilters() {
  const chip = (id, label, color) => {
    const dot = color ? h('span', { class: 'dot' }) : null;
    if (dot) setColor(dot, color);
    return h('button', { class: 'chip', type: 'button', 'aria-pressed': ui.filter === id, 'data-id': id },
      [dot, h('span', { text: label })]);
  };
  el.filters.replaceChildren(chip('all', t('all')), ...data.categories.map((c) => chip(c.id, c.name, c.color)));
}

function renderCategorySelect(select, dot, selectedId) {
  select.replaceChildren(...data.categories.map((c) =>
    h('option', { value: c.id, text: c.name, selected: c.id === selectedId })));
  setColor(dot, categoryById(select.value)?.color);
}

function renderList() {
  const visible = sortRecords(
    filterRecords(data.records, data.categories, { filter: ui.filter, query: ui.query }),
    data.settings.sortBy,
    locale(),
  );

  if (!visible.length) {
    const noResults = data.records.length && (ui.query.trim() || ui.filter !== 'all');
    el.emptyTitle.textContent = t(noResults ? 'noResultsTitle' : 'emptyTitle');
    el.emptyDesc.textContent = t(noResults ? 'noResultsDesc' : 'emptyDesc');
  }
  el.emptyState.hidden = visible.length > 0;
  el.recordList.hidden = visible.length === 0;

  const now = new Date();
  el.recordList.classList.toggle('intro', ui.firstRender);
  el.recordList.replaceChildren(...visible.map((r) => renderCard(r, now)));
  if (ui.firstRender && visible.length) {
    ui.firstRender = false;
    setTimeout(() => el.recordList.classList.remove('intro'), 900);
  }
}

function renderCard(record, now) {
  const cat = categoryById(record.categoryId);
  const dot = h('span', { class: 'dot' });
  setColor(dot, cat?.color);
  const date = new Date(record.createdAt);
  const insertFirst = data.settings.clickAction === 'insert';
  const secondary = insertFirst ? { icon: 'copy', label: t('copy') } : { icon: 'insert', label: t('insert') };

  return h('li', { class: 'record glass', 'data-id': record.id }, [
    h('button', {
      class: 'record-main', type: 'button', 'data-action': 'primary', title: insertFirst ? t('insert') : t('copy'),
    }, h('span', { class: 'record-text', text: record.text })),
    h('div', { class: 'record-footer' }, [
      h('span', { class: 'tag' }, [dot, h('span', { text: cat?.name ?? '' })]),
      h('time', {
        class: 'record-date', dateTime: date.toISOString(), title: date.toLocaleString(locale()),
        text: formatDate(record.createdAt, now),
      }),
      h('div', { class: 'record-actions' }, [
        h('button', { class: 'action primary', type: 'button', 'data-action': 'secondary', 'aria-label': secondary.label, title: secondary.label }, icon(secondary.icon)),
        h('button', { class: 'action', type: 'button', 'data-action': 'edit', 'aria-label': t('edit'), title: t('edit') }, icon('pencil')),
        h('button', { class: 'action danger', type: 'button', 'data-action': 'delete', 'aria-label': t('delete'), title: t('delete') }, icon('trash')),
      ]),
    ]),
  ]);
}

function renderSortMenu() {
  for (const item of el.sortMenu.querySelectorAll('[data-sort]')) {
    item.setAttribute('aria-checked', String(item.dataset.sort === data.settings.sortBy));
  }
}

function renderSegmented(group, value) {
  for (const btn of group.querySelectorAll('[role="radio"]')) {
    const on = btn.dataset.value === value;
    btn.setAttribute('aria-checked', String(on));
    btn.tabIndex = on ? 0 : -1;
  }
}

function renderSettings() {
  renderSegmented(el.themeControl, data.settings.theme);
  renderSegmented(el.langControl, data.settings.lang);
  renderSegmented(el.clickControl, data.settings.clickAction);
  el.glassSwitch.setAttribute('aria-checked', String(data.settings.glass));

  el.categoryList.replaceChildren(...data.categories.map((c) => {
    const dot = h('span', { class: 'dot' });
    setColor(dot, c.color);
    const count = data.records.filter((r) => r.categoryId === c.id).length;
    return h('li', { class: 'cell', 'data-id': c.id }, [
      dot,
      h('span', { class: 'cell-label', text: c.name }),
      h('span', { class: 'cell-detail', text: String(count) }),
      h('button', {
        class: 'action danger', type: 'button', 'data-action': 'delete-category',
        'aria-label': `${t('delete')}: ${c.name}`, title: t('delete'), disabled: data.categories.length <= 1,
      }, icon('trash')),
    ]);
  }));

  el.swatches.replaceChildren(...COLORS.map((color) => {
    const on = color === ui.newColor;
    const btn = h('button', {
      class: 'swatch', type: 'button', role: 'radio', 'data-color': color,
      'aria-checked': on, 'aria-label': colorName(color), title: colorName(color), tabIndex: on ? 0 : -1,
    });
    setColor(btn, color);
    return btn;
  }));
  updateAddCategoryState();
  renderAccess();
}

async function renderAccess() {
  const granted = await hasHostAccess().catch(() => false);
  el.accessStatus.textContent = t(granted ? 'siteAccessOn' : 'siteAccessOff');
  el.accessBtn.textContent = t(granted ? 'revoke' : 'grant');
  el.accessBtn.classList.toggle('danger', granted);
  el.accessBtn.dataset.granted = String(granted);
}

function updateComposerState() {
  const len = el.composerInput.value.length;
  el.charCount.textContent = len > LIMITS.text * 0.8 ? `${len} / ${LIMITS.text}` : '';
  el.saveBtn.disabled = !el.composerInput.value.trim();
  autoGrow(el.composerInput, 180);
}

function updateAddCategoryState() {
  el.addCategoryBtn.disabled = !sanitizeName(el.newCategoryInput.value);
}

function autoGrow(textarea, max) {
  textarea.style.height = 'auto';
  textarea.style.height = `${Math.min(textarea.scrollHeight, max)}px`;
}

function updateToolbarEdge() {
  el.toolbar.classList.toggle('stuck', !el.mainView.hidden && window.scrollY > 4);
}

// ---------------------------------------------------------------------------
// Record actions
// ---------------------------------------------------------------------------

function addRecord() {
  const text = sanitizeText(el.composerInput.value);
  if (!text) return;
  if (data.records.length >= LIMITS.records) {
    toast(t('recordLimit'), false);
    return;
  }
  const now = Date.now();
  const categoryId = categoryById(el.composerCategory.value)?.id ?? data.categories[0].id;
  data.records.unshift({ id: newId(), text, categoryId, createdAt: now, updatedAt: now });
  el.composerInput.value = '';
  updateComposerState();
  renderAll();
  commit();
  toast(t('saved'));
}

function flashCard(id) {
  const card = el.recordList.querySelector(`.record[data-id="${CSS.escape(id)}"]`);
  if (!card) return;
  card.classList.remove('flash');
  void card.offsetWidth; // restart the animation
  card.classList.add('flash');
}

async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Record Manager: clipboard write failed', err);
    return false;
  }
}

async function copyRecord(id) {
  const record = recordById(id);
  if (!record) return;
  const ok = await writeClipboard(record.text);
  toast(t(ok ? 'copied' : 'copyFailed'), ok);
  if (ok) flashCard(id);
}

async function insertRecord(id) {
  const record = recordById(id);
  if (!record) return;
  const result = await insertIntoActiveTab(record.text);
  if (result === 'inserted') {
    toast(t('inserted'));
    flashCard(id);
    return;
  }

  // Fall back to the clipboard so the user can always paste.
  const copied = await writeClipboard(record.text);
  if (!copied) {
    toast(t('copyFailed'), false);
    return;
  }
  flashCard(id);
  if (result === 'no-field') {
    toast(t('noFieldCopied'));
  } else if (result === 'no-access' && !(await hasHostAccess().catch(() => true))) {
    showSnack({
      kind: 'access', text: t('needAccess'), action: t('allow'), timeout: 9000,
      onAction: () => requestAccess(record.text),
    });
  } else {
    toast(t('restrictedCopied'));
  }
}

/** Must be called directly from a click handler: the permission prompt needs a user gesture. */
function requestAccess(retryText) {
  chrome.permissions.request(HOST_ACCESS).then(async (granted) => {
    renderAccess();
    if (!granted || !retryText) return;
    const result = await insertIntoActiveTab(retryText);
    toast(t(result === 'inserted' ? 'inserted' : 'noFieldCopied'));
  }).catch((err) => console.error('Record Manager: permission request failed', err));
}

function primaryAction(id) {
  if (data.settings.clickAction === 'insert') insertRecord(id);
  else copyRecord(id);
}

function secondaryAction(id) {
  if (data.settings.clickAction === 'insert') copyRecord(id);
  else insertRecord(id);
}

function deleteRecord(id) {
  const index = data.records.findIndex((r) => r.id === id);
  if (index < 0) return;
  const [record] = data.records.splice(index, 1);
  const items = ui.snack.kind === 'undo' ? ui.snack.items : [];
  items.push({ record, index });
  renderAll();
  commit();
  showSnack({
    kind: 'undo',
    text: items.length === 1 ? t('deletedOne') : t('deletedMany', { n: items.length }),
    action: t('undo'),
    onAction: undoDelete,
  });
  ui.snack.items = items;
}

function undoDelete() {
  const items = ui.snack.items.slice().reverse();
  for (const { record, index } of items) {
    if (recordById(record.id)) continue;
    if (!categoryById(record.categoryId)) record.categoryId = data.categories[0].id;
    data.records.splice(Math.min(index, data.records.length), 0, record);
  }
  hideSnack();
  renderAll();
  commit();
}

function openEditor(id) {
  const record = recordById(id);
  if (!record) return;
  ui.editingId = id;
  el.editInput.value = record.text;
  renderCategorySelect(el.editCategory, el.editDot, record.categoryId);
  updateEditCount();
  el.editDialog.showModal();
  el.editInput.focus();
  el.editInput.setSelectionRange(el.editInput.value.length, el.editInput.value.length);
}

function updateEditCount() {
  el.editCount.textContent = `${el.editInput.value.length} / ${LIMITS.text}`;
  el.editDone.disabled = !el.editInput.value.trim();
}

function saveEditor() {
  const record = recordById(ui.editingId);
  const text = sanitizeText(el.editInput.value);
  if (!record || !text) return;
  record.text = text;
  record.categoryId = categoryById(el.editCategory.value)?.id ?? record.categoryId;
  record.updatedAt = Date.now();
  el.editDialog.close();
  renderAll();
  commit();
}

// ---------------------------------------------------------------------------
// Categories, data, settings
// ---------------------------------------------------------------------------

function addCategory() {
  const name = sanitizeName(el.newCategoryInput.value);
  if (!name) return;
  if (data.categories.length >= LIMITS.categories) {
    toast(t('categoryLimit'), false);
    return;
  }
  if (data.categories.some((c) => c.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
    toast(t('categoryExists'), false);
    return;
  }
  data.categories.push({ id: newId(), name, color: ui.newColor });
  el.newCategoryInput.value = '';
  ui.newColor = COLORS[data.categories.length % COLORS.length];
  renderAll();
  commit();
}

async function deleteCategory(id) {
  const cat = categoryById(id);
  if (!cat) return;
  if (data.categories.length <= 1) {
    toast(t('lastCategory'), false);
    return;
  }
  const target = data.categories.find((c) => c.id !== id);
  const count = data.records.filter((r) => r.categoryId === id).length;
  const ok = await confirmDialog(
    t('deleteCategoryTitle', { name: cat.name }),
    count ? t('deleteCategoryMoves', { n: count, target: target.name }) : t('deleteCategoryEmpty'),
  );
  if (!ok || !categoryById(id)) return;

  data.categories = data.categories.filter((c) => c.id !== id);
  for (const r of data.records) if (r.categoryId === id) r.categoryId = target.id;
  if (ui.filter === id) ui.filter = 'all';
  if (ui.composerCategory === id) ui.composerCategory = target.id;
  renderAll();
  commit();
}

function confirmDialog(title, message) {
  el.confirmTitle.textContent = title;
  el.confirmMessage.textContent = message;
  el.confirmDialog.returnValue = '';
  el.confirmDialog.showModal();
  el.confirmCancel.focus();
  return new Promise((resolve) => {
    el.confirmDialog.addEventListener('close', () => resolve(el.confirmDialog.returnValue === 'ok'), { once: true });
  });
}

function exportData() {
  const json = JSON.stringify(buildExport(data), null, 2);
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = h('a');
  a.href = url;
  a.download = `record-manager-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  toast(t('exported'));
}

async function importData(file) {
  if (!file) return;
  if (file.size > LIMITS.importBytes) {
    toast(t('importTooLarge'), false);
    return;
  }
  try {
    const incoming = parseImport(await file.text(), opts());
    const { state, added } = mergeImport(data, incoming);
    data = { ...state, settings: data.settings };
    renderAll();
    await commit();
    toast(t('imported', { n: added }));
  } catch (err) {
    if (!(err instanceof ImportError)) console.error('Record Manager: import failed', err);
    toast(t(err?.code === 'tooLarge' ? 'importTooLarge' : 'importError'), false);
  }
}

const SETTING_VALUES = { theme: THEMES, lang: LANGS, sortBy: SORTS, clickAction: CLICK_ACTIONS };

function setSetting(key, value) {
  if (key === 'glass') value = Boolean(value);
  else if (!SETTING_VALUES[key]?.includes(value)) return;
  data.settings[key] = value;
  if (key === 'theme' || key === 'glass') applyAppearance();
  if (key === 'lang') {
    setLang(value);
    applyTexts();
  }
  renderAll();
  commit();
}

function toggleAccess() {
  if (el.accessBtn.dataset.granted === 'true') {
    chrome.permissions.remove(HOST_ACCESS).then(renderAccess).catch(renderAccess);
  } else {
    requestAccess(null);
  }
}

// ---------------------------------------------------------------------------
// Views and windows
// ---------------------------------------------------------------------------

function showView(name) {
  const settings = name === 'settings';
  el.mainView.hidden = settings;
  el.settingsView.hidden = !settings;
  window.scrollTo(0, 0);
  updateToolbarEdge();
  (settings ? el.backBtn : el.settingsBtn).focus();
}

function toggleSortMenu(open = el.sortMenu.hidden) {
  el.sortMenu.hidden = !open;
  el.sortBtn.setAttribute('aria-expanded', String(open));
  if (open) el.sortMenu.querySelector('[aria-checked="true"]')?.focus();
}

function readBounds(raw) {
  const ok = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
  if (!raw || typeof raw !== 'object') return {};
  const b = {};
  if (ok(raw.width, 300, 4000)) b.width = raw.width;
  if (ok(raw.height, 400, 4000)) b.height = raw.height;
  if (ok(raw.left, -4000, 8000)) b.left = raw.left;
  if (ok(raw.top, -4000, 8000)) b.top = raw.top;
  return b;
}

async function openInWindow() {
  try {
    const { popupWindowId } = await chrome.storage.session.get('popupWindowId');
    if (Number.isInteger(popupWindowId)) {
      try {
        await chrome.windows.update(popupWindowId, { focused: true });
        window.close();
        return;
      } catch { /* the window is gone */ }
    }
    const { windowBounds } = await chrome.storage.local.get('windowBounds');
    const bounds = { width: 440, height: 760, ...readBounds(windowBounds) };
    const win = await chrome.windows.create({
      url: chrome.runtime.getURL('sidepanel.html?mode=window'), type: 'popup', focused: true, ...bounds,
    });
    await chrome.storage.session.set({ popupWindowId: win.id });
    window.close(); // closes the side panel
  } catch (err) {
    console.error('Record Manager: could not open window', err);
  }
}

function dockToPanel() {
  // Called synchronously from the click so the browser accepts it as a user gesture.
  if (!chrome.sidePanel?.open || ui.lastNormalWindowId === null) return;
  chrome.sidePanel.open({ windowId: ui.lastNormalWindowId })
    .then(() => window.close())
    .catch((err) => console.error('Record Manager: could not open side panel', err));
}

function setupWindowMode() {
  el.windowBtn.hidden = WINDOW_MODE;
  el.windowBtn2.closest('.group').hidden = WINDOW_MODE;
  el.dockBtn.hidden = !WINDOW_MODE || !chrome.sidePanel?.open;
  if (!WINDOW_MODE) return;

  const remember = async (id) => {
    try {
      const win = await chrome.windows.get(id);
      if (win.type === 'normal') ui.lastNormalWindowId = id;
    } catch { /* ignore */ }
  };
  chrome.windows.getLastFocused({ windowTypes: ['normal'] }).then((w) => { ui.lastNormalWindowId = w.id; }).catch(() => {});
  chrome.windows.onFocusChanged.addListener((id) => { if (id !== chrome.windows.WINDOW_ID_NONE) remember(id); });

  let timer;
  const saveBounds = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      chrome.storage.local.set({
        windowBounds: { width: window.outerWidth, height: window.outerHeight, left: window.screenX, top: window.screenY },
      });
    }, 400);
  };
  window.addEventListener('resize', saveBounds);
  window.addEventListener('pagehide', saveBounds);
}

/** Arrow-key navigation inside a role=radiogroup, as in native segmented controls. */
function radioKeys(group, onPick) {
  group.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
    const items = [...group.querySelectorAll('[role="radio"]')];
    const i = items.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    let next;
    if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    else next = (i + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length;
    onPick(items[next]);
    group.querySelector('[aria-checked="true"]')?.focus();
  });
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

function bindEvents() {
  el.settingsBtn.addEventListener('click', () => showView('settings'));
  el.backBtn.addEventListener('click', () => showView('main'));
  el.windowBtn.addEventListener('click', openInWindow);
  el.windowBtn2.addEventListener('click', openInWindow);
  el.dockBtn.addEventListener('click', dockToPanel);

  // Search
  let searchTimer;
  el.searchInput.addEventListener('input', () => {
    el.clearSearchBtn.hidden = !el.searchInput.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      ui.query = el.searchInput.value.slice(0, LIMITS.query);
      renderList();
    }, 120);
  });
  el.searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && el.searchInput.value) {
      e.stopPropagation();
      el.clearSearchBtn.click();
    }
  });
  el.clearSearchBtn.addEventListener('click', () => {
    el.searchInput.value = '';
    el.clearSearchBtn.hidden = true;
    ui.query = '';
    renderList();
    el.searchInput.focus();
  });

  // Sort menu
  el.sortBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSortMenu();
  });
  el.sortMenu.addEventListener('click', (e) => {
    const item = e.target.closest('[data-sort]');
    if (!item) return;
    toggleSortMenu(false);
    el.sortBtn.focus();
    setSetting('sortBy', item.dataset.sort);
  });
  el.sortMenu.addEventListener('keydown', (e) => {
    const items = [...el.sortMenu.querySelectorAll('[data-sort]')];
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      toggleSortMenu(false);
      el.sortBtn.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (!el.sortMenu.hidden && !el.sortMenu.contains(e.target)) toggleSortMenu(false);
  });

  // Filters
  el.filters.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const id = chip.dataset.id;
    ui.filter = id === 'all' || categoryById(id) ? id : 'all';
    if (ui.filter !== 'all') ui.composerCategory = ui.filter;
    renderAll();
  });

  // Composer
  el.composerInput.addEventListener('input', updateComposerState);
  el.composerCategory.addEventListener('change', () => {
    ui.composerCategory = el.composerCategory.value;
    setColor(el.composerDot, categoryById(ui.composerCategory)?.color);
  });
  el.saveBtn.addEventListener('click', addRecord);
  el.composerInput.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key.toLowerCase() === 's') && modKey(e)) {
      e.preventDefault();
      addRecord();
    }
  });

  // Record grid (event delegation)
  el.recordList.addEventListener('click', (e) => {
    const button = e.target.closest('[data-action]');
    const card = e.target.closest('.record');
    if (!button || !card) return;
    const id = card.dataset.id;
    const action = button.dataset.action;
    if (action === 'primary') primaryAction(id);
    else if (action === 'secondary') secondaryAction(id);
    else if (action === 'edit') openEditor(id);
    else if (action === 'delete') deleteRecord(id);
  });

  el.snackBtn.addEventListener('click', () => {
    const action = ui.snack.onAction;
    if (ui.snack.kind !== 'undo') hideSnack();
    action?.();
  });

  // Editor sheet
  el.editInput.addEventListener('input', updateEditCount);
  el.editCategory.addEventListener('change', () => setColor(el.editDot, categoryById(el.editCategory.value)?.color));
  el.editCancel.addEventListener('click', () => el.editDialog.close());
  el.editDone.addEventListener('click', saveEditor);
  el.editDialog.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key.toLowerCase() === 's') && modKey(e)) {
      e.preventDefault();
      saveEditor();
    }
  });
  el.editDialog.addEventListener('click', (e) => { if (e.target === el.editDialog) el.editDialog.close(); });
  el.editDialog.addEventListener('close', () => { ui.editingId = null; });

  // Confirm alert
  el.confirmCancel.addEventListener('click', () => el.confirmDialog.close('cancel'));
  el.confirmOk.addEventListener('click', () => el.confirmDialog.close('ok'));
  el.confirmDialog.addEventListener('cancel', () => { el.confirmDialog.returnValue = 'cancel'; });

  // Settings
  const segmented = (group, key) => {
    const pick = (btn) => btn?.dataset.value && setSetting(key, btn.dataset.value);
    group.addEventListener('click', (e) => pick(e.target.closest('[role="radio"]')));
    radioKeys(group, pick);
  };
  segmented(el.themeControl, 'theme');
  segmented(el.langControl, 'lang');
  segmented(el.clickControl, 'clickAction');
  el.glassSwitch.addEventListener('click', () => setSetting('glass', !data.settings.glass));
  el.accessBtn.addEventListener('click', toggleAccess);
  chrome.permissions.onAdded.addListener(renderAccess);
  chrome.permissions.onRemoved.addListener(renderAccess);

  const pickColor = (btn) => {
    if (!btn || !COLORS.includes(btn.dataset.color)) return;
    ui.newColor = btn.dataset.color;
    renderSettings();
  };
  el.swatches.addEventListener('click', (e) => pickColor(e.target.closest('.swatch')));
  radioKeys(el.swatches, pickColor);

  el.newCategoryInput.addEventListener('input', updateAddCategoryState);
  el.newCategoryInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCategory();
    }
  });
  el.addCategoryBtn.addEventListener('click', addCategory);
  el.categoryList.addEventListener('click', (e) => {
    const button = e.target.closest('[data-action="delete-category"]');
    if (button) deleteCategory(button.closest('.cell').dataset.id);
  });

  el.exportBtn.addEventListener('click', exportData);
  el.importBtn.addEventListener('click', () => el.importFile.click());
  el.importFile.addEventListener('change', () => {
    importData(el.importFile.files[0]);
    el.importFile.value = '';
  });

  // Global shortcuts
  document.addEventListener('keydown', (e) => {
    if (document.querySelector('dialog[open]')) return;
    if (modKey(e) && e.key.toLowerCase() === 'f' && !el.mainView.hidden) {
      e.preventDefault();
      el.searchInput.focus();
      el.searchInput.select();
    } else if (e.key === 'Escape' && !el.settingsView.hidden) {
      showView('main');
    }
  });

  window.addEventListener('scroll', updateToolbarEdge, { passive: true });
  darkQuery.addEventListener('change', applyAppearance);

  // Keep several open panels (one per window, plus the pop-out) in sync.
  onExternalChange(async () => {
    const fresh = await loadState(opts());
    if (JSON.stringify(fresh) === JSON.stringify(data)) return;
    const langChanged = fresh.settings.lang !== data.settings.lang;
    data = fresh;
    if (!categoryById(ui.composerCategory)) ui.composerCategory = data.categories[0].id;
    if (ui.filter !== 'all' && !categoryById(ui.filter)) ui.filter = 'all';
    applyAppearance();
    if (langChanged) {
      setLang(data.settings.lang);
      applyTexts();
    }
    renderAll();
  });
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

function opts() {
  const lang = data?.settings.lang ?? defaultLang(navigator.language);
  return { lang, defaultCategoryName: defaultCategoryName(lang) };
}

async function init() {
  data = await loadState(opts());
  ui.composerCategory = data.categories[0].id;
  ui.newColor = COLORS[data.categories.length % COLORS.length];
  setLang(data.settings.lang);
  applyAppearance();
  applyTexts();
  setupWindowMode();
  bindEvents();
  renderAll();
  updateComposerState();
  document.body.classList.add('ready');
}

init().catch((err) => {
  console.error('Record Manager: failed to start', err);
  document.body.classList.add('ready');
});
