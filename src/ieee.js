import { AddrFormatError } from './core.js';
import { DEFAULT_IAB_REGISTRY, DEFAULT_OUI_REGISTRY } from './data/ieee.js';

const OUI_REGISTRY = new Map();
const IAB_REGISTRY = new Map();

function normalizePrefix(prefix, length) {
  const value = String(prefix).trim().toLowerCase().replace(/[-:.]/g, '');
  if (!new RegExp(`^[0-9a-f]{${length}}$`).test(value)) {
    throw new AddrFormatError(`invalid registry prefix: ${prefix}`);
  }
  return value;
}

function normalizeRecord(record) {
  const org = String(record.org ?? '').trim();
  if (!org) {
    throw new AddrFormatError('registry record must include a non-empty org field');
  }

  return {
    org,
    address: record.address ?? null,
    country: record.country ?? null,
    source: record.source ?? 'custom',
  };
}

function seedRegistries() {
  for (const record of DEFAULT_OUI_REGISTRY) {
    const key = normalizePrefix(record.prefix, 6);
    OUI_REGISTRY.set(key, { prefix: key, ...normalizeRecord(record) });
  }
  for (const record of DEFAULT_IAB_REGISTRY) {
    const key = normalizePrefix(record.prefix, 9);
    IAB_REGISTRY.set(key, { prefix: key, ...normalizeRecord(record) });
  }
}

export function register_oui(prefix, record) {
  const key = normalizePrefix(prefix, 6);
  OUI_REGISTRY.set(key, { prefix: key, ...normalizeRecord(record) });
}

export function register_iab(prefix, record) {
  const key = normalizePrefix(prefix, 9);
  IAB_REGISTRY.set(key, { prefix: key, ...normalizeRecord(record) });
}

export function lookup_oui(prefix) {
  const key = normalizePrefix(prefix, 6);
  return OUI_REGISTRY.get(key) ?? null;
}

export function lookup_iab(prefix) {
  const key = normalizePrefix(prefix, 9);
  return IAB_REGISTRY.get(key) ?? null;
}

export function clear_ieee_registries() {
  OUI_REGISTRY.clear();
  IAB_REGISTRY.clear();
}

seedRegistries();
