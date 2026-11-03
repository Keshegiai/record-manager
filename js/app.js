// Side panel UI.
//
// Security rules followed throughout this file:
//  * No innerHTML / outerHTML / insertAdjacentHTML — user data is only ever set via textContent.
//  * No inline styles — colors are applied with whitelisted CSS classes (see COLORS).
//  * All stored or imported data goes through schema.js before it is used.

import {
  COLORS, LIMITS, SORTS, ImportError, buildExport, defaultLang, filterRecords, mergeImport,
  newId, parseImport, sanitizeName, sanitizeText, sortRecords,
} from './schema.js';
import {
  colorName, defaultCategoryName, formatCount, formatDate, locale, setLang, t,
} from './i18n.js';
import { loadState, onExternalChange, saveState } from './storage.js';

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
    else if (key === 'on') for (const [ev, fn] of Object.entries(value)) node.addEventListener(ev, fn);
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

/** Applies one of the whitelisted color classes (c-blue, c-green, ...) to an element. */
function setColor(node, color) {
  for (const c of COLORS) node.classList.remove(`c-${c}`);
  node.classList.add(`c-${COLORS.includes(color) ? color : 'gray'}`);
}

const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
const modKey = (e) => (isMac ? e.metaKey : e.ctrlKey);

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
  undo: { items: [], timer: null },
};

const el = {
  mainView: $('mainView'), settingsView: $('settingsView'),
  settingsBtn: $('settingsBtn'), backBtn: $('backBtn'),
  recordCount: $('recordCount'),
  toolbar: $('toolbar'),
  searchInput: $('searchInput'), clearSearchBtn: $('clearSearchBtn'),
  sortBtn: $('sortBtn'), sortMenu: $('sortMenu'),
  filters: $('filters'),
  composerInput: $('composerInput'), composerCategory: $('composerCategory'), composerDot: $('composerDot'),
  charCount: $('charCount'), saveBtn: $('saveBtn'),
  recordList: $('recordList'), emptyState: $('emptyState'), emptyTitle: $('emptyTitle'), emptyDesc: $('emptyDesc'),
  themeControl: $('themeControl'), langControl: $('langControl'),
  categoryList: $('categoryList'), newCategoryInput: $('newCategoryInput'), addCategoryBtn: $('addCategoryBtn'),
  swatches: $('swatches'),
  exportBtn: $('exportBtn'), importBtn: $('importBtn'), importFile: $('importFile'),
  versionLabel: $('versionLabel'),
  editDialog: $('editDialog'), editCancel: $('editCancel'), editDone: $('editDone'),
  editCategory: $('editCategory'), editDot: $('editDot'), editInput: $('editInput'), editCount: $('editCount'),
  confirmDialog: $('confirmDialog'), confirmTitle: $('confirmTitle'), confirmMessage: $('confirmMessage'),
  confirmCancel: $('confirmCancel'), confirmOk: $('confirmOk'),
  toast: $('toast'), toastText: $('toastText'),
  undoBar: $('undoBar'), undoText: $('undoText'), undoBtn: $('undoBtn'),
};

const categoryById = (id) => data.categories.find((c) => c.id === id);

async function commit() {
  try {
    await saveState(data);
  } catch (err) {
    console.error('Record Manager: save failed', err);
    toast(t('saveFailed'), false);
  }
}

// ---------------------------------------------------------------------------
// Feedback: toast and undo bar
// ---------------------------------------------------------------------------

let toastTimer = null;
function toast(message, ok = true) {
  el.toastText.textContent = message;
  el.toast.querySelector('use').setAttribute('href', ok ? '#i-check' : '#i-xmark');
  el.toast.classList.toggle('error', !ok);
  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), 1800);
}

function showUndo() {
  const n = ui.undo.items.length;
  el.undoText.textContent = n === 1 ? t('deletedOne') : t('deletedMany', { n });
  el.undoBar.hidden = false;
  document.body.classList.add('has-snackbar');
  clearTimeout(ui.undo.timer);
  ui.undo.timer = setTimeout(hideUndo, 6000);
}

function hideUndo() {
  clearTimeout(ui.undo.timer);
  ui.undo.items = [];
  el.undoBar.hidden = true;
  document.body.classList.remove('has-snackbar');
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function applyTheme() {
  const theme = data.settings.theme;
  if (theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('rm-theme', theme); } catch { /* ignore */ }
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

function renderAll() {
  renderHeader();
  renderFilters();
  renderCategorySelect(el.composerCategory, el.composerDot, ui.composerCategory);
  renderList();
  renderSortMenu();
  renderSettings();
}

function renderHeader() {
  el.recordCount.textContent = formatCount(data.records.length);
}

function renderFilters() {
  const chip = (id, label, color) => {
    const pressed = ui.filter === id;
    const dot = color ? h('span', { class: 'dot' }) : null;
    if (dot) setColor(dot, color);
    return h('button', {
      class: 'chip', type: 'button', 'aria-pressed': pressed, 'data-id': id,
    }, [dot, h('span', { text: label })]);
  };
  el.filters.replaceChildren(
    chip('all', t('all')),
    ...data.categories.map((c) => chip(c.id, c.name, c.color)),
  );
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
    const searching = ui.query.trim() || ui.filter !== 'all';
    el.emptyTitle.textContent = t(searching && data.records.length ? 'noResultsTitle' : 'emptyTitle');
    el.emptyDesc.textContent = t(searching && data.records.length ? 'noResultsDesc' : 'emptyDesc');
  }
  el.emptyState.hidden = visible.length > 0;
  el.recordList.hidden = visible.length === 0;

  const now = new Date();
  el.recordList.replaceChildren(...visible.map((r) => renderRow(r, now)));
}

function renderRow(record, now) {
  const cat = categoryById(record.categoryId);
  const dot = h('span', { class: 'dot' });
  setColor(dot, cat?.color);
  const date = new Date(record.createdAt);

  return h('li', { class: 'row', 'data-id': record.id }, [
    h('button', { class: 'row-main', type: 'button', 'data-action': 'copy', title: t('copy') }, [
      h('span', { class: 'row-text', text: record.text }),
      h('span', { class: 'row-meta' }, [
        dot,
        h('span', { class: 'row-category', text: cat?.name ?? '' }),
        h('span', { 'aria-hidden': 'true', text: '·' }),
        h('time', { dateTime: date.toISOString(), title: date.toLocaleString(locale()), text: formatDate(record.createdAt, now) }),
      ]),
    ]),
    h('div', { class: 'row-actions' }, [
      h('button', { class: 'action', type: 'button', 'data-action': 'edit', 'aria-label': t('edit'), title: t('edit') }, icon('pencil')),
      h('button', { class: 'action danger', type: 'button', 'data-action': 'delete', 'aria-label': t('delete'), title: t('delete') }, icon('trash')),
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
        'aria-label': `${t('delete')}: ${c.name}`, title: t('delete'),
        disabled: data.categories.length <= 1,
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
}

function updateComposerState() {
  const len = el.composerInput.value.length;
  el.charCount.textContent = len > LIMITS.text * 0.8 ? `${len} / ${LIMITS.text}` : len ? String(len) : '';
  el.saveBtn.disabled = !el.composerInput.value.trim();
  autoGrow(el.composerInput, 260);
}

function updateAddCategoryState() {
  el.addCategoryBtn.disabled = !sanitizeName(el.newCategoryInput.value);
}

function autoGrow(textarea, max) {
  textarea.style.height = 'auto';
  textarea.style.height = `${Math.min(textarea.scrollHeight, max)}px`;
}

// ---------------------------------------------------------------------------
// Actions
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

async function copyRecord(id, rowNode) {
  const record = data.records.find((r) => r.id === id);
  if (!record) return;
  try {
    await navigator.clipboard.writeText(record.text);
    toast(t('copied'));
    rowNode?.classList.remove('flash');
    void rowNode?.offsetWidth; // restart the animation
    rowNode?.classList.add('flash');
  } catch (err) {
    console.error('Record Manager: clipboard write failed', err);
    toast(t('copyFailed'), false);
  }
}

function deleteRecord(id) {
  const index = data.records.findIndex((r) => r.id === id);
  if (index < 0) return;
  const [record] = data.records.splice(index, 1);
  ui.undo.items.push({ record, index });
  renderAll();
  commit();
  showUndo();
}

function undoDelete() {
  // Restore in reverse order so original positions are preserved.
  const items = ui.undo.items.slice().reverse();
  for (const { record, index } of items) {
    if (data.records.some((r) => r.id === record.id)) continue;
    if (!categoryById(record.categoryId)) record.categoryId = data.categories[0].id;
    data.records.splice(Math.min(index, data.records.length), 0, record);
  }
  hideUndo();
  renderAll();
  commit();
}

function openEditor(id) {
  const record = data.records.find((r) => r.id === id);
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
  const len = el.editInput.value.length;
  el.editCount.textContent = `${len} / ${LIMITS.text}`;
  el.editDone.disabled = !el.editInput.value.trim();
}

function saveEditor() {
  const record = data.records.find((r) => r.id === ui.editingId);
  const text = sanitizeText(el.editInput.value);
  if (!record || !text) return;
  record.text = text;
  record.categoryId = categoryById(el.editCategory.value)?.id ?? record.categoryId;
  record.updatedAt = Date.now();
  el.editDialog.close();
  renderAll();
  commit();
}

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

function setSetting(key, value) {
  data.settings[key] = value;
  if (key === 'theme') applyTheme();
  if (key === 'lang') {
    setLang(value);
    applyTexts();
  }
  renderAll();
  commit();
}

function updateToolbarHairline() {
  const stuck = !el.mainView.hidden && el.toolbar.getBoundingClientRect().top <= 0 && window.scrollY > 0;
  el.toolbar.classList.toggle('stuck', stuck);
}

function showView(name) {
  const settings = name === 'settings';
  el.mainView.hidden = settings;
  el.settingsView.hidden = !settings;
  window.scrollTo(0, 0);
  updateToolbarHairline();
  (settings ? el.backBtn : el.settingsBtn).focus();
}

function toggleSortMenu(open = el.sortMenu.hidden) {
  el.sortMenu.hidden = !open;
  el.sortBtn.setAttribute('aria-expanded', String(open));
  if (open) el.sortMenu.querySelector('[aria-checked="true"]')?.focus();
}

/** Arrow-key navigation inside a role=radiogroup, as in native segmented controls. */
function radioKeys(group, onPick) {
  group.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
    const items = [...group.querySelectorAll('[role="radio"]')];
    const i = items.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    let next = i;
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
    if (!item || !SORTS.includes(item.dataset.sort)) return;
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
    if (e.key === 'Enter' && modKey(e)) {
      e.preventDefault();
      addRecord();
    }
  });

  // List (event delegation)
  el.recordList.addEventListener('click', (e) => {
    const button = e.target.closest('[data-action]');
    const row = e.target.closest('.row');
    if (!button || !row) return;
    const id = row.dataset.id;
    if (button.dataset.action === 'copy') copyRecord(id, row);
    else if (button.dataset.action === 'edit') openEditor(id);
    else if (button.dataset.action === 'delete') deleteRecord(id);
  });
  el.undoBtn.addEventListener('click', undoDelete);

  // Editor sheet
  el.editInput.addEventListener('input', updateEditCount);
  el.editCategory.addEventListener('change', () => setColor(el.editDot, categoryById(el.editCategory.value)?.color));
  el.editCancel.addEventListener('click', () => el.editDialog.close());
  el.editDone.addEventListener('click', saveEditor);
  el.editDialog.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === 's') && modKey(e)) {
      e.preventDefault();
      saveEditor();
    }
  });
  el.editDialog.addEventListener('click', (e) => {
    if (e.target === el.editDialog) el.editDialog.close(); // backdrop click
  });
  el.editDialog.addEventListener('close', () => { ui.editingId = null; });

  // Confirm alert
  el.confirmCancel.addEventListener('click', () => el.confirmDialog.close('cancel'));
  el.confirmOk.addEventListener('click', () => el.confirmDialog.close('ok'));
  el.confirmDialog.addEventListener('cancel', () => { el.confirmDialog.returnValue = 'cancel'; });

  // Settings
  const pickTheme = (btn) => btn?.dataset.value && setSetting('theme', btn.dataset.value);
  const pickLang = (btn) => btn?.dataset.value && setSetting('lang', btn.dataset.value);
  el.themeControl.addEventListener('click', (e) => pickTheme(e.target.closest('[role="radio"]')));
  el.langControl.addEventListener('click', (e) => pickLang(e.target.closest('[role="radio"]')));
  radioKeys(el.themeControl, pickTheme);
  radioKeys(el.langControl, pickLang);

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
    } else if (modKey(e) && e.key.toLowerCase() === 's' && document.activeElement === el.composerInput) {
      e.preventDefault();
      addRecord();
    } else if (e.key === 'Escape' && !el.settingsView.hidden) {
      showView('main');
    }
  });

  // Hairline under the toolbar once it sticks to the top.
  window.addEventListener('scroll', updateToolbarHairline, { passive: true });

  // Keep several open panels (one per window) in sync.
  onExternalChange(async () => {
    const fresh = await loadState(opts());
    if (JSON.stringify(fresh) === JSON.stringify(data)) return;
    const langChanged = fresh.settings.lang !== data.settings.lang;
    data = fresh;
    if (!categoryById(ui.composerCategory)) ui.composerCategory = data.categories[0].id;
    if (ui.filter !== 'all' && !categoryById(ui.filter)) ui.filter = 'all';
    applyTheme();
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
  applyTheme();
  applyTexts();
  bindEvents();
  renderAll();
  updateComposerState();
  document.body.classList.add('ready');
}

init().catch((err) => {
  console.error('Record Manager: failed to start', err);
  document.body.classList.add('ready');
});
