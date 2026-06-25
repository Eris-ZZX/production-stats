import { Router } from 'express';
import db from '../db.js';
import { requireAnyAuth, requireConfigAuth } from '../auth.js';

const router = Router();

function getCtx(req: any) {
  if (req.adminRole) return { type: 'admin', table: 'defect_field_options' };
  if (req.productId) return { type: 'product', table: 'product_defect_fields' };
  return { type: 'admin', table: 'defect_field_options' };
}

router.get('/', requireAnyAuth, (req, res) => {
  const ctx = getCtx(req);
  const pid = (req as any).productId;
  const rows = ctx.type === 'admin'
    ? db.prepare(`SELECT * FROM ${ctx.table} ORDER BY id`).all()
    : db.prepare(`SELECT * FROM ${ctx.table} WHERE product_line_id = ? ORDER BY id`).all(pid);
  res.json((rows as any[]).map(r => ({ id: r.id, fieldType: r.field_type, name: r.name })));
});

router.post('/', requireConfigAuth, (req, res) => {
  const ctx = getCtx(req);
  const r = req.body;
  const pid = (req as any).productId;
  if (ctx.type === 'product') {
    const result = db.prepare(`INSERT OR IGNORE INTO ${ctx.table} (product_line_id, field_type, name) VALUES (?,?,?)`).run(pid, r.fieldType, r.name);
    if (result.changes === 0) { res.status(409).json({ error: '该选项已存在' }); return; }
    res.json({ id: result.lastInsertRowid });
  } else {
    const result = db.prepare(`INSERT OR IGNORE INTO ${ctx.table} (field_type, name) VALUES (?,?)`).run(r.fieldType, r.name);
    if (result.changes === 0) { res.status(409).json({ error: '该选项已存在' }); return; }
    res.json({ id: result.lastInsertRowid });
  }
});

router.put('/:id', requireConfigAuth, (req, res) => {
  const ctx = getCtx(req);
  const r = req.body;
  const pid = (req as any).productId;
  const whereClause = ctx.type === 'product' ? 'id=? AND product_line_id=?' : 'id=?';
  const whereParams: any[] = ctx.type === 'product' ? [req.params.id, pid] : [req.params.id];
  const existing = db.prepare(`SELECT * FROM ${ctx.table} WHERE ${whereClause}`).get(...whereParams) as any;
  if (!existing) { res.status(404).json({ error: '不存在' }); return; }
  db.prepare(`UPDATE ${ctx.table} SET field_type=?, name=? WHERE id=?`).run(r.fieldType || existing.field_type, r.name || existing.name, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', requireConfigAuth, (req, res) => {
  const ctx = getCtx(req);
  const pid = (req as any).productId;
  if (ctx.type === 'product') {
    db.prepare(`DELETE FROM ${ctx.table} WHERE id = ? AND product_line_id = ?`).run(req.params.id, pid);
  } else {
    db.prepare(`DELETE FROM ${ctx.table} WHERE id = ?`).run(req.params.id);
  }
  res.json({ ok: true });
});

export default router;
