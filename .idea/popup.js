const mainView = document.getElementById('mainView');
const settingsView = document.getElementById('settingsView');
const themeBtn = document.getElementById('themeBtn');
const settingsBtn = document.getElementById('settingsBtn');
const backBtn = document.getElementById('backBtn');

const searchInput = document.getElementById('searchInput');
const filterContainer = document.getElementById('filterContainer');

const customSelect = document.getElementById('customSelect');
const selectTrigger = customSelect.querySelector('.select-trigger');
const selectOptions = document.getElementById('selectOptions');
const selectedValueSpan = document.getElementById('selectedValue');
const categoryInput = document.getElementById('categoryInput');

const promptInput = document.getElementById('promptInput');
const saveBtn = document.getElementById('saveBtn');
const promptsList = document.getElementById('promptsList');

const newCatInput = document.getElementById('newCatInput');
const addCatBtn = document.getElementById('addCatBtn');
const categoriesList = document.getElementById('categoriesList');

let state = {
    prompts: [],
    categories: ['MUIT', 'Kamiqr', 'Gemini'],
    theme: 'dark',
    filter: 'Все',
    search: '',
    selectedCategory: ''
};

const ICONS = {
    sun: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
    moon: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
    gear: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`
};

settingsBtn.innerHTML = ICONS.gear;

function init() {
    chrome.storage.local.get(['prompts', 'categories', 'theme'], (res) => {
        if (res.prompts) {
            state.prompts = res.prompts.map((p, index) => {
                if (!p.id) p.id = Date.now() + index;
                return p;
            });
        }

        if (res.categories && res.categories.length > 0) {
            state.categories = res.categories.filter(c => c !== 'Общее');
        }
        if (state.categories.length === 0) {
            state.categories = ['MUIT'];
        }

        if (res.theme) state.theme = res.theme;

        state.selectedCategory = state.categories[0];

        applyTheme(state.theme);
        renderAll();
    });
}

function applyTheme(name) {
    state.theme = name;
    document.body.setAttribute('data-theme', name);
    themeBtn.innerHTML = name === 'dark' ? ICONS.sun : ICONS.moon;
    chrome.storage.local.set({ theme: name });
}

function renderAll() {
    renderFilters();
    renderCustomDropdown();
    renderList();
    renderSettings();
}

selectTrigger.onclick = (e) => {
    e.stopPropagation();
    customSelect.classList.toggle('open');
};

document.onclick = (e) => {
    if (!customSelect.contains(e.target)) {
        customSelect.classList.remove('open');
    }
};

function renderCustomDropdown() {
    selectOptions.innerHTML = '';
    if (state.filter !== 'Все' && state.categories.includes(state.filter)) {
        state.selectedCategory = state.filter;
    }
    if (!state.categories.includes(state.selectedCategory) && state.categories.length > 0) {
        state.selectedCategory = state.categories[0];
    }

    selectedValueSpan.innerText = state.selectedCategory;
    categoryInput.value = state.selectedCategory;

    state.categories.forEach(cat => {
        const opt = document.createElement('div');
        opt.className = `custom-option ${cat === state.selectedCategory ? 'selected' : ''}`;
        opt.innerText = cat;

        opt.onclick = () => {
            state.selectedCategory = cat;
            selectedValueSpan.innerText = cat;
            categoryInput.value = cat;
            customSelect.classList.remove('open');
            renderCustomDropdown();
        };

        selectOptions.appendChild(opt);
    });
}

function renderFilters() {
    const all = ['Все', ...state.categories];
    filterContainer.innerHTML = '';

    all.forEach(cat => {
        const chip = document.createElement('div');
        chip.className = `chip ${cat === state.filter ? 'active' : ''}`;
        chip.innerText = cat;
        chip.onclick = () => {
            state.filter = cat;
            if (cat !== 'Все') {
                state.selectedCategory = cat;
            }
            renderAll();
        };
        filterContainer.appendChild(chip);
    });
}

function renderList() {
    promptsList.innerHTML = '';

    const filtered = state.prompts.filter(p => {
        const byCat = state.filter === 'Все' || p.category === state.filter;
        const bySearch = p.text.toLowerCase().includes(state.search.toLowerCase());
        return byCat && bySearch;
    });

    filtered.forEach(p => {
        const el = document.createElement('div');
        el.className = 'prompt-item';

        el.innerHTML = `
      <div class="item-text">${p.text}</div>
      <div class="item-tag">${p.category}</div>
      <div class="del-prompt">×</div>
    `;

        el.onclick = () => {
            navigator.clipboard.writeText(p.text);
            const textDiv = el.querySelector('.item-text');
            const originalText = p.text;

            el.classList.add('copied');
            textDiv.innerText = 'Скопировано! ✅';

            setTimeout(() => {
                el.classList.remove('copied');
                textDiv.innerText = originalText;
            }, 1200);
        };

        el.querySelector('.del-prompt').onclick = (e) => {
            e.stopPropagation();
            state.prompts = state.prompts.filter(x => x.id !== p.id);
            saveData();
        };

        promptsList.appendChild(el);
    });
}

function renderSettings() {
    categoriesList.innerHTML = '';
    state.categories.forEach(cat => {
        const row = document.createElement('div');
        row.className = 'setting-row';
        row.innerHTML = `<span class="cat-name">${cat}</span><span class="cat-del">Удалить</span>`;

        row.querySelector('.cat-del').onclick = () => {
            if (confirm(`Удалить категорию "${cat}"?`)) {
                state.categories = state.categories.filter(c => c !== cat);
                const fallback = state.categories.length > 0 ? state.categories[0] : 'Без категории';

                state.prompts.forEach(p => {
                    if (p.category === cat) p.category = fallback;
                });

                if (state.filter === cat) state.filter = 'Все';
                if (state.selectedCategory === cat) state.selectedCategory = fallback;

                saveData();
            }
        };
        categoriesList.appendChild(row);
    });
}

function saveData() {
    chrome.storage.local.set({
        prompts: state.prompts,
        categories: state.categories
    }, renderAll);
}

saveBtn.onclick = () => {
    const txt = promptInput.value.trim();
    if (!txt) return;

    state.prompts.unshift({
        id: Date.now(),
        text: txt,
        category: state.selectedCategory
    });

    promptInput.value = '';
    saveData();
};

addCatBtn.onclick = () => {
    const name = newCatInput.value.trim();
    if (name && !state.categories.includes(name)) {
        state.categories.push(name);
        newCatInput.value = '';
        saveData();
    }
};

searchInput.oninput = (e) => { state.search = e.target.value; renderList(); };
themeBtn.onclick = () => applyTheme(state.theme === 'light' ? 'dark' : 'light');
settingsBtn.onclick = () => { mainView.classList.add('hidden'); settingsView.classList.remove('hidden'); };
backBtn.onclick = () => { settingsView.classList.add('hidden'); mainView.classList.remove('hidden'); };

init();