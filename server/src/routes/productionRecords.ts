import { Router } from 'express';
import db from '../db.js';
import { requireProduct } from '../auth.js';

const router = Router();

router.get('/', requireProduct, (req, res) => {
  const productId = (req as any).productId; // this is product_line_id
  const { startDate, endDate } = req.query;
  let sql = 'SELECT pr.*, ps.code as sku_code, ps.product_line_id FROM production_records pr JOIN product_skus ps ON pr.product_sku_id = ps.id WHERE ps.product_line_id = ?';
  const params: any[] = [productId];
  if (startDate) { sql += ' AND pr.record_date >= ?'; params.push(startDate); }
  if (endDate) { sql += ' AND pr.record_date <= ?'; params.push(endDate); }
  sql += ' ORDER BY pr.record_date DESC, pr.station_id';
  const rows = db.prepare(sql).all(...params);
  res.json((rows as any[]).map(r => ({
    id: r.id, productSkuId: r.product_sku_id, productLineId: r.product_line_id, skuCode: r.sku_code,
    recordDate: r.record_date, stationId: r.station_id, outputQty: r.output_qty, createdAt: r.created_at,
  })));
});

router.post('/', requireProduct, (req, res) => {
  const { recordDate, stationId, outputQty, productSkuId } = req.body;
  if (!recordDate || !stationId || !outputQty || !productSkuId) { res.status(400).json({ error: '参数不完整' }); return; }
  const dup = db.prepare('SELECT id FROM production_records WHERE product_sku_id=? AND record_date=? AND station_id=?').get(productSkuId, recordDate, stationId);
  if (dup) { res.status(409).json({ error: '该日期+工站已有记录', duplicate: true }); return; }
  const result = db.prepare('INSERT INTO production_records (product_sku_id, record_date, station_id, output_qty) VALUES (?,?,?,?)').run(productSkuId, recordDate, stationId, outputQty);
  res.json({ id: result.lastInsertRowid });
});

router.post('/batch', requireProduct, (req, res) => {
  const { records } = req.body;
  if (!records || !records.length) { res.status(400).json({ error: '无记录' }); return; }
  const insert = db.prepare('INSERT INTO production_records (product_sku_id, record_date, station_id, output_qty) VALUES (?,?,?,?)');
  const check = db.prepare('SELECT id FROM production_records WHERE product_sku_id=? AND record_date=? AND station_id=?');
  const duplicates: string[] = [];
  const tx = db.transaction(() => {
    for (const r of records) {
      const dup = check.get(r.productSkuId, r.recordDate, r.stationId);
      if (dup) { duplicates.push(`${r.recordDate}/${r.stationId}`); continue; }
      insert.run(r.productSkuId, r.recordDate, r.stationId, r.outputQty);
    }
  });
  tx();
  if (duplicates.length > 0) {
    res.status(409).json({ error: `${duplicates.length} 条重复`, duplicates });
    return;
  }
  res.json({ ok: true, count: records.length });
});

router.put('/:id', requireProduct, (req, res) => {
  const { recordDate, stationId, outputQty, productSkuId } = req.body;
  db.prepare('UPDATE production_records SET product_sku_id=?, record_date=?, station_id=?, output_qty=? WHERE id=?').run(productSkuId, recordDate, stationId, outputQty, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', requireProduct, (req, res) => {
  db.prepare('DELETE FROM production_records WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
