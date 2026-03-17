import { AddrConversionError } from './core.js';
import { IPAddress } from './ip.js';

const RFC1924_ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~';

const CHAR_TO_VALUE = new Map(Array.from(RFC1924_ALPHABET).map((ch, idx) => [ch, idx]));

export function ipv6_to_base85(ipv6) {
  const ip = new IPAddress(ipv6, 6);
  let value = ip.toBigInt();
  const chars = Array(20).fill('0');

  for (let i = 19; i >= 0; i -= 1) {
    const digit = Number(value % 85n);
    chars[i] = RFC1924_ALPHABET[digit];
    value /= 85n;
  }

  return chars.join('');
}

export function base85_to_ipv6(text) {
  const value = String(text).trim();
  if (value.length !== 20) {
    throw new AddrConversionError('RFC1924 base85 IPv6 values must be exactly 20 characters');
  }

  let num = 0n;
  for (const ch of value) {
    const digit = CHAR_TO_VALUE.get(ch);
    if (digit == null) {
      throw new AddrConversionError(`invalid RFC1924 base85 character: ${ch}`);
    }
    num = num * 85n + BigInt(digit);
  }

  return new IPAddress(num, 6);
}
