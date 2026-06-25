import crypto from 'crypto';

const SALT_LEN = 16;
const KEY_LEN = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LEN).toString('hex');
  const hash = crypto.scryptSync(password, salt, KEY_LEN).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  // scrypt format: "salt:hash"
  if (stored.includes(':')) {
    const [salt, hash] = stored.split(':');
    const computed = crypto.scryptSync(password, salt, KEY_LEN).toString('hex');
    return computed === hash;
  }
  // Legacy SHA-256 fallback (migrate on successful match)
  const legacy = crypto.createHash('sha256').update(password).digest('hex');
  return legacy === stored;
}
