import { Router } from 'express';
import db from '../db.js';
import { requireAnyAuth, requireConfigAuth } from '../auth.js';

const router = Router();

function getCtx(req: any) {
  if (req.adminRole) return { type: 'admin', table: 'defect_codes' };
  if (req.productId) return { type: 'product', table: 'product_defect_codes' };
  return { type: 'admin', table: 'defect_codes' };
}

router.get('/', requireAnyAuth, (req, res) => {
  const ctx = getCtx(req);
  const pid = (req as any).productId;
  const rows = ctx.type === 'admin'
    ? db.prepare(`SELECT * FROM ${ctx.table} ORDER BY defect_code`).all()
    : db.prepare(`SELECT * FROM ${ctx.table} WHERE product_line_id = ? ORDER BY defect_code`).all(pid);
  res.json((rows as any[]).map(r => ({
    id: r.id, defectCode: r.defect_code, component: r.component,
    type: r.type, location: r.location, defect: r.defect, isActive: !!r.is_active,
    productLineId: r.product_line_id,
  })));
});

router.post('/', requireConfigAuth, (req, res) => {
  const ctx = getCtx(req);
  const r = req.body;
  const pid = (req as any).productId;
  try {
    if (ctx.type === 'product') {
      const result = db.prepare(
        `INSERT INTO ${ctx.table} (product_line_id, defect_code, component, type, location, defect, is_active) VALUES (?,?,?,?,?,?,?)`
      ).run(pid, r.defectCode, r.component, r.type, r.location, r.defect, r.isActive ? 1 : 0);
      res.json({ id: result.lastInsertRowid });
    } else {
      const result = db.prepare(
        `INSERT INTO ${ctx.table} (defect_code, component, type, location, defect, is_active) VALUES (?,?,?,?,?,?)`
      ).run(r.defectCode, r.component, r.type, r.location, r.defect, r.isActive ? 1 : 0);
      res.json({ id: result.lastInsertRowid });
    }
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) res.status(409).json({ error: '缺陷代码已存在' });
    else { console.error('defectCodes POST error:', e); res.status(500).json({ error: '操作失败' }); }
  }
});

router.put('/:id', requireConfigAuth, (req, res) => {
  const ctx = getCtx(req);
  const r = req.body;
  const pid = (req as any).productId;
  const whereClause = ctx.type === 'product' ? 'id=? AND product_line_id=?' : 'id=?';
  const whereParams: any[] = ctx.type === 'product' ? [req.params.id, pid] : [req.params.id];
  const existing = db.prepare(`SELECT * FROM ${ctx.table} WHERE ${whereClause}`).get(...whereParams) as any;
  if (!existing) { res.status(404).json({ error: '不存在' }); return; }
  db.prepare(
    `UPDATE ${ctx.table} SET defect_code=?, component=?, type=?, location=?, defect=?, is_active=? WHERE id=?`
  ).run(r.defectCode, r.component, r.type, r.location, r.defect, r.isActive ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', requireConfigAuth, (req, res) => {
  const ctx = getCtx(req);
  const pid = (req as any).productId;
  // Verify record exists and (if product context) belongs to correct product
  const whereClause = ctx.type === 'product' ? 'id=? AND product_line_id=?' : 'id=?';
  const whereParams: any[] = ctx.type === 'product' ? [req.params.id, pid] : [req.params.id];
  const existing = db.prepare(`SELECT defect_code FROM ${ctx.table} WHERE ${whereClause}`).get(...whereParams) as any;
  if (!existing) { res.status(404).json({ error: '不存在' }); return; }
  // Check if used in station_detail_records (product-scoped)
  let used: any;
  if (ctx.type === 'product') {
    used = db.prepare('SELECT 1 FROM station_detail_records sr JOIN product_skus ps ON sr.product_sku_id = ps.id WHERE sr.defect_code = ? AND ps.product_line_id = ? LIMIT 1').get(existing.defect_code, pid);
  } else {
    used = db.prepare('SELECT 1 FROM station_detail_records WHERE defect_code = ? LIMIT 1').get(existing.defect_code);
  }
  if (used) {
    db.prepare(`UPDATE ${ctx.table} SET is_active = 0 WHERE id = ?`).run(req.params.id);
    res.json({ ok: true, deactivated: true, message: '该缺陷代码已被使用，已自动停用' });
    return;
  }
  db.prepare(`DELETE FROM ${ctx.table} WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

export default router;
