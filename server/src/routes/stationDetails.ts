import { Router } from 'express';
import db from '../db.js';
import { requireProduct } from '../auth.js';

const router = Router();

router.get('/', requireProduct, (req, res) => {
  const productId = (req as any).productId;
  const { startDate, endDate } = req.query;
  let sql = 'SELECT * FROM station_detail_records WHERE product_id = ?';
  const params: any[] = [productId];
  if (startDate) { sql += ' AND record_date >= ?'; params.push(startDate); }
  if (endDate) { sql += ' AND record_date <= ?'; params.push(endDate); }
  sql += ' ORDER BY record_date DESC, station_id';
  const rows = db.prepare(sql).all(...params);
  res.json((rows as any[]).map(r => ({
    id: r.id, productId: r.product_id, recordDate: r.record_date,
    stationId: r.station_id, defectType: r.defect_type, defectCode: r.defect_code, qty: r.qty,
  })));
});

router.post('/', requireProduct, (req, res) => {
  const productId = (req as any).productId;
  const { recordDate, stationId, defectType, defectCode, qty } = req.body;
  if (!recordDate || !stationId || !defectCode || !qty) { res.status(400).json({ error: '参数不完整' }); return; }

  const dup = db.prepare('SELECT id FROM station_detail_records WHERE product_id=? AND record_date=? AND station_id=? AND defect_code=?').get(productId, recordDate, stationId, defectCode);
  if (dup) { res.status(409).json({ error: '该日期+工站+缺陷已有记录', duplicate: true }); return; }

  const result = db.prepare('INSERT INTO station_detail_records (product_id, record_date, station_id, defect_type, defect_code, qty) VALUES (?,?,?,?,?,?)').run(productId, recordDate, stationId, defectType || '', defectCode, qty);
  res.json({ id: result.lastInsertRowid });
});

router.post('/batch', requireProduct, (req, res) => {
  const productId = (req as any).productId;
  const { records } = req.body;
  if (!records || !records.length) { res.status(400).json({ error: '无记录' }); return; }

  const insert = db.prepare('INSERT INTO station_detail_records (product_id, record_date, station_id, defect_type, defect_code, qty) VALUES (?,?,?,?,?,?)');
  const check = db.prepare('SELECT id FROM station_detail_records WHERE product_id=? AND record_date=? AND station_id=? AND defect_code=?');
  const duplicates: string[] = [];

  const tx = db.transaction(() => {
    for (const r of records) {
      const dup = check.get(productId, r.recordDate, r.stationId, r.defectCode);
      if (dup) { duplicates.push(`${r.recordDate}/${r.stationId}/${r.defectCode}`); continue; }
      insert.run(productId, r.recordDate, r.stationId, r.defectType || '', r.defectCode, r.qty);
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
  const { recordDate, stationId, defectType, defectCode, qty } = req.body;
  db.prepare('UPDATE station_detail_records SET record_date=?, station_id=?, defect_type=?, defect_code=?, qty=? WHERE id=?').run(recordDate, stationId, defectType || '', defectCode, qty, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', requireProduct, (req, res) => {
  db.prepare('DELETE FROM station_detail_records WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
