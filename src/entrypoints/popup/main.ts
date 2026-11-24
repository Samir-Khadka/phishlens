// Sachet popup.
//
// Flow (v0.1, click-to-scan):
//   1. On open, read the active tab and inject collectPageSignals() into it
//      (chrome.scripting + activeTab — no host permissions needed).
//   2. Run the pure analysis engine locally on the collected signals.
//   3. Render the verdict + reasons in English or Nepali.
//   4. Send the verdict to the background worker so the toolbar badge
//      shows the trusted verdict (pages cannot draw over the badge).
//
// Nothing leaves the device: no URLs, page text or typed values are sent
// anywhere. The only outbound action is the optional, user-initiated
// "Report this page", which stores a stripped URL locally.

import { analyzePage } from '../../lib/engine';
import type { PageSignals, Verdict } from '../../lib/engine';
import { collectPageSignals } from '../../lib/collect';
import { verifiedBrands } from '../../lib/registry';
import { getStrings } from '../../lib/i18n';
import type { Lang } from '../../lib/i18n';

const $ = (id: string) => document.getElementById(id)!;

let lang: Lang = 'en';
let lastResult: ReturnType<typeof analyzePage> | null = null;
let lastSignals: PageSignals | null = null;

async function loadLang(): Promise<Lang> {
  const stored = await chrome.storage.local.get('lang');
  return stored.lang === 'ne' ? 'ne' : 'en';
}

function renderStrings(): void {
  const s = getStrings(lang);
  ($('tagline') as HTMLElement).textContent = s.appTagline;
  ($('lang-toggle') as HTMLButtonElement).textContent = s.languageLabel;
  ($('xray-button') as HTMLButtonElement).textContent = s.xrayButton;
  ($('reasons-title') as HTMLElement).textContent = s.reasonsTitle;
  ($('checked-title') as HTMLElement).textContent = s.checkedTitle;
  ($('report-button') as HTMLButtonElement).textContent = s.reportButton;
  ($('official-button') as HTMLButtonElement).textContent = s.officialSiteButton;
  ($('privacy-note') as HTMLElement).textContent = s.privacyNote;
  ($('privacy-link') as HTMLAnchorElement).textContent = s.privacyLink;
  if (lastResult) renderResult(lastResult);
}

function verdictText(v: Verdict): { title: string; sub: string } {
  const s = getStrings(lang);
  switch (v) {
    case 'red':
      return { title: s.verdictRed, sub: s.verdictRedSub };
    case 'yellow':
      return { title: s.verdictYellow, sub: s.verdictYellowSub };
    case 'green':
      return { title: s.verdictGreen, sub: s.verdictGreenSub };
    case 'gray':
      return { title: s.verdictGray, sub: s.verdictGraySub };
  }
}

function renderResult(result: ReturnType<typeof analyzePage>): void {
  lastResult = result;
  const card = $('verdict-card');
  card.className = `verdict-card verdict-${result.verdict}`;
  const text = verdictText(result.verdict);
  ($('verdict-title') as HTMLElement).textContent = text.title;
  ($('verdict-sub') as HTMLElement).textContent = text.sub;

  const reasonsList = $('reasons-list');
  reasonsList.innerHTML = '';
  for (const reason of result.reasons) {
    const li = document.createElement('li');
    li.className = `reason severity-${reason.severity}`;
    li.textContent = lang === 'ne' ? reason.ne : reason.en;
    reasonsList.appendChild(li);
  }

  const checkedList = $('checked-list');
  checkedList.innerHTML = '';
  for (const item of result.checked) {
    const li = document.createElement('li');
    li.textContent = item;
    checkedList.appendChild(li);
  }

  // Offer the official site when the page claims a brand but isn't on it.
  const officialButton = $('official-button') as HTMLButtonElement;
  officialButton.hidden = true;
  officialButton.onclick = null;
  const impersonated = result.reasons.some((r) => r.id === 'impersonation');
  if (impersonated) {
    // Find the impersonated brand from the page text the collector saved.
    const mentioned = verifiedBrands().find((b) =>
      (lastSignals?.pageText ?? '').includes(b.nameVariants[0] ?? b.id),
    );
    if (mentioned) {
      officialButton.hidden = false;
      officialButton.onclick = () => {
        void chrome.tabs.create({ url: `https://${mentioned.officialDomains[0]}` });
      };
    }
  }
}

async function runXray(): Promise<void> {
  const s = getStrings(lang);
  const card = $('verdict-card');
  card.className = 'verdict-card verdict-gray';
  ($('verdict-title') as HTMLElement).textContent = s.checking;
  ($('verdict-sub') as HTMLElement).textContent = '';
  ($('reasons-list') as HTMLElement).innerHTML = '';
  ($('checked-list') as HTMLElement).innerHTML = '';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) return;
  const url = new URL(tab.url);
  $('domain').textContent = url.hostname;

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    // chrome://, about:, extension pages — nothing to X-ray.
    renderResult({
      verdict: 'gray',
      score: 0,
      brandId: null,
      officialDomain: null,
      reasons: [
        {
          id: 'unknown-site',
          severity: 'low',
          en: 'This is a browser page, not a website — nothing to check here.',
          ne: 'यो ब्राउजरको पेज हो, वेबसाइट होइन — यहाँ जाँच्नुपर्ने केही छैन।',
        },
      ],
      checked: [],
    });
    return;
  }

  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: collectPageSignals,
    });
    if (!result) return;
    lastSignals = result as PageSignals;
    const analysis = analyzePage(lastSignals, verifiedBrands());
    renderResult(analysis);
    void chrome.runtime.sendMessage({ type: 'phishlens:verdict', verdict: analysis.verdict });
  } catch (err) {
    // Injection can fail on restricted pages (e.g. Chrome Web Store).
    ($('verdict-title') as HTMLElement).textContent =
      lang === 'ne' ? 'यो पेज जाँच्न सकिएन' : 'Could not check this page';
    ($('verdict-sub') as HTMLElement).textContent =
      lang === 'ne'
        ? 'ब्राउजरले यो पेजमा जाँच गर्न दिएन। ठेगाना बार आफैं जाँच्नुहोस्।'
        : 'The browser did not allow checking this page. Check the address bar yourself.';
    console.warn('Sachet injection failed:', err);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  lang = await loadLang();
  renderStrings();
  $('xray-button').addEventListener('click', () => void runXray());
  $('lang-toggle').addEventListener('click', async () => {
    lang = lang === 'en' ? 'ne' : 'en';
    await chrome.storage.local.set({ lang });
    renderStrings();
  });
  $('report-button').addEventListener('click', async () => {
    if (!lastSignals || !lastResult) return;
    await chrome.runtime.sendMessage({
      type: 'phishlens:report',
      url: lastSignals.url,
      hostname: lastSignals.hostname,
      verdict: lastResult.verdict,
      reasons: lastResult.reasons.map((r) => r.en),
    });
    const done = $('report-done');
    done.hidden = false;
    done.textContent = getStrings(lang).reportDone;
  });
  // Auto-run on open: the user clicked the icon to X-ray the page.
  await runXray();
});
