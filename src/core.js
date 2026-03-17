export class AddrFormatError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AddrFormatError';
  }
}

export class AddrConversionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AddrConversionError';
  }
}

export class NotRegisteredError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotRegisteredError';
  }
}

export const INET_PTON = 1;
export const ZEROFILL = 2;
export const NOHOST = 4;
export const INET_ATON = 8;
