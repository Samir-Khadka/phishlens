// Standalone engine check — runs the real src/lib/engine.ts with Node's
// built-in type stripping (Node 22.6+), no npm install needed.
// Mirrors the Vitest suite's core assertions. Run: node tests/check-engine.node.ts
import assert from 'node:assert/strict';
import {
  analyzePage,
  analyzeUrl,
  levenshtein,
  normalizeConfusables,
  registrableDomain,
} from '../src/lib/engine.ts';

const BRANDS = [
  { id: 'esewa', name: 'eSewa', nameNe: 'ईसेवा', officialDomains: ['esewa.com.np'], nameVariants: ['esewa', 'e-sewa', 'e sewa', 'ईसेवा'], verified: true, source: 'test' },
  { id: 'khalti', name: 'Khalti', nameNe: 'खल्ती', officialDomains: ['khalti.com'], nameVariants: ['khalti', 'खल्ती'], verified: true, source: 'test' },
  { id: 'ime-pay', name: 'IME Pay', nameNe: 'आईएमई पे', officialDomains: ['imepay.com.np'], nameVariants: ['imepay', 'ime pay', 'आईएमई पे'], verified: true, source: 'test' },
  { id: 'fonepay', name: 'FonePay', nameNe: 'फोनपे', officialDomains: ['fonepay.com'], nameVariants: ['fonepay', 'fone pay', 'फोनपे'], verified: true, source: 'test' },
  { id: 'connectips', name: 'ConnectIPS', nameNe: 'कनेक्ट आईपीएस', officialDomains: ['connectips.com'], nameVariants: ['connectips', 'connect ips', 'कनेक्ट आईपीएस'], verified: true, source: 'test' },
  { id: 'nabil-bank', name: 'Nabil Bank', nameNe: 'नबिल बैंक', officialDomains: ['nabilbank.com', 'nbank.nabilbank.com'], nameVariants: ['nabil', 'nabil bank', 'nbank', 'नबिल'], verified: true, source: 'test' },
  { id: 'nic-asia', name: 'NIC Asia Bank', nameNe: 'एन आई सी एशिया बैंक', officialDomains: ['nicasiabank.com'], nameVariants: ['nicasia', 'nic asia', 'nic asia bank', 'एन आई सी एशिया'], verified: true, source: 'test' },
  { id: 'global-ime', name: 'Global IME Bank', nameNe: 'ग्लोबल आईएमई बैंक', officialDomains: ['globalimebank.com'], nameVariants: ['globalime', 'global ime', 'global ime bank', 'ग्लोबल आईएमई'], verified: true, source: 'test' },
  { id: 'nmb', name: 'NMB Bank', nameNe: 'एनएमबी बैंक', officialDomains: ['nmb.com.np'], nameVariants: ['nmb', 'nmb bank', 'एनएमबी'], verified: true, source: 'test' },
  { id: 'google', name: 'Google', nameNe: 'गुगल', officialDomains: ['google.com', 'accounts.google.com'], nameVariants: ['google', 'gmail', 'गुगल'], verified: true, source: 'test' },
  { id: 'paypal', name: 'PayPal', nameNe: 'पेपल', officialDomains: ['paypal.com'], nameVariants: ['paypal', 'पेपल'], verified: true, source: 'test' },
];

function sig(overrides = {}) {
  return {
    url: 'https://example.com/', hostname: 'example.com', isHttps: true,
    hasPasswordField: false, hasOtpField: false, hasPinField: false,
    formActionHosts: [], pageText: '', title: '',
    hasHiddenIframe: false, rightClickDisabled: false, pasteDisabled: false,
    hasObfuscatedScript: false, ...overrides,
  };
}

let passed = 0;
function check(name, fn) { fn(); passed++; console.log('ok -', name); }

check('levenshtein', () => {
  assert.equal(levenshtein('esewa', 'esewa'), 0);
  assert.equal(levenshtein('esewa', 'esewaa'), 1);
  assert.equal(levenshtein('kitten', 'sitting'), 3);
});
check('registrableDomain', () => {
  assert.equal(registrableDomain('www.esewa.com.np'), 'esewa.com.np');
  assert.equal(registrableDomain('login.nabilbank.com'), 'nabilbank.com');
  assert.equal(registrableDomain('a.b.c.example.co.uk'), 'example.co.uk');
});
check('normalizeConfusables', () => {
  assert.equal(normalizeConfusables('еѕеwа.com.np'), 'esewa.com.np');
  assert.equal(normalizeConfusables('paypa1.com'), 'paypal.com');
});
check('esewa.com.np login is green', () => {
  const r = analyzePage(sig({ url: 'https://esewa.com.np/login', hostname: 'esewa.com.np', hasPasswordField: true, pageText: 'esewa login enter your password' }), BRANDS);
  assert.equal(r.verdict, 'green');
  assert.equal(r.brandId, 'esewa');
});
check('khalti.com login is green', () => {
  const r = analyzePage(sig({ url: 'https://khalti.com/login', hostname: 'khalti.com', hasPasswordField: true, pageText: 'khalti login' }), BRANDS);
  assert.equal(r.verdict, 'green');
});
check('nbank.nabilbank.com is green', () => {
  const r = analyzePage(sig({ url: 'https://nbank.nabilbank.com/', hostname: 'nbank.nabilbank.com', hasPasswordField: true, pageText: 'nabil bank nbank login' }), BRANDS);
  assert.equal(r.verdict, 'green');
});
check('imepay.com.np login is green', () => {
  const r = analyzePage(sig({ url: 'https://imepay.com.np/login', hostname: 'imepay.com.np', hasPasswordField: true, pageText: 'ime pay login' }), BRANDS);
  assert.equal(r.verdict, 'green');
  assert.equal(r.brandId, 'ime-pay');
});
check('nicasiabank.com login is green', () => {
  const r = analyzePage(sig({ url: 'https://www.nicasiabank.com/login', hostname: 'www.nicasiabank.com', hasPasswordField: true, pageText: 'nic asia bank login' }), BRANDS);
  assert.equal(r.verdict, 'green');
  assert.equal(r.brandId, 'nic-asia');
});
check('globalimebank.com login is green', () => {
  const r = analyzePage(sig({ url: 'https://www.globalimebank.com/login', hostname: 'www.globalimebank.com', hasPasswordField: true, pageText: 'global ime bank login' }), BRANDS);
  assert.equal(r.verdict, 'green');
  assert.equal(r.brandId, 'global-ime');
});
const lookalikes = [
  'esewaa.com.np', 'esewa-login.com', 'esewa.com.np.verify-account.xyz',
  'esewa.com', 'khaltii.com', 'khalti-secure.com', 'khalti.com.np-login.xyz',
  'nabilbank-login.com', 'nabil-bank.com', 'paypa1-secure-login.com',
  'imepay-login.com', 'nicasia-bank.com', 'globalime-secure.com',
];
for (const host of lookalikes) {
  check(`look-alike ${host} is red`, () => {
    const r = analyzePage(sig({ url: `https://${host}/login`, hostname: host, hasPasswordField: true, pageText: 'login enter your password otp' }), BRANDS);
    assert.equal(r.verdict, 'red');
    assert.ok(r.reasons.length > 0, 'should list reasons');
  });
}
check('Cyrillic esewa homoglyph is red with homoglyph reason', () => {
  const r = analyzePage(sig({ url: 'https://еѕеwа.com.np/login', hostname: 'еѕеwа.com.np', hasPasswordField: true, pageText: 'esewa login' }), BRANDS);
  assert.equal(r.verdict, 'red');
  assert.ok(r.reasons.some((x) => x.id === 'homoglyph-domain'));
});
check('punycode label is red or yellow', () => {
  const r = analyzePage(sig({ url: 'https://xn--esewa-9nf.com/login', hostname: 'xn--esewa-9nf.com', hasPasswordField: true, pageText: 'login' }), BRANDS);
  assert.ok(['red', 'yellow'].includes(r.verdict));
});
check('login + brand mention on unrelated domain is red (impersonation)', () => {
  const r = analyzePage(sig({ url: 'https://secure-wallet-update.info/login', hostname: 'secure-wallet-update.info', hasPasswordField: true, hasOtpField: true, pageText: 'esewa login please enter your esewa password and otp to verify' }), BRANDS);
  assert.equal(r.verdict, 'red');
  assert.ok(r.reasons.some((x) => x.id === 'impersonation'));
});
check('cross-domain form action is red', () => {
  const r = analyzePage(sig({ url: 'https://example-shop.com/login', hostname: 'example-shop.com', hasPasswordField: true, formActionHosts: ['evil-collect.net'], pageText: 'login' }), BRANDS);
  assert.equal(r.verdict, 'red');
  assert.ok(r.reasons.some((x) => x.id === 'cross-domain-form'));
});
check('no HTTPS on login page is red', () => {
  const r = analyzePage(sig({ url: 'http://example-shop.com/login', hostname: 'example-shop.com', isHttps: false, hasPasswordField: true, pageText: 'login' }), BRANDS);
  assert.equal(r.verdict, 'red');
});
check('Nepali urgency language is caught', () => {
  const r = analyzePage(sig({ url: 'https://example-shop.com/offer', hostname: 'example-shop.com', pageText: 'तपाईंले पुरस्कार जित्नुभयो तुरुन्तै kyc अपडेट गर्नुहोस्' }), BRANDS);
  assert.ok(['red', 'yellow'].includes(r.verdict));
  assert.ok(r.reasons.some((x) => x.id === 'urgency-language'));
});
check('romanized Nepali urgency language is caught', () => {
  const r = analyzePage(sig({ url: 'https://example-shop.com/offer', hostname: 'example-shop.com', pageText: 'khata banda hunechha kyc update garnus' }), BRANDS);
  assert.ok(r.reasons.some((x) => x.id === 'urgency-language'));
});
check('unknown site with no signals is gray', () => {
  const r = analyzePage(sig({ url: 'https://example-blog.com/post', hostname: 'example-blog.com', pageText: 'a blog post about hiking in the himalayas' }), BRANDS);
  assert.equal(r.verdict, 'gray');
});
check('unverified registry entries are ignored', () => {
  const unverified = { id: 'fake-brand', name: 'Fake Brand', nameNe: 'नक्कली', officialDomains: ['example-blog.com'], nameVariants: ['fake'], verified: false, source: 'none' };
  const r = analyzePage(sig({ url: 'https://example-blog.com/', hostname: 'example-blog.com', pageText: 'welcome' }), [...BRANDS, unverified]);
  assert.equal(r.verdict, 'gray');
  assert.equal(r.brandId, null);
});
check('login page on a bare IP address is red', () => {
  const r = analyzePage(sig({ url: 'http://45.90.12.34/login', hostname: '45.90.12.34', isHttps: false, hasPasswordField: true, pageText: 'esewa login' }), BRANDS);
  assert.equal(r.verdict, 'red');
  assert.ok(r.reasons.some((x) => x.id === 'ip-host'));
});
check('the @ trick is red', () => {
  const r = analyzePage(sig({ url: 'https://esewa.com.np@evil-login.xyz/login', hostname: 'evil-login.xyz', hasPasswordField: true, pageText: 'login' }), BRANDS);
  assert.equal(r.verdict, 'red');
  assert.ok(r.reasons.some((x) => x.id === 'userinfo-trick'));
});
check('login page on an unusual port is at least yellow', () => {
  const r = analyzePage(sig({ url: 'https://example-shop.com:8443/login', hostname: 'example-shop.com', hasPasswordField: true, pageText: 'login' }), BRANDS);
  assert.ok(['red', 'yellow'].includes(r.verdict));
  assert.ok(r.reasons.some((x) => x.id === 'unusual-port'));
});
check('login page behind a URL shortener is at least yellow', () => {
  const r = analyzePage(sig({ url: 'https://bit.ly/3xYzAbC', hostname: 'bit.ly', hasPasswordField: true, pageText: 'login' }), BRANDS);
  assert.ok(['red', 'yellow'].includes(r.verdict));
  assert.ok(r.reasons.some((x) => x.id === 'url-shortener'));
});
check('analyzeUrl: look-alike pasted link is red', () => {
  const r = analyzeUrl('https://esewaa.com.np/login', BRANDS);
  assert.ok(r);
  assert.equal(r.verdict, 'red');
});
check('analyzeUrl: link without a scheme still works', () => {
  const r = analyzeUrl('esewaa.com.np/login', BRANDS);
  assert.ok(r);
  assert.equal(r.verdict, 'red');
});
check('analyzeUrl: official domain pasted is green', () => {
  const r = analyzeUrl('https://esewa.com.np/login', BRANDS);
  assert.ok(r);
  assert.equal(r.verdict, 'green');
});
check('analyzeUrl: shortened link pasted is yellow', () => {
  const r = analyzeUrl('https://bit.ly/3xYzAbC', BRANDS);
  assert.ok(r);
  assert.equal(r.verdict, 'yellow');
  assert.ok(r.reasons.some((x) => x.id === 'url-shortener'));
});
check('analyzeUrl: clean unknown address is gray with the address-only note', () => {
  const r = analyzeUrl('https://example.com/some-page', BRANDS);
  assert.ok(r);
  assert.equal(r.verdict, 'gray');
  assert.ok(r.reasons.some((x) => x.id === 'url-only-gray'));
  assert.ok(r.checked[0].en.includes('Only the address was checked'));
  assert.ok(r.checked[0].ne.length > 0);
});
check('checked list is bilingual', () => {
  const r = analyzePage(sig({ url: 'https://esewa.com.np/login', hostname: 'esewa.com.np', hasPasswordField: true, pageText: 'esewa login' }), BRANDS);
  assert.ok(r.checked.length > 0);
  for (const item of r.checked) {
    assert.ok(item.en.length > 0);
    assert.ok(item.ne.length > 0);
  }
});
check('fonepay.com login is green', () => {
  const r = analyzePage(sig({ url: 'https://fonepay.com/login', hostname: 'fonepay.com', hasPasswordField: true, pageText: 'fonepay login' }), BRANDS);
  assert.equal(r.verdict, 'green');
  assert.equal(r.brandId, 'fonepay');
});
check('connectips.com login is green', () => {
  const r = analyzePage(sig({ url: 'https://www.connectips.com/login', hostname: 'www.connectips.com', hasPasswordField: true, pageText: 'connectips login' }), BRANDS);
  assert.equal(r.verdict, 'green');
  assert.equal(r.brandId, 'connectips');
});
check('web.nmb.com.np — NMB internet banking — is green', () => {
  const r = analyzePage(sig({ url: 'https://web.nmb.com.np/login', hostname: 'web.nmb.com.np', hasPasswordField: true, pageText: 'nmb bank login' }), BRANDS);
  assert.equal(r.verdict, 'green');
  assert.equal(r.brandId, 'nmb');
});
for (const host of ['fonepay-login.com', 'connectips-secure.com', 'nmb-login.com']) {
  check(`new-brand look-alike ${host} is red`, () => {
    const r = analyzePage(sig({ url: `https://${host}/login`, hostname: host, hasPasswordField: true, pageText: 'login' }), BRANDS);
    assert.equal(r.verdict, 'red');
  });
}
check('anmb.com is NOT flagged — short tokens only match whole parts', () => {
  const r = analyzePage(sig({ url: 'https://anmb.com/login', hostname: 'anmb.com', hasPasswordField: true, pageText: 'login' }), BRANDS);
  assert.equal(r.verdict, 'gray');
});
check('analyzeUrl: garbage text returns null', () => {
  assert.equal(analyzeUrl('not a url at all !!!', BRANDS), null);
  assert.equal(analyzeUrl('ftp://example.com/file', BRANDS), null);
});
for (const url of ['https://github.com/login', 'https://www.facebook.com/login', 'https://www.chase.com/login', 'https://login.microsoftonline.com/']) {
  check(`false positive: ${url} is gray, not red`, () => {
    const host = new URL(url).hostname;
    const r = analyzePage(sig({ url, hostname: host, hasPasswordField: true, pageText: 'login enter your password' }), BRANDS);
    assert.equal(r.verdict, 'gray');
  });
}
console.log(`\nAll ${passed} engine checks passed.`);
