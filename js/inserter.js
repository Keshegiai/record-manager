// Inserting records into web pages. Shared by the side panel and the background worker.
//
// Access model (least privilege):
//  * Context-menu clicks and the keyboard shortcut grant temporary `activeTab`
//    access, so "Insert record" from the right-click menu works on any site with
//    no extra permission.
//  * Inserting from the panel into an arbitrary tab needs host access, which is an
//    optional permission the user grants once, explicitly, from the panel.

import { insertTextInPage, readSelectionInPage } from './page-scripts.js';

export const HOST_ACCESS = Object.freeze({ origins: ['<all_urls>'] });

/** Result: 'inserted' | 'no-field' | 'no-access' | 'no-tab'. */
export async function insertIntoTab(tabId, text, frameId) {
  try {
    if (frameId !== undefined) {
      const [res] = await chrome.scripting.executeScript({
        target: { tabId, frameIds: [frameId] }, func: insertTextInPage, args: [text, false],
      });
      return res?.result === 'inserted' ? 'inserted' : 'no-field';
    }

    const [top] = await chrome.scripting.executeScript({
      target: { tabId, frameIds: [0] }, func: insertTextInPage, args: [text, false],
    });
    if (top?.result === 'inserted') return 'inserted';
    if (top?.result !== 'iframe') return 'no-field';

    // The caret is inside an iframe: find the frame that has an editable focus, then insert there.
    const probes = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true }, func: insertTextInPage, args: [text, true],
    });
    const frame = probes.find((p) => p.frameId !== 0 && p.result === 'editable');
    if (!frame) return 'no-field';
    return insertIntoTab(tabId, text, frame.frameId);
  } catch {
    return 'no-access';
  }
}

/** The active tab of the browser window the user worked in last (not our pop-out window). */
export async function getTargetTab() {
  try {
    const win = await chrome.windows.getLastFocused({ windowTypes: ['normal'] });
    const [tab] = await chrome.tabs.query({ active: true, windowId: win.id });
    return tab ?? null;
  } catch {
    return null;
  }
}

export async function insertIntoActiveTab(text) {
  const tab = await getTargetTab();
  if (!tab?.id) return 'no-tab';
  return insertIntoTab(tab.id, text);
}

export async function readSelection(tabId, frameId = 0) {
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId, frameIds: [frameId] }, func: readSelectionInPage,
    });
    return typeof res?.result === 'string' ? res.result : '';
  } catch {
    return '';
  }
}

export function hasHostAccess() {
  return chrome.permissions.contains(HOST_ACCESS);
}
