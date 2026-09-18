import { webcrypto } from 'node:crypto';
import { Headers, Request, Response } from 'undici';

Object.assign(globalThis, { Headers, Request, Response });

if (!globalThis.crypto) {
  Object.assign(globalThis, { crypto: webcrypto });
}