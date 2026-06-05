import { Router } from 'express';
import db from '../db.js';
import { requireProduct } from '../auth.js';

const router = Router();

router.get('/', requireProduct, (_req, res) => {
  const rows = db.prepare('SELECT * FROM station_field_options ORDER BY id').all();
  res.json((rows as any[]).map(r => ({
    id: r.id, fieldType: r.field_type, name: r.name,
    isDataEntry: r.is_data_entry === null ? undefined : !!r.is_data_entry,
    visualFpyTarget: r.visual_fpy_target, functionalFpyTarget: r.functional_fpy_target, airLeakFpyTarget: r.air_leak_fpy_target,
  })));
});

router.post('/', requireProduct, (req, res) => {
  const r = req.body;
  const result = db.prepare(
    'INSERT OR IGNORE INTO station_field_options (field_type, name, is_data_entry, visual_fpy_target, functional_fpy_target, air_leak_fpy_target) VALUES (?,?,?,?,?,?)'
  ).run(r.fieldType, r.name, r.isDataEntry === undefined ? null : (r.isDataEntry ? 1 : 0), r.visualFpyTarget ?? null, r.functionalFpyTarget ?? null, r.airLeakFpyTarget ?? null);
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', requireProduct, (req, res) => {
  const r = req.body;
  db.prepare(
    'UPDATE station_field_options SET field_type=?, name=?, is_data_entry=?, visual_fpy_target=?, functional_fpy_target=?, air_leak_fpy_target=? WHERE id=?'
  ).run(r.fieldType, r.name, r.isDataEntry === undefined ? null : (r.isDataEntry ? 1 : 0), r.visualFpyTarget ?? null, r.functionalFpyTarget ?? null, r.airLeakFpyTarget ?? null, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', requireProduct, (req, res) => {
  db.prepare('DELETE FROM station_field_options WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
