import { defineConfig } from 'wxt';

// Sachet — Phishing X-ray browser extension (Manifest V3).
// One codebase builds for Chrome/Edge (Chromium) and Firefox.
//
// v0.1 permissions are deliberately minimal: the user clicks the icon to
// "X-ray this page". No host permissions, no browsing history, no cookies.
// Automatic protection (v0.2) will ask for host access only if the user
// turns it on, with a plain-language explanation of why.
export default defineConfig({
  manifest: {
    name: 'Sachet — Phishing X-ray',
    description:
      'Shows why a login page looks fake, in plain Nepali or English, before you type your password.',
    homepage_url: 'https://github.com/Samir-Khadka/phishlens',
    permissions: ['activeTab', 'storage', 'scripting'],
    action: {
      default_title: 'Sachet — X-ray this page',
    },
    icons: {
      16: 'icon-16.png',
      48: 'icon-48.png',
      128: 'icon-128.png',
    },
    // No content_scripts in v0.1: page signals are collected by a one-shot
    // injected function (see src/lib/collect.ts) only when the user clicks
    // the icon. See README.md "Permissions" for the reasoning.
  },
});
