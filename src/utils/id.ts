import * as Crypto from 'expo-crypto';

/** RFC 4122 v4 UUID generated from a cryptographically secure source. */
export function createId(): string {
  return Crypto.randomUUID();
}
