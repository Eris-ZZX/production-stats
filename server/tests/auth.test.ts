import { describe, it, expect } from 'vitest';
import { signAdmin, signProduct, verifyToken } from '../src/auth.js';

describe('JWT token lifecycle', () => {
  it('signs and verifies admin token with super role', () => {
    const token = signAdmin('admin', 'super');
    const payload = verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.type).toBe('admin');
    expect((payload as any).role).toBe('super');
    expect((payload as any).sub).toBe('admin');
  });

  it('signs and verifies admin token with config role', () => {
    const token = signAdmin('cfg', 'config');
    const payload = verifyToken(token);
    expect(payload).not.toBeNull();
    expect((payload as any).role).toBe('config');
  });

  it('signs and verifies admin token with viewer role', () => {
    const token = signAdmin('viewer', 'viewer');
    const payload = verifyToken(token);
    expect(payload).not.toBeNull();
    expect((payload as any).role).toBe('viewer');
  });

  it('signs and verifies product token with read role', () => {
    const token = signProduct(42, 'read', 'TestProduct');
    const payload = verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.type).toBe('product');
    expect((payload as any).productId).toBe(42);
    expect((payload as any).role).toBe('read');
    expect((payload as any).productName).toBe('TestProduct');
  });

  it('signs and verifies product token with config role', () => {
    const token = signProduct(99, 'config', 'ProductX');
    const payload = verifyToken(token);
    expect(payload).not.toBeNull();
    expect((payload as any).productId).toBe(99);
    expect((payload as any).role).toBe('config');
  });

  it('returns null for invalid token', () => {
    expect(verifyToken('invalid.token.here')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(verifyToken('')).toBeNull();
  });

  it('returns null for garbage input', () => {
    expect(verifyToken('not-a-jwt-at-all!')).toBeNull();
  });

  it('produces distinct tokens for different users', () => {
    const t1 = signAdmin('user1', 'super');
    const t2 = signAdmin('user2', 'super');
    expect(t1).not.toBe(t2);
  });

  it('produces distinct tokens for different products', () => {
    const t1 = signProduct(1, 'read', 'A');
    const t2 = signProduct(2, 'read', 'B');
    expect(t1).not.toBe(t2);
  });
});
