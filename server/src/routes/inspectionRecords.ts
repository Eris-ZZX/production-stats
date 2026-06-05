import { Router } from 'express';
import db from '../db.js';
import { requireProduct } from '../auth.js';

const router = Router();

router.get('/', requireProduct, (req, res) => {
  const productId = (req as any).productId;
  const { startDate, endDate } = req.query;
  let sql = 'SELECT * FROM inspection_records WHERE product_id = ?';
  const params: any[] = [productId];
  if (startDate) { sql += ' AND inspection_date >= ?'; params.push(startDate); }
  if (endDate) { sql += ' AND inspection_date <= ?'; params.push(endDate); }
  sql += ' ORDER BY inspection_date DESC';
  const rows = db.prepare(sql).all(...params);
  res.json((rows as any[]).map(r => ({
    id: r.id, productId: r.product_id, productSn: r.product_sn,
    majorSection: r.major_section, minorSection: r.minor_section,
    productionDefects: JSON.parse(r.production_defects || '[]'),
    fqcDefects: JSON.parse(r.fqc_defects || '[]'),
    inspectionDate: r.inspection_date, createdAt: r.created_at,
  })));
});

router.post('/', requireProduct, (req, res) => {
  const productId = (req as any).productId;
  const r = req.body;
  const result = db.prepare(
    'INSERT INTO inspection_records (product_id, product_sn, major_section, minor_section, production_defects, fqc_defects, inspection_date) VALUES (?,?,?,?,?,?,?)'
  ).run(productId, r.productSn, r.majorSection || '', r.minorSection || '', JSON.stringify(r.productionDefects || []), JSON.stringify(r.fqcDefects || []), r.inspectionDate);
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', requireProduct, (req, res) => {
  const r = req.body;
  db.prepare(
    'UPDATE inspection_records SET product_sn=?, major_section=?, minor_section=?, production_defects=?, fqc_defects=?, inspection_date=? WHERE id=?'
  ).run(r.productSn, r.majorSection || '', r.minorSection || '', JSON.stringify(r.productionDefects || []), JSON.stringify(r.fqcDefects || []), r.inspectionDate, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', requireProduct, (req, res) => {
  db.prepare('DELETE FROM inspection_records WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
