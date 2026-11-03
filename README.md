# Record Manager

A Chrome extension for saving text snippets, reply templates and AI prompts in the browser's **side panel**. Click a record to copy it.

The design is minimal and iOS-inspired: flat surfaces, Apple system colors, hairline separators, no gradients.

## Features

- **Side panel**: stays open while you work on the page.
- **Light, Dark and Auto themes**: Auto follows the system setting.
- **Categories** with a fixed color palette, filter chips and a category picker.
- **Search** across record text and category names; sort by date or alphabetically.
- **Click to copy**, with confirmation (and an error message if the clipboard is unavailable).
- **Edit** in a bottom sheet; **delete with undo** (several deletions can be undone together).
- **Export / import** a JSON backup. Import merges data and never overwrites existing records.
- **Languages**: Русский, Қазақша, English.
- **Keyboard**: `Ctrl/⌘ + Enter` or `Ctrl/⌘ + S` saves, `Ctrl/⌘ + F` focuses search, `Esc` closes dialogs.
- Accessible: real buttons, ARIA roles for segmented controls and menus, visible focus, `prefers-reduced-motion` support.

## Privacy & security

Records are stored only in `chrome.storage.local` on your device. The extension makes **no network requests** and collects no data.

- **Minimal permissions**: only `storage` and `sidePanel`. (The unused `tabs` permission from v1 was removed.)
- **Strict Content Security Policy**: `default-src 'none'; script-src 'self'; style-src 'self'; …`. No remote code, no inline scripts or styles, and `connect-src` is `'none'`, so the page cannot send data anywhere.
- **No HTML injection**: the UI never uses `innerHTML`. All user data is rendered with `textContent`.
- **Validated data**: everything read from storage or an imported file goes through `js/schema.js`, which:
  - enforces types and limits (20,000 characters per record, 5,000 records, 50 categories, 5 MB import);
  - strips control characters, and removes zero-width and bidi-override characters from names (Trojan Source-style spoofing);
  - allows only palette colors, so a color can never inject CSS;
  - ignores prototype-pollution keys and unknown fields.
- **Safe migration**: data from v1 is converted automatically, and an untouched copy is kept under `legacyBackupV1`.

## Installation (developer mode)

1. Clone or download this repository.
2. Open `chrome://extensions/` and turn on **Developer mode**.
3. Click **Load unpacked** and select the project folder (the one containing `manifest.json`).
4. Click the extension icon to open the side panel.

Requires Chrome 116 or newer.

## Project structure

```
manifest.json        MV3 manifest with a strict CSP
background.js        Opens the side panel on toolbar click
sidepanel.html       Markup and inline SVG icon sprite
css/sidepanel.css    Design tokens (light/dark) and components
js/app.js            UI: rendering and events
js/schema.js         Data model, validation, migration, import/export (pure, unit-tested)
js/storage.js        chrome.storage wrapper (serialized writes, multi-window sync)
js/i18n.js           RU / KK / EN strings, plurals, dates
js/theme-boot.js     Applies the saved theme before first paint
_locales/            Store name and description (en, ru)
tests/               Unit tests (node:test, no dependencies)
```

## Development

```bash
npm test
```

The tests use Node's built-in test runner (Node 20+) and need no `npm install`.
