# Record Manager

A Chrome / Edge extension for saving text snippets, reply templates and AI prompts in the browser's **side panel**, and inserting them straight into any text field.

The design follows Apple's **Liquid Glass**: translucent, refractive surfaces on a plain, solid background — no gradients. A fully opaque mode is one switch away.

## Features

- **Insert into the page**: click a record to insert it at the cursor in the focused field — inputs, textareas, rich editors (ChatGPT, Gmail, Notion…), fields inside iframes. If no field is focused, the text is copied instead. Click behavior (insert or copy) is configurable.
- **Right-click menu**: *Save Selection* (to any category) and *Insert Record* (grouped by category) on every site — no extra permission needed.
- **Side panel or separate window**: the panel can be resized by dragging its edge; *Open in Separate Window* gives a freely resizable window whose size is remembered. The layout adapts — one column when narrow, a grid of cards when wide.
- **Liquid Glass design** with real SVG refraction (Chromium), plus Light, Dark and Auto themes and a solid mode. Respects *reduce motion* and *reduce transparency*.
- **Shortcut**: `Alt + Shift + R` opens the panel.
- **Categories** with a fixed color palette, filter chips and a category picker.
- **Search** across record text and category names; sort by date or alphabetically.
- **Clear feedback**: every insert or copy is confirmed, and failures (no field, blocked page, clipboard unavailable) are explained.
- **Edit** in a bottom sheet; **delete with undo** (several deletions can be undone together).
- **Export / import** a JSON backup. Import merges data and never overwrites existing records.
- **Languages**: Русский, Қазақша, English.
- **Keyboard**: `Ctrl/⌘ + Enter` or `Ctrl/⌘ + S` saves, `Ctrl/⌘ + F` focuses search, `Esc` closes dialogs.
- Accessible: real buttons, ARIA roles for segmented controls and menus, visible focus, `prefers-reduced-motion` support.

## Privacy & security

Records are stored only in `chrome.storage.local` on your device. The extension makes **no network requests** and collects no data.

- **Minimal permissions, no install warnings**: `storage`, `sidePanel`, `contextMenus`, `activeTab`, `scripting`.
  - The right-click menu and the shortcut use `activeTab`: temporary access to the current tab only, granted by your click.
  - Inserting by clicking in the panel needs host access, which is an **optional** permission requested only when you press *Allow*, and can be revoked in Settings at any time.
  - The extension never reads page content. Injected code only inserts plain text (never HTML) or reads the selection you asked to save.
- **Strict Content Security Policy**: `default-src 'none'; script-src 'self'; style-src 'self'; …`. No remote code, no inline scripts or styles, and `connect-src` is `'none'`, so extension pages cannot send data anywhere.
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

Requires Chrome or Edge 116 or newer.

## Project structure

```
manifest.json        MV3 manifest with a strict CSP
background.js        Side panel behavior and the right-click menu
sidepanel.html       Markup and inline SVG icon sprite
css/sidepanel.css    Design tokens (light/dark) and components
js/app.js            UI: rendering and events
js/schema.js         Data model, validation, migration, import/export (pure, unit-tested)
js/storage.js        chrome.storage wrapper (serialized writes, multi-window sync)
js/inserter.js       Finds the target tab/frame and inserts text (least-privilege access)
js/page-scripts.js   Self-contained functions injected into pages (insert text, read selection)
img/lens.png         Displacement map for the Liquid Glass refraction filter
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
