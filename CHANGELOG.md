# Changelog

All notable changes to Sachet are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
