import { Router } from 'express';
import db from '../db.js';
import { requireProduct } from '../auth.js';

const router = Router();

router.get('/', requireProduct, (req, res) => {
  const productId = (req as any).productId;
  const { startDate, endDate } = req.query;
  let sql = 'SELECT ir.*, ps.code as sku_code FROM inspection_records ir JOIN product_skus ps ON ir.product_sku_id = ps.id WHERE ps.product_line_id = ?';
  const params: any[] = [productId];
  if (startDate) { sql += ' AND ir.inspection_date >= ?'; params.push(startDate); }
  if (endDate) { sql += ' AND ir.inspection_date <= ?'; params.push(endDate); }
  sql += ' ORDER BY ir.inspection_date DESC';
  const rows = db.prepare(sql).all(...params);
  res.json((rows as any[]).map(r => ({
    id: r.id, productSkuId: r.product_sku_id, skuCode: r.sku_code,
    majorSection: r.major_section, minorSection: r.minor_section,
    productionDefects: JSON.parse(r.production_defects || '[]'),
    fqcDefects: JSON.parse(r.fqc_defects || '[]'),
    inspectionDate: r.inspection_date, createdAt: r.created_at,
  })));
});

router.post('/', requireProduct, (req, res) => {
  const r = req.body;
  if (!r.productSkuId) { res.status(400).json({ error: '品号必填' }); return; }
  const result = db.prepare(
    'INSERT INTO inspection_records (product_sku_id, product_sn, major_section, minor_section, production_defects, fqc_defects, inspection_date) VALUES (?,?,?,?,?,?,?)'
  ).run(r.productSkuId, r.productSn, r.majorSection || '', r.minorSection || '', JSON.stringify(r.productionDefects || []), JSON.stringify(r.fqcDefects || []), r.inspectionDate);
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
