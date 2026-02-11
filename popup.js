// DOM Elements
const mainView = document.getElementById('mainView');
const settingsView = document.getElementById('settingsView');
const themeBtn = document.getElementById('themeBtn');
const settingsBtn = document.getElementById('settingsBtn');
const backBtn = document.getElementById('backBtn');
const langSelect = document.getElementById('langSelect');

const searchInput = document.getElementById('searchInput');
const filterContainer = document.getElementById('filterContainer');

const customSelect = document.getElementById('customSelect');
const selectTrigger = customSelect.querySelector('.select-trigger');
const selectOptions = document.getElementById('selectOptions');
const selectedValueSpan = document.getElementById('selectedValue');
const selectedColorDot = document.getElementById('selectedColorDot');
const categoryInput = document.getElementById('categoryInput');

const promptInput = document.getElementById('promptInput');
const saveBtn = document.getElementById('saveBtn');
const promptsList = document.getElementById('promptsList');
const charCount = document.getElementById('charCount');
const clearBtn = document.getElementById('clearBtn');
const recordCount = document.getElementById('recordCount');
const emptyState = document.getElementById('emptyState');

const newCatInput = document.getElementById('newCatInput');
const newCatColor = document.getElementById('newCatColor');
const addCatBtn = document.getElementById('addCatBtn');
const categoriesList = document.getElementById('categoriesList');

const sortBtn = document.getElementById('sortBtn');
const sortMenu = document.getElementById('sortMenu');

// Modal elements
const editModal = document.getElementById('editModal');
const closeModal = document.getElementById('closeModal');
const editTextarea = document.getElementById('editTextarea');
const editCharCount = document.getElementById('editCharCount');
const cancelEdit = document.getElementById('cancelEdit');
const saveEdit = document.getElementById('saveEdit');
const editCategorySelect = document.getElementById('editCategorySelect');
const editSelectOptions = document.getElementById('editSelectOptions');
const editSelectedValue = document.getElementById('editSelectedValue');
const editSelectedColorDot = document.getElementById('editSelectedColorDot');

// Toast & Undo
const toast = document.getElementById('toast');
const toastIcon = document.getElementById('toastIcon');
const toastMessage = document.getElementById('toastMessage');
const undoBar = document.getElementById('undoBar');
const undoBtn = document.getElementById('undoBtn');

// Export/Import
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');

// Default category colors
const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const TRANSLATIONS = {
    ru: {
        appTitle: "Менеджер записей",
        themeTitle: "Тема",
        settingsTitle: "Настройки",
        searchPlaceholder: "Найти запись...",
        catLabel: "Категория:",
        selectPlaceholder: "Выбрать...",
        inputPlaceholder: "Введите текст записи...",
        saveBtn: "Сохранить",
        backBtn: "Назад",
        newCatPlaceholder: "Новая категория",
        all: "Все",
        delete: "Удалить",
        confirmDelete: "Удалить категорию",
        copied: "Скопировано!",
        uncategorized: "Без категории",
        records: "записей",
        record: "запись",
        records25: "записи",
        emptyTitle: "Нет записей",
        emptyDesc: "Создайте первую запись, чтобы начать",
        editTitle: "Редактирование",
        cancel: "Отмена",
        deleted: "Запись удалена",
        undo: "Отменить",
        exportBtn: "Экспорт",
        importBtn: "Импорт",
        imported: "Импортировано",
        categoriesTitle: "Категории",
        dataTitle: "Данные"
    },
    kk: {
        appTitle: "Жазбалар менеджері",
        themeTitle: "Тақырып",
        settingsTitle: "Баптаулар",
        searchPlaceholder: "Жазбаны іздеу...",
        catLabel: "Санат:",
        selectPlaceholder: "Таңдау...",
        inputPlaceholder: "Жазба мәтінін енгізіңіз...",
        saveBtn: "Сақтау",
        backBtn: "Артқа",
        newCatPlaceholder: "Жаңа санат",
        all: "Барлығы",
        delete: "Өшіру",
        confirmDelete: "Санатты өшіру керек пе",
        copied: "Көшірілді!",
        uncategorized: "Санатсыз",
        records: "жазба",
        record: "жазба",
        records25: "жазба",
        emptyTitle: "Жазбалар жоқ",
        emptyDesc: "Бастау үшін бірінші жазбаны жасаңыз",
        editTitle: "Өңдеу",
        cancel: "Бас тарту",
        deleted: "Жазба өшірілді",
        undo: "Болдырмау",
        exportBtn: "Экспорт",
        importBtn: "Импорт",
        imported: "Импортталды",
        categoriesTitle: "Санаттар",
        dataTitle: "Деректер"
    },
    en: {
        appTitle: "Record Manager",
        themeTitle: "Theme",
        settingsTitle: "Settings",
        searchPlaceholder: "Search records...",
        catLabel: "Category:",
        selectPlaceholder: "Select...",
        inputPlaceholder: "Enter record text...",
        saveBtn: "Save",
        backBtn: "Back",
        newCatPlaceholder: "New category",
        all: "All",
        delete: "Delete",
        confirmDelete: "Delete category",
        copied: "Copied!",
        uncategorized: "Uncategorized",
        records: "records",
        record: "record",
        records25: "records",
        emptyTitle: "No records",
        emptyDesc: "Create your first record to get started",
        editTitle: "Edit",
        cancel: "Cancel",
        deleted: "Record deleted",
        undo: "Undo",
        exportBtn: "Export",
        importBtn: "Import",
        imported: "Imported",
        categoriesTitle: "Categories",
        dataTitle: "Data"
    }
};

let state = {
    prompts: [],
    categories: [{ name: 'Personal', color: '#3b82f6' }],
    theme: 'dark',
    lang: 'ru',
    filter: 'ALL_FILTER_KEY',
    search: '',
    selectedCategory: 'Personal',
    sortBy: 'date-desc',
    editingPrompt: null,
    editCategory: '',
    deletedPrompt: null,
    undoTimeout: null
};

const ICONS = {
    sun: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
    moon: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
    gear: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    edit: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    trash: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`
};

settingsBtn.innerHTML = ICONS.gear;

// Utility functions
function getCategoryColor(catName) {
    const cat = state.categories.find(c => c.name === catName);
    return cat ? cat.color : '#3b82f6';
}

function getCategoryNames() {
    return state.categories.map(c => c.name);
}

function showToast(message, icon = '✅') {
    toastIcon.innerText = icon;
    toastMessage.innerText = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
        return date.toLocaleTimeString(state.lang, { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
        return state.lang === 'ru' ? 'Вчера' : state.lang === 'kk' ? 'Кеше' : 'Yesterday';
    } else if (days < 7) {
        return date.toLocaleDateString(state.lang, { weekday: 'short' });
    } else {
        return date.toLocaleDateString(state.lang, { day: 'numeric', month: 'short' });
    }
}

function getRecordCountText(count) {
    const t = TRANSLATIONS[state.lang];
    if (state.lang === 'ru') {
        const lastDigit = count % 10;
        const lastTwoDigits = count % 100;
        if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return `${count} ${t.records}`;
        if (lastDigit === 1) return `${count} ${t.record}`;
        if (lastDigit >= 2 && lastDigit <= 4) return `${count} ${t.records25}`;
        return `${count} ${t.records}`;
    }
    return `${count} ${count === 1 ? t.record : t.records}`;
}

// Migration for old category format
function migrateCategories(categories) {
    if (!categories || categories.length === 0) {
        return [{ name: 'Personal', color: '#3b82f6' }];
    }

    if (typeof categories[0] === 'string') {
        return categories
            .filter(c => c !== 'Общее' && c !== 'All' && c !== 'Все' && c !== 'Барлығы')
            .map((name, index) => ({
                name,
                color: DEFAULT_COLORS[index % DEFAULT_COLORS.length]
            }));
    }

    return categories;
}

function init() {
    chrome.storage.local.get(['prompts', 'categories', 'theme', 'lang', 'sortBy'], (res) => {
        if (res.prompts) {
            state.prompts = res.prompts.map((p, index) => {
                if (!p.id) p.id = Date.now() + index;
                if (!p.createdAt) p.createdAt = p.id;
                return p;
            });
        }

        state.categories = migrateCategories(res.categories);

        if (state.categories.length === 0) {
            state.categories = [{ name: 'Personal', color: '#3b82f6' }];
        }

        if (res.theme) state.theme = res.theme;
        if (res.lang) state.lang = res.lang;
        if (res.sortBy) state.sortBy = res.sortBy;

        state.selectedCategory = state.categories[0].name;
        state.filter = 'ALL_FILTER_KEY';

        applyTheme(state.theme);
        applyLanguage(state.lang);
        renderAll();
        updateCharCount();
    });
}

function applyTheme(name) {
    state.theme = name;
    document.body.setAttribute('data-theme', name);
    themeBtn.innerHTML = name === 'dark' ? ICONS.sun : ICONS.moon;
    saveData();
}

function applyLanguage(lang) {
    state.lang = lang;
    langSelect.value = lang;
    const t = TRANSLATIONS[lang];

    document.getElementById('t-appTitle').innerText = t.appTitle;
    document.getElementById('t-catLabel').innerText = t.catLabel;
    document.getElementById('t-saveBtn').innerText = t.saveBtn;
    document.getElementById('t-backBtn').innerText = t.backBtn;
    document.getElementById('t-settingsTitle').innerText = t.settingsTitle;
    document.getElementById('t-emptyTitle').innerText = t.emptyTitle;
    document.getElementById('t-emptyDesc').innerText = t.emptyDesc;
    document.getElementById('t-editTitle').innerText = t.editTitle;
    document.getElementById('t-undoText').innerText = t.deleted;
    document.getElementById('t-categoriesTitle').innerText = t.categoriesTitle;
    document.getElementById('t-dataTitle').innerText = t.dataTitle;
    document.getElementById('t-exportBtn').innerText = t.exportBtn;
    document.getElementById('t-importBtn').innerText = t.importBtn;

    themeBtn.title = t.themeTitle;
    settingsBtn.title = t.settingsTitle;
    searchInput.placeholder = t.searchPlaceholder;
    promptInput.placeholder = t.inputPlaceholder;
    newCatInput.placeholder = t.newCatPlaceholder;

    cancelEdit.innerText = t.cancel;
    undoBtn.innerText = t.undo;

    if (selectedValueSpan.innerText === 'Выбрать...' || selectedValueSpan.innerText === 'Select...' || selectedValueSpan.innerText === 'Таңдау...') {
        selectedValueSpan.innerText = t.selectPlaceholder;
    }

    renderAll();
    saveData();
}

function renderAll() {
    renderFilters();
    renderCustomDropdown();
    renderList();
    renderSettings();
    updateRecordCount();
    updateSortMenu();
}

function updateRecordCount() {
    const count = state.prompts.length;
    recordCount.innerText = getRecordCountText(count);
}

function updateCharCount() {
    charCount.innerText = promptInput.value.length;
}

function updateSortMenu() {
    document.querySelectorAll('.sort-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.sort === state.sortBy);
    });
}

// Event listeners
langSelect.onchange = (e) => applyLanguage(e.target.value);

selectTrigger.onclick = (e) => {
    e.stopPropagation();
    customSelect.classList.toggle('open');
};

document.onclick = (e) => {
    if (!customSelect.contains(e.target)) {
        customSelect.classList.remove('open');
    }
    if (!editCategorySelect.contains(e.target)) {
        editCategorySelect.classList.remove('open');
    }
    if (!sortMenu.contains(e.target) && !sortBtn.contains(e.target)) {
        sortMenu.classList.add('hidden');
    }
};

promptInput.oninput = updateCharCount;

clearBtn.onclick = () => {
    promptInput.value = '';
    updateCharCount();
    promptInput.focus();
};

sortBtn.onclick = (e) => {
    e.stopPropagation();
    sortMenu.classList.toggle('hidden');
};

sortMenu.onclick = (e) => {
    const option = e.target.closest('.sort-option');
    if (option) {
        state.sortBy = option.dataset.sort;
        sortMenu.classList.add('hidden');
        updateSortMenu();
        renderList();
        saveData();
    }
};

// Custom dropdown rendering
function renderCustomDropdown() {
    selectOptions.innerHTML = '';
    const t = TRANSLATIONS[state.lang];
    const catNames = getCategoryNames();

    if (state.selectedCategory && catNames.includes(state.selectedCategory)) {
        selectedValueSpan.innerText = state.selectedCategory;
        selectedColorDot.style.background = getCategoryColor(state.selectedCategory);
    } else {
        selectedValueSpan.innerText = t.selectPlaceholder;
        selectedColorDot.style.background = '#3b82f6';
    }

    state.categories.forEach(cat => {
        const opt = document.createElement('div');
        opt.className = `custom-option ${cat.name === state.selectedCategory ? 'selected' : ''}`;
        opt.innerHTML = `
            <span class="category-color-dot" style="background: ${cat.color}"></span>
            <span style="flex: 1">${cat.name}</span>
        `;

        opt.onclick = () => {
            state.selectedCategory = cat.name;
            selectedValueSpan.innerText = cat.name;
            selectedColorDot.style.background = cat.color;
            categoryInput.value = cat.name;
            customSelect.classList.remove('open');
            renderCustomDropdown();
        };

        selectOptions.appendChild(opt);
    });
}

function renderFilters() {
    const t = TRANSLATIONS[state.lang];
    filterContainer.innerHTML = '';

    // "All" chip
    const allChip = document.createElement('div');
    allChip.className = `chip ${state.filter === 'ALL_FILTER_KEY' ? 'active' : ''}`;
    allChip.innerText = t.all;
    allChip.onclick = () => {
        state.filter = 'ALL_FILTER_KEY';
        renderAll();
    };
    filterContainer.appendChild(allChip);

    // Category chips
    state.categories.forEach(cat => {
        const chip = document.createElement('div');
        chip.className = `chip ${cat.name === state.filter ? 'active' : ''}`;
        chip.innerHTML = `
            <span class="chip-color" style="background: ${cat.color}"></span>
            <span>${cat.name}</span>
        `;

        chip.onclick = () => {
            state.filter = cat.name;
            state.selectedCategory = cat.name;
            renderAll();
        };
        filterContainer.appendChild(chip);
    });
}

function sortPrompts(prompts) {
    const sorted = [...prompts];
    switch (state.sortBy) {
        case 'date-desc':
            return sorted.sort((a, b) => b.createdAt - a.createdAt);
        case 'date-asc':
            return sorted.sort((a, b) => a.createdAt - b.createdAt);
        case 'alpha-asc':
            return sorted.sort((a, b) => a.text.localeCompare(b.text));
        case 'alpha-desc':
            return sorted.sort((a, b) => b.text.localeCompare(a.text));
        default:
            return sorted;
    }
}

function renderList() {
    promptsList.innerHTML = '';
    const t = TRANSLATIONS[state.lang];

    let filtered = state.prompts.filter(p => {
        const byCat = state.filter === 'ALL_FILTER_KEY' || p.category === state.filter;
        const bySearch = p.text.toLowerCase().includes(state.search.toLowerCase());
        return byCat && bySearch;
    });

    filtered = sortPrompts(filtered);

    // Show/hide empty state
    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
        promptsList.classList.add('hidden');
    } else {
        emptyState.classList.add('hidden');
        promptsList.classList.remove('hidden');
    }

    filtered.forEach(p => {
        const el = document.createElement('div');
        el.className = 'prompt-item';
        const catColor = getCategoryColor(p.category);

        el.innerHTML = `
            <div class="item-text">${escapeHtml(p.text)}</div>
            <div class="item-meta">
                <div class="item-tag">
                    <span class="category-color-dot" style="background: ${catColor}"></span>
                    ${p.category}
                </div>
                <span class="item-date">${formatDate(p.createdAt)}</span>
            </div>
            <div class="item-actions">
                <button class="item-action-btn edit" title="Редактировать">
                    ${ICONS.edit}
                </button>
                <button class="item-action-btn delete" title="Удалить">
                    ${ICONS.trash}
                </button>
            </div>
        `;

        // Copy on click (main area)
        el.onclick = (e) => {
            if (e.target.closest('.item-action-btn')) return;

            navigator.clipboard.writeText(p.text);
            showToast(t.copied, '✅');
        };

        // Edit button
        el.querySelector('.edit').onclick = (e) => {
            e.stopPropagation();
            openEditModal(p);
        };

        // Delete button
        el.querySelector('.delete').onclick = (e) => {
            e.stopPropagation();
            deletePrompt(p);
        };

        promptsList.appendChild(el);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function deletePrompt(prompt) {
    // Store for undo
    state.deletedPrompt = { ...prompt };

    // Remove from state
    state.prompts = state.prompts.filter(x => x.id !== prompt.id);
    saveData();

    // Show undo bar
    if (state.undoTimeout) {
        clearTimeout(state.undoTimeout);
    }

    undoBar.classList.add('show');
    state.undoTimeout = setTimeout(() => {
        undoBar.classList.remove('show');
        state.deletedPrompt = null;
    }, 5000);
}

undoBtn.onclick = () => {
    if (state.deletedPrompt) {
        state.prompts.unshift(state.deletedPrompt);
        state.deletedPrompt = null;
        undoBar.classList.remove('show');
        if (state.undoTimeout) {
            clearTimeout(state.undoTimeout);
        }
        saveData();
    }
};

// Edit Modal
function openEditModal(prompt) {
    state.editingPrompt = prompt;
    state.editCategory = prompt.category;
    editTextarea.value = prompt.text;
    editCharCount.innerText = prompt.text.length;

    renderEditCategoryDropdown();
    editModal.classList.remove('hidden');
}

function closeEditModal() {
    editModal.classList.add('hidden');
    state.editingPrompt = null;
    editCategorySelect.classList.remove('open');
}

function renderEditCategoryDropdown() {
    editSelectOptions.innerHTML = '';

    editSelectedValue.innerText = state.editCategory;
    editSelectedColorDot.style.background = getCategoryColor(state.editCategory);

    state.categories.forEach(cat => {
        const opt = document.createElement('div');
        opt.className = `custom-option ${cat.name === state.editCategory ? 'selected' : ''}`;
        opt.innerHTML = `
            <span class="category-color-dot" style="background: ${cat.color}"></span>
            <span style="flex: 1">${cat.name}</span>
        `;

        opt.onclick = () => {
            state.editCategory = cat.name;
            editSelectedValue.innerText = cat.name;
            editSelectedColorDot.style.background = cat.color;
            editCategorySelect.classList.remove('open');
            renderEditCategoryDropdown();
        };

        editSelectOptions.appendChild(opt);
    });
}

editCategorySelect.querySelector('.select-trigger').onclick = (e) => {
    e.stopPropagation();
    editCategorySelect.classList.toggle('open');
};

editTextarea.oninput = () => {
    editCharCount.innerText = editTextarea.value.length;
};

closeModal.onclick = closeEditModal;
cancelEdit.onclick = closeEditModal;
editModal.querySelector('.modal-overlay').onclick = closeEditModal;

saveEdit.onclick = () => {
    if (!state.editingPrompt) return;

    const newText = editTextarea.value.trim();
    if (!newText) return;

    const prompt = state.prompts.find(p => p.id === state.editingPrompt.id);
    if (prompt) {
        prompt.text = newText;
        prompt.category = state.editCategory;
    }

    closeEditModal();
    saveData();
};

// Settings
function renderSettings() {
    categoriesList.innerHTML = '';
    const t = TRANSLATIONS[state.lang];

    state.categories.forEach(cat => {
        const row = document.createElement('div');
        row.className = 'setting-row';
        row.innerHTML = `
            <div class="cat-info">
                <span class="cat-color" style="background: ${cat.color}"></span>
                <span class="cat-name">${cat.name}</span>
            </div>
            <span class="cat-del">${t.delete}</span>
        `;

        row.querySelector('.cat-del').onclick = () => {
            if (state.categories.length <= 1) return;

            state.categories = state.categories.filter(c => c.name !== cat.name);
            const fallback = state.categories[0].name;

            state.prompts.forEach(p => {
                if (p.category === cat.name) p.category = fallback;
            });

            if (state.filter === cat.name) state.filter = 'ALL_FILTER_KEY';
            if (state.selectedCategory === cat.name) state.selectedCategory = fallback;

            saveData();
        };

        categoriesList.appendChild(row);
    });
}

function saveData() {
    chrome.storage.local.set({
        prompts: state.prompts,
        categories: state.categories,
        theme: state.theme,
        lang: state.lang,
        sortBy: state.sortBy
    }, renderAll);
}

// Save new prompt
saveBtn.onclick = () => {
    const txt = promptInput.value.trim();
    if (!txt) return;

    state.prompts.unshift({
        id: Date.now(),
        text: txt,
        category: state.selectedCategory,
        createdAt: Date.now()
    });

    promptInput.value = '';
    updateCharCount();
    saveData();
    showToast(TRANSLATIONS[state.lang].saveBtn + '!', '💾');
};

// Add category
addCatBtn.onclick = () => {
    const name = newCatInput.value.trim();
    const color = newCatColor.value;

    if (name && !getCategoryNames().includes(name)) {
        state.categories.push({ name, color });
        newCatInput.value = '';
        newCatColor.value = DEFAULT_COLORS[state.categories.length % DEFAULT_COLORS.length];
        saveData();
    }
};

// Export/Import
exportBtn.onclick = () => {
    const data = {
        prompts: state.prompts,
        categories: state.categories,
        exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `record-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('Exported!', '📦');
};

importBtn.onclick = () => importFile.click();

importFile.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);

            if (data.prompts && Array.isArray(data.prompts)) {
                // Merge prompts
                const existingIds = new Set(state.prompts.map(p => p.id));
                const newPrompts = data.prompts.filter(p => !existingIds.has(p.id));
                state.prompts = [...newPrompts, ...state.prompts];
            }

            if (data.categories && Array.isArray(data.categories)) {
                // Merge categories
                const existingNames = new Set(getCategoryNames());
                const newCats = data.categories.filter(c => !existingNames.has(c.name));
                state.categories = [...state.categories, ...newCats];
            }

            saveData();
            showToast(TRANSLATIONS[state.lang].imported + '!', '📥');
        } catch (err) {
            showToast('Error importing file', '❌');
        }
    };
    reader.readAsText(file);
    importFile.value = '';
};

// Keyboard shortcuts
document.onkeydown = (e) => {
    // Ctrl+S to save
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (!editModal.classList.contains('hidden')) {
            saveEdit.click();
        } else if (promptInput.value.trim()) {
            saveBtn.click();
        }
    }

    // Escape to close modal
    if (e.key === 'Escape') {
        if (!editModal.classList.contains('hidden')) {
            closeEditModal();
        }
    }

    // Ctrl+F to focus search
    if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        searchInput.focus();
    }
};

// Search with debounce
let searchTimeout;
searchInput.oninput = (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        state.search = e.target.value;
        renderList();
    }, 200);
};

themeBtn.onclick = () => applyTheme(state.theme === 'light' ? 'dark' : 'light');
settingsBtn.onclick = () => { mainView.classList.add('hidden'); settingsView.classList.remove('hidden'); };
backBtn.onclick = () => { settingsView.classList.add('hidden'); mainView.classList.remove('hidden'); };

init();

