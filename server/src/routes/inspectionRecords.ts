import { Router } from 'express';
import db from '../db.js';
import { requireProduct, requireProductWrite } from '../auth.js';

const router = Router();

function validateSkuOwnership(productSkuId: number, productId: number): boolean {
  const row = db.prepare('SELECT product_line_id FROM product_skus WHERE id = ?').get(productSkuId) as any;
  return row?.product_line_id === productId;
}

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

router.post('/', requireProductWrite, (req, res) => {
  const productId = (req as any).productId;
  const r = req.body;
  if (!r.productSkuId || !r.productSn || !r.inspectionDate) {
    res.status(400).json({ error: '品号、SN、日期必填' }); return;
  }
  if (!validateSkuOwnership(r.productSkuId, productId)) { res.status(403).json({ error: '品号不属于当前产品' }); return; }
  // Duplicate check
  const dup = db.prepare('SELECT id FROM inspection_records WHERE product_sku_id=? AND inspection_date=? AND product_sn=? AND major_section=?').get(r.productSkuId, r.inspectionDate, r.productSn, r.majorSection || '');
  if (dup) { res.status(409).json({ error: '该记录已存在', duplicate: true }); return; }
  const result = db.prepare(
    'INSERT INTO inspection_records (product_sku_id, product_sn, major_section, minor_section, production_defects, fqc_defects, inspection_date) VALUES (?,?,?,?,?,?,?)'
  ).run(r.productSkuId, r.productSn, r.majorSection || '', r.minorSection || '', JSON.stringify(r.productionDefects || []), JSON.stringify(r.fqcDefects || []), r.inspectionDate);
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', requireProductWrite, (req, res) => {
  const productId = (req as any).productId;
  const existing = db.prepare('SELECT ir.product_sku_id, ps.product_line_id FROM inspection_records ir JOIN product_skus ps ON ir.product_sku_id = ps.id WHERE ir.id = ?').get(req.params.id) as any;
  if (!existing) { res.status(404).json({ error: '记录不存在' }); return; }
  if (existing.product_line_id !== productId) { res.status(403).json({ error: '无权操作其他产品的记录' }); return; }
  const r = req.body;
  // If changing productSkuId, validate ownership too
  if (r.productSkuId && !validateSkuOwnership(r.productSkuId, productId)) { res.status(403).json({ error: '品号不属于当前产品' }); return; }
  db.prepare(
    'UPDATE inspection_records SET product_sn=?, major_section=?, minor_section=?, production_defects=?, fqc_defects=?, inspection_date=? WHERE id=?'
  ).run(r.productSn, r.majorSection || '', r.minorSection || '', JSON.stringify(r.productionDefects || []), JSON.stringify(r.fqcDefects || []), r.inspectionDate, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', requireProductWrite, (req, res) => {
  const productId = (req as any).productId;
  const existing = db.prepare('SELECT ir.product_sku_id, ps.product_line_id FROM inspection_records ir JOIN product_skus ps ON ir.product_sku_id = ps.id WHERE ir.id = ?').get(req.params.id) as any;
  if (!existing) { res.status(404).json({ error: '记录不存在' }); return; }
  if (existing.product_line_id !== productId) { res.status(403).json({ error: '无权操作其他产品的记录' }); return; }
  db.prepare('DELETE FROM inspection_records WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
