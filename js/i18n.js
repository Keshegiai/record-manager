// UI strings. All output is inserted with textContent, never as HTML.

const STRINGS = {
  ru: {
    locale: 'ru-RU',
    appTitle: 'Записи',
    count: { one: '{n} запись', few: '{n} записи', many: '{n} записей', other: '{n} записи' },
    settings: 'Настройки',
    back: 'Назад',
    search: 'Поиск',
    clearSearch: 'Очистить поиск',
    sort: 'Сортировка',
    sortNewest: 'Сначала новые',
    sortOldest: 'Сначала старые',
    sortAZ: 'По алфавиту (А–Я)',
    sortZA: 'По алфавиту (Я–А)',
    filters: 'Фильтр по категории',
    all: 'Все',
    composerPlaceholder: 'Новая запись…',
    composerLabel: 'Текст новой записи',
    category: 'Категория',
    save: 'Сохранить',
    saved: 'Сохранено',
    saveFailed: 'Не удалось сохранить',
    copy: 'Скопировать',
    copied: 'Скопировано',
    copyFailed: 'Не удалось скопировать',
    edit: 'Изменить',
    delete: 'Удалить',
    cancel: 'Отменить',
    done: 'Готово',
    editTitle: 'Редактирование',
    deletedOne: 'Запись удалена',
    deletedMany: 'Удалено записей: {n}',
    undo: 'Вернуть',
    emptyTitle: 'Нет записей',
    emptyDesc: 'Напишите текст выше и нажмите «Сохранить».',
    noResultsTitle: 'Ничего не найдено',
    noResultsDesc: 'Попробуйте изменить запрос или фильтр.',
    appearance: 'Оформление',
    themeSystem: 'Авто',
    themeLight: 'Светлая',
    themeDark: 'Тёмная',
    themeFooter: '«Авто» следует настройкам системы.',
    language: 'Язык',
    categories: 'Категории',
    newCategory: 'Новая категория',
    addCategory: 'Добавить категорию',
    color: 'Цвет',
    categoryExists: 'Такая категория уже есть',
    categoryLimit: 'Достигнут лимит категорий',
    lastCategory: 'Нельзя удалить последнюю категорию',
    deleteCategoryTitle: 'Удалить «{name}»?',
    deleteCategoryMoves: 'Записей в категории: {n}. Они будут перенесены в «{target}».',
    deleteCategoryEmpty: 'В этой категории нет записей.',
    data: 'Данные',
    export: 'Экспортировать в файл',
    import: 'Импортировать из файла',
    exported: 'Файл сохранён',
    imported: 'Добавлено записей: {n}',
    importError: 'Файл повреждён или не поддерживается',
    importTooLarge: 'Файл больше 5 МБ',
    privacy: 'Записи хранятся только на этом устройстве. Расширение не делает сетевых запросов и не собирает данные.',
    version: 'Версия {v}',
    recordLimit: 'Достигнут лимит записей',
    yesterday: 'Вчера',
    colors: {
      blue: 'Синий', green: 'Зелёный', indigo: 'Индиго', orange: 'Оранжевый', pink: 'Розовый',
      purple: 'Фиолетовый', red: 'Красный', teal: 'Бирюзовый', yellow: 'Жёлтый', gray: 'Серый',
    },
    defaultCategory: 'Личное',
  },
  kk: {
    locale: 'kk-KZ',
    appTitle: 'Жазбалар',
    count: { one: '{n} жазба', other: '{n} жазба' },
    settings: 'Баптаулар',
    back: 'Артқа',
    search: 'Іздеу',
    clearSearch: 'Іздеуді тазалау',
    sort: 'Сұрыптау',
    sortNewest: 'Алдымен жаңалары',
    sortOldest: 'Алдымен ескілері',
    sortAZ: 'Әліпби бойынша (А–Я)',
    sortZA: 'Әліпби бойынша (Я–А)',
    filters: 'Санат бойынша сүзгі',
    all: 'Барлығы',
    composerPlaceholder: 'Жаңа жазба…',
    composerLabel: 'Жаңа жазба мәтіні',
    category: 'Санат',
    save: 'Сақтау',
    saved: 'Сақталды',
    saveFailed: 'Сақтау мүмкін болмады',
    copy: 'Көшіру',
    copied: 'Көшірілді',
    copyFailed: 'Көшіру мүмкін болмады',
    edit: 'Өзгерту',
    delete: 'Өшіру',
    cancel: 'Бас тарту',
    done: 'Дайын',
    editTitle: 'Өңдеу',
    deletedOne: 'Жазба өшірілді',
    deletedMany: 'Өшірілген жазбалар: {n}',
    undo: 'Қайтару',
    emptyTitle: 'Жазбалар жоқ',
    emptyDesc: 'Жоғарыға мәтін жазып, «Сақтау» түймесін басыңыз.',
    noResultsTitle: 'Ештеңе табылмады',
    noResultsDesc: 'Сұрауды немесе сүзгіні өзгертіп көріңіз.',
    appearance: 'Безендіру',
    themeSystem: 'Авто',
    themeLight: 'Ашық',
    themeDark: 'Қараңғы',
    themeFooter: '«Авто» жүйе баптауларына сәйкес келеді.',
    language: 'Тіл',
    categories: 'Санаттар',
    newCategory: 'Жаңа санат',
    addCategory: 'Санат қосу',
    color: 'Түс',
    categoryExists: 'Мұндай санат бар',
    categoryLimit: 'Санаттар шегіне жетті',
    lastCategory: 'Соңғы санатты өшіруге болмайды',
    deleteCategoryTitle: '«{name}» өшірілсін бе?',
    deleteCategoryMoves: 'Санаттағы жазбалар: {n}. Олар «{target}» санатына ауыстырылады.',
    deleteCategoryEmpty: 'Бұл санатта жазбалар жоқ.',
    data: 'Деректер',
    export: 'Файлға экспорттау',
    import: 'Файлдан импорттау',
    exported: 'Файл сақталды',
    imported: 'Қосылған жазбалар: {n}',
    importError: 'Файл зақымдалған немесе қолдау көрсетілмейді',
    importTooLarge: 'Файл 5 МБ-тан үлкен',
    privacy: 'Жазбалар тек осы құрылғыда сақталады. Кеңейтім желілік сұраулар жасамайды және деректер жинамайды.',
    version: 'Нұсқа {v}',
    recordLimit: 'Жазбалар шегіне жетті',
    yesterday: 'Кеше',
    colors: {
      blue: 'Көк', green: 'Жасыл', indigo: 'Индиго', orange: 'Қызғылт сары', pink: 'Қызғылт',
      purple: 'Күлгін', red: 'Қызыл', teal: 'Көгілдір', yellow: 'Сары', gray: 'Сұр',
    },
    defaultCategory: 'Жеке',
  },
  en: {
    locale: 'en-US',
    appTitle: 'Records',
    count: { one: '{n} record', other: '{n} records' },
    settings: 'Settings',
    back: 'Back',
    search: 'Search',
    clearSearch: 'Clear search',
    sort: 'Sort',
    sortNewest: 'Newest first',
    sortOldest: 'Oldest first',
    sortAZ: 'Alphabetical (A–Z)',
    sortZA: 'Alphabetical (Z–A)',
    filters: 'Filter by category',
    all: 'All',
    composerPlaceholder: 'New record…',
    composerLabel: 'New record text',
    category: 'Category',
    save: 'Save',
    saved: 'Saved',
    saveFailed: 'Couldn’t save',
    copy: 'Copy',
    copied: 'Copied',
    copyFailed: 'Couldn’t copy',
    edit: 'Edit',
    delete: 'Delete',
    cancel: 'Cancel',
    done: 'Done',
    editTitle: 'Edit Record',
    deletedOne: 'Record deleted',
    deletedMany: '{n} records deleted',
    undo: 'Undo',
    emptyTitle: 'No Records',
    emptyDesc: 'Type something above and tap Save.',
    noResultsTitle: 'No Results',
    noResultsDesc: 'Try a different search or filter.',
    appearance: 'Appearance',
    themeSystem: 'Auto',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeFooter: 'Auto follows your system setting.',
    language: 'Language',
    categories: 'Categories',
    newCategory: 'New category',
    addCategory: 'Add category',
    color: 'Color',
    categoryExists: 'This category already exists',
    categoryLimit: 'Category limit reached',
    lastCategory: 'You can’t delete the last category',
    deleteCategoryTitle: 'Delete “{name}”?',
    deleteCategoryMoves: '{n} records will be moved to “{target}”.',
    deleteCategoryEmpty: 'This category has no records.',
    data: 'Data',
    export: 'Export to File',
    import: 'Import from File',
    exported: 'File saved',
    imported: '{n} records added',
    importError: 'The file is damaged or not supported',
    importTooLarge: 'The file is larger than 5 MB',
    privacy: 'Records are stored only on this device. The extension makes no network requests and collects no data.',
    version: 'Version {v}',
    recordLimit: 'Record limit reached',
    yesterday: 'Yesterday',
    colors: {
      blue: 'Blue', green: 'Green', indigo: 'Indigo', orange: 'Orange', pink: 'Pink',
      purple: 'Purple', red: 'Red', teal: 'Teal', yellow: 'Yellow', gray: 'Gray',
    },
    defaultCategory: 'Personal',
  },
};

let current = 'en';

export function setLang(lang) {
  current = Object.hasOwn(STRINGS, lang) ? lang : 'en';
}

export function getLang() {
  return current;
}

export function locale() {
  return STRINGS[current].locale;
}

function interpolate(template, params) {
  return template.replace(/\{(\w+)\}/g, (m, key) => (Object.hasOwn(params, key) ? String(params[key]) : m));
}

export function t(key, params = {}) {
  const value = STRINGS[current][key] ?? STRINGS.en[key];
  if (typeof value !== 'string') return key;
  return interpolate(value, params);
}

export function colorName(color) {
  return STRINGS[current].colors[color] ?? color;
}

export function defaultCategoryName(lang) {
  return (STRINGS[lang] ?? STRINGS.en).defaultCategory;
}

export function formatCount(n) {
  const forms = STRINGS[current].count;
  const rule = new Intl.PluralRules(locale()).select(n);
  return interpolate(forms[rule] ?? forms.other, { n });
}

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Relative date by calendar day: time today, "Yesterday", weekday this week, else date. */
export function formatDate(timestamp, now = new Date()) {
  const date = new Date(timestamp);
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  const loc = locale();
  if (days <= 0) return date.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return t('yesterday');
  if (days < 7) return date.toLocaleDateString(loc, { weekday: 'long' });
  const opts = { day: 'numeric', month: 'short' };
  if (date.getFullYear() !== now.getFullYear()) opts.year = 'numeric';
  return date.toLocaleDateString(loc, opts);
}
