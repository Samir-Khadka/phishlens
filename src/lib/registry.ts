// Brand registry loader.
//
// The registry is a folder of JSON files, one per brand, bundled with the
// extension. Contributors add brands by pull request; every entry needs a
// `source` proving the official domains (the brand's own site or app
// listing). A wrong entry marks the real site as fake or a fake as real,
// so unverified entries are NEVER used for verdicts — the engine skips any
// brand with verified === false.
//
// JSON imports work because tsconfig sets "resolveJsonModule": true and
// Vite bundles JSON at build time. No network fetch, no browsing data
// leaves the device.

import type { Brand } from './engine';

import esewa from '../brands/esewa.json';
import khalti from '../brands/khalti.json';
import nabilBank from '../brands/nabil-bank.json';
import google from '../brands/google.json';
import paypal from '../brands/paypal.json';

/** All bundled brands, in registry order. */
export const REGISTRY: Brand[] = [esewa, khalti, nabilBank, google, paypal] as Brand[];

/** Only the entries whose official domains were verified against a source. */
export function verifiedBrands(): Brand[] {
  return REGISTRY.filter((b) => b.verified);
}

export function findBrand(id: string): Brand | undefined {
  return REGISTRY.find((b) => b.id === id);
}
