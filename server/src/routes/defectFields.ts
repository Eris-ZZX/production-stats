import { Router } from 'express';
import db from '../db.js';
import { requireAnyAuth } from '../auth.js';

const router = Router();

function getCtx(req: any) {
  if (req.adminRole) return { type: 'admin', table: 'defect_field_options' };
  if (req.productId) return { type: 'product', table: 'product_defect_fields' };
  return { type: 'admin', table: 'defect_field_options' };
}

router.get('/', requireAnyAuth, (req, res) => {
  const ctx = getCtx(req);
  const rows = ctx.type === 'admin'
    ? db.prepare(`SELECT * FROM ${ctx.table} ORDER BY id`).all()
    : db.prepare(`SELECT * FROM ${ctx.table} WHERE product_line_id = ? ORDER BY id`).all(req.productId);
  res.json((rows as any[]).map(r => ({ id: r.id, fieldType: r.field_type, name: r.name })));
});

router.post('/', requireAnyAuth, (req, res) => {
  const ctx = getCtx(req);
  const r = req.body;
  if (ctx.type === 'product') {
    const result = db.prepare(`INSERT OR IGNORE INTO ${ctx.table} (product_line_id, field_type, name) VALUES (?,?,?)`).run(req.productId, r.fieldType, r.name);
    res.json({ id: result.lastInsertRowid });
  } else {
    const result = db.prepare(`INSERT OR IGNORE INTO ${ctx.table} (field_type, name) VALUES (?,?)`).run(r.fieldType, r.name);
    res.json({ id: result.lastInsertRowid });
  }
});

router.put('/:id', requireAnyAuth, (req, res) => {
  const ctx = getCtx(req);
  const r = req.body;
  db.prepare(`UPDATE ${ctx.table} SET field_type=?, name=? WHERE id=?`).run(r.fieldType, r.name, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', requireAnyAuth, (req, res) => {
  const ctx = getCtx(req);
  db.prepare(`DELETE FROM ${ctx.table} WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

export default router;
