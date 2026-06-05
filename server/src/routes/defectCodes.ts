import { Router } from 'express';
import db from '../db.js';
import { requireProduct } from '../auth.js';

const router = Router();

router.get('/', requireProduct, (_req, res) => {
  const rows = db.prepare('SELECT * FROM defect_codes ORDER BY defect_code').all();
  res.json((rows as any[]).map(r => ({
    id: r.id, defectCode: r.defect_code, component: r.component,
    type: r.type, location: r.location, defect: r.defect, isActive: !!r.is_active,
  })));
});

router.post('/', requireProduct, (req, res) => {
  const r = req.body;
  const result = db.prepare(
    'INSERT INTO defect_codes (defect_code, component, type, location, defect, is_active) VALUES (?,?,?,?,?,?)'
  ).run(r.defectCode, r.component, r.type, r.location, r.defect, r.isActive ? 1 : 0);
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', requireProduct, (req, res) => {
  const r = req.body;
  db.prepare(
    'UPDATE defect_codes SET defect_code=?, component=?, type=?, location=?, defect=?, is_active=? WHERE id=?'
  ).run(r.defectCode, r.component, r.type, r.location, r.defect, r.isActive ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', requireProduct, (req, res) => {
  db.prepare('DELETE FROM defect_codes WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
