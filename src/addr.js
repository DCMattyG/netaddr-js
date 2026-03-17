import { AddrFormatError, INET_ATON, INET_PTON, ZEROFILL } from './core.js';

export const IPV4_WIDTH = 32;
export const IPV6_WIDTH = 128;
export const IPV4_MAX = (1n << 32n) - 1n;
export const IPV6_MAX = (1n << 128n) - 1n;

export function widthForVersion(version) {
  if (version === 4) {
    return IPV4_WIDTH;
  }
  if (version === 6) {
    return IPV6_WIDTH;
  }
  throw new AddrFormatError(`invalid IP version: ${version}`);
}

export function maxForVersion(version) {
  return version === 4 ? IPV4_MAX : IPV6_MAX;
}

export function toBigInt(value) {
  if (typeof value === 'bigint') {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) {
      throw new AddrFormatError(`expected integer number, got ${value}`);
    }
    return BigInt(value);
  }
  throw new AddrFormatError(`expected bigint or number, got ${typeof value}`);
}

export function bitLength(value) {
  if (value < 0n) {
    throw new AddrFormatError('bitLength only supports non-negative values');
  }
  if (value === 0n) {
    return 0;
  }
  return value.toString(2).length;
}

export function trailingZeroBits(value, width) {
  if (value === 0n) {
    return width;
  }
  let count = 0;
  let cur = value;
  while ((cur & 1n) === 0n) {
    cur >>= 1n;
    count += 1;
  }
  return count;
}

export function prefixToNetmask(prefix, width) {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > width) {
    throw new AddrFormatError(`invalid prefix length /${prefix} for width ${width}`);
  }
  if (prefix === 0) {
    return 0n;
  }
  const hostBits = BigInt(width - prefix);
  return ((1n << BigInt(prefix)) - 1n) << hostBits;
}

export function netmaskToPrefix(mask, width) {
  const max = (1n << BigInt(width)) - 1n;
  if (mask < 0n || mask > max) {
    throw new AddrFormatError('mask is out of range');
  }
  const inverted = max ^ mask;
  if ((inverted & (inverted + 1n)) !== 0n) {
    throw new AddrFormatError('invalid non-contiguous netmask');
  }
  return width - bitLength(inverted);
}

export function hostmaskToPrefix(mask, width) {
  const max = (1n << BigInt(width)) - 1n;
  if (mask < 0n || mask > max) {
    throw new AddrFormatError('mask is out of range');
  }
  if ((mask & (mask + 1n)) !== 0n) {
    throw new AddrFormatError('invalid non-contiguous hostmask');
  }
  return width - bitLength(mask);
}

function parseInetAtonNumber(part, original, decimalOnly = false) {
  const text = String(part).trim();
  if (text.length === 0) {
    throw new AddrFormatError(`invalid IPv4 address: ${original}`);
  }

  if (decimalOnly) {
    if (!/^\d+$/.test(text)) {
      throw new AddrFormatError(`invalid IPv4 address: ${original}`);
    }
    const value = BigInt(Number.parseInt(text, 10));
    if (value < 0n || value > 0xffffffffn) {
      throw new AddrFormatError(`invalid IPv4 address: ${original}`);
    }
    return value;
  }

  let base = 10;
  let digits = text;
  if (/^0x/i.test(text)) {
    base = 16;
    digits = text.slice(2);
    if (!/^[0-9a-fA-F]+$/.test(digits)) {
      throw new AddrFormatError(`invalid IPv4 address: ${original}`);
    }
  } else if (/^0[0-7]+$/.test(text)) {
    base = 8;
    digits = text.slice(1);
  } else if (!/^\d+$/.test(text)) {
    throw new AddrFormatError(`invalid IPv4 address: ${original}`);
  }

  const value = BigInt(Number.parseInt(digits, base));
  if (value < 0n || value > 0xffffffffn) {
    throw new AddrFormatError(`invalid IPv4 address: ${original}`);
  }
  return value;
}

function parseStrictIpv4Octet(part, original, allowLeadingZeroes = false) {
  const text = String(part).trim();
  if (!/^\d+$/.test(text)) {
    throw new AddrFormatError(`invalid IPv4 address: ${original}`);
  }
  if (!allowLeadingZeroes && text.length > 1 && text.startsWith('0')) {
    throw new AddrFormatError(`invalid IPv4 address: ${original}`);
  }
  const value = Number(text);
  if (value < 0 || value > 255) {
    throw new AddrFormatError(`invalid IPv4 address: ${original}`);
  }
  return value;
}

export function parseIPv4(input, flags = 0) {
  const value = String(input).trim();
  const parts = value.split('.');

  if ((flags & INET_ATON) && (flags & INET_PTON)) {
    throw new AddrFormatError('INET_ATON and INET_PTON are mutually exclusive');
  }

  if (flags & INET_ATON) {
    if (parts.length < 1 || parts.length > 4) {
      throw new AddrFormatError(`invalid IPv4 address: ${input}`);
    }

    const nums = parts.map((part) => parseInetAtonNumber(part, input, Boolean(flags & ZEROFILL)));
    if (parts.length === 1) {
      return nums[0];
    }
    if (parts.length === 2) {
      if (nums[0] > 255n || nums[1] > 0xffffffn) {
        throw new AddrFormatError(`invalid IPv4 address: ${input}`);
      }
      return (nums[0] << 24n) | nums[1];
    }
    if (parts.length === 3) {
      if (nums[0] > 255n || nums[1] > 255n || nums[2] > 0xffffn) {
        throw new AddrFormatError(`invalid IPv4 address: ${input}`);
      }
      return (nums[0] << 24n) | (nums[1] << 16n) | nums[2];
    }

    if (nums.some((num) => num > 255n)) {
      throw new AddrFormatError(`invalid IPv4 address: ${input}`);
    }
    return (nums[0] << 24n) | (nums[1] << 16n) | (nums[2] << 8n) | nums[3];
  }

  if (parts.length !== 4) {
    throw new AddrFormatError(`invalid IPv4 address: ${input}`);
  }
  const octets = parts.map((part) => parseStrictIpv4Octet(part, input, Boolean(flags & ZEROFILL)));

  return (
    (BigInt(octets[0]) << 24n) |
    (BigInt(octets[1]) << 16n) |
    (BigInt(octets[2]) << 8n) |
    BigInt(octets[3])
  );
}

export function formatIPv4(value) {
  const octets = [
    Number((value >> 24n) & 255n),
    Number((value >> 16n) & 255n),
    Number((value >> 8n) & 255n),
    Number(value & 255n),
  ];
  return octets.join('.');
}

function parseIPv6Part(part, original) {
  if (part.length === 0) {
    return [];
  }
  return part.split(':').map((hextet) => {
    if (!/^[0-9a-fA-F]{1,4}$/.test(hextet)) {
      throw new AddrFormatError(`invalid IPv6 address: ${original}`);
    }
    return Number.parseInt(hextet, 16);
  });
}

function parseEmbeddedIPv4(value, original) {
  const ipv4 = parseIPv4(value);
  return [Number((ipv4 >> 16n) & 0xffffn), Number(ipv4 & 0xffffn)];
}

export function parseIPv6(input) {
  const original = String(input).trim();
  if (original.length === 0) {
    throw new AddrFormatError('invalid IPv6 address');
  }
  const zoneIndex = original.indexOf('%');
  const value = zoneIndex >= 0 ? original.slice(0, zoneIndex) : original;

  let left = '';
  let right = '';
  const compressionCount = (value.match(/::/g) || []).length;
  if (compressionCount > 1) {
    throw new AddrFormatError(`invalid IPv6 address: ${input}`);
  }
  if (compressionCount === 1) {
    [left, right] = value.split('::');
  } else {
    left = value;
  }

  let leftParts = [];
  let rightParts = [];

  if (compressionCount === 0 && left.includes('.')) {
    const idx = left.lastIndexOf(':');
    const ipv4Text = idx === -1 ? left : left.slice(idx + 1);
    const prefix = idx === -1 ? '' : left.slice(0, idx);
    leftParts = parseIPv6Part(prefix, input).concat(parseEmbeddedIPv4(ipv4Text, input));
  } else {
    leftParts = parseIPv6Part(left, input);
    if (right.includes('.')) {
      const idx = right.lastIndexOf(':');
      const ipv4Text = idx === -1 ? right : right.slice(idx + 1);
      const prefix = idx === -1 ? '' : right.slice(0, idx);
      rightParts = parseIPv6Part(prefix, input).concat(parseEmbeddedIPv4(ipv4Text, input));
    } else {
      rightParts = parseIPv6Part(right, input);
    }
  }

  let hextets;
  if (compressionCount === 1) {
    const zeros = 8 - (leftParts.length + rightParts.length);
    if (zeros < 1) {
      throw new AddrFormatError(`invalid IPv6 address: ${input}`);
    }
    hextets = [...leftParts, ...Array(zeros).fill(0), ...rightParts];
  } else {
    hextets = [...leftParts];
    if (hextets.length !== 8) {
      throw new AddrFormatError(`invalid IPv6 address: ${input}`);
    }
  }

  let result = 0n;
  for (const hextet of hextets) {
    result = (result << 16n) | BigInt(hextet);
  }
  return result;
}

export function formatIPv6(value) {
  const parts = [];
  let working = value;
  for (let i = 0; i < 8; i += 1) {
    parts.unshift(Number(working & 0xffffn));
    working >>= 16n;
  }

  let bestStart = -1;
  let bestLen = 0;
  let runStart = -1;

  for (let i = 0; i <= parts.length; i += 1) {
    const zero = i < parts.length && parts[i] === 0;
    if (zero && runStart === -1) {
      runStart = i;
    }
    if (!zero && runStart !== -1) {
      const len = i - runStart;
      if (len > bestLen && len >= 2) {
        bestStart = runStart;
        bestLen = len;
      }
      runStart = -1;
    }
  }

  if (bestStart >= 0) {
    const left = parts.slice(0, bestStart).map((n) => n.toString(16)).join(':');
    const right = parts
      .slice(bestStart + bestLen)
      .map((n) => n.toString(16))
      .join(':');
    if (left && right) {
      return `${left}::${right}`;
    }
    if (left) {
      return `${left}::`;
    }
    if (right) {
      return `::${right}`;
    }
    return '::';
  }

  return parts.map((n) => n.toString(16)).join(':');
}

export function parseIP(input, version, flags = 0) {
  if (version === 4) {
    return parseIPv4(input, flags);
  }
  if (version === 6) {
    return parseIPv6(input);
  }

  const text = String(input);
  if (text.includes(':')) {
    return { value: parseIPv6(text), version: 6 };
  }
  return { value: parseIPv4(text, flags), version: 4 };
}

export function formatIP(value, version) {
  return version === 4 ? formatIPv4(value) : formatIPv6(value);
}
