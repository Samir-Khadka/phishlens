# Changelog

All notable changes to Sachet are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.4.0] — 2026-11-24

### Added

- **Punycode decoding in the engine** (RFC 3492, pure TypeScript, no
  imports): encoded domains are decoded before the look-alike and
  homoglyph checks run, so a Cyrillic "е" hidden behind `xn--...` is
  now caught as a homoglyph and goes red instead of yellow. The
  decoder is verified against Node's own `domainToUnicode`.
- **"My reports" in the popup**: reports you save are listed there
  (site, verdict, date) and can be cleared, instead of disappearing
  into local storage.
- **Three more verified Nepali brands**: Siddhartha Bank
  (siddharthabank.com), Prabhu Bank (prabhubank.com), Rastriya Banijya
  Bank (rbb.com.np). Registry is now 14 brands.
- Look-alike test list grew from 16 to 19 domains.

### Fixed

- **Two real bank domains could flag each other**: `nmb.com.np` and
  `rbb.com.np` are two edits apart, so each looked like a look-alike
  of the other. A verified official domain is now never treated as a
  look-alike of another brand.
- Homoglyph reasons are now reported as homoglyphs, not look-alikes:
  the homoglyph check runs before the edit-distance check, so a
  single Cyrillic letter gets the more precise explanation.

### Changed

- Standalone engine check now 63 checks.

## [0.3.0] — 2026-11-24

### Added

- **Automatic protection (opt-in, off by default)**: turn it on in the
  popup and Sachet checks each finished page load itself, updates the
  toolbar badge, and warns once per tab with a notification when a page
  looks fake. Turning it on asks the browser for optional host access
  (`*://*/*`) via the browser's own permission prompt; turning it off
  gives that access back. Click-to-scan still needs no host permissions.
- **Bilingual "what was checked" list**: every line now has English and
  Nepali text, matching the verdict reasons.
- **Three more verified Nepali brands**: FonePay (fonepay.com),
  ConnectIPS (connectips.com), NMB Bank (nmb.com.np, internet banking at
  web.nmb.com.np). Registry is now 11 brands.
- Look-alike test list grew from 13 to 16 domains.

### Changed

- `notifications` permission added (red-page warnings in auto-protection
  only); `optional_host_permissions` added for the opt-in mode.
- Short brand tokens (e.g. "nmb") now match only as a whole
  hyphen-separated domain part — `nmb-login.com` is flagged red, but
  `anmb.com` is not.
- Standalone engine check now 53 checks.

## [0.2.0] — 2026-11-24

### Added

- **Check a link before you open it**: paste a suspicious link into the
  popup and get a verdict on the address alone — the page is never visited.
  A clean address is reported as gray with an explicit "address only" note,
  never as a claim about the page.
- **Address-level checks** in the engine: bare IP address as the host,
  the `@` userinfo trick (`https://esewa.com.np@evil.com`), unusual ports,
  and URL shorteners hiding the real destination.
- **Three more verified Nepali brands**: IME Pay (imepay.com.np),
  NIC Asia Bank (nicasiabank.com), Global IME Bank (globalimebank.com).
  Registry is now 8 brands.
- **False-positive regression tests**: GitHub, Facebook, Chase and Microsoft
  login pages must stay gray, not red.
- Standalone engine check `tests/check-engine.node.ts` now mirrors the
  Vitest suite (45 checks, no npm install needed).

### Changed

- Product renamed from PhishLens to **Sachet** for Chrome Web Store submission:
  the name "PhishLens" is already used by a live Chrome Web Store listing
  ("PhishLens - Advanced Browser Security Extension for Phishing Protection").
  The GitHub repository slug stays `phishlens` for now.
- Popup footer links to the privacy policy.
- Look-alike test list grew from 10 to 13 domains.

### Added (store readiness)

- `PRIVACY.md` — full privacy policy (collects nothing).
- `store/listing.md` — Chrome Web Store listing text.
- `docs/store-submission.md` — step-by-step submission guide.

## [0.1.0] — 2026-11-24

First public release (GitHub only, not yet submitted to any store).

### Added

- Manifest V3 extension (TypeScript + WXT) for Chrome, Edge, and Firefox.
- Pure, import-free analysis engine: domain checks (edit distance, homoglyph /
  punycode, brand in subdomain / path / domain, suspicious TLDs, hyphens),
  page checks (login form + brand mention, cross-domain form action, no HTTPS
  on login, hidden iframes, blocked right-click / paste, obfuscated scripts),
  Nepali urgency phrases (Devanagari and romanized).
- Verdicts red / yellow / green / gray with reasons in English and Nepali.
  Green only on a verified official domain; never says "safe".
- Brand registry as one JSON file per brand, with a source proving each
  official domain. Starter set (verified Nov 2026): eSewa, Khalti,
  Nabil Bank, Google, PayPal.
- Click-to-scan popup with EN/NE toggle, "what was checked" list,
  "open the official site" button, and opt-in local reporting.
- Trusted toolbar badge (red `!`, yellow `?`, green `✓`).
- Minimal permissions: `activeTab`, `storage`, `scripting`. No host
  permissions, no history, no cookies.
- Vitest suite: 10 look-alike domains (all red), homoglyph / punycode,
  impersonation, cross-domain forms, no-HTTPS, Nepali urgency, green / gray
  behaviour, unverified registry entries ignored.
- Local test fixtures (clearly labelled, never to be hosted publicly).
