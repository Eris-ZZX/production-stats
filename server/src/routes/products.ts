import { Router } from 'express';
import db from '../db.js';
import { requireAdmin, verifyToken } from '../auth.js';

const router = Router();

// 产品线列表（公开，无登录也可；有 admin token 时返回全字段含密码）
router.get('/', (req, res) => {
  const auth = req.headers.authorization;
  const payload = auth?.startsWith('Bearer ') ? verifyToken(auth.slice(7)) : null;
  const isAdmin = payload?.type === 'admin';
  if (isAdmin) {
    const rows = db.prepare('SELECT * FROM product_lines').all();
    res.json((rows as any[]).map(r => ({
      id: r.id, name: r.name, isActive: !!r.is_active,
      pwdRead: r.pwd_read || '', pwdEntry: r.pwd_entry || '', pwdConfig: r.pwd_config || '',
    })));
  } else {
    const rows = db.prepare('SELECT id, name, is_active as isActive FROM product_lines WHERE is_active = 1').all();
    res.json(rows);
  }
});

// 产品线详情（全字段，后台管理用）
router.get('/:id', requireAdmin, (req, res) => {
  const row = db.prepare('SELECT * FROM product_lines WHERE id = ?').get(req.params.id);
  if (!row) { res.status(404).json({ error: '不存在' }); return; }
  const r = row as any;
  res.json({ id: r.id, name: r.name, isActive: !!r.is_active, pwdRead: r.pwd_read, pwdEntry: r.pwd_entry, pwdConfig: r.pwd_config });
});

// 创建产品线 (admin super only)
router.post('/', requireAdmin, (req, res) => {
  if ((req as any).adminRole !== 'super') { res.status(403).json({ error: '权限不足' }); return; }
  const { name, pwdRead, pwdEntry, pwdConfig } = req.body;
  if (!name) { res.status(400).json({ error: '产品名称必填' }); return; }
  const result = db.prepare('INSERT INTO product_lines (name, pwd_read, pwd_entry, pwd_config) VALUES (?,?,?,?)').run(name, pwdRead || '', pwdEntry || '', pwdConfig || '');
  res.json({ id: result.lastInsertRowid });
});

// 更新产品线
router.put('/:id', requireAdmin, (req, res) => {
  if ((req as any).adminRole !== 'super') { res.status(403).json({ error: '权限不足' }); return; }
  const { name, isActive, pwdRead, pwdEntry, pwdConfig } = req.body;
  db.prepare('UPDATE product_lines SET name=?, is_active=?, pwd_read=?, pwd_entry=?, pwd_config=? WHERE id=?').run(name, isActive ? 1 : 0, pwdRead || '', pwdEntry || '', pwdConfig || '', req.params.id);
  res.json({ ok: true });
});

// 删除产品线
router.delete('/:id', requireAdmin, (req, res) => {
  if ((req as any).adminRole !== 'super') { res.status(403).json({ error: '权限不足' }); return; }
  db.prepare('DELETE FROM product_lines WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
