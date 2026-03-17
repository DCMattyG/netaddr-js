import { AddrFormatError, NotRegisteredError } from './core.js';
import { lookup_iab, lookup_oui } from './ieee.js';
import { IPAddress, IPNetwork } from './ip.js';

function parseHexChunk(text, original) {
  if (!/^[0-9a-fA-F]+$/.test(text)) {
    throw new AddrFormatError(`invalid EUI address: ${original}`);
  }
  return text.toLowerCase();
}

function normalizeEuiText(input) {
  const text = String(input).trim();
  if (text.length === 0) {
    throw new AddrFormatError('invalid EUI address');
  }

  if (/^[0-9a-fA-F]{12}$/.test(text) || /^[0-9a-fA-F]{16}$/.test(text)) {
    return text.toLowerCase();
  }

  if (text.includes('-')) {
    const chunks = text.split('-').map((c) => parseHexChunk(c, text));
    if (chunks.length === 6 && chunks.every((c) => c.length === 2)) {
      return chunks.join('');
    }
    if (chunks.length === 8 && chunks.every((c) => c.length === 2)) {
      return chunks.join('');
    }
  }

  if (text.includes(':')) {
    const chunks = text.split(':').map((c) => parseHexChunk(c, text));
    if (chunks.length === 6 && chunks.every((c) => c.length === 2)) {
      return chunks.join('');
    }
    if (chunks.length === 8 && chunks.every((c) => c.length === 2)) {
      return chunks.join('');
    }
  }

  if (text.includes('.')) {
    const chunks = text.split('.').map((c) => parseHexChunk(c, text));
    if (chunks.length === 3 && chunks.every((c) => c.length === 4)) {
      return chunks.join('');
    }
    if (chunks.length === 4 && chunks.every((c) => c.length === 4)) {
      return chunks.join('');
    }
  }

  throw new AddrFormatError(`invalid EUI address: ${input}`);
}

function sanitizeIdentifierHex(input) {
  const text = String(input).trim().toLowerCase().replace(/[-:.]/g, '');
  if (!/^[0-9a-f]+$/.test(text)) {
    throw new AddrFormatError(`invalid identifier: ${input}`);
  }
  return text;
}

function ensureWordBounds(word, bits, original) {
  const max = (1 << bits) - 1;
  if (!Number.isInteger(word) || word < 0 || word > max) {
    throw new AddrFormatError(`invalid EUI ${original} word`);
  }
}

function formatWordsHex(words, width) {
  return words.map((w) => w.toString(16).padStart(width, '0'));
}

function formatByDialect(eui, dialect) {
  const d = dialect;
  const words8 = formatWordsHex(eui.words, 2);

  if (d === mac_bare || d === eui64_bare) {
    return words8.join('');
  }
  if (d === mac_eui48 || d === eui64_base) {
    return words8.join('-');
  }
  if (d === mac_unix || d === eui64_unix) {
    return words8.join(':');
  }
  if (d === mac_unix_expanded || d === eui64_unix_expanded) {
    return words8.join(':');
  }
  if (d === mac_pgsql) {
    return words8.join(':');
  }
  if (d === mac_cisco || d === eui64_cisco) {
    const chunks = [];
    for (let i = 0; i < words8.length; i += 2) {
      chunks.push(`${words8[i]}${words8[i + 1]}`);
    }
    return chunks.join('.');
  }

  if (typeof d?.format === 'function') {
    return d.format(eui);
  }

  return words8.join('-');
}

class BaseIdentifier {
  constructor(value, version, dialect) {
    this.value = value;
    this.version = version;
    this._dialect = dialect;
  }

  toBigInt() {
    return this.value;
  }
}

export class OUI extends BaseIdentifier {
  constructor(addr) {
    const normalized = sanitizeIdentifierHex(addr);
    if (normalized.length < 6) {
      throw new AddrFormatError(`invalid OUI address: ${addr}`);
    }
    const ouiHex = normalized.slice(0, 6);
    super(BigInt(`0x${ouiHex}`), 24, mac_eui48);
    this._hex = ouiHex;
  }

  get registration() {
    const registration = lookup_oui(this._hex);
    if (!registration) {
      throw new NotRegisteredError(`OUI ${this.toString()} is not registered`);
    }
    return registration;
  }

  toString() {
    const bytes = [this._hex.slice(0, 2), this._hex.slice(2, 4), this._hex.slice(4, 6)];
    return bytes.join('-');
  }
}

export class IAB extends BaseIdentifier {
  constructor(addr) {
    const normalized = sanitizeIdentifierHex(addr);
    if (normalized.length < 9) {
      throw new AddrFormatError(`invalid IAB address: ${addr}`);
    }
    const iabHex = normalized.slice(0, 9);
    super(BigInt(`0x${iabHex}`), 36, mac_eui48);
    this._hex = iabHex;
  }

  get registration() {
    const registration = lookup_iab(this._hex);
    if (!registration) {
      throw new NotRegisteredError(`IAB ${this.toString()} is not registered`);
    }
    return registration;
  }

  toString() {
    return this._hex;
  }
}

export class EUI extends BaseIdentifier {
  constructor(addr, dialect = null) {
    if (addr instanceof EUI) {
      super(addr.value, addr.version, dialect ?? addr._dialect);
      return;
    }

    if (typeof addr === 'bigint' || typeof addr === 'number') {
      const value = BigInt(addr);
      if (value < 0n) {
        throw new AddrFormatError(`invalid EUI integer: ${addr}`);
      }
      if (value <= 0xffffffffffffn) {
        super(value, 48, dialect ?? mac_eui48);
        return;
      }
      if (value <= 0xffffffffffffffffn) {
        super(value, 64, dialect ?? eui64_base);
        return;
      }
      throw new AddrFormatError(`EUI integer out of range: ${addr}`);
    }

    const normalized = normalizeEuiText(addr);
    if (normalized.length === 12) {
      super(BigInt(`0x${normalized}`), 48, dialect ?? mac_eui48);
      return;
    }
    if (normalized.length === 16) {
      super(BigInt(`0x${normalized}`), 64, dialect ?? eui64_base);
      return;
    }
  }

  get oui() {
    const shift = BigInt(this.version - 24);
    const ouiValue = this.value >> shift;
    const hex = ouiValue.toString(16).padStart(6, '0');
    return new OUI(hex);
  }

  get ei() {
    const bits = this.version - 24;
    const mask = (1n << BigInt(bits)) - 1n;
    return this.value & mask;
  }

  is_iab() {
    if (this.version !== 48) {
      return false;
    }
    const prefix = this.value.toString(16).padStart(12, '0').slice(0, 9);
    return lookup_iab(prefix) != null;
  }

  get iab() {
    if (!this.is_iab()) {
      return null;
    }
    const prefix = this.value.toString(16).padStart(12, '0').slice(0, 9);
    return new IAB(prefix);
  }

  get words() {
    const count = this.version / 8;
    const words = [];
    let cur = this.value;
    for (let i = 0; i < count; i += 1) {
      words.unshift(Number(cur & 0xffn));
      cur >>= 8n;
    }
    return Object.freeze(words);
  }

  get packed() {
    return Uint8Array.from(this.words);
  }

  get bin() {
    return `0b${this.value.toString(2).padStart(this.version, '0')}`;
  }

  bits(wordSep = '-') {
    const raw = this.value.toString(2).padStart(this.version, '0');
    const groups = [];
    for (let i = 0; i < this.version; i += 8) {
      groups.push(raw.slice(i, i + 8));
    }
    return groups.join(wordSep);
  }

  getWord(index) {
    const words = this.words;
    if (!Number.isInteger(index) || index < 0 || index >= words.length) {
      throw new AddrFormatError(`word index out of range: ${index}`);
    }
    return words[index];
  }

  setWord(index, value) {
    const words = [...this.words];
    if (!Number.isInteger(index) || index < 0 || index >= words.length) {
      throw new AddrFormatError(`word index out of range: ${index}`);
    }
    ensureWordBounds(value, 8, 'byte');
    words[index] = value;
    const hex = formatWordsHex(words, 2).join('');
    this.value = BigInt(`0x${hex}`);
    return this;
  }

  eui64() {
    if (this.version === 64) {
      return new EUI(this);
    }

    const words = [...this.words];
    const withInsert = [...words.slice(0, 3), 0xff, 0xfe, ...words.slice(3)];
    const hex = formatWordsHex(withInsert, 2).join('');
    return new EUI(hex, eui64_base);
  }

  modified_eui64() {
    const eui64 = this.eui64();
    const words = [...eui64.words];
    words[0] ^= 0x02;
    const hex = formatWordsHex(words, 2).join('');
    return new EUI(hex, eui64_base);
  }

  ipv6(prefix) {
    const net = new IPNetwork(prefix);
    if (net.version !== 6) {
      throw new AddrFormatError('IPv6 prefix expected');
    }
    if (net.prefixlen > 64) {
      throw new AddrFormatError('prefix length must be <= 64 for EUI-64 interface IDs');
    }

    const iface = this.modified_eui64();
    const hostBits = 128n - BigInt(net.prefixlen);
    const prefixValue = net.first;

    const value = prefixValue | iface.value;
    return new IPAddress(value, 6);
  }

  ipv6_link_local() {
    return this.ipv6('fe80::/64');
  }

  get info() {
    if (this.is_iab()) {
      return this.iab.registration;
    }
    return this.oui.registration;
  }

  format(dialect = null) {
    return formatByDialect(this, dialect ?? this._dialect);
  }

  toString() {
    return this.format();
  }
}

export function valid_mac(addr) {
  try {
    const eui = new EUI(addr);
    return eui.version === 48;
  } catch {
    return false;
  }
}

export function valid_eui64(addr) {
  try {
    const eui = new EUI(addr);
    return eui.version === 64;
  } catch {
    return false;
  }
}

export const mac_eui48 = { name: 'mac_eui48' };
export const mac_unix = { name: 'mac_unix' };
export const mac_unix_expanded = { name: 'mac_unix_expanded' };
export const mac_cisco = { name: 'mac_cisco' };
export const mac_bare = { name: 'mac_bare' };
export const mac_pgsql = { name: 'mac_pgsql' };

export const eui64_base = { name: 'eui64_base' };
export const eui64_unix = { name: 'eui64_unix' };
export const eui64_unix_expanded = { name: 'eui64_unix_expanded' };
export const eui64_cisco = { name: 'eui64_cisco' };
export const eui64_bare = { name: 'eui64_bare' };
