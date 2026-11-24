# Changelog

All notable changes to Sachet are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed

- Product renamed from PhishLens to **Sachet** for Chrome Web Store submission:
  the name "PhishLens" is already used by a live Chrome Web Store listing
  ("PhishLens - Advanced Browser Security Extension for Phishing Protection").
  The GitHub repository slug stays `phishlens` for now.
- Popup footer links to the privacy policy.

### Added

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
