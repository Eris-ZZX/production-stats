import { Router } from 'express';
import db from '../db.js';
import { optionalProduct } from '../auth.js';

const router = Router();

// ===== 工站 FPY =====
router.get('/station-fpy', optionalProduct, (req, res) => {
  const productId = (req as any).productId;
  const { skuIds, startDate, endDate } = req.query;
  const sIds = skuIds ? String(skuIds).split(',').map(Number) : (productId ? [] : []);

  let prodSql = 'SELECT pr.station_id, SUM(pr.output_qty) as total_output FROM production_records pr JOIN product_skus ps ON pr.product_sku_id = ps.id WHERE 1=1';
  let detailSql = 'SELECT sr.station_id, sr.defect_type, SUM(sr.qty) as qty FROM station_detail_records sr JOIN product_skus ps ON sr.product_sku_id = ps.id WHERE 1=1';
  const pParams: any[] = [];
  const dParams: any[] = [];

  if (sIds.length > 0) {
    const ph = sIds.map(() => '?').join(',');
    prodSql += ` AND ps.id IN (${ph})`;
    detailSql += ` AND ps.id IN (${ph})`;
    pParams.push(...sIds);
    dParams.push(...sIds);
  }
  if (startDate) { prodSql += ' AND pr.record_date >= ?'; pParams.push(startDate); detailSql += ' AND sr.record_date >= ?'; dParams.push(startDate); }
  if (endDate) { prodSql += ' AND pr.record_date <= ?'; pParams.push(endDate); detailSql += ' AND sr.record_date <= ?'; dParams.push(endDate); }
  prodSql += ' GROUP BY pr.station_id';
  detailSql += ' GROUP BY sr.station_id, sr.defect_type';

  const prodRows = db.prepare(prodSql).all(...pParams) as any[];
  const detailRows = db.prepare(detailSql).all(...dParams) as any[];

  // Map outputs and defects
  const outputMap = new Map<number, number>();
  prodRows.forEach(r => outputMap.set(r.station_id, r.total_output));

  const defectMap = new Map<number, { appearance: number; functional: number; airLeak: number }>();
  detailRows.forEach(r => {
    let d = defectMap.get(r.station_id);
    if (!d) { d = { appearance: 0, functional: 0, airLeak: 0 }; defectMap.set(r.station_id, d); }
    if (r.defect_type === '外观') d.appearance += r.qty;
    else if (r.defect_type === '功能') d.functional += r.qty;
    else if (r.defect_type === '气密性') d.airLeak += r.qty;
  });

  const stations = db.prepare('SELECT * FROM stations').all() as any[];
  const result = [...outputMap.entries()].map(([sid, output]) => {
    const st = stations.find(s => s.id === sid);
    const defects = defectMap.get(sid) || { appearance: 0, functional: 0, airLeak: 0 };
    return {
      stationId: sid,
      stationName: st?.station_name || `#${sid}`,
      majorSection: st?.major_section || '',
      minorSection: st?.minor_section || '',
      stationType: st?.station_type || '',
      totalOutput: output,
      appearanceDefects: defects.appearance,
      functionalDefects: defects.functional,
      airLeakDefects: defects.airLeak,
      appearanceFpy: output > 0 ? +(100 * (output - defects.appearance) / output).toFixed(1) : 100,
      functionalFpy: output > 0 ? +(100 * (output - defects.functional) / output).toFixed(1) : 100,
      airLeakFpy: output > 0 ? +(100 * (output - defects.airLeak) / output).toFixed(1) : 100,
    };
  });
  res.json(result);
});

// ===== 工段 FPY =====
router.get('/section-fpy', optionalProduct, (req, res) => {
  const productId = (req as any).productId;
  const { skuIds, startDate, endDate } = req.query;
  const pIds = skuIds ? String(skuIds).split(',').map(Number) : (productId ? [productId] : []);

  // Get station FPY first (excluding FQC)
  let prodSql = 'SELECT s.id, s.major_section, SUM(pr.output_qty) as total_output FROM production_records pr JOIN stations s ON pr.station_id = s.id JOIN product_skus ps ON pr.product_sku_id = ps.id WHERE s.station_type != ?';
  const params: any[] = ['FQC'];
  if (pIds.length > 0) { prodSql += ` AND ps.id IN (${pIds.map(() => '?').join(',')})`; params.push(...pIds); }
  if (startDate) { prodSql += ' AND pr.record_date >= ?'; params.push(startDate); }
  if (endDate) { prodSql += ' AND pr.record_date <= ?'; params.push(endDate); }
  prodSql += ' GROUP BY s.id, s.major_section';

  let detailSql = 'SELECT s.id, s.major_section, sr.defect_type, SUM(sr.qty) as qty FROM station_detail_records sr JOIN stations s ON sr.station_id = s.id JOIN product_skus ps ON sr.product_sku_id = ps.id WHERE s.station_type != ?';
  const dParams: any[] = ['FQC'];
  if (pIds.length > 0) { detailSql += ` AND ps.id IN (${pIds.map(() => '?').join(',')})`; dParams.push(...pIds); }
  if (startDate) { detailSql += ' AND sr.record_date >= ?'; dParams.push(startDate); }
  if (endDate) { detailSql += ' AND sr.record_date <= ?'; dParams.push(endDate); }
  detailSql += ' GROUP BY s.id, s.major_section, sr.defect_type';

  const prodRows = db.prepare(prodSql).all(...params) as any[];
  const detailRows = db.prepare(detailSql).all(...dParams) as any[];

  // Calculate station FPY per section
  const stationFpys = new Map<number, { appearance: number; functional: number; airLeak: number }>();
  // Build defect map per station
  const defMap = new Map<number, { appearance: number; functional: number; airLeak: number }>();
  detailRows.forEach((r: any) => {
    let d = defMap.get(r.id);
    if (!d) { d = { appearance: 0, functional: 0, airLeak: 0 }; defMap.set(r.id, d); }
    if (r.defect_type === '外观') d.appearance += r.qty;
    else if (r.defect_type === '功能') d.functional += r.qty;
    else if (r.defect_type === '气密性') d.airLeak += r.qty;
  });

  prodRows.forEach((r: any) => {
    const d = defMap.get(r.id) || { appearance: 0, functional: 0, airLeak: 0 };
    stationFpys.set(r.id, {
      appearance: r.total_output > 0 ? (r.total_output - d.appearance) / r.total_output : 1,
      functional: r.total_output > 0 ? (r.total_output - d.functional) / r.total_output : 1,
      airLeak: r.total_output > 0 ? (r.total_output - d.airLeak) / r.total_output : 1,
    });
  });

  // Group by section and compute product FPY
  const secMap = new Map<string, { stations: { appearanceRatio: number; functionalRatio: number; airLeakRatio: number }[]; totalOutput: number }>();
  prodRows.forEach((r: any) => {
    let s = secMap.get(r.major_section);
    if (!s) { s = { stations: [], totalOutput: 0 }; secMap.set(r.major_section, s); }
    const fpy = stationFpys.get(r.id) || { appearance: 1, functional: 1, airLeak: 1 };
    s.stations.push({ appearanceRatio: fpy.appearance, functionalRatio: fpy.functional, airLeakRatio: fpy.airLeak });
    s.totalOutput += r.total_output;
  });

  const fieldsTable = productId ? 'product_station_fields' : 'station_field_options';
  const fieldsWhere = productId ? `field_type = 'majorSection' AND product_line_id = ${productId}` : "field_type = 'majorSection'";
  const fields = db.prepare(`SELECT * FROM ${fieldsTable} WHERE ${fieldsWhere}`).all() as any[];

  const result = [...secMap.entries()].map(([name, d]) => {
    const targets = fields.find((f: any) => f.name === name);
    return {
      majorSection: name,
      totalOutput: d.totalOutput,
      appearanceDefects: 0, functionalDefects: 0, airLeakDefects: 0,
      appearanceFpy: d.stations.length > 0 ? +((d.stations.reduce((p, s) => p * s.appearanceRatio, 1)) * 100).toFixed(1) : 100,
      functionalFpy: d.stations.length > 0 ? +((d.stations.reduce((p, s) => p * s.functionalRatio, 1)) * 100).toFixed(1) : 100,
      airLeakFpy: d.stations.length > 0 ? +((d.stations.reduce((p, s) => p * s.airLeakRatio, 1)) * 100).toFixed(1) : 100,
      appearanceTarget: targets?.visual_fpy_target ?? 97,
      functionalTarget: targets?.functional_fpy_target ?? 95,
      airLeakTarget: targets?.air_leak_fpy_target ?? 98,
    };
  });
  res.json(result);
});

// ===== FQC FPY =====
router.get('/fqc-fpy', optionalProduct, (req, res) => {
  const productId = (req as any).productId;
  const { skuIds, startDate, endDate } = req.query;
  const pIds = skuIds ? String(skuIds).split(',').map(Number) : (productId ? [productId] : []);

  let prodSql = 'SELECT s.id, s.major_section, SUM(pr.output_qty) as total_output FROM production_records pr JOIN stations s ON pr.station_id = s.id JOIN product_skus ps ON pr.product_sku_id = ps.id WHERE s.station_type = ?';
  const params: any[] = ['FQC'];
  if (pIds.length > 0) { prodSql += ` AND ps.id IN (${pIds.map(() => '?').join(',')})`; params.push(...pIds); }
  if (startDate) { prodSql += ' AND pr.record_date >= ?'; params.push(startDate); }
  if (endDate) { prodSql += ' AND pr.record_date <= ?'; params.push(endDate); }
  prodSql += ' GROUP BY s.id, s.major_section';

  let detailSql = 'SELECT s.id, s.major_section, sr.defect_type, SUM(sr.qty) as qty FROM station_detail_records sr JOIN stations s ON sr.station_id = s.id JOIN product_skus ps ON sr.product_sku_id = ps.id WHERE s.station_type = ?';
  const dParams: any[] = ['FQC'];
  if (pIds.length > 0) { detailSql += ` AND ps.id IN (${pIds.map(() => '?').join(',')})`; dParams.push(...pIds); }
  if (startDate) { detailSql += ' AND sr.record_date >= ?'; dParams.push(startDate); }
  if (endDate) { detailSql += ' AND sr.record_date <= ?'; dParams.push(endDate); }
  detailSql += ' GROUP BY s.id, s.major_section, sr.defect_type';

  const prodRows = db.prepare(prodSql).all(...params) as any[];
  const detailRows = db.prepare(detailSql).all(...dParams) as any[];

  // Same logic as section FPY but only appearance and functional
  const defMap = new Map<number, { appearance: number; functional: number }>();
  detailRows.forEach((r: any) => {
    let d = defMap.get(r.id);
    if (!d) { d = { appearance: 0, functional: 0 }; defMap.set(r.id, d); }
    if (r.defect_type === '外观') d.appearance += r.qty;
    else if (r.defect_type === '功能') d.functional += r.qty;
  });

  const stationFpys = new Map<number, { appearance: number; functional: number }>();
  prodRows.forEach((r: any) => {
    const d = defMap.get(r.id) || { appearance: 0, functional: 0 };
    stationFpys.set(r.id, {
      appearance: r.total_output > 0 ? (r.total_output - d.appearance) / r.total_output : 1,
      functional: r.total_output > 0 ? (r.total_output - d.functional) / r.total_output : 1,
    });
  });

  const secMap = new Map<string, { appearanceRatio: number[]; functionalRatio: number[]; totalOutput: number }>();
  prodRows.forEach((r: any) => {
    let s = secMap.get(r.major_section);
    if (!s) { s = { appearanceRatio: [], functionalRatio: [], totalOutput: 0 }; secMap.set(r.major_section, s); }
    const f = stationFpys.get(r.id) || { appearance: 1, functional: 1 };
    s.appearanceRatio.push(f.appearance);
    s.functionalRatio.push(f.functional);
    s.totalOutput += r.total_output;
  });

  res.json([...secMap.entries()].map(([name, d]) => ({
    majorSection: name,
    appearanceFpy: d.appearanceRatio.length > 0 ? +(d.appearanceRatio.reduce((p, v) => p * v, 1) * 100).toFixed(1) : 100,
    functionalFpy: d.functionalRatio.length > 0 ? +(d.functionalRatio.reduce((p, v) => p * v, 1) * 100).toFixed(1) : 100,
    appearanceTarget: 99, functionalTarget: 98,
  })));
});

// ===== TOP 缺陷排名 =====
router.get('/top-defects', optionalProduct, (req, res) => {
  const productId = (req as any).productId;
  const { skuIds, startDate, endDate, section, defectType, topN } = req.query;
  const pIds = skuIds ? String(skuIds).split(',').map(Number) : (productId ? [productId] : []);
  const top = parseInt(String(topN)) || 10;

  let filterSql = '';
  const params: any[] = [];

  if (section && section !== 'FQC') {
    filterSql = ' AND s.major_section = ?';
    params.push(section);
  } else if (section === 'FQC') {
    filterSql = ' AND s.station_type = ?';
    params.push('FQC');
  }

  let detailSql = 'SELECT sr.defect_code, SUM(sr.qty) as count FROM station_detail_records sr JOIN stations s ON sr.station_id = s.id JOIN product_skus ps ON sr.product_sku_id = ps.id WHERE 1=1';
  detailSql += filterSql;
  if (pIds.length > 0) { detailSql += ` AND ps.id IN (${pIds.map(() => '?').join(',')})`; params.push(...pIds); }
  if (startDate) { detailSql += ' AND sr.record_date >= ?'; params.push(startDate); }
  if (endDate) { detailSql += ' AND sr.record_date <= ?'; params.push(endDate); }
  if (defectType) { detailSql += ' AND sr.defect_type = ?'; params.push(defectType); }
  detailSql += ' GROUP BY sr.defect_code ORDER BY count DESC LIMIT ?';
  params.push(top);

  const rows = db.prepare(detailSql).all(...params) as any[];
  const total = rows.reduce((s, r) => s + r.count, 0);

  // Get stations per defect and max output
  const defects = db.prepare('SELECT * FROM defect_codes').all() as any[];

  // For output: get all production records in range
  let outputSql = 'SELECT pr.station_id, SUM(pr.output_qty) as total_output FROM production_records pr JOIN product_skus ps ON pr.product_sku_id = ps.id ';
  if (section && section !== 'FQC') {
    outputSql += 'JOIN stations s ON pr.station_id = s.id WHERE s.major_section = ?';
  } else if (section === 'FQC') {
    outputSql += 'JOIN stations s ON pr.station_id = s.id WHERE s.station_type = ?';
  } else {
    outputSql += 'WHERE 1=1';
  }
  const oParams: any[] = section && section !== 'FQC' ? [section] : section === 'FQC' ? ['FQC'] : [];
  if (pIds.length > 0) { outputSql += ` AND ps.id IN (${pIds.map(() => '?').join(',')})`; oParams.push(...pIds); }
  if (startDate) { outputSql += ' AND pr.record_date >= ?'; oParams.push(startDate); }
  if (endDate) { outputSql += ' AND pr.record_date <= ?'; oParams.push(endDate); }
  outputSql += ' GROUP BY pr.station_id';

  const outputRows = db.prepare(outputSql).all(...oParams) as any[];
  const stationOutput = new Map<number, number>();
  outputRows.forEach((r: any) => stationOutput.set(r.station_id, r.total_output));

  // For each top defect, find stations it appears in
  const result = rows.map((r: any) => {
    const d = defects.find((x: any) => x.defect_code === r.defect_code);
    // Find which stations have this defect
    let stSql = 'SELECT DISTINCT sr.station_id FROM station_detail_records sr JOIN product_skus ps ON sr.product_sku_id = ps.id WHERE sr.defect_code = ?';
    const stParams: any[] = [r.defect_code];
    if (pIds.length > 0) { stSql += ` AND ps.id IN (${pIds.map(() => '?').join(',')})`; stParams.push(...pIds); }
    if (startDate) { stSql += ' AND sr.record_date >= ?'; stParams.push(startDate); }
    if (endDate) { stSql += ' AND sr.record_date <= ?'; stParams.push(endDate); }
    if (defectType) { stSql += ' AND sr.defect_type = ?'; stParams.push(defectType); }
    const stRows = db.prepare(stSql).all(...stParams) as any[];
    const stationIds = stRows.map((sr: any) => sr.station_id);

    const stations = db.prepare('SELECT * FROM stations').all() as any[];
    const stationNames = stationIds.map((sid: number) => {
      const st = stations.find((s: any) => s.id === sid);
      return st ? `${st.major_section}-${st.station_name}` : `#${sid}`;
    });

    let maxOutput = 0;
    stationIds.forEach((sid: number) => {
      const out = stationOutput.get(sid) || 0;
      if (out > maxOutput) maxOutput = out;
    });

    return {
      defectCode: r.defect_code,
      defectName: d?.defect || r.defect_code,
      component: d?.component || '',
      type: d?.type || '',
      location: d?.location || '',
      stations: stationNames,
      output: maxOutput,
      count: r.count,
      rate: total > 0 ? +(r.count / total * 100).toFixed(1) : 0,
      defectRate: maxOutput > 0 ? +(r.count / maxOutput * 100).toFixed(1) : 0,
    };
  });

  res.json(result);
});

// ===== 工站趋势 =====
router.get('/station-trend', optionalProduct, (req, res) => {
  const productId = (req as any).productId;
  const { skuIds, startDate, endDate, defectType } = req.query;
  const pIds = skuIds ? String(skuIds).split(',').map(Number) : (productId ? [productId] : []);

  // Get stations
  const stations = db.prepare("SELECT * FROM stations WHERE is_active = 1 AND station_type != 'FQC' ORDER BY sort_order").all() as any[];

  // Production per date per station
  let prodSql = 'SELECT pr.record_date, pr.station_id, SUM(pr.output_qty) as total_output FROM production_records pr JOIN product_skus ps ON pr.product_sku_id = ps.id WHERE 1=1';
  const pParams: any[] = [];
  if (pIds.length > 0) { prodSql += ` AND ps.id IN (${pIds.map(() => '?').join(',')})`; pParams.push(...pIds); }
  if (startDate) { prodSql += ' AND pr.record_date >= ?'; pParams.push(startDate); }
  if (endDate) { prodSql += ' AND pr.record_date <= ?'; pParams.push(endDate); }
  prodSql += ' GROUP BY pr.record_date, pr.station_id ORDER BY pr.record_date';
  const prodMap = new Map<string, number>();
  (db.prepare(prodSql).all(...pParams) as any[]).forEach((r: any) => prodMap.set(`${r.record_date}|${r.station_id}`, r.total_output));

  let detailSql = 'SELECT sr.record_date, sr.station_id, SUM(sr.qty) as qty FROM station_detail_records sr JOIN product_skus ps ON sr.product_sku_id = ps.id WHERE 1=1';
  const dParams: any[] = [];
  if (pIds.length > 0) { detailSql += ` AND ps.id IN (${pIds.map(() => '?').join(',')})`; dParams.push(...pIds); }
  if (startDate) { detailSql += ' AND sr.record_date >= ?'; dParams.push(startDate); }
  if (endDate) { detailSql += ' AND sr.record_date <= ?'; dParams.push(endDate); }
  if (defectType) { detailSql += ' AND sr.defect_type = ?'; dParams.push(defectType); }
  detailSql += ' GROUP BY sr.record_date, sr.station_id ORDER BY sr.record_date';
  const detailMap = new Map<string, number>();
  (db.prepare(detailSql).all(...dParams) as any[]).forEach((r: any) => detailMap.set(`${r.record_date}|${r.station_id}`, r.qty));

  // Collect dates
  const dates = [...new Set([...prodMap.keys(), ...detailMap.keys()].map(k => k.split('|')[0]))].sort();

  const stationData = stations.map((st: any) => {
    const data = dates.map(d => {
      const dk = `${d}|${st.id}`;
      const output = prodMap.get(dk) || 0;
      const defects = detailMap.get(dk) || 0;
      if (output === 0 && defects === 0) return null;
      const safe = Math.min(defects, output);
      return output > 0 ? +(100 * (output - safe) / output).toFixed(1) : null;
    });
    const hasData = data.some(v => v !== null);
    if (!hasData) return null;
    return { stationId: st.id, stationName: st.station_name, majorSection: st.major_section, data };
  }).filter(Boolean);

  res.json({ dates, stations: stationData });
});

// ===== 工段趋势 =====
router.get('/section-trend', optionalProduct, (req, res) => {
  // Reuse station trend and aggregate by section
  const productId = (req as any).productId;
  const { skuIds, startDate, endDate, defectType } = req.query;
  const pIds = skuIds ? String(skuIds).split(',').map(Number) : (productId ? [productId] : []);

  const stations = db.prepare("SELECT * FROM stations WHERE is_active = 1 AND station_type != 'FQC' ORDER BY sort_order").all() as any[];

  let prodSql = 'SELECT pr.record_date, pr.station_id, SUM(pr.output_qty) as total_output FROM production_records pr JOIN product_skus ps ON pr.product_sku_id = ps.id WHERE 1=1';
  const pParams: any[] = [];
  if (pIds.length > 0) { prodSql += ` AND ps.id IN (${pIds.map(() => '?').join(',')})`; pParams.push(...pIds); }
  if (startDate) { prodSql += ' AND pr.record_date >= ?'; pParams.push(startDate); }
  if (endDate) { prodSql += ' AND pr.record_date <= ?'; pParams.push(endDate); }
  prodSql += ' GROUP BY pr.record_date, pr.station_id ORDER BY pr.record_date';
  const prodMap = new Map<string, number>();
  (db.prepare(prodSql).all(...pParams) as any[]).forEach((r: any) => prodMap.set(`${r.record_date}|${r.station_id}`, r.total_output));

  let detailSql = 'SELECT sr.record_date, sr.station_id, SUM(sr.qty) as qty FROM station_detail_records sr JOIN product_skus ps ON sr.product_sku_id = ps.id WHERE 1=1';
  const dParams: any[] = [];
  if (pIds.length > 0) { detailSql += ` AND ps.id IN (${pIds.map(() => '?').join(',')})`; dParams.push(...pIds); }
  if (startDate) { detailSql += ' AND sr.record_date >= ?'; dParams.push(startDate); }
  if (endDate) { detailSql += ' AND sr.record_date <= ?'; dParams.push(endDate); }
  if (defectType) { detailSql += ' AND sr.defect_type = ?'; dParams.push(defectType); }
  detailSql += ' GROUP BY sr.record_date, sr.station_id ORDER BY sr.record_date';
  const detailMap = new Map<string, number>();
  (db.prepare(detailSql).all(...dParams) as any[]).forEach((r: any) => detailMap.set(`${r.record_date}|${r.station_id}`, r.qty));

  const dates = [...new Set([...prodMap.keys(), ...detailMap.keys()].map(k => k.split('|')[0]))].sort();

  const stationData = stations.map((st: any) => {
    const data = dates.map(d => {
      const dk = `${d}|${st.id}`;
      const output = prodMap.get(dk) || 0;
      const defects = detailMap.get(dk) || 0;
      if (output === 0 && defects === 0) return null;
      const safe = Math.min(defects, output);
      return output > 0 ? +(100 * (output - safe) / output).toFixed(1) : null;
    });
    return { stationId: st.id, stationName: st.station_name, majorSection: st.major_section, data };
  });

  // Group by section
  const secMap = new Map<string, (number | null)[][]>();
  stationData.forEach(st => {
    let arr = secMap.get(st.majorSection);
    if (!arr) { arr = []; secMap.set(st.majorSection, arr); }
    arr.push(st.data);
  });

  const sections = [...secMap.entries()].map(([name, dataArrs]) => {
    const data = dates.map((_, i) => {
      const vals = dataArrs.map(arr => arr[i]).filter((v): v is number => v !== null);
      if (vals.length === 0) return null;
      return +(vals.reduce((p, v) => p * (v / 100), 1) * 100).toFixed(1);
    });
    return { sectionName: name, data };
  });

  res.json({ dates, sections });
});

// ===== 缺陷趋势 =====
router.get('/defect-trend', optionalProduct, (req, res) => {
  const productId = (req as any).productId;
  const { skuIds, startDate, endDate, topN } = req.query;
  const pIds = skuIds ? String(skuIds).split(',').map(Number) : (productId ? [productId] : []);
  const top = parseInt(String(topN)) || 15;

  // Get top defect codes
  let topSql = 'SELECT sr.defect_code, SUM(sr.qty) as total FROM station_detail_records sr JOIN product_skus ps ON sr.product_sku_id = ps.id WHERE 1=1';
  const tParams: any[] = [];
  if (pIds.length > 0) { topSql += ` AND ps.id IN (${pIds.map(() => '?').join(',')})`; tParams.push(...pIds); }
  if (startDate) { topSql += ' AND sr.record_date >= ?'; tParams.push(startDate); }
  if (endDate) { topSql += ' AND sr.record_date <= ?'; tParams.push(endDate); }
  topSql += ' GROUP BY sr.defect_code ORDER BY total DESC LIMIT ?';
  tParams.push(top);
  const topCodes = (db.prepare(topSql).all(...tParams) as any[]).map(r => r.defect_code);

  // Get counts per date per code
  let detailSql = 'SELECT sr.record_date, sr.defect_code, SUM(sr.qty) as qty FROM station_detail_records sr JOIN product_skus ps ON sr.product_sku_id = ps.id WHERE sr.defect_code IN (';
  detailSql += topCodes.map(() => '?').join(',') + ')';
  const dParams: any[] = [...topCodes];
  if (pIds.length > 0) { detailSql += ` AND ps.id IN (${pIds.map(() => '?').join(',')})`; dParams.push(...pIds); }
  if (startDate) { detailSql += ' AND sr.record_date >= ?'; dParams.push(startDate); }
  if (endDate) { detailSql += ' AND sr.record_date <= ?'; dParams.push(endDate); }
  detailSql += ' GROUP BY sr.record_date, sr.defect_code ORDER BY sr.record_date';
  const detailRows = db.prepare(detailSql).all(...dParams) as any[];

  const dates = [...new Set(detailRows.map((r: any) => r.record_date))].sort();
  const defects = db.prepare('SELECT * FROM defect_codes').all() as any[];

  const result = topCodes.map(code => {
    const d = defects.find((x: any) => x.defect_code === code);
    const countData = dates.map(date => {
      const row = detailRows.find((r: any) => r.record_date === date && r.defect_code === code);
      return row ? row.qty : 0;
    });
    return { defectName: d?.defect || code, component: d?.component || '', count: countData };
  });

  res.json({ dates, defects: result });
});

export default router;
