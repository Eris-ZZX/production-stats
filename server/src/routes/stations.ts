import { Router } from 'express';
import db from '../db.js';
import { requireProduct } from '../auth.js';

const router = Router();

router.get('/', requireProduct, (_req, res) => {
  const rows = db.prepare('SELECT * FROM stations ORDER BY sort_order').all();
  res.json((rows as any[]).map(r => ({
    id: r.id, majorSection: r.major_section, minorSection: r.minor_section,
    stationName: r.station_name, stationType: r.station_type, isDataEntryType: !!r.is_data_entry_type,
    mesName: r.mes_name, abnormalPositions: JSON.parse(r.abnormal_positions || '[]'),
    sortOrder: r.sort_order, isActive: !!r.is_active,
  })));
});

router.post('/', requireProduct, (req, res) => {
  const r = req.body;
  const maxOrder = (db.prepare('SELECT MAX(sort_order) as m FROM stations').get() as any).m || 0;
  const result = db.prepare(
    'INSERT INTO stations (major_section, minor_section, station_name, station_type, is_data_entry_type, mes_name, abnormal_positions, sort_order, is_active) VALUES (?,?,?,?,?,?,?,?,?)'
  ).run(r.majorSection, r.minorSection, r.stationName, r.stationType || '', r.isDataEntryType ? 1 : 0, r.mesName || '', JSON.stringify(r.abnormalPositions || []), maxOrder + 1, r.isActive ? 1 : 0);
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', requireProduct, (req, res) => {
  const r = req.body;
  db.prepare(
    'UPDATE stations SET major_section=?, minor_section=?, station_name=?, station_type=?, is_data_entry_type=?, mes_name=?, abnormal_positions=?, is_active=?, sort_order=? WHERE id=?'
  ).run(r.majorSection, r.minorSection, r.stationName, r.stationType || '', r.isDataEntryType ? 1 : 0, r.mesName || '', JSON.stringify(r.abnormalPositions || []), r.isActive ? 1 : 0, r.sortOrder ?? 0, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', requireProduct, (req, res) => {
  db.prepare('DELETE FROM stations WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// 拖拽排序
router.put('/reorder/bulk', requireProduct, (req, res) => {
  const { items } = req.body; // [{ id, sortOrder }]
  const update = db.prepare('UPDATE stations SET sort_order = ? WHERE id = ?');
  const tx = db.transaction(() => { for (const it of items) update.run(it.sortOrder, it.id); });
  tx();
  res.json({ ok: true });
});

export default router;
