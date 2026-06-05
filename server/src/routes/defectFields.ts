import { Router } from 'express';
import db from '../db.js';
import { requireProduct } from '../auth.js';

const router = Router();

router.get('/', requireProduct, (_req, res) => {
  const rows = db.prepare('SELECT * FROM defect_field_options ORDER BY id').all();
  res.json((rows as any[]).map(r => ({ id: r.id, fieldType: r.field_type, name: r.name })));
});

router.post('/', requireProduct, (req, res) => {
  const r = req.body;
  const result = db.prepare('INSERT OR IGNORE INTO defect_field_options (field_type, name) VALUES (?,?)').run(r.fieldType, r.name);
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', requireProduct, (req, res) => {
  const r = req.body;
  db.prepare('UPDATE defect_field_options SET field_type=?, name=? WHERE id=?').run(r.fieldType, r.name, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', requireProduct, (req, res) => {
  db.prepare('DELETE FROM defect_field_options WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
