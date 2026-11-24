// Sachet background service worker (Manifest V3).
//
// Responsibilities:
//  - Keep the brand registry in memory (bundled JSON, no network).
//  - Hold the toolbar badge state. The badge is the TRUSTED verdict: a
//    malicious page can imitate anything it draws in-page, but it cannot
//    touch the toolbar icon or the popup. In-page banners are secondary.
//  - Store opt-in user reports locally (chrome.storage.local). Reports
//    strip query parameters and never include typed values.
//  - Automatic protection (opt-in, off by default): when the user turns it
//    on in the popup, the worker checks each finished page load the same
//    way the popup does, updates the badge, and warns once per tab when
//    a page looks fake. It only runs after the browser grants the optional
//    host permission the user approved.
//
// Click-to-scan (the default) does not auto-scan pages. The popup injects
// the collector only when the user clicks "X-ray this page" (activeTab +
// scripting).

import { analyzePage } from '../lib/engine';
import { collectPageSignals } from '../lib/collect';
import { REGISTRY, verifiedBrands } from '../lib/registry';

type BadgeVerdict = 'red' | 'yellow' | 'green' | 'gray';

const BADGE_COLORS: Record<BadgeVerdict, string> = {
  red: '#C62828',
  yellow: '#F9A825',
  green: '#2E7D32',
  gray: '#757575',
};

const BADGE_TEXT: Record<BadgeVerdict, string> = {
  red: '!',
  yellow: '?',
  green: '✓',
  gray: '',
};

interface Report {
  url: string;
  hostname: string;
  verdict: BadgeVerdict;
  reasons: string[];
  reportedAt: string;
}

chrome.runtime.onInstalled.addListener(() => {
  // Default badge: neutral until the user X-rays a page.
  void setBadge('gray');
});

/** Set the toolbar badge for the current tab (or all tabs when tabId is omitted). */
async function setBadge(verdict: BadgeVerdict, tabId?: number): Promise<void> {
  const options = tabId !== undefined ? { tabId } : {};
  await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS[verdict] ?? BADGE_COLORS.gray, ...options });
  await chrome.action.setBadgeText({ text: BADGE_TEXT[verdict] ?? '', ...options });
}

// ---------------------------------------------------------------------------
// Automatic protection (opt-in)
// ---------------------------------------------------------------------------

const AUTO_ORIGINS = { origins: ['*://*/*'] };

/** Tab ids already warned about in this navigation, so a red page warns once. */
const warnedTabs = new Set<number>();

async function autoProtectEnabled(): Promise<boolean> {
  const stored = await chrome.storage.local.get('autoProtect');
  if (stored.autoProtect !== true) return false;
  // The user can revoke the permission from the browser's extension page;
  // the toggle must then read as off.
  return chrome.permissions.contains(AUTO_ORIGINS);
}

async function autoScanTab(tabId: number, url: string): Promise<void> {
  if (!(await autoProtectEnabled())) return;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return;
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: collectPageSignals,
    });
    if (!result) return;
    const analysis = analyzePage(result, verifiedBrands());
    await setBadge(analysis.verdict, tabId);
    if (analysis.verdict === 'red' && !warnedTabs.has(tabId)) {
      warnedTabs.add(tabId);
      await chrome.notifications.create(`sachet-red-${tabId}`, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icon-48.png'),
        title: 'Sachet: this page looks fake — do not log in',
        message: `${parsed.hostname} shows strong signs of imitating a real brand. Do not enter your password, OTP or PIN here.`,
      });
    }
  } catch {
    // Injection can fail on restricted pages (e.g. the Chrome Web Store).
    // Automatic protection simply does nothing there; click-to-scan in the
    // popup explains it if the user opens it.
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') warnedTabs.delete(tabId);
  if (changeInfo.status !== 'complete' || !tab.url) return;
  void autoScanTab(tabId, tab.url);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  warnedTabs.delete(tabId);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'phishlens:verdict') {
    const verdict = message.verdict as BadgeVerdict;
    void setBadge(verdict);
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === 'phishlens:report') {
    const report: Report = {
      url: stripUrl(message.url as string),
      hostname: message.hostname as string,
      verdict: message.verdict as BadgeVerdict,
      reasons: Array.isArray(message.reasons) ? (message.reasons as string[]) : [],
      reportedAt: new Date().toISOString(),
    };
    void chrome.storage.local.get('reports').then((stored) => {
      const reports = (stored.reports as Report[] | undefined) ?? [];
      reports.push(report);
      void chrome.storage.local.set({ reports });
    });
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === 'phishlens:registry') {
    // Lets the popup (or a future content script) read the registry without
    // bundling the JSON twice. Only brand data crosses this boundary.
    sendResponse({ brands: REGISTRY });
    return true;
  }

  if (message?.type === 'phishlens:get-reports') {
    void chrome.storage.local.get('reports').then((stored) => {
      sendResponse({ reports: (stored.reports as Report[] | undefined) ?? [] });
    });
    return true;
  }

  if (message?.type === 'phishlens:clear-reports') {
    void chrome.storage.local.set({ reports: [] }).then(() => {
      sendResponse({ ok: true });
    });
    return true;
  }

  return false;
});

/** Strip query string and fragment before storing a reported URL. */
function stripUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}${u.pathname}`;
  } catch {
    return url.split(/[?#]/)[0] ?? url;
  }
}
