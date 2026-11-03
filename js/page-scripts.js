// Functions injected into web pages with chrome.scripting.executeScript.
//
// They are serialized and run in the page's isolated world, so each one must be
// fully self-contained (no imports, no outer variables). They never evaluate
// strings and only ever insert plain text — never HTML.

/**
 * Inserts `text` at the caret of the focused editable element.
 * With probeOnly=true it only reports whether there is such an element.
 * Returns 'inserted' | 'editable' | 'iframe' | 'no-field'.
 */
export function insertTextInPage(text, probeOnly) {
  const TEXT_INPUTS = new Set(['', 'text', 'search', 'url', 'tel', 'email']);

  let el = document.activeElement;
  while (el && el.shadowRoot && el.shadowRoot.activeElement) el = el.shadowRoot.activeElement;
  if (!el || el === document.body || el === document.documentElement) return 'no-field';
  if (el.tagName === 'IFRAME' || el.tagName === 'FRAME') return 'iframe';

  const type = (el.getAttribute('type') || '').toLowerCase();
  const isInput = el.tagName === 'INPUT' && TEXT_INPUTS.has(type);
  const isTextarea = el.tagName === 'TEXTAREA';
  const isRich = !isInput && !isTextarea && el.isContentEditable;
  if (!isInput && !isTextarea && !isRich) return 'no-field';
  if (el.disabled || el.readOnly) return 'no-field';
  if (probeOnly) return 'editable';

  el.focus();
  const notify = () => el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));

  // execCommand keeps the browser's undo stack and works with React/ProseMirror editors.
  let done = false;
  try { done = document.execCommand('insertText', false, text); } catch { done = false; }

  if (isInput || isTextarea) {
    if (done) return 'inserted';
    try {
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? start;
      el.setRangeText(text, start, end, 'end');
    } catch {
      el.value += text; // e.g. type=email does not expose a selection
    }
    notify();
    return 'inserted';
  }

  if (!done) {
    const sel = window.getSelection();
    if (!sel.rangeCount || !el.contains(sel.anchorNode)) {
      const r = document.createRange();
      r.selectNodeContents(el);
      r.collapse(false);
      sel.removeAllRanges();
      sel.addRange(r);
    }
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    notify();
  }
  return 'inserted';
}

/** Returns the selected text, preserving line breaks (contextMenus' selectionText collapses them). */
export function readSelectionInPage() {
  const el = document.activeElement;
  if (el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') && typeof el.selectionStart === 'number') {
    return el.value.slice(el.selectionStart, el.selectionEnd);
  }
  return String(window.getSelection() || '');
}
