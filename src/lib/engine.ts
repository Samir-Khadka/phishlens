// Sachet analysis engine — pure TypeScript, zero browser dependencies.
//
// This module turns page signals into a verdict (red / yellow / green / gray)
// plus human-readable reasons in English and Nepali. It is deliberately
// import-free so it can be unit-tested with Vitest, reused in a bot or CLI,
// and run by Node's type-stripping for a quick logic check.
//
// Verdict rules (in order):
//   1. Official domain of a verified brand + no warning signals  -> green
//   2. Login fields + brand mentioned + domain is NOT official   -> red
//   3. Look-alike / homoglyph / brand-in-subdomain domain         -> red
//   4. Login form posting to a different domain                   -> red
//   5. Login fields + any high-severity signal (e.g. no HTTPS)    -> red
//   6. Score >= 6                                                  -> red
//   6. Score >= 1                                                  -> yellow
//   7. Score == 0                                                  -> gray (unknown, no claim)
//   Official domain + some warning signals                        -> yellow
//
// URL-level checks (IP host, @-trick, unusual port, URL shortener) feed
// into the same score / severity rules above. analyzeUrl() reuses the
// same engine for a pasted link: address only, the page is never visited.
//
// Wording rule: never say "safe". Green means "no warning signs found"
// on a verified official domain. Phishing pages can pass checks.

export type Verdict = 'red' | 'yellow' | 'green' | 'gray';
export type Severity = 'high' | 'medium' | 'low';

export interface Brand {
  id: string;
  name: string;
  nameNe: string;
  /** Lowercase official domains, e.g. "esewa.com.np". Subdomains count. */
  officialDomains: string[];
  /** Lowercase name variants used for matching page text, e.g. ["esewa", "e-sewa", "ईसेवा"]. */
  nameVariants: string[];
  /** True only when officialDomains were checked against an official source. */
  verified: boolean;
  /** Where the official domains were confirmed (brand site, app listing, ...). */
  source: string;
  /** Optional logo hashes (SHA-256 of the logo file) for clone detection. */
  logoHashes?: string[];
}

export interface PageSignals {
  url: string;
  hostname: string;
  isHttps: boolean;
  hasPasswordField: boolean;
  hasOtpField: boolean;
  hasPinField: boolean;
  /** Hostnames that page forms submit to (action attributes), lowercased. */
  formActionHosts: string[];
  /** Lowercased visible-text sample of the page (title + body, truncated). */
  pageText: string;
  title: string;
  hasHiddenIframe: boolean;
  rightClickDisabled: boolean;
  pasteDisabled: boolean;
  hasObfuscatedScript: boolean;
}

export interface Reason {
  id: string;
  severity: Severity;
  en: string;
  ne: string;
}

/** One line of the "what was checked" list, in both languages. */
export interface CheckedItem {
  en: string;
  ne: string;
}

export interface AnalysisResult {
  verdict: Verdict;
  score: number;
  brandId: string | null;
  /** Official domain of the matched brand, when the page is on it. */
  officialDomain: string | null;
  reasons: Reason[];
  /** Plain-language list of what was checked, for the "why this verdict" view. */
  checked: CheckedItem[];
}

const WEIGHTS: Record<Severity, number> = { high: 3, medium: 2, low: 1 };

// ---------------------------------------------------------------------------
// Small string helpers
// ---------------------------------------------------------------------------

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost);
    }
    prev = cur;
  }
  return prev[b.length]!;
}

/** Second-level domains where the registrable domain is three labels. */
const THREE_LABEL_SUFFIXES = new Set([
  'com.np', 'org.np', 'edu.np', 'gov.np', 'net.np', 'mil.np',
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk',
  'com.au', 'org.au', 'net.au', 'edu.au',
  'co.in', 'org.in', 'net.in',
]);

/** Registrable domain: "www.esewa.com.np" -> "esewa.com.np". */
export function registrableDomain(hostname: string): string {
  const host = hostname.toLowerCase().replace(/^\.+|\.+$/g, '');
  const labels = host.split('.').filter(Boolean);
  if (labels.length <= 2) return host;
  const lastTwo = labels.slice(-2).join('.');
  if (THREE_LABEL_SUFFIXES.has(lastTwo)) return labels.slice(-3).join('.');
  return lastTwo;
}

/** Host part before the registrable domain, e.g. "www" in "www.esewa.com.np". */
export function subdomainPart(hostname: string): string {
  const reg = registrableDomain(hostname);
  const host = hostname.toLowerCase();
  if (host === reg) return '';
  return host.slice(0, host.length - reg.length - 1);
}

// Cyrillic / Greek / other look-alike characters mapped to Latin.
const CONFUSABLES: Record<string, string> = {
  'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'х': 'x', 'у': 'y',
  'і': 'i', 'ј': 'j', 'ѕ': 's', 'һ': 'h', 'ԁ': 'd', 'ɡ': 'g', 'κ': 'k',
  'м': 'm', 'н': 'h', 'т': 't', 'в': 'b', 'п': 'n', 'з': '3', 'ο': 'o',
  'α': 'a', 'ε': 'e', 'ι': 'i', 'ν': 'v', 'ρ': 'p', 'τ': 't', 'χ': 'x',
  'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a',
  'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
  'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
  'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
  'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
  'ý': 'y', 'ÿ': 'y', 'ñ': 'n', 'ç': 'c',
  '‐': '-', '‑': '-', '‒': '-', '–': '-', '—': '-',
  '０': '0', '１': '1', '２': '2', '３': '3', '４': '4',
  '５': '5', '６': '6', '７': '7', '８': '8', '９': '9',
  'ａ': 'a', 'ｂ': 'b', 'ｃ': 'c', 'ｄ': 'd', 'ｅ': 'e', 'ｆ': 'f',
  'ｇ': 'g', 'ｈ': 'h', 'ｉ': 'i', 'ｊ': 'j', 'ｋ': 'k', 'ｌ': 'l',
  'ｍ': 'm', 'ｎ': 'n', 'ｏ': 'o', 'ｐ': 'p', 'ｑ': 'q', 'ｒ': 'r',
  'ｓ': 's', 'ｔ': 't', 'ｕ': 'u', 'ｖ': 'v', 'ｗ': 'w', 'ｘ': 'x',
  'ｙ': 'y', 'ｚ': 'z',
};

/**
 * Normalise a hostname for comparison: lowercases, maps confusable
 * characters to Latin, and collapses common letter-substitution tricks
 * (rn -> m, cl -> d, vv -> w, 0 -> o, 1 -> l, 5 -> s).
 */
export function normalizeConfusables(hostname: string): string {
  let out = '';
  for (const ch of hostname.toLowerCase()) out += CONFUSABLES[ch] ?? ch;
  return out
    .replace(/rn/g, 'm')
    .replace(/cl/g, 'd')
    .replace(/vv/g, 'w')
    .replace(/0/g, 'o')
    .replace(/1/g, 'l')
    .replace(/5/g, 's');
}

/** True when the hostname carries a punycode (xn--) label. */
export function hasPunycode(hostname: string): boolean {
  return hostname.toLowerCase().split('.').some((label) => label.startsWith('xn--'));
}

/** True when the hostname is a bare IP address instead of a domain name. */
export function isIpHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  // IPv6 literals arrive without brackets in location.hostname.
  return host.includes(':');
}

/** URL shorteners that hide the real destination. */
const URL_SHORTENERS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly',
  'rb.gy', 'cutt.ly', 'shrtco.de', 'tiny.cc', 'rebrand.ly', 's.id',
  'shorturl.at', 'qr.ae',
]);

/** Parse the URL once for the address-level checks; null when unparseable. */
function urlParts(url: string): { username: string; port: string; path: string } | null {
  try {
    const u = new URL(url);
    return { username: u.username, port: u.port, path: u.pathname.toLowerCase() };
  } catch {
    return null;
  }
}

// TLDs that appear disproportionately in phishing. A signal, never a verdict.
const SUSPICIOUS_TLDS = new Set([
  'xyz', 'top', 'click', 'link', 'buzz', 'shop', 'online', 'site', 'fun',
  'icu', 'cyou', 'rest', 'live', 'lol', 'quest', 'cam', 'zip', 'mov',
  'bond', 'cfd', 'sbs', 'tokyo', 'gq', 'ml', 'ga', 'cf', 'tk',
]);

function tldOf(hostname: string): string {
  const labels = hostname.toLowerCase().split('.');
  return labels[labels.length - 1] ?? '';
}

// ---------------------------------------------------------------------------
// Urgency / scam language (English + Nepali, Devanagari and romanized)
// ---------------------------------------------------------------------------

export const URGENCY_PHRASES_EN = [
  'account will be blocked',
  'account will be suspended',
  'update kyc now',
  'verify your account immediately',
  'act now',
  'last chance',
  'within 24 hours',
  'you have won',
  'claim your prize',
  'urgent action required',
];

export const URGENCY_PHRASES_NE = [
  // Devanagari
  'खाता बन्द हुनेछ',
  'खाता रोकिनेछ',
  'तुरुन्त kyc अपडेट गर्नुहोस्',
  'तुरुन्तै kyc अपडेट गर्नुहोस्',
  'तपाईंले पुरस्कार जित्नुभयो',
  'पुरस्कार जित्नुभयो',
  'otp शेयर गर्नुहोस्',
  'otp दिनुहोस्',
  'pin दिनुहोस्',
  '२४ घण्टा भित्र',
  'अन्तिम मौका',
  'तुरुन्तै',
  // Romanized Nepali
  'khata banda hunechha',
  'khata block huncha',
  'kyc update garnus',
  'kyc update garnuhos',
  'puraskar jitnubhayo',
  'prize jityo',
  'otp dinus',
  'otp share garnus',
  'pin dinus',
  '24 ghanta bhitra',
  'antim mauka',
  'turuntai',
];

function findUrgency(text: string): string[] {
  const found: string[] = [];
  for (const phrase of [...URGENCY_PHRASES_EN, ...URGENCY_PHRASES_NE]) {
    if (text.includes(phrase)) found.push(phrase);
  }
  return found;
}

// ---------------------------------------------------------------------------
// Domain checks
// ---------------------------------------------------------------------------

function isOfficialDomain(hostname: string, brand: Brand): boolean {
  const host = hostname.toLowerCase();
  return brand.officialDomains.some(
    (d) => host === d || host.endsWith('.' + d),
  );
}

function brandToken(brand: Brand): string {
  // First variant is the canonical short token, e.g. "esewa".
  return brand.nameVariants[0] ?? brand.id;
}

function domainChecks(hostname: string, url: string, brands: Brand[]): Reason[] {
  const reasons: Reason[] = [];
  const host = hostname.toLowerCase();
  const reg = registrableDomain(host);
  const sub = subdomainPart(host);
  const path = (() => {
    try {
      return new URL(url).pathname.toLowerCase();
    } catch {
      return '';
    }
  })();

  for (const brand of brands) {
    if (!brand.verified) continue;
    if (isOfficialDomain(host, brand)) continue; // handled by the caller
    const token = brandToken(brand);

    for (const official of brand.officialDomains) {
      const officialReg = registrableDomain(official);

      // 1. Look-alike: small edit distance on the registrable domain.
      const maxEdits = officialReg.length <= 8 ? 1 : 2;
      const dist = levenshtein(reg, officialReg);
      if (dist > 0 && dist <= maxEdits) {
        reasons.push({
          id: 'lookalike-domain',
          severity: 'high',
          en: `This domain looks like ${official} but is spelled differently (${host} vs ${official}).`,
          ne: `यो डोमेन ${official} जस्तो देखिन्छ, तर हिज्जे फरक छ (${host} बनाम ${official})।`,
        });
        break;
      }

      // 2. Homoglyph: equal after confusable normalisation, different raw text.
      if (normalizeConfusables(reg) === normalizeConfusables(officialReg) && reg !== officialReg) {
        reasons.push({
          id: 'homoglyph-domain',
          severity: 'high',
          en: `This domain uses look-alike characters from another alphabet to imitate ${official}.`,
          ne: `यो डोमेनले ${official} को नक्कल गर्न अर्को वर्णमालाका उस्तै देखिने अक्षरहरू प्रयोग गरेको छ।`,
        });
        break;
      }
    }

    // 3. Brand name inside the domain itself: esewa-login.com,
    //    paypa1-secure-login.com, esewa.com (wrong ending). The check runs
    //    on the confusable-normalised domain so digit/letter substitutions
    //    (paypa1 -> paypal) are caught too. Short tokens (e.g. "nmb") only
    //    match as a whole hyphen-separated part — "nmb-login.com" is a
    //    look-alike, but "anmb.com" is not — while longer tokens match as
    //    a substring, as before.
    const normReg = normalizeConfusables(reg);
    const domainParts = normReg.split(/[.\\-]/);
    if (
      (token.length >= 4 && normReg.includes(token)) ||
      domainParts.includes(token)
    ) {
      reasons.push({
        id: 'brand-in-domain',
        severity: 'high',
        en: `The domain contains the brand name "${token}" but is not the official ${brand.officialDomains.join(', ')}.`,
        ne: `डोमेनमा ब्रान्डको नाम "${token}" छ, तर यो आधिकारिक ${brand.officialDomains.join(', ')} होइन।`,
      });
    }

    // 4. Brand name in a subdomain of an unrelated domain: esewa.com.evil.xyz
    if (sub && sub.split('.').some((label) => label.includes(token))) {
      reasons.push({
        id: 'brand-in-subdomain',
        severity: 'high',
        en: `The brand name "${token}" sits in the subdomain — the real site here is ${reg}, not ${token}.`,
        ne: `ब्रान्डको नाम "${token}" सबडोमेनमा छ — यहाँको वास्तविक साइट ${reg} हो, ${token} होइन।`,
      });
    }

    // 5. Brand name in the path of an unrelated domain: evil.com/esewa/login
    //    Same short-token rule as brand-in-domain: a whole path segment.
    const pathParts = path.split(/[^a-z0-9]+/).filter(Boolean);
    if ((token.length >= 4 && path.includes(token)) || pathParts.includes(token)) {
      reasons.push({
        id: 'brand-in-path',
        severity: 'medium',
        en: `The brand name "${token}" appears in the page address, but this is not ${brand.name}'s site.`,
        ne: `ब्रान्डको नाम "${token}" पेजको ठेगानामा देखिन्छ, तर यो ${brand.name} को साइट होइन।`,
      });
    }
  }

  const parts = urlParts(url);

  // 6. Bare IP address instead of a domain name. Real banks and wallets
  //    never ask you to log in at an IP address.
  if (isIpHostname(host)) {
    reasons.push({
      id: 'ip-host',
      severity: 'high',
      en: 'This site is reached by a bare IP address instead of a domain name — real banks and wallets never do this.',
      ne: 'यो साइट डोमेन नामको सट्टा खाली IP ठेगानाबाट खोलिएको छ — वास्तविक बैंक र वालेटले कहिल्यै यस्तो गर्दैनन्।',
    });
  }

  // 7. The @ trick: https://esewa.com.np@evil.com — the part before @ is
  //    not the real site; the browser goes to the part after it.
  if (parts && parts.username) {
    reasons.push({
      id: 'userinfo-trick',
      severity: 'high',
      en: `This address contains "@" — the part before it (${parts.username}) is not the real site. The browser actually goes to ${reg}.`,
      ne: `यो ठेगानामा "@" छ — त्यसअघिको भाग (${parts.username}) वास्तविक साइट होइन। ब्राउजरले वास्तवमा ${reg} खोल्छ।`,
    });
  }

  // 8. Unusual port on the address (the default ports 80/443 are already
  //    normalised away by the URL parser, so any port here is non-standard).
  if (parts && parts.port) {
    reasons.push({
      id: 'unusual-port',
      severity: 'medium',
      en: `This address uses an unusual port (:${parts.port}). Login pages on real sites almost never do.`,
      ne: `यो ठेगानामा असामान्य पोर्ट (:${parts.port}) प्रयोग भएको छ। वास्तविक साइटका लगइन पेजमा यस्तो लगभग कहिल्यै हुँदैन।`,
    });
  }

  // 9. URL shortener hiding the real destination.
  if (URL_SHORTENERS.has(reg)) {
    reasons.push({
      id: 'url-shortener',
      severity: 'medium',
      en: 'This is a shortened link — the real destination is hidden. Shortened links are a common way to smuggle a fake login page past you.',
      ne: 'यो छोटो पारिएको लिंक हो — वास्तविक गन्तव्य लुकेको छ। नक्कली लगइन पेज छिराउन छोटो लिंक धेरै प्रयोग हुन्छ।',
    });
  }

  // 10. Punycode trick.
  if (hasPunycode(host)) {
    reasons.push({
      id: 'punycode',
      severity: 'medium',
      en: 'This domain uses encoded characters (punycode), a common way to hide look-alike letters.',
      ne: 'यो डोमेनले इन्कोड गरिएका अक्षरहरू (punycode) प्रयोग गरेको छ — उस्तै देखिने अक्षर लुकाउने सामान्य तरिका हो।',
    });
  }

  // 11. Suspicious TLD.
  if (SUSPICIOUS_TLDS.has(tldOf(host))) {
    reasons.push({
      id: 'suspicious-tld',
      severity: 'low',
      en: `This domain uses .${tldOf(host)}, a top-level domain often seen in scam sites.`,
      ne: `यो डोमेनमा .${tldOf(host)} छ — ठगी साइटहरूमा धेरै देखिने एक्सटेन्सन हो।`,
    });
  }

  // 12. Excessive hyphens or subdomains.
  const hyphenCount = (reg.match(/-/g) ?? []).length;
  if (hyphenCount >= 3) {
    reasons.push({
      id: 'many-hyphens',
      severity: 'low',
      en: 'This domain has many hyphens, which is common in look-alike domains.',
      ne: 'यो डोमेनमा धेरै हाइफन छन् — नक्कली डोमेनहरूमा सामान्य कुरा हो।',
    });
  }
  if (host.split('.').length >= 5) {
    reasons.push({
      id: 'many-subdomains',
      severity: 'low',
      en: 'This address has an unusually deep chain of subdomains.',
      ne: 'यो ठेगानामा असामान्य रूपमा धेरै सबडोमेनहरू छन्।',
    });
  }

  return reasons;
}

// ---------------------------------------------------------------------------
// Page checks
// ---------------------------------------------------------------------------

function pageChecks(signals: PageSignals, brands: Brand[], officialBrand: Brand | null): Reason[] {
  const reasons: Reason[] = [];
  const host = signals.hostname.toLowerCase();
  const hasLoginField = signals.hasPasswordField || signals.hasOtpField || signals.hasPinField;
  const text = signals.pageText;

  // Brand mentioned on the page?
  const mentioned = brands.filter(
    (b) =>
      b.verified &&
      b.nameVariants.some((v) => v.length >= 3 && text.includes(v)),
  );

  // 1. Impersonation: login fields + brand mentioned + not the official site.
  if (hasLoginField && mentioned.length > 0 && !officialBrand) {
    const brand = mentioned[0]!;
    reasons.push({
      id: 'impersonation',
      severity: 'high',
      en: `This page asks for a password, OTP or PIN and mentions ${brand.name}, but it is not on ${brand.name}'s official site (${brand.officialDomains.join(', ')}).`,
      ne: `यो पेजले पासवर्ड, OTP वा PIN माग्छ र ${brand.name} को नाम लिन्छ, तर यो ${brand.name} को आधिकारिक साइट (${brand.officialDomains.join(', ')}) होइन।`,
    });
  }

  // 2. Login form submits to a different domain.
  if (hasLoginField) {
    const foreign = signals.formActionHosts.filter(
      (h) => h && h !== host && !h.endsWith('.' + host) && host !== h,
    );
    const foreignOffPage = foreign.filter((h) => {
      // A form posting to a subdomain of the same site is normal.
      const pageReg = registrableDomain(host);
      return registrableDomain(h) !== pageReg;
    });
    if (foreignOffPage.length > 0) {
      reasons.push({
        id: 'cross-domain-form',
        severity: 'high',
        en: `The login form sends what you type to ${foreignOffPage[0]}, a different site than this page.`,
        ne: `लगइन फारमले तपाईंले टाइप गरेको कुरा अर्को साइट ${foreignOffPage[0]} मा पठाउँछ।`,
      });
    }
  }

  // 3. No HTTPS on a login page.
  if (hasLoginField && !signals.isHttps) {
    reasons.push({
      id: 'no-https',
      severity: 'high',
      en: 'This login page does not use HTTPS — anything typed here can be read in transit.',
      ne: 'यो लगइन पेजले HTTPS प्रयोग गरेको छैन — यहाँ टाइप गरेको कुरा बाटोमै पढ्न सकिन्छ।',
    });
  }

  // 4. Urgency / scam language.
  const urgency = findUrgency(text);
  if (urgency.length > 0) {
    reasons.push({
      id: 'urgency-language',
      severity: 'medium',
      en: `The page uses pressure language ("${urgency[0]}") — a common scam tactic.`,
      ne: `पेजमा दबाब दिने भाषा छ ("${urgency[0]}") — यो ठगीको सामान्य तरिका हो।`,
    });
  }

  // 5. Hidden iframes on a login page.
  if (hasLoginField && signals.hasHiddenIframe) {
    reasons.push({
      id: 'hidden-iframe',
      severity: 'medium',
      en: 'Hidden frames were found on this login page.',
      ne: 'यो लगइन पेजमा लुकेका फ्रेमहरू भेटिए।',
    });
  }

  // 6. Right-click / paste blocked on a login page.
  if (hasLoginField && (signals.rightClickDisabled || signals.pasteDisabled)) {
    reasons.push({
      id: 'input-restrictions',
      severity: 'medium',
      en: 'Right-click or paste is blocked here — a common phishing trick to stop you checking the page.',
      ne: 'यहाँ राइट-क्लिक वा पेस्ट रोकिएको छ — पेज जाँच्न नदिने फिसिङको सामान्य तरिका हो।',
    });
  }

  // 7. Heavily obfuscated scripts.
  if (signals.hasObfuscatedScript) {
    reasons.push({
      id: 'obfuscated-script',
      severity: 'low',
      en: 'The page contains heavily obfuscated scripts.',
      ne: 'पेजमा धेरै लुकाइएका (obfuscated) स्क्रिप्टहरू छन्।',
    });
  }

  return reasons;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function analyzePage(signals: PageSignals, brands: Brand[]): AnalysisResult {
  const host = signals.hostname.toLowerCase();
  const officialBrand =
    brands.find((b) => b.verified && isOfficialDomain(host, b)) ?? null;

  const reasons: Reason[] = [];
  const checked: CheckedItem[] = [];

  checked.push({
    en: 'Domain compared against the verified brand registry',
    ne: 'डोमेन प्रमाणित ब्रान्ड रजिस्ट्रीसँग तुलना गरियो',
  });
  if (officialBrand) {
    checked.push({
      en: `Matched official domain of ${officialBrand.name}`,
      ne: `${officialBrand.nameNe} को आधिकारिक डोमेनसँग मिल्यो`,
    });
  }

  // Domain checks always run (except the look-alike family is skipped when
  // the page IS the official domain — handled inside domainChecks).
  reasons.push(...domainChecks(signals.hostname, signals.url, brands));
  checked.push({
    en: 'Look-alike, homoglyph, subdomain and path tricks checked',
    ne: 'उस्तै देखिने, होमोग्लिफ, सबडोमेन र पाथका छलहरू जाँचिए',
  });

  const hasLoginField =
    signals.hasPasswordField || signals.hasOtpField || signals.hasPinField;
  if (hasLoginField) {
    checked.push({
      en: 'Login form found on the page',
      ne: 'पेजमा लगइन फारम भेटियो',
    });
  }
  reasons.push(...pageChecks(signals, brands, officialBrand));
  checked.push({
    en: 'Form destination, HTTPS, urgency language and page tricks checked',
    ne: 'फारमको गन्तव्य, HTTPS, दबाब दिने भाषा र पेजका छलहरू जाँचिए',
  });

  const score = reasons.reduce((sum, r) => sum + WEIGHTS[r.severity], 0);
  const hasImpersonation = reasons.some((r) => r.id === 'impersonation');
  const hasDomainImpersonation = reasons.some((r) =>
    ['lookalike-domain', 'homoglyph-domain', 'brand-in-subdomain', 'brand-in-domain'].includes(r.id),
  );
  const hasCrossDomainForm = reasons.some((r) => r.id === 'cross-domain-form');
  const hasHighSeverity = reasons.some((r) => r.severity === 'high');

  let verdict: Verdict;
  if (officialBrand && reasons.length === 0) {
    verdict = 'green';
  } else if (officialBrand) {
    verdict = 'yellow';
  } else if (hasImpersonation || hasDomainImpersonation) {
    verdict = 'red';
  } else if (hasCrossDomainForm && hasLoginField) {
    verdict = 'red';
  } else if (hasLoginField && hasHighSeverity) {
    verdict = 'red';
  } else if (score >= 6) {
    verdict = 'red';
  } else if (score >= 1) {
    verdict = 'yellow';
  } else {
    verdict = 'gray';
  }

  // Green / gray get a single plain-language note instead of an empty list.
  if (verdict === 'green' && officialBrand) {
    reasons.push({
      id: 'official-domain',
      severity: 'low',
      en: `No warning signs found on the verified official domain ${officialBrand.officialDomains[0]}.`,
      ne: `प्रमाणित आधिकारिक डोमेन ${officialBrand.officialDomains[0]} मा कुनै चेतावनी संकेत भेटिएन।`,
    });
  } else if (verdict === 'gray') {
    reasons.push({
      id: 'unknown-site',
      severity: 'low',
      en: 'Unknown site — Sachet makes no claim about it. No login form or brand signals were found.',
      ne: 'अपरिचित साइट — Sachet ले यसबारे कुनै दाबी गर्दैन। कुनै लगइन फारम वा ब्रान्ड संकेत भेटिएन।',
    });
  }

  return {
    verdict,
    score,
    brandId: officialBrand?.id ?? null,
    officialDomain: officialBrand?.officialDomains[0] ?? null,
    reasons,
    checked,
  };
}

// ---------------------------------------------------------------------------
// Address-only check (pasted link — the page is never visited)
// ---------------------------------------------------------------------------

/**
 * Check a pasted link by its address alone. Returns null when the text is
 * not a usable http(s) address. No login form or page text exists here, so
 * the verdict rests on the domain checks only, and a clean address is
 * reported as gray with an explicit "address only" note — never green
 * beyond the official-domain case, and never a claim about the page.
 */
export function analyzeUrl(rawUrl: string, brands: Brand[]): AnalysisResult | null {
  const text = rawUrl.trim();
  // A non-web scheme (ftp://, file://, ...) is not a checkable link.
  // Note the order: prepending https:// to "ftp://x" would silently
  // turn it into a different address, so reject other schemes first.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text) && !/^https?:\/\//i.test(text)) return null;
  let parsed: URL;
  try {
    parsed = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  const signals: PageSignals = {
    url: parsed.href,
    hostname: parsed.hostname.toLowerCase(),
    isHttps: parsed.protocol === 'https:',
    hasPasswordField: false,
    hasOtpField: false,
    hasPinField: false,
    formActionHosts: [],
    pageText: '',
    title: '',
    hasHiddenIframe: false,
    rightClickDisabled: false,
    pasteDisabled: false,
    hasObfuscatedScript: false,
  };

  const result = analyzePage(signals, brands);
  result.checked = [
    {
      en: 'Only the address was checked — the page itself was not visited, so no login form or page text was seen',
      ne: 'ठेगाना मात्र जाँचियो — पेज खोलिएको छैन, त्यसैले कुनै लगइन फारम वा पेजको पाठ हेरिएन',
    },
    ...result.checked,
  ];

  if (result.verdict === 'gray') {
    result.reasons = [
      {
        id: 'url-only-gray',
        severity: 'low',
        en: 'This address shows no warning signs, but only the address was checked — the page itself was not visited. Only open it if you trust who sent it.',
        ne: 'यो ठेगानामा कुनै चेतावनी संकेत देखिएन, तर ठेगाना मात्र जाँचिएको हो — पेज खोलिएको छैन। पठाउने व्यक्तिलाई विश्वास छ भने मात्र खोल्नुहोस्।',
      },
    ];
  }
  return result;
}
