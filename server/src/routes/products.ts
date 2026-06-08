import { Router } from 'express';
import db from '../db.js';
import { requireAdmin, requireAnyAuth, verifyToken } from '../auth.js';

const router = Router();

// ========== 产品线 ==========

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

router.get('/:id', requireAdmin, (req, res) => {
  const row = db.prepare('SELECT * FROM product_lines WHERE id = ?').get(req.params.id);
  if (!row) { res.status(404).json({ error: '不存在' }); return; }
  const r = row as any;
  res.json({ id: r.id, name: r.name, isActive: !!r.is_active, pwdRead: r.pwd_read, pwdEntry: r.pwd_entry, pwdConfig: r.pwd_config });
});

router.post('/', requireAdmin, (req, res) => {
  if ((req as any).adminRole !== 'super') { res.status(403).json({ error: '权限不足' }); return; }
  const { name, pwdRead, pwdEntry, pwdConfig } = req.body;
  if (!name) { res.status(400).json({ error: '产品名称必填' }); return; }
  const result = db.prepare('INSERT INTO product_lines (name, pwd_read, pwd_entry, pwd_config) VALUES (?,?,?,?)').run(name, pwdRead || '', pwdEntry || '', pwdConfig || '');
  const newId = result.lastInsertRowid;

  // 复制主模板字段选项到产品专用表
  db.prepare('INSERT INTO product_station_fields (product_line_id, field_type, name, is_data_entry, visual_fpy_target, functional_fpy_target, air_leak_fpy_target) SELECT ?, field_type, name, is_data_entry, visual_fpy_target, functional_fpy_target, air_leak_fpy_target FROM station_field_options').run(newId);
  db.prepare('INSERT INTO product_defect_fields (product_line_id, field_type, name) SELECT ?, field_type, name FROM defect_field_options').run(newId);

  res.json({ id: newId });
});

router.put('/:id', requireAdmin, (req, res) => {
  if ((req as any).adminRole !== 'super') { res.status(403).json({ error: '权限不足' }); return; }
  const { name, isActive, pwdRead, pwdEntry, pwdConfig } = req.body;
  db.prepare('UPDATE product_lines SET name=?, is_active=?, pwd_read=?, pwd_entry=?, pwd_config=? WHERE id=?').run(name, isActive ? 1 : 0, pwdRead || '', pwdEntry || '', pwdConfig || '', req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', requireAdmin, (req, res) => {
  if ((req as any).adminRole !== 'super') { res.status(403).json({ error: '权限不足' }); return; }
  db.prepare('DELETE FROM product_lines WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ========== 品号 ==========

// 所有品号（公开）
router.get('/skus/all', (_req, res) => {
  const rows = db.prepare('SELECT ps.*, pl.name as product_name FROM product_skus ps JOIN product_lines pl ON ps.product_line_id = pl.id WHERE pl.is_active = 1 ORDER BY ps.code').all();
  res.json((rows as any[]).map(r => ({
    id: r.id, productLineId: r.product_line_id, productName: r.product_name, code: r.code, isActive: !!r.is_active,
  })));
});

// 某产品下的品号
router.get('/:productLineId/skus', requireAnyAuth, (req, res) => {
  const rows = db.prepare('SELECT id, code, is_active as isActive FROM product_skus WHERE product_line_id = ? ORDER BY code').all(req.params.productLineId);
  res.json(rows);
});

// 创建品号
router.post('/skus', requireAnyAuth, (req, res) => {
  const { productLineId, code } = req.body;
  if (!productLineId || !code) { res.status(400).json({ error: '产品ID和品号编码必填' }); return; }
  const result = db.prepare('INSERT OR IGNORE INTO product_skus (product_line_id, code) VALUES (?,?)').run(productLineId, code);
  if (result.changes === 0) { res.status(409).json({ error: '该品号已存在' }); return; }
  res.json({ id: result.lastInsertRowid });
});

router.put('/skus/:id', requireAnyAuth, (req, res) => {
  const { code, isActive } = req.body;
  db.prepare('UPDATE product_skus SET code=?, is_active=? WHERE id=?').run(code, isActive ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

router.delete('/skus/:id', requireAnyAuth, (req, res) => {
  db.prepare('DELETE FROM product_skus WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
