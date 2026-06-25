import { Router } from 'express';
import db from '../db.js';
import { requireAnyAuth } from '../auth.js';

const router = Router();

router.get('/', requireAnyAuth, (_req, res) => {
  const rows = db.prepare('SELECT * FROM stations ORDER BY sort_order').all();
  res.json((rows as any[]).map(r => ({
    id: r.id, majorSection: r.major_section, minorSection: r.minor_section,
    stationName: r.station_name, stationType: r.station_type, isDataEntryType: !!r.is_data_entry_type,
    mesName: r.mes_name, abnormalPositions: JSON.parse(r.abnormal_positions || '[]'),
    sortOrder: r.sort_order, isActive: !!r.is_active,
  })));
});

// 根据工站类型自动获取 is_data_entry
function getDataEntryByType(stationType: string): number {
  if (!stationType) return 1;
  const row = db.prepare("SELECT is_data_entry FROM station_field_options WHERE field_type='stationType' AND name=?").get(stationType) as any;
  return row?.is_data_entry ?? 1;
}

router.post('/', requireAnyAuth, (req, res) => {
  const r = req.body;
  if (!r.majorSection || !r.minorSection || !r.stationName) {
    res.status(400).json({ error: '大工段、小工段、工站名称必填' });
    return;
  }
  const maxOrder = (db.prepare('SELECT MAX(sort_order) as m FROM stations').get() as any).m || 0;
  const isDataEntry = r.stationType ? getDataEntryByType(r.stationType) : (r.isDataEntryType ? 1 : 0);
  const result = db.prepare(
    'INSERT INTO stations (major_section, minor_section, station_name, station_type, is_data_entry_type, mes_name, abnormal_positions, sort_order, is_active) VALUES (?,?,?,?,?,?,?,?,?)'
  ).run(r.majorSection, r.minorSection, r.stationName, r.stationType || '', isDataEntry, r.mesName || '', JSON.stringify(r.abnormalPositions || []), maxOrder + 1, r.isActive ? 1 : 0);
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', requireAnyAuth, (req, res) => {
  const r = req.body;
  const isDataEntry = r.stationType ? getDataEntryByType(r.stationType) : (r.isDataEntryType ? 1 : 0);
  db.prepare(
    'UPDATE stations SET major_section=?, minor_section=?, station_name=?, station_type=?, is_data_entry_type=?, mes_name=?, abnormal_positions=?, is_active=?, sort_order=? WHERE id=?'
  ).run(r.majorSection, r.minorSection, r.stationName, r.stationType || '', isDataEntry, r.mesName || '', JSON.stringify(r.abnormalPositions || []), r.isActive ? 1 : 0, r.sortOrder ?? 0, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', requireAnyAuth, (req, res) => {
  const used = db.prepare(`
    SELECT 1 FROM production_records WHERE station_id = ?
    UNION ALL SELECT 1 FROM station_detail_records WHERE station_id = ?
    LIMIT 1`
  ).get(req.params.id, req.params.id);
  if (used) {
    res.json({ inUse: true, message: '该工站已有生产记录，无法删除' });
    return;
  }
  db.prepare('DELETE FROM stations WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// 拖拽排序
router.put('/reorder/bulk', requireAnyAuth, (req, res) => {
  const { items } = req.body; // [{ id, sortOrder }]
  const update = db.prepare('UPDATE stations SET sort_order = ? WHERE id = ?');
  const tx = db.transaction(() => { for (const it of items) update.run(it.sortOrder, it.id); });
  tx();
  res.json({ ok: true });
});

export default router;
