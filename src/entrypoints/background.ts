// PhishLens background service worker (Manifest V3).
//
// Responsibilities:
//  - Keep the brand registry in memory (bundled JSON, no network).
//  - Hold the toolbar badge state. The badge is the TRUSTED verdict: a
//    malicious page can imitate anything it draws in-page, but it cannot
//    touch the toolbar icon or the popup. In-page banners are secondary.
//  - Store opt-in user reports locally (chrome.storage.local). Reports
//    strip query parameters and never include typed values.
//
// v0.1 does not auto-scan pages. The popup injects the collector only when
// the user clicks "X-ray this page" (activeTab + scripting).

import { REGISTRY } from '../lib/registry';

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
  void chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS.gray });
  void chrome.action.setBadgeText({ text: '' });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'phishlens:verdict') {
    const verdict = message.verdict as BadgeVerdict;
    void chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS[verdict] ?? BADGE_COLORS.gray });
    void chrome.action.setBadgeText({ text: BADGE_TEXT[verdict] ?? '' });
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
