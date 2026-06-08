import { Router } from 'express';
import db from '../db.js';
import { requireAdmin } from '../auth.js';

const router = Router();

router.get('/', requireAdmin, (req, res) => {
  if ((req as any).adminRole !== 'super') { res.status(403).json({ error: '权限不足' }); return; }
  const rows = db.prepare('SELECT id, username, role, is_active FROM admin_accounts').all();
  res.json((rows as any[]).map(r => ({
    id: r.id, username: r.username, password: '', role: r.role, isActive: !!r.is_active,
  })));
});

router.post('/', requireAdmin, (req, res) => {
  if ((req as any).adminRole !== 'super') { res.status(403).json({ error: '权限不足' }); return; }
  const { username, password, role } = req.body;
  try {
    const result = db.prepare('INSERT INTO admin_accounts (username, password, role) VALUES (?,?,?)').run(username, password, role);
    res.json({ id: result.lastInsertRowid });
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) res.status(409).json({ error: '账号已存在' });
    else { res.status(500).json({ error: e.message }); }
  }
});

router.put('/:id', requireAdmin, (req, res) => {
  if ((req as any).adminRole !== 'super') { res.status(403).json({ error: '权限不足' }); return; }
  const { username, password, role, isActive } = req.body;
  if (password) {
    db.prepare('UPDATE admin_accounts SET username=?, password=?, role=?, is_active=? WHERE id=?').run(username, password, role, isActive ? 1 : 0, req.params.id);
  } else {
    db.prepare('UPDATE admin_accounts SET username=?, role=?, is_active=? WHERE id=?').run(username, role, isActive ? 1 : 0, req.params.id);
  }
  res.json({ ok: true });
});

router.delete('/:id', requireAdmin, (req, res) => {
  if ((req as any).adminRole !== 'super') { res.status(403).json({ error: '权限不足' }); return; }
  const count = (db.prepare('SELECT COUNT(*) as c FROM admin_accounts').get() as any).c;
  if (count <= 1) { res.status(400).json({ error: '至少保留一个账号' }); return; }
  db.prepare('DELETE FROM admin_accounts WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
