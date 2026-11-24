// Page-signal collector.
//
// This function is INJECTED into the active tab with chrome.scripting
// executeScript when the user clicks "X-ray this page". It must therefore
// be fully self-contained: no imports, no references to other modules, no
// browser-extension APIs. It only READS the page — it never reads or stores
// what the user typed into fields (input values are never collected).
//
// It returns a plain JSON-able object matching the PageSignals interface
// in src/lib/engine.ts. Keep the two in sync by hand; the Vitest suite
// checks the shape.

export interface CollectedSignals {
  url: string;
  hostname: string;
  isHttps: boolean;
  hasPasswordField: boolean;
  hasOtpField: boolean;
  hasPinField: boolean;
  formActionHosts: string[];
  pageText: string;
  title: string;
  hasHiddenIframe: boolean;
  rightClickDisabled: boolean;
  pasteDisabled: boolean;
  hasObfuscatedScript: boolean;
}

export function collectPageSignals(): CollectedSignals {
  const doc = document;
  const loc = window.location;

  const inputs = Array.from(doc.querySelectorAll('input'));
  const hasPasswordField = inputs.some(
    (i) => i.type === 'password' || (i.getAttribute('autocomplete') ?? '') === 'current-password',
  );
  const hasOtpField = inputs.some((i) => {
    const hay = `${i.type} ${i.name} ${i.id} ${i.getAttribute('autocomplete') ?? ''} ${i.placeholder ?? ''}`.toLowerCase();
    return (
      hay.includes('otp') ||
      hay.includes('one-time') ||
      hay.includes('verification code') ||
      hay.includes('2fa')
    );
  });
  const hasPinField = inputs.some((i) => {
    const hay = `${i.name} ${i.id} ${i.placeholder ?? ''}`.toLowerCase();
    return (
      hay.includes('pin') &&
      (i.type === 'password' || i.inputMode === 'numeric' || i.maxLength === 4 || i.maxLength === 6)
    );
  });

  const formActionHosts: string[] = [];
  for (const form of Array.from(doc.querySelectorAll('form'))) {
    const action = form.getAttribute('action');
    if (!action) continue;
    try {
      const u = new URL(action, loc.href);
      if (u.protocol.startsWith('http') && !formActionHosts.includes(u.hostname)) {
        formActionHosts.push(u.hostname.toLowerCase());
      }
    } catch {
      // Relative or malformed action — same page, ignore.
    }
  }

  const iframes = Array.from(doc.querySelectorAll('iframe'));
  const hasHiddenIframe = iframes.some((f) => {
    const style = window.getComputedStyle(f);
    const w = Number(f.width) || 0;
    const h = Number(f.height) || 0;
    return (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      (w <= 2 && h <= 2) ||
      (f.style.position === 'absolute' && (f.style.left.includes('-') || f.style.top.includes('-')))
    );
  });

  // Pages cannot be trusted to report their own handlers, but the common
  // phishing pattern sets these as attributes or direct properties.
  const rightClickDisabled =
    !!doc.oncontextmenu ||
    doc.documentElement.getAttribute('oncontextmenu') !== null ||
    doc.body?.getAttribute('oncontextmenu') !== null;
  const pasteDisabled = inputs.some(
    (i) =>
      i.getAttribute('onpaste') !== null ||
      i.getAttribute('oncopy') !== null ||
      i.getAttribute('oncut') !== null,
  );

  // Heuristic only: very long inline scripts with little whitespace and
  // heavy use of eval / fromCharCode / hex escapes.
  let hasObfuscatedScript = false;
  for (const s of Array.from(doc.querySelectorAll('script:not([src])'))) {
    const text = s.textContent ?? '';
    if (text.length < 5000) continue;
    const noSpace = text.replace(/\s+/g, '').length;
    const evalish = (text.match(/eval|fromCharCode|\\x[0-9a-f]{2}|atob\(/gi) ?? []).length;
    if (noSpace / Math.max(text.length, 1) > 0.9 || evalish >= 5) {
      hasObfuscatedScript = true;
      break;
    }
  }

  const text = `${doc.title}\n${doc.body ? doc.body.innerText : ''}`
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, 4000);

  return {
    url: loc.href,
    hostname: loc.hostname.toLowerCase(),
    isHttps: loc.protocol === 'https:',
    hasPasswordField,
    hasOtpField,
    hasPinField,
    formActionHosts,
    pageText: text,
    title: doc.title,
    hasHiddenIframe,
    rightClickDisabled,
    pasteDisabled,
    hasObfuscatedScript,
  };
}
