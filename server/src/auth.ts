import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'production-stats-secret-key-2026';

export interface AdminPayload {
  sub: string;
  role: 'super' | 'config' | 'viewer';
  type: 'admin';
}

export interface ProductPayload {
  sub: string;
  productId: number;
  role: 'read' | 'entry' | 'config';
  productName: string;
  type: 'product';
}

export type AuthPayload = AdminPayload | ProductPayload;

export function signAdmin(username: string, role: AdminPayload['role']): string {
  return jwt.sign({ sub: username, role, type: 'admin' } as AdminPayload, JWT_SECRET, { expiresIn: '12h' });
}

export function signProduct(productId: number, role: ProductPayload['role'], productName: string): string {
  return jwt.sign({ sub: `product-${productId}`, productId, role, productName, type: 'product' } as ProductPayload, JWT_SECRET, { expiresIn: '8h' });
}

export function verifyToken(token: string): AuthPayload | null {
  try { return jwt.verify(token, JWT_SECRET) as AuthPayload; } catch { return null; }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) { res.status(401).json({ error: '未登录' }); return; }
  const payload = verifyToken(auth.slice(7));
  if (!payload || payload.type !== 'admin') { res.status(403).json({ error: '后台权限不足' }); return; }
  (req as any).adminRole = (payload as AdminPayload).role;
  (req as any).adminUser = (payload as AdminPayload).sub;
  next();
}

/** 产品认证：只读/录入/配置均可 */
export function requireProduct(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) { res.status(401).json({ error: '未登录' }); return; }
  const payload = verifyToken(auth.slice(7));
  if (!payload || payload.type !== 'product') { res.status(403).json({ error: '产品权限不足' }); return; }
  (req as any).productRole = (payload as ProductPayload).role;
  (req as any).productId = (payload as ProductPayload).productId;
  next();
}

/** 数据写入认证：仅 entry/config 角色 */
export function requireProductWrite(req: Request, res: Response, next: NextFunction) {
  requireProduct(req, res, () => {
    const role = (req as any).productRole;
    if (role === 'read') { res.status(403).json({ error: '只读权限，无法操作数据' }); return; }
    next();
  });
}

/** 配置管理认证：仅 config 角色 */
export function requireProductConfig(req: Request, res: Response, next: NextFunction) {
  requireProduct(req, res, () => {
    const role = (req as any).productRole;
    if (role !== 'config') { res.status(403).json({ error: '需要配置管理权限' }); return; }
    next();
  });
}

export function requireAnyAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) { res.status(401).json({ error: '未登录' }); return; }
  const payload = verifyToken(auth.slice(7));
  if (!payload) { res.status(403).json({ error: '权限不足' }); return; }
  if (payload.type === 'admin') {
    (req as any).adminRole = (payload as AdminPayload).role;
  } else if (payload.type === 'product') {
    (req as any).productRole = (payload as ProductPayload).role;
    (req as any).productId = (payload as ProductPayload).productId;
  }
  next();
}

export function optionalProduct(req: Request, _res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    const payload = verifyToken(auth.slice(7));
    if (payload?.type === 'product') {
      (req as any).productRole = (payload as ProductPayload).role;
      (req as any).productId = (payload as ProductPayload).productId;
    }
  }
  next();
}
