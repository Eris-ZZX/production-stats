import { Router } from 'express';
import db from '../db.js';
import { requireAnyAuth } from '../auth.js';

const router = Router();

function getCtx(req: any) {
  if (req.adminRole) return { type: 'admin', table: 'station_field_options', extraCols: '' };
  if (req.productId) return { type: 'product', table: 'product_station_fields', extraCols: ` WHERE product_line_id = ${req.productId}` };
  return { type: 'admin', table: 'station_field_options', extraCols: '' };
}

router.get('/', requireAnyAuth, (req, res) => {
  const ctx = getCtx(req);
  const rows = db.prepare(`SELECT * FROM ${ctx.table}${ctx.extraCols} ORDER BY sort_order, id`).all();
  res.json((rows as any[]).map(r => ({
    id: r.id, fieldType: r.field_type, name: r.name, sortOrder: r.sort_order ?? 0,
    isDataEntry: r.is_data_entry === null ? undefined : !!r.is_data_entry,
    visualFpyTarget: r.visual_fpy_target, functionalFpyTarget: r.functional_fpy_target, airLeakFpyTarget: r.air_leak_fpy_target,
  })));
});

router.post('/', requireAnyAuth, (req, res) => {
  const ctx = getCtx(req);
  const r = req.body;
  if (ctx.type === 'product') {
    const result = db.prepare(
      `INSERT OR IGNORE INTO ${ctx.table} (product_line_id, field_type, name, is_data_entry, visual_fpy_target, functional_fpy_target, air_leak_fpy_target, sort_order) VALUES (?,?,?,?,?,?,?, COALESCE((SELECT MAX(sort_order)+1 FROM ${ctx.table} WHERE product_line_id=? AND field_type=?), 1))`
    ).run(req.productId, r.fieldType, r.name, r.isDataEntry === undefined ? null : (r.isDataEntry ? 1 : 0), r.visualFpyTarget ?? null, r.functionalFpyTarget ?? null, r.airLeakFpyTarget ?? null, req.productId, r.fieldType);
    res.json({ id: result.lastInsertRowid });
  } else {
    const result = db.prepare(
      `INSERT OR IGNORE INTO ${ctx.table} (field_type, name, is_data_entry, visual_fpy_target, functional_fpy_target, air_leak_fpy_target, sort_order) VALUES (?,?,?,?,?,?, COALESCE((SELECT MAX(sort_order)+1 FROM ${ctx.table} WHERE field_type=?), 1))`
    ).run(r.fieldType, r.name, r.isDataEntry === undefined ? null : (r.isDataEntry ? 1 : 0), r.visualFpyTarget ?? null, r.functionalFpyTarget ?? null, r.airLeakFpyTarget ?? null, r.fieldType);
    res.json({ id: result.lastInsertRowid });
  }
});

router.put('/:id', requireAnyAuth, (req, res) => {
  const ctx = getCtx(req);
  const r = req.body;
  const existing = db.prepare(`SELECT * FROM ${ctx.table} WHERE id=?`).get(req.params.id) as any;
  if (!existing) { res.status(404).json({ error: '不存在' }); return; }
  db.prepare(
    `UPDATE ${ctx.table} SET field_type=?, name=?, is_data_entry=?, visual_fpy_target=?, functional_fpy_target=?, air_leak_fpy_target=?, sort_order=? WHERE id=?`
  ).run(r.fieldType || existing.field_type, r.name, r.isDataEntry === undefined ? existing.is_data_entry : (r.isDataEntry ? 1 : 0), r.visualFpyTarget ?? existing.visual_fpy_target, r.functionalFpyTarget ?? existing.functional_fpy_target, r.airLeakFpyTarget ?? existing.air_leak_fpy_target, r.sortOrder ?? existing.sort_order ?? 0, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', requireAnyAuth, (req, res) => {
  const ctx = getCtx(req);
  db.prepare(`DELETE FROM ${ctx.table} WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

export default router;
