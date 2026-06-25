import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../src/crypto.js';

describe('hashPassword', () => {
  it('returns salt:hash format', () => {
    const result = hashPassword('test123');
    expect(result).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
  });

  it('generates different hashes for same password (salt)', () => {
    const h1 = hashPassword('test123');
    const h2 = hashPassword('test123');
    expect(h1).not.toBe(h2);
  });

  it('handles empty password', () => {
    const result = hashPassword('');
    expect(result).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
  });

  it('handles long passwords', () => {
    const long = 'a'.repeat(1000);
    const result = hashPassword(long);
    expect(result).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
  });

  it('handles unicode passwords', () => {
    const result = hashPassword('密码123!@#');
    expect(result).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
  });
});

describe('verifyPassword', () => {
  it('verifies correct scrypt password', () => {
    const hash = hashPassword('mysecret');
    expect(verifyPassword('mysecret', hash)).toBe(true);
  });

  it('rejects wrong scrypt password', () => {
    const hash = hashPassword('mysecret');
    expect(verifyPassword('wrong', hash)).toBe(false);
  });

  it('verifies against legacy SHA-256 hash (backward compat)', () => {
    // Legacy format: just hex, no colon
    const legacy = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'; // SHA-256 of ''
    expect(verifyPassword('', legacy)).toBe(true);
  });

  it('rejects wrong password against legacy SHA-256 hash', () => {
    const legacy = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    expect(verifyPassword('wrong', legacy)).toBe(false);
  });

  it('handles invalid stored format gracefully', () => {
    expect(verifyPassword('x', '')).toBe(false);
  });
});
