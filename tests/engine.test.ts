// Engine tests — Vitest. Run with `npm test` after `npm install`.
//
// The look-alike list below is the plan's first-weekend step: 10 look-alike
// domain examples for the three starter brands, each expected RED. These
// are test strings only — never host look-alike login pages publicly.

import { describe, expect, it } from 'vitest';
import { analyzePage, analyzeUrl, levenshtein, normalizeConfusables, registrableDomain } from '../src/lib/engine';
import type { Brand, PageSignals } from '../src/lib/engine';
import { verifiedBrands } from '../src/lib/registry';

const BRANDS: Brand[] = verifiedBrands();

function signals(overrides: Partial<PageSignals> = {}): PageSignals {
  return {
    url: 'https://example.com/',
    hostname: 'example.com',
    isHttps: true,
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
    ...overrides,
  };
}

describe('helpers', () => {
  it('levenshtein distances', () => {
    expect(levenshtein('esewa', 'esewa')).toBe(0);
    expect(levenshtein('esewa', 'esewaa')).toBe(1);
    expect(levenshtein('khalti', 'khaltii')).toBe(1);
    expect(levenshtein('kitten', 'sitting')).toBe(3);
  });

  it('registrableDomain handles Nepali second-level domains', () => {
    expect(registrableDomain('www.esewa.com.np')).toBe('esewa.com.np');
    expect(registrableDomain('login.nabilbank.com')).toBe('nabilbank.com');
    expect(registrableDomain('a.b.c.example.co.uk')).toBe('example.co.uk');
  });

  it('normalizeConfusables maps Cyrillic look-alikes', () => {
    // "еѕеwа" is Cyrillic е/ѕ/а + Latin w — visually "esewa".
    expect(normalizeConfusables('еѕеwа.com.np')).toBe('esewa.com.np');
    expect(normalizeConfusables('rn')).toBe('m');
    expect(normalizeConfusables('paypa1.com')).toBe('paypal.com');
  });
});

describe('official domains go green', () => {
  it('esewa.com.np with a login form is green', () => {
    const r = analyzePage(
      signals({
        url: 'https://esewa.com.np/login',
        hostname: 'esewa.com.np',
        hasPasswordField: true,
        pageText: 'esewa login enter your password',
      }),
      BRANDS,
    );
    expect(r.verdict).toBe('green');
    expect(r.brandId).toBe('esewa');
  });

  it('khalti.com login is green', () => {
    const r = analyzePage(
      signals({
        url: 'https://khalti.com/login',
        hostname: 'khalti.com',
        hasPasswordField: true,
        pageText: 'khalti login',
      }),
      BRANDS,
    );
    expect(r.verdict).toBe('green');
  });

  it('nbank.nabilbank.com is green', () => {
    const r = analyzePage(
      signals({
        url: 'https://nbank.nabilbank.com/',
        hostname: 'nbank.nabilbank.com',
        hasPasswordField: true,
        pageText: 'nabil bank nbank login',
      }),
      BRANDS,
    );
    expect(r.verdict).toBe('green');
  });

  it('imepay.com.np login is green', () => {
    const r = analyzePage(
      signals({
        url: 'https://imepay.com.np/login',
        hostname: 'imepay.com.np',
        hasPasswordField: true,
        pageText: 'ime pay login',
      }),
      BRANDS,
    );
    expect(r.verdict).toBe('green');
    expect(r.brandId).toBe('ime-pay');
  });

  it('nicasiabank.com login is green', () => {
    const r = analyzePage(
      signals({
        url: 'https://www.nicasiabank.com/login',
        hostname: 'www.nicasiabank.com',
        hasPasswordField: true,
        pageText: 'nic asia bank login',
      }),
      BRANDS,
    );
    expect(r.verdict).toBe('green');
    expect(r.brandId).toBe('nic-asia');
  });

  it('globalimebank.com login is green', () => {
    const r = analyzePage(
      signals({
        url: 'https://www.globalimebank.com/login',
        hostname: 'www.globalimebank.com',
        hasPasswordField: true,
        pageText: 'global ime bank login',
      }),
      BRANDS,
    );
    expect(r.verdict).toBe('green');
    expect(r.brandId).toBe('global-ime');
  });
});

describe('10 look-alike domains — all red', () => {
  const lookalikes: Array<{ host: string; note: string }> = [
    { host: 'esewaa.com.np', note: 'extra letter' },
    { host: 'esewa-login.com', note: 'brand + hyphen + generic word' },
    { host: 'esewa.com.np.verify-account.xyz', note: 'brand in subdomain of unrelated domain' },
    { host: 'esewa.com', note: 'brand name, wrong ending (.com instead of .com.np)' },
    { host: 'khaltii.com', note: 'extra letter' },
    { host: 'khalti-secure.com', note: 'brand + hyphen + "secure"' },
    { host: 'khalti.com.np-login.xyz', note: 'brand in subdomain, suspicious TLD' },
    { host: 'nabilbank-login.com', note: 'brand + hyphen + "login"' },
    { host: 'nabil-bank.com', note: 'hyphenated brand name, wrong domain' },
    { host: 'paypa1-secure-login.com', note: 'digit substitution + "secure login"' },
    { host: 'imepay-login.com', note: 'IME Pay + hyphen + "login"' },
    { host: 'nicasia-bank.com', note: 'NIC Asia hyphenated, wrong domain' },
    { host: 'globalime-secure.com', note: 'Global IME + hyphen + "secure"' },
  ];

  for (const { host, note } of lookalikes) {
    it(`${host} (${note})`, () => {
      const r = analyzePage(
        signals({
          url: `https://${host}/login`,
          hostname: host,
          hasPasswordField: true,
          pageText: 'login enter your password otp',
        }),
        BRANDS,
      );
      expect(r.verdict).toBe('red');
      expect(r.reasons.length).toBeGreaterThan(0);
    });
  }
});

describe('homoglyph and punycode', () => {
  it('Cyrillic look-alike of esewa.com.np is red', () => {
    const r = analyzePage(
      signals({
        url: 'https://еѕеwа.com.np/login',
        hostname: 'еѕеwа.com.np',
        hasPasswordField: true,
        pageText: 'esewa login',
      }),
      BRANDS,
    );
    expect(r.verdict).toBe('red');
    expect(r.reasons.some((x) => x.id === 'homoglyph-domain')).toBe(true);
  });

  it('punycode label is at least yellow', () => {
    const r = analyzePage(
      signals({
        url: 'https://xn--esewa-9nf.com/login',
        hostname: 'xn--esewa-9nf.com',
        hasPasswordField: true,
        pageText: 'login',
      }),
      BRANDS,
    );
    expect(['red', 'yellow']).toContain(r.verdict);
  });
});

describe('impersonation and form checks', () => {
  it('login form + brand mention on an unrelated domain is red', () => {
    const r = analyzePage(
      signals({
        url: 'https://secure-wallet-update.info/login',
        hostname: 'secure-wallet-update.info',
        hasPasswordField: true,
        hasOtpField: true,
        pageText: 'esewa login please enter your esewa password and otp to verify',
      }),
      BRANDS,
    );
    expect(r.verdict).toBe('red');
    expect(r.reasons.some((x) => x.id === 'impersonation')).toBe(true);
  });

  it('login form posting to a different domain is red', () => {
    const r = analyzePage(
      signals({
        url: 'https://example-shop.com/login',
        hostname: 'example-shop.com',
        hasPasswordField: true,
        formActionHosts: ['evil-collect.net'],
        pageText: 'login',
      }),
      BRANDS,
    );
    expect(r.verdict).toBe('red');
    expect(r.reasons.some((x) => x.id === 'cross-domain-form')).toBe(true);
  });

  it('no HTTPS on a login page is red', () => {
    const r = analyzePage(
      signals({
        url: 'http://example-shop.com/login',
        hostname: 'example-shop.com',
        isHttps: false,
        hasPasswordField: true,
        pageText: 'login',
      }),
      BRANDS,
    );
    expect(r.verdict).toBe('red');
  });

  it('Nepali urgency language raises at least yellow', () => {
    const r = analyzePage(
      signals({
        url: 'https://example-shop.com/offer',
        hostname: 'example-shop.com',
        pageText: 'तपाईंले पुरस्कार जित्नुभयो तुरुन्तै kyc अपडेट गर्नुहोस्',
      }),
      BRANDS,
    );
    expect(['red', 'yellow']).toContain(r.verdict);
    expect(r.reasons.some((x) => x.id === 'urgency-language')).toBe(true);
  });

  it('romanized Nepali urgency language is caught', () => {
    const r = analyzePage(
      signals({
        url: 'https://example-shop.com/offer',
        hostname: 'example-shop.com',
        pageText: 'khata banda hunechha kyc update garnus',
      }),
      BRANDS,
    );
    expect(r.reasons.some((x) => x.id === 'urgency-language')).toBe(true);
  });
});

describe('gray and yellow', () => {
  it('unknown site with no login form and no signals is gray', () => {
    const r = analyzePage(
      signals({
        url: 'https://example-blog.com/post',
        hostname: 'example-blog.com',
        pageText: 'a blog post about hiking in the himalayas',
      }),
      BRANDS,
    );
    expect(r.verdict).toBe('gray');
  });

  it('unverified registry entries are ignored', () => {
    const unverified: Brand = {
      id: 'fake-brand',
      name: 'Fake Brand',
      nameNe: 'नक्कली',
      officialDomains: ['example-blog.com'],
      nameVariants: ['fake'],
      verified: false,
      source: 'none',
    };
    const r = analyzePage(
      signals({
        url: 'https://example-blog.com/',
        hostname: 'example-blog.com',
        pageText: 'welcome',
      }),
      [...BRANDS, unverified],
    );
    expect(r.verdict).toBe('gray');
    expect(r.brandId).toBeNull();
  });
});

describe('address-level checks', () => {
  it('login page on a bare IP address is red', () => {
    const r = analyzePage(
      signals({
        url: 'http://45.90.12.34/login',
        hostname: '45.90.12.34',
        isHttps: false,
        hasPasswordField: true,
        pageText: 'esewa login',
      }),
      BRANDS,
    );
    expect(r.verdict).toBe('red');
    expect(r.reasons.some((x) => x.id === 'ip-host')).toBe(true);
  });

  it('the @ trick is red (brand in userinfo, real site after @)', () => {
    const r = analyzePage(
      signals({
        url: 'https://esewa.com.np@evil-login.xyz/login',
        hostname: 'evil-login.xyz',
        hasPasswordField: true,
        pageText: 'login',
      }),
      BRANDS,
    );
    expect(r.verdict).toBe('red');
    expect(r.reasons.some((x) => x.id === 'userinfo-trick')).toBe(true);
  });

  it('login page on an unusual port is at least yellow', () => {
    const r = analyzePage(
      signals({
        url: 'https://example-shop.com:8443/login',
        hostname: 'example-shop.com',
        hasPasswordField: true,
        pageText: 'login',
      }),
      BRANDS,
    );
    expect(['red', 'yellow']).toContain(r.verdict);
    expect(r.reasons.some((x) => x.id === 'unusual-port')).toBe(true);
  });

  it('login page behind a URL shortener is at least yellow', () => {
    const r = analyzePage(
      signals({
        url: 'https://bit.ly/3xYzAbC',
        hostname: 'bit.ly',
        hasPasswordField: true,
        pageText: 'login',
      }),
      BRANDS,
    );
    expect(['red', 'yellow']).toContain(r.verdict);
    expect(r.reasons.some((x) => x.id === 'url-shortener')).toBe(true);
  });
});

describe('analyzeUrl — pasted links, address only', () => {
  it('look-alike pasted link is red', () => {
    const r = analyzeUrl('https://esewaa.com.np/login', BRANDS);
    expect(r).not.toBeNull();
    expect(r!.verdict).toBe('red');
  });

  it('past link without a scheme still works', () => {
    const r = analyzeUrl('esewaa.com.np/login', BRANDS);
    expect(r).not.toBeNull();
    expect(r!.verdict).toBe('red');
  });

  it('official domain pasted is green', () => {
    const r = analyzeUrl('https://esewa.com.np/login', BRANDS);
    expect(r).not.toBeNull();
    expect(r!.verdict).toBe('green');
  });

  it('shortened link pasted is yellow', () => {
    const r = analyzeUrl('https://bit.ly/3xYzAbC', BRANDS);
    expect(r).not.toBeNull();
    expect(r!.verdict).toBe('yellow');
    expect(r!.reasons.some((x) => x.id === 'url-shortener')).toBe(true);
  });

  it('clean unknown address is gray with the address-only note', () => {
    const r = analyzeUrl('https://example.com/some-page', BRANDS);
    expect(r).not.toBeNull();
    expect(r!.verdict).toBe('gray');
    expect(r!.reasons.some((x) => x.id === 'url-only-gray')).toBe(true);
    expect(r!.checked[0]).toContain('Only the address was checked');
  });

  it('garbage text returns null', () => {
    expect(analyzeUrl('not a url at all !!!', BRANDS)).toBeNull();
    expect(analyzeUrl('ftp://example.com/file', BRANDS)).toBeNull();
  });
});

describe('false positives — real login pages stay gray', () => {
  const legit: string[] = [
    'https://github.com/login',
    'https://www.facebook.com/login',
    'https://www.chase.com/login',
    'https://login.microsoftonline.com/',
  ];
  for (const url of legit) {
    it(`${url} is not red`, () => {
      const host = new URL(url).hostname;
      const r = analyzePage(
        signals({
          url,
          hostname: host,
          hasPasswordField: true,
          pageText: 'login enter your password',
        }),
        BRANDS,
      );
      expect(r.verdict).toBe('gray');
    });
  }
});

describe('new brands in v0.3 — FonePay, ConnectIPS, NMB', () => {
  it('fonepay.com login is green', () => {
    const r = analyzePage(
      signals({
        url: 'https://fonepay.com/login',
        hostname: 'fonepay.com',
        hasPasswordField: true,
        pageText: 'fonepay login',
      }),
      BRANDS,
    );
    expect(r.verdict).toBe('green');
    expect(r.brandId).toBe('fonepay');
  });

  it('connectips.com login is green', () => {
    const r = analyzePage(
      signals({
        url: 'https://www.connectips.com/login',
        hostname: 'www.connectips.com',
        hasPasswordField: true,
        pageText: 'connectips login',
      }),
      BRANDS,
    );
    expect(r.verdict).toBe('green');
    expect(r.brandId).toBe('connectips');
  });

  it('web.nmb.com.np — NMB internet banking — is green', () => {
    const r = analyzePage(
      signals({
        url: 'https://web.nmb.com.np/login',
        hostname: 'web.nmb.com.np',
        hasPasswordField: true,
        pageText: 'nmb bank login',
      }),
      BRANDS,
    );
    expect(r.verdict).toBe('green');
    expect(r.brandId).toBe('nmb');
  });

  for (const host of ['fonepay-login.com', 'connectips-secure.com', 'nmb-login.com']) {
    it(`${host} is red`, () => {
      const r = analyzePage(
        signals({
          url: `https://${host}/login`,
          hostname: host,
          hasPasswordField: true,
          pageText: 'login',
        }),
        BRANDS,
      );
      expect(r.verdict).toBe('red');
    });
  }

  it('anmb.com is NOT flagged — short tokens only match whole parts', () => {
    const r = analyzePage(
      signals({
        url: 'https://anmb.com/login',
        hostname: 'anmb.com',
        hasPasswordField: true,
        pageText: 'login',
      }),
      BRANDS,
    );
    expect(r.verdict).toBe('gray');
  });
});

describe('checked list is bilingual', () => {
  it('every checked item has English and Nepali text', () => {
    const r = analyzePage(
      signals({
        url: 'https://esewa.com.np/login',
        hostname: 'esewa.com.np',
        hasPasswordField: true,
        pageText: 'esewa login',
      }),
      BRANDS,
    );
    expect(r.checked.length).toBeGreaterThan(0);
    for (const item of r.checked) {
      expect(item.en.length).toBeGreaterThan(0);
      expect(item.ne.length).toBeGreaterThan(0);
    }
  });

  it('analyzeUrl first item is the address-only note, in both languages', () => {
    const r = analyzeUrl('https://example.com/some-page', BRANDS);
    expect(r).not.toBeNull();
    expect(r!.checked[0]!.en).toContain('Only the address was checked');
    expect(r!.checked[0]!.ne.length).toBeGreaterThan(0);
  });
});
