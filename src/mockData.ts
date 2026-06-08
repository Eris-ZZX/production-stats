import type { Product, Station, DefectCode, DefectFieldOption, StationFieldOption, ProductionRecord, InspectionRecord, YieldData, FpyData, TopDefect, TrendPoint, ProductLine, AdminAccount } from './types';

// ========== 产品线 ==========
export const mockProductLines: ProductLine[] = [];

// ========== 后台管理员账号 ==========
export const mockAdminAccounts: AdminAccount[] = [
  { id: 1, username: 'admin', password: 'admin', role: 'super', isActive: true },
  { id: 2, username: 'config', password: 'config', role: 'config', isActive: true },
  { id: 3, username: 'viewer', password: 'viewer', role: 'viewer', isActive: true },
];

// ========== 品号 ==========
export const mockProducts: Product[] = [];

// ========== 工站 ==========
export const mockStations: Station[] = [];

// ========== 缺陷字段选项（全局共享） ==========
let _nextFieldId = 100;

function makeField(fieldType: DefectFieldOption['fieldType'], name: string): DefectFieldOption {
  return { id: _nextFieldId++, fieldType, name };
}

export const mockDefectFields: DefectFieldOption[] = [
  // 组件
  makeField('component', '左耳'),
  makeField('component', '右耳'),
  makeField('component', '充电盒'),
  makeField('component', '盒机'),
  // 类型
  makeField('type', '外观'),
  makeField('type', '功能'),
  makeField('type', '气密性'),
];

// ========== 缺陷代码 ==========
export const mockDefects: DefectCode[] = [];

// 工具：从缺陷字段选项中提取指定类型的名称列表
export function getFieldOptions(fieldType: DefectFieldOption['fieldType']): string[] {
  return mockDefectFields.filter(f => f.fieldType === fieldType).map(f => f.name);
}

/** 确保缺陷字段存在，不存在则添加 */
export function ensureDefectField(fieldType: DefectFieldOption['fieldType'], name: string) {
  if (!name || !name.trim()) return;
  if (!mockDefectFields.some(f => f.fieldType === fieldType && f.name === name)) {
    const maxId = mockDefectFields.reduce((max, f) => Math.max(max, f.id), 0);
    mockDefectFields.push({ id: maxId + 1, fieldType, name });
  }
}

// ========== 工站字段选项（全局共享） ==========
let _nextSFieldId = 200;

function makeSField(fieldType: StationFieldOption['fieldType'], name: string): StationFieldOption {
  return { id: _nextSFieldId++, fieldType, name };
}

export const mockStationFields: StationFieldOption[] = [
  { ...makeSField('stationType', '必过工站'), isDataEntry: true },
  { ...makeSField('stationType', '被合并工站'), isDataEntry: false },
  { ...makeSField('stationType', '前加工记录工站'), isDataEntry: true },
  { ...makeSField('stationType', '可选工站'), isDataEntry: true },
  { ...makeSField('stationType', 'FQC'), isDataEntry: true },
];

export function getStationFieldOptions(fieldType: StationFieldOption['fieldType']): string[] {
  return mockStationFields.filter(f => f.fieldType === fieldType).map(f => f.name);
}

/** 确保工站字段存在，不存在则添加 */
export function ensureStationField(fieldType: StationFieldOption['fieldType'], name: string) {
  if (!name || !name.trim()) return;
  if (!mockStationFields.some(f => f.fieldType === fieldType && f.name === name)) {
    const maxId = mockStationFields.reduce((max, f) => Math.max(max, f.id), 0);
    mockStationFields.push({ id: maxId + 1, fieldType, name });
  }
}

// ========== 工站明细记录（缺陷细分数据，用于FPY计算） ==========
export interface StationDetailRecord {
  productId: number; recordDate: string; stationId: number;
  defectType: string; defectCode: string; qty: number;
}

export const mockStationDetailRecords: StationDetailRecord[] = [];

// ========== 制程投产记录 ==========
export const mockProductionRecords: ProductionRecord[] = [];

// ========== 外检记录 ==========
export const mockInspectionRecords: InspectionRecord[] = [];

// ========== 仪表盘数据 ==========

/**
 * FPY 计算逻辑：
 *   - 投产数：来源于 mockProductionRecords（去重后每站每天唯一）
 *   - 不良数：来源于 mockStationDetailRecords（工站明细录入的缺陷细分数据）
 *   - 按 defectType 归类为外观/功能/气密性
 *   - FPY = (投产数 - 该类型不良数) / 投产数 × 100%
 */

/** 计算指定日期范围内每个工站的 FPY（支持多品号） */
export function getStationFpy(productIds: number[], startDate?: string, endDate?: string) {
  // 1. 投产数：从 ProductionRecords 聚合（去重后每站每天一条）
  const pSet = new Set(productIds);
  const prodRecords = mockProductionRecords.filter(r => {
    if (!pSet.has(r.productId)) return false;
    if (startDate && r.recordDate < startDate) return false;
    if (endDate && r.recordDate > endDate) return false;
    return true;
  });

  const stationOutput = new Map<number, number>();
  prodRecords.forEach(r => {
    stationOutput.set(r.stationId, (stationOutput.get(r.stationId) || 0) + r.outputQty);
  });

  // 2. 不良数：从 StationDetailRecords 按类型聚合
  const detailRecs = mockStationDetailRecords.filter(r => {
    if (!pSet.has(r.productId)) return false;
    if (startDate && r.recordDate < startDate) return false;
    if (endDate && r.recordDate > endDate) return false;
    return true;
  });

  const stationDefects = new Map<number, { appearance: number; functional: number; airLeak: number }>();
  detailRecs.forEach(r => {
    let d = stationDefects.get(r.stationId);
    if (!d) { d = { appearance: 0, functional: 0, airLeak: 0 }; stationDefects.set(r.stationId, d); }
    if (r.defectType === '外观') d.appearance += r.qty;
    else if (r.defectType === '功能') d.functional += r.qty;
    else if (r.defectType === '气密性') d.airLeak += r.qty;
  });

  // 3. 合并计算：只展示有投产数据的工站
  return [...stationOutput.entries()].map(([sid, output]) => {
    const st = mockStations.find(x => x.id === sid);
    const defects = stationDefects.get(sid) || { appearance: 0, functional: 0, airLeak: 0 };
    return {
      stationId: sid,
      stationName: st?.stationName || `Station#${sid}`,
      majorSection: st?.majorSection || '',
      minorSection: st?.minorSection || '',
      stationType: st?.stationType || '',
      totalOutput: output,
      appearanceDefects: defects.appearance,
      functionalDefects: defects.functional,
      airLeakDefects: defects.airLeak,
      appearanceFpy: output > 0 ? Number((((output - defects.appearance) / output) * 100).toFixed(1)) : 100,
      functionalFpy: output > 0 ? Number((((output - defects.functional) / output) * 100).toFixed(1)) : 100,
      airLeakFpy: output > 0 ? Number((((output - defects.airLeak) / output) * 100).toFixed(1)) : 100,
    };
  });
}

/** 计算指定日期范围内各大工段的 FPY（支持多品号）
 *  工段FPY = 该工段内各工站FPY的乘积（一次通过率）
 *  不含 FQC 工站，FQC 独立计算见 getFqcFpy */
export function getSectionFpy(productIds: number[], startDate?: string, endDate?: string) {
  const stations = getStationFpy(productIds, startDate, endDate).filter(s => s.stationType !== 'FQC');

  const bySection = new Map<string, { stations: { appearanceFpy: number; functionalFpy: number; airLeakFpy: number }[]; totalOutput: number }>();

  stations.forEach(s => {
    let sec = bySection.get(s.majorSection);
    if (!sec) { sec = { stations: [], totalOutput: 0 }; bySection.set(s.majorSection, sec); }
    sec.stations.push({ appearanceFpy: s.appearanceFpy, functionalFpy: s.functionalFpy, airLeakFpy: s.airLeakFpy });
    sec.totalOutput += s.totalOutput;
  });

  return [...bySection.entries()].map(([name, d]) => {
    const appearanceFpy = d.stations.length > 0
      ? Number((d.stations.reduce((p, s) => p * (s.appearanceFpy / 100), 1) * 100).toFixed(1)) : 100;
    const functionalFpy = d.stations.length > 0
      ? Number((d.stations.reduce((p, s) => p * (s.functionalFpy / 100), 1) * 100).toFixed(1)) : 100;
    const airLeakFpy = d.stations.length > 0
      ? Number((d.stations.reduce((p, s) => p * (s.airLeakFpy / 100), 1) * 100).toFixed(1)) : 100;
    const targets = mockStationFields.find(f => f.fieldType === 'majorSection' && f.name === name);
    return {
      majorSection: name,
      totalOutput: d.totalOutput,
      appearanceDefects: 0, functionalDefects: 0, airLeakDefects: 0,
      appearanceFpy, functionalFpy, airLeakFpy,
      appearanceTarget: targets?.visualFpyTarget ?? 97,
      functionalTarget: targets?.functionalFpyTarget ?? 95,
      airLeakTarget: targets?.airLeakFpyTarget ?? 98,
    };
  });
}

/** 计算 FQC 工站按大工段分组的 FPY（外观 + 功能两个维度） */
export function getFqcFpy(productIds: number[], startDate?: string, endDate?: string) {
  const stations = getStationFpy(productIds, startDate, endDate).filter(s => s.stationType === 'FQC');

  const bySection = new Map<string, { stations: { appearanceFpy: number; functionalFpy: number }[]; totalOutput: number }>();

  stations.forEach(s => {
    let sec = bySection.get(s.majorSection);
    if (!sec) { sec = { stations: [], totalOutput: 0 }; bySection.set(s.majorSection, sec); }
    sec.stations.push({ appearanceFpy: s.appearanceFpy, functionalFpy: s.functionalFpy });
    sec.totalOutput += s.totalOutput;
  });

  return [...bySection.entries()].map(([name, d]) => {
    const appearanceFpy = d.stations.length > 0
      ? Number((d.stations.reduce((p, s) => p * (s.appearanceFpy / 100), 1) * 100).toFixed(1)) : 100;
    const functionalFpy = d.stations.length > 0
      ? Number((d.stations.reduce((p, s) => p * (s.functionalFpy / 100), 1) * 100).toFixed(1)) : 100;
    return {
      majorSection: name,
      appearanceFpy, functionalFpy,
      appearanceTarget: 99, functionalTarget: 98,
    };
  });
}

/** 按缺陷类型（外观/功能/气密性）计算 TOP 缺陷排名 */
export function getTypeTopDefects(
  defectType: string,
  productIds: number[],
  startDate?: string,
  endDate?: string,
  topN: number = 10,
) {
  const pSet = new Set(productIds);
  const detailRecs = mockStationDetailRecords.filter(r => {
    if (!pSet.has(r.productId)) return false;
    if (startDate && r.recordDate < startDate) return false;
    if (endDate && r.recordDate > endDate) return false;
    if (r.defectType !== defectType) return false;
    return true;
  });

  const byCode = new Map<string, number>();
  detailRecs.forEach(r => {
    byCode.set(r.defectCode, (byCode.get(r.defectCode) || 0) + r.qty);
  });

  const total = [...byCode.values()].reduce((a, b) => a + b, 0);

  return [...byCode.entries()]
    .map(([code, count]) => {
      const d = mockDefects.find(x => x.defectCode === code);
      return {
        defectCode: code,
        defectName: d?.defect || code,
        component: d?.component || '',
        location: d?.location || '',
        count,
        rate: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}
export function getSectionTopDefects(
  section: string,
  productIds: number[],
  startDate?: string,
  endDate?: string,
  topN: number = 10,
  defectType?: string,
) {
  const pSet = new Set(productIds);
  const detailRecs = mockStationDetailRecords.filter(r => {
    if (!pSet.has(r.productId)) return false;
    if (startDate && r.recordDate < startDate) return false;
    if (endDate && r.recordDate > endDate) return false;
    if (defectType && r.defectType !== defectType) return false;
    return true;
  });

  // 筛选指定工段的记录（FQC 按工站类型筛选）
  const isFqc = section === 'FQC';
  const inSection = detailRecs.filter(r => {
    const st = mockStations.find(s => s.id === r.stationId);
    if (!st) return false;
    return isFqc ? st.stationType === 'FQC' : st.majorSection === section;
  });

  // 按缺陷代码汇总数量 + 记录出现的工站集合
  const byCode = new Map<string, { count: number; stationIds: Set<number> }>();
  inSection.forEach(r => {
    let entry = byCode.get(r.defectCode);
    if (!entry) { entry = { count: 0, stationIds: new Set() }; byCode.set(r.defectCode, entry); }
    entry.count += r.qty;
    entry.stationIds.add(r.stationId);
  });

  const total = [...byCode.values()].reduce((a, b) => a + b.count, 0);

  // 投产记录：按 productId+stationId+recordDate 去重取投产数
  const prodRecs = mockProductionRecords.filter(r => {
    if (!pSet.has(r.productId)) return false;
    if (startDate && r.recordDate < startDate) return false;
    if (endDate && r.recordDate > endDate) return false;
    return true;
  });
  const stationOutput = new Map<number, number>();
  const seen = new Set<string>();
  prodRecs.forEach(r => {
    const key = `${r.productId}|${r.stationId}|${r.recordDate}`;
    if (seen.has(key)) return;
    seen.add(key);
    stationOutput.set(r.stationId, (stationOutput.get(r.stationId) || 0) + r.outputQty);
  });

  return [...byCode.entries()]
    .map(([code, { count, stationIds }]) => {
      const d = mockDefects.find(x => x.defectCode === code);
      // 不良率分母：该缺陷出现的工站中，投产数最大的工站的投产数
      let maxOutput = 0;
      stationIds.forEach(sid => {
        const out = stationOutput.get(sid) || 0;
        if (out > maxOutput) maxOutput = out;
      });
      const stationNames = [...stationIds].map(sid => {
        const st = mockStations.find(x => x.id === sid);
        return st ? `${st.majorSection}-${st.stationName}` : `#${sid}`;
      });
      return {
        defectCode: code,
        defectName: d?.defect || code,
        component: d?.component || '',
        type: d?.type || '',
        location: d?.location || '',
        stations: stationNames,
        output: maxOutput,
        count,
        rate: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
        defectRate: maxOutput > 0 ? Number(((count / maxOutput) * 100).toFixed(1)) : 0,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

export const getMockYieldData = (productId: number): YieldData[] => {
  return getStationFpy([productId]).map(s => ({
    stationName: s.stationName,
    outputQty: s.totalOutput,
    defectQty: s.appearanceDefects + s.functionalDefects + s.airLeakDefects,
    yieldRate: s.totalOutput > 0 ? Number((((s.totalOutput - s.appearanceDefects - s.functionalDefects - s.airLeakDefects) / s.totalOutput) * 100).toFixed(1)) : 100,
  }));
};

export const getMockFpyData = (productId: number): FpyData[] => {
  return getSectionFpy([productId]).map(s => ({
    majorSection: s.majorSection,
    visualFpy: s.appearanceFpy,
    functionalFpy: s.functionalFpy,
    airLeakFpy: s.airLeakFpy,
    overallFpy: Number((((s.totalOutput - s.appearanceDefects - s.functionalDefects - s.airLeakDefects) / s.totalOutput) * 100).toFixed(1)) || 100,
    targetFpy: Math.max(s.appearanceTarget, s.functionalTarget, s.airLeakTarget),
  }));
};

export const getMockTopDefects = (productId: number): TopDefect[] => {
  const records = mockProductionRecords.filter(r => r.productId === productId);
  const byCode = new Map<string, number>();
  records.forEach(r => {
    if (r.defectCode) {
      byCode.set(r.defectCode, (byCode.get(r.defectCode) || 0) + (r.outputQty - r.visualReturnGood));
    }
  });
  const totalDefects = [...byCode.values()].reduce((a, b) => a + b, 0);
  return [...byCode.entries()]
    .map(([code, count]) => {
      const d = mockDefects.find(x => x.defectCode === code);
      return { defectCode: code, defectName: d?.defect || code, component: d?.component || '', count, rate: Number(((count / totalDefects) * 100).toFixed(1)) };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
};

export const getMockTrendData = (productId: number): TrendPoint[] => {
  const records = mockProductionRecords.filter(r => r.productId === productId);
  const byDate = new Map<string, { total: number; defects: number }>();
  records.forEach(r => {
    const cur = byDate.get(r.recordDate) || { total: 0, defects: 0 };
    cur.total += r.outputQty;
    cur.defects += (r.outputQty - r.visualReturnGood);
    byDate.set(r.recordDate, cur);
  });
  return [...byDate.entries()]
    .map(([date, d]) => ({
      date,
      yieldRate: d.total > 0 ? Number((((d.total - d.defects) / d.total) * 100).toFixed(1)) : 100,
      fpy: d.total > 0 ? Number((((d.total - d.defects) / d.total) * 100).toFixed(1)) : 100,
      defectRate: d.total > 0 ? Number(((d.defects / d.total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

// ========== 趋势图数据 ==========

/** 工站趋势图：每个工站每天的 FPY 走势 */
export function getStationTrendData(
  productIds: number[],
  startDate?: string,
  endDate?: string,
  defectType?: string, // '外观' | '功能' | '气密性' | undefined=综合
) {
  const pSet = new Set(productIds);

  // 按日期+工站去重投产数
  const prodByDateStation = new Map<string, number>();
  const prodSeen = new Set<string>();
  mockProductionRecords.forEach(r => {
    if (!pSet.has(r.productId)) return;
    if (startDate && r.recordDate < startDate) return;
    if (endDate && r.recordDate > endDate) return;
    const key = `${r.productId}|${r.stationId}|${r.recordDate}`;
    if (prodSeen.has(key)) return;
    prodSeen.add(key);
    const dk = `${r.recordDate}|${r.stationId}`;
    prodByDateStation.set(dk, (prodByDateStation.get(dk) || 0) + r.outputQty);
  });

  // 明细缺陷数
  const defByDateStation = new Map<string, number>();
  mockStationDetailRecords.forEach(r => {
    if (!pSet.has(r.productId)) return;
    if (startDate && r.recordDate < startDate) return;
    if (endDate && r.recordDate > endDate) return;
    if (defectType && r.defectType !== defectType) return;
    const dk = `${r.recordDate}|${r.stationId}`;
    defByDateStation.set(dk, (defByDateStation.get(dk) || 0) + r.qty);
  });

  // 收集所有日期
  const dates = [...new Set([...prodByDateStation.keys(), ...defByDateStation.keys()].map(k => k.split('|')[0]))].sort();

  // 按工站分组
  const stations = mockStations.filter(s => s.isActive && s.stationType !== 'FQC');
  const stationSeries = stations.map(st => {
    // 检查是否有该工站的投产数据
    const hasData = dates.some(d => {
      const dk = `${d}|${st.id}`;
      return prodByDateStation.has(dk) || defByDateStation.has(dk);
    });
    if (!hasData) return null;
    const data = dates.map(d => {
      const dk = `${d}|${st.id}`;
      const output = prodByDateStation.get(dk) || 0;
      const defects = defByDateStation.get(dk) || 0;
      if (output === 0 && defects === 0) return null;
      return output > 0 ? Number((((output - (defects > output ? output : defects)) / output) * 100).toFixed(1)) : null;
    });
    return { stationId: st.id, stationName: st.stationName, majorSection: st.majorSection, data };
  }).filter(Boolean) as { stationId: number; stationName: string; majorSection: string; data: (number | null)[] }[];

  return { dates, stations: stationSeries };
}

/** 工段趋势图：每个大工段每天的 FPY 走势 */
export function getSectionTrendData(
  productIds: number[],
  startDate?: string,
  endDate?: string,
  defectType?: string,
) {
  const { dates, stations: stationData } = getStationTrendData(productIds, startDate, endDate, defectType);
  if (dates.length === 0) return { dates: [], sections: [] as { sectionName: string; data: (number | null)[] }[] };

  const sectionMap = new Map<string, (number | null)[][]>();

  stationData.forEach(st => {
    let arr = sectionMap.get(st.majorSection);
    if (!arr) { arr = []; sectionMap.set(st.majorSection, arr); }
    arr.push(st.data);
  });

  const sections = [...sectionMap.entries()].map(([name, dataArrs]) => {
    const data = dates.map((_, i) => {
      const vals = dataArrs.map(arr => arr[i]).filter((v): v is number => v !== null);
      if (vals.length === 0) return null;
      // 工段 FPY = 各工站 FPY 乘积
      return Number((vals.reduce((p, v) => p * (v / 100), 1) * 100).toFixed(1));
    });
    return { sectionName: name, data };
  });

  return { dates, sections };
}

/** 缺陷趋势图：TOP 缺陷每天的缺陷数量走势 */
export function getDefectTrendData(
  productIds: number[],
  startDate?: string,
  endDate?: string,
  topN: number = 10,
) {
  const pSet = new Set(productIds);

  // 筛选明细记录
  const detailRecs = mockStationDetailRecords.filter(r => {
    if (!pSet.has(r.productId)) return false;
    if (startDate && r.recordDate < startDate) return false;
    if (endDate && r.recordDate > endDate) return false;
    return true;
  });

  // 找 TOP N 缺陷
  const byCode = new Map<string, number>();
  detailRecs.forEach(r => {
    byCode.set(r.defectCode, (byCode.get(r.defectCode) || 0) + r.qty);
  });
  const topCodes = [...byCode.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN).map(e => e[0]);

  // 收集所有日期
  const dates = [...new Set(detailRecs.map(r => r.recordDate))].sort();

  // 每个缺陷每天的计数
  const defects = topCodes.map(code => {
    const d = mockDefects.find(x => x.defectCode === code);
    const name = d?.defect || code;
    const countData = dates.map(date => {
      const n = detailRecs.filter(r => r.recordDate === date && r.defectCode === code).reduce((sum, r) => sum + r.qty, 0);
      return n || 0;
    });
    return { defectName: name, component: d?.component || '', count: countData };
  });

  return { dates, defects };
}
