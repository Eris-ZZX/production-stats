import { Router } from 'express';
import db from '../db.js';
import { requireProduct } from '../auth.js';

const router = Router();

function validateSkuOwnership(productSkuId: number, productId: number): boolean {
  const row = db.prepare('SELECT product_line_id FROM product_skus WHERE id = ?').get(productSkuId) as any;
  return row?.product_line_id === productId;
}

router.get('/', requireProduct, (req, res) => {
  const productId = (req as any).productId;
  const { startDate, endDate } = req.query;
  let sql = 'SELECT sr.*, ps.code as sku_code, ps.product_line_id FROM station_detail_records sr JOIN product_skus ps ON sr.product_sku_id = ps.id WHERE ps.product_line_id = ?';
  const params: any[] = [productId];
  if (startDate) { sql += ' AND sr.record_date >= ?'; params.push(startDate); }
  if (endDate) { sql += ' AND sr.record_date <= ?'; params.push(endDate); }
  sql += ' ORDER BY sr.record_date DESC, sr.station_id';
  const rows = db.prepare(sql).all(...params);
  res.json((rows as any[]).map(r => ({
    id: r.id, productSkuId: r.product_sku_id, productLineId: r.product_line_id, skuCode: r.sku_code,
    recordDate: r.record_date, stationId: r.station_id, defectType: r.defect_type, defectCode: r.defect_code, qty: r.qty,
  })));
});

router.post('/', requireProduct, (req, res) => {
  const productId = (req as any).productId;
  const { recordDate, stationId, defectType, defectCode, qty, productSkuId } = req.body;
  if (!recordDate || !stationId || !defectCode || !qty || !productSkuId) { res.status(400).json({ error: '参数不完整' }); return; }
  if (!validateSkuOwnership(productSkuId, productId)) { res.status(403).json({ error: '品号不属于当前产品' }); return; }
  const dup = db.prepare('SELECT id FROM station_detail_records WHERE product_sku_id=? AND record_date=? AND station_id=? AND defect_code=?').get(productSkuId, recordDate, stationId, defectCode);
  if (dup) { res.status(409).json({ error: '该日期+工站+缺陷已有记录', duplicate: true }); return; }
  const result = db.prepare('INSERT INTO station_detail_records (product_sku_id, record_date, station_id, defect_type, defect_code, qty) VALUES (?,?,?,?,?,?)').run(productSkuId, recordDate, stationId, defectType || '', defectCode, qty);
  res.json({ id: result.lastInsertRowid });
});

router.post('/batch', requireProduct, (req, res) => {
  const productId = (req as any).productId;
  const { records } = req.body;
  if (!records || !records.length) { res.status(400).json({ error: '无记录' }); return; }

  const ownershipErrors: string[] = [];
  const duplicates: string[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (!validateSkuOwnership(r.productSkuId, productId)) { ownershipErrors.push(`第${i + 1}条: 品号不属于当前产品`); continue; }
    const key = `${r.productSkuId}|${r.recordDate}|${r.stationId}|${r.defectCode}`;
    if (seen.has(key)) { duplicates.push(`第${i + 1}条: 批次内重复`); continue; }
    seen.add(key);
    const dup = db.prepare('SELECT id FROM station_detail_records WHERE product_sku_id=? AND record_date=? AND station_id=? AND defect_code=?').get(r.productSkuId, r.recordDate, r.stationId, r.defectCode);
    if (dup) { duplicates.push(`第${i + 1}条: 已存在`); }
  }

  if (ownershipErrors.length > 0) { res.status(403).json({ error: ownershipErrors.join('; ') }); return; }
  if (duplicates.length > 0) { res.status(409).json({ error: `${duplicates.length} 条重复`, duplicates }); return; }

  const insert = db.prepare('INSERT INTO station_detail_records (product_sku_id, record_date, station_id, defect_type, defect_code, qty) VALUES (?,?,?,?,?,?)');
  db.transaction(() => { for (const r of records) insert.run(r.productSkuId, r.recordDate, r.stationId, r.defectType || '', r.defectCode, r.qty); })();
  res.json({ ok: true, count: records.length });
});

router.put('/:id', requireProduct, (req, res) => {
  const productId = (req as any).productId;
  const { recordDate, stationId, defectType, defectCode, qty, productSkuId } = req.body;
  if (productSkuId && !validateSkuOwnership(productSkuId, productId)) { res.status(403).json({ error: '品号不属于当前产品' }); return; }
  db.prepare('UPDATE station_detail_records SET product_sku_id=?, record_date=?, station_id=?, defect_type=?, defect_code=?, qty=? WHERE id=?').run(productSkuId, recordDate, stationId, defectType || '', defectCode, qty, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', requireProduct, (req, res) => {
  db.prepare('DELETE FROM station_detail_records WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
