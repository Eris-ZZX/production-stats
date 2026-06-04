import type { Product, Station, DefectCode, DefectFieldOption, StationFieldOption, ProductionRecord, InspectionRecord, YieldData, FpyData, TopDefect, TrendPoint } from './types';

// ========== 产品 ==========
export const mockProducts: Product[] = [
  { id: 1, code: 'TX-100', status: 'active' },
  { id: 2, code: 'TX-200', status: 'active' },
  { id: 3, code: 'TX-300', status: 'inactive' },
];

// ========== 工站 ==========
export const mockStations: Station[] = [
  { id: 1, majorSection: '组装', minorSection: '前段组装', stationName: '贴膜', stationType: '必过工站', isDataEntryType: true, mesName: 'ASSY-FILM', abnormalPositions: ['左上角', '右下角'], sortOrder: 1, isActive: true },
  { id: 2, majorSection: '组装', minorSection: '前段组装', stationName: '点胶', stationType: '必过工站', isDataEntryType: true, mesName: 'ASSY-GLUE', abnormalPositions: ['溢胶'], sortOrder: 2, isActive: true },
  { id: 3, majorSection: '组装', minorSection: '后段组装', stationName: '锁螺丝', stationType: '必过工站', isDataEntryType: true, mesName: 'ASSY-SCREW', abnormalPositions: ['滑牙', '漏锁'], sortOrder: 3, isActive: true },
  { id: 4, majorSection: '测试', minorSection: '功能测试', stationName: '触屏测试', stationType: '前加工记录工站', isDataEntryType: true, mesName: 'TEST-TOUCH', sortOrder: 4, isActive: true },
  { id: 5, majorSection: '测试', minorSection: '功能测试', stationName: '音频测试', stationType: '前加工记录工站', isDataEntryType: true, mesName: 'TEST-AUDIO', sortOrder: 5, isActive: true },
  { id: 6, majorSection: '测试', minorSection: '气密测试', stationName: '整机气密', stationType: '被合并工站', isDataEntryType: false, mesName: 'TEST-AIR', sortOrder: 6, isActive: false },
  { id: 7, majorSection: '包装', minorSection: '外观检查', stationName: '外观终检', stationType: '可选工站', isDataEntryType: true, mesName: 'QC-VISUAL', sortOrder: 7, isActive: true },
  { id: 8, majorSection: '包装', minorSection: '外观检查', stationName: 'FQC抽检', stationType: 'FQC', isDataEntryType: true, mesName: 'QC-FQC', sortOrder: 8, isActive: true },
];

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
  // 位置
  makeField('location', '屏幕'),
  makeField('location', '壳体'),
  makeField('location', '按键'),
  makeField('location', '触屏'),
  makeField('location', '音频'),
  makeField('location', '整机'),
  makeField('location', '接口'),
  // 缺陷
  makeField('defect', '轻微划伤'),
  makeField('defect', '严重划伤'),
  makeField('defect', '指纹残留'),
  makeField('defect', '油污'),
  makeField('defect', '向上翘起'),
  makeField('defect', '向下凹陷'),
  makeField('defect', '按键无响应'),
  makeField('defect', '触屏断触'),
  makeField('defect', '扬声器杂音'),
  makeField('defect', '气密NG'),
  makeField('defect', '充电口气密不良'),
  makeField('defect', '颜色不均'),
];

// ========== 缺陷代码 ==========
export const mockDefects: DefectCode[] = [
  { id: 1, defectCode: 'D001', component: '左耳', type: '外观', location: '屏幕', defect: '轻微划伤', isActive: true },
  { id: 2, defectCode: 'D002', component: '左耳', type: '外观', location: '屏幕', defect: '严重划伤', isActive: true },
  { id: 3, defectCode: 'D003', component: '左耳', type: '外观', location: '屏幕', defect: '指纹残留', isActive: true },
  { id: 4, defectCode: 'D004', component: '左耳', type: '外观', location: '壳体', defect: '油污', isActive: true },
  { id: 5, defectCode: 'D005', component: '左耳', type: '外观', location: '壳体', defect: '向上翘起', isActive: true },
  { id: 6, defectCode: 'D006', component: '右耳', type: '外观', location: '壳体', defect: '向下凹陷', isActive: true },
  { id: 7, defectCode: 'D007', component: '右耳', type: '功能', location: '按键', defect: '按键无响应', isActive: true },
  { id: 8, defectCode: 'D008', component: '右耳', type: '功能', location: '触屏', defect: '触屏断触', isActive: true },
  { id: 9, defectCode: 'D009', component: '右耳', type: '功能', location: '音频', defect: '扬声器杂音', isActive: true },
  { id: 10, defectCode: 'D010', component: '充电盒', type: '气密性', location: '整机', defect: '气密NG', isActive: true },
  { id: 11, defectCode: 'D011', component: '充电盒', type: '气密性', location: '接口', defect: '充电口气密不良', isActive: true },
  { id: 12, defectCode: 'D012', component: '盒机', type: '外观', location: '壳体', defect: '颜色不均', isActive: false },
];

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
  { ...makeSField('majorSection', '组装'), visualFpyTarget: 97, functionalFpyTarget: 95, airLeakFpyTarget: 98 },
  { ...makeSField('majorSection', '测试'), visualFpyTarget: 96, functionalFpyTarget: 94, airLeakFpyTarget: 97 },
  { ...makeSField('majorSection', '包装'), visualFpyTarget: 99, functionalFpyTarget: 98, airLeakFpyTarget: 99 },
  makeSField('minorSection', '前段组装'),
  makeSField('minorSection', '后段组装'),
  makeSField('minorSection', '功能测试'),
  makeSField('minorSection', '气密测试'),
  makeSField('minorSection', '外观检查'),
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

export const mockStationDetailRecords: StationDetailRecord[] = [
  { productId: 1, recordDate: '2026-06-01', stationId: 1, defectType: '外观', defectCode: 'D001', qty: 2 },
  { productId: 1, recordDate: '2026-06-01', stationId: 1, defectType: '功能', defectCode: 'D008', qty: 3 },
  { productId: 1, recordDate: '2026-06-01', stationId: 2, defectType: '外观', defectCode: 'D004', qty: 2 },
  { productId: 1, recordDate: '2026-06-01', stationId: 2, defectType: '功能', defectCode: 'D007', qty: 3 },
  { productId: 1, recordDate: '2026-06-01', stationId: 3, defectType: '外观', defectCode: 'D005', qty: 1 },
  { productId: 1, recordDate: '2026-06-01', stationId: 3, defectType: '功能', defectCode: 'D007', qty: 3 },
  { productId: 1, recordDate: '2026-06-01', stationId: 4, defectType: '外观', defectCode: 'D002', qty: 2 },
  { productId: 1, recordDate: '2026-06-01', stationId: 5, defectType: '外观', defectCode: 'D003', qty: 2 },
  { productId: 1, recordDate: '2026-06-01', stationId: 6, defectType: '气密性', defectCode: 'D010', qty: 3 },
  { productId: 1, recordDate: '2026-06-01', stationId: 7, defectType: '外观', defectCode: 'D006', qty: 1 },
  { productId: 1, recordDate: '2026-06-01', stationId: 8, defectType: '外观', defectCode: 'D012', qty: 2 },
  { productId: 1, recordDate: '2026-06-02', stationId: 1, defectType: '外观', defectCode: 'D001', qty: 1 },
  { productId: 1, recordDate: '2026-06-02', stationId: 1, defectType: '气密性', defectCode: 'D010', qty: 2 },
  { productId: 1, recordDate: '2026-06-02', stationId: 2, defectType: '外观', defectCode: 'D004', qty: 1 },
  { productId: 1, recordDate: '2026-06-02', stationId: 2, defectType: '功能', defectCode: 'D008', qty: 3 },
  { productId: 1, recordDate: '2026-06-02', stationId: 3, defectType: '外观', defectCode: 'D002', qty: 1 },
  { productId: 1, recordDate: '2026-06-02', stationId: 4, defectType: '功能', defectCode: 'D008', qty: 2 },
  { productId: 1, recordDate: '2026-06-02', stationId: 5, defectType: '外观', defectCode: 'D003', qty: 2 },
  { productId: 1, recordDate: '2026-06-02', stationId: 8, defectType: '外观', defectCode: 'D012', qty: 1 },
  { productId: 1, recordDate: '2026-06-03', stationId: 1, defectType: '外观', defectCode: 'D001', qty: 2 },
  { productId: 1, recordDate: '2026-06-03', stationId: 1, defectType: '功能', defectCode: 'D007', qty: 3 },
  { productId: 1, recordDate: '2026-06-03', stationId: 2, defectType: '外观', defectCode: 'D005', qty: 1 },
  { productId: 1, recordDate: '2026-06-03', stationId: 3, defectType: '功能', defectCode: 'D007', qty: 2 },
  { productId: 1, recordDate: '2026-06-03', stationId: 4, defectType: '外观', defectCode: 'D002', qty: 2 },
  { productId: 1, recordDate: '2026-06-03', stationId: 5, defectType: '外观', defectCode: 'D006', qty: 1 },
  { productId: 1, recordDate: '2026-06-03', stationId: 6, defectType: '气密性', defectCode: 'D010', qty: 2 },
  { productId: 1, recordDate: '2026-06-03', stationId: 6, defectType: '气密性', defectCode: 'D011', qty: 3 },
  { productId: 1, recordDate: '2026-06-03', stationId: 7, defectType: '外观', defectCode: 'D006', qty: 1 },
  { productId: 1, recordDate: '2026-06-03', stationId: 8, defectType: '外观', defectCode: 'D003', qty: 1 },
];

// ========== 制程投产记录 ==========
export const mockProductionRecords: ProductionRecord[] = [
  // === TX-100, 2026-06-01 ===
  { id: 1, productId: 1, recordDate: '2026-06-01', stationId: 1, outputQty: 500, visualReturnGood: 498, defectComponent: '左耳', defectType: '外观', defectLocation: '屏幕', defectCode: 'D001' },
  { id: 2, productId: 1, recordDate: '2026-06-01', stationId: 1, outputQty: 500, visualReturnGood: 497, defectComponent: '左耳', defectType: '功能', defectLocation: '触屏', defectCode: 'D008' },
  { id: 3, productId: 1, recordDate: '2026-06-01', stationId: 2, outputQty: 498, visualReturnGood: 496, defectComponent: '左耳', defectType: '外观', defectLocation: '壳体', defectCode: 'D004' },
  { id: 4, productId: 1, recordDate: '2026-06-01', stationId: 2, outputQty: 498, visualReturnGood: 495, defectComponent: '左耳', defectType: '功能', defectLocation: '按键', defectCode: 'D007' },
  { id: 5, productId: 1, recordDate: '2026-06-01', stationId: 3, outputQty: 496, visualReturnGood: 495, defectComponent: '右耳', defectType: '外观', defectLocation: '壳体', defectCode: 'D005' },
  { id: 6, productId: 1, recordDate: '2026-06-01', stationId: 3, outputQty: 496, visualReturnGood: 493, defectComponent: '右耳', defectType: '功能', defectLocation: '按键', defectCode: 'D007' },
  { id: 7, productId: 1, recordDate: '2026-06-01', stationId: 4, outputQty: 480, visualReturnGood: 478, defectComponent: '右耳', defectType: '外观', defectLocation: '屏幕', defectCode: 'D002' },
  { id: 8, productId: 1, recordDate: '2026-06-01', stationId: 5, outputQty: 478, visualReturnGood: 476, defectComponent: '右耳', defectType: '外观', defectLocation: '屏幕', defectCode: 'D003' },
  { id: 9, productId: 1, recordDate: '2026-06-01', stationId: 6, outputQty: 450, visualReturnGood: 447, defectComponent: '充电盒', defectType: '气密性', defectLocation: '整机', defectCode: 'D010' },
  { id: 10, productId: 1, recordDate: '2026-06-01', stationId: 7, outputQty: 447, visualReturnGood: 446, defectComponent: '充电盒', defectType: '外观', defectLocation: '壳体', defectCode: 'D006' },
  { id: 11, productId: 1, recordDate: '2026-06-01', stationId: 8, outputQty: 446, visualReturnGood: 444, defectComponent: '盒机', defectType: '外观', defectLocation: '壳体', defectCode: 'D012' },
  // === TX-100, 2026-06-02 ===
  { id: 12, productId: 1, recordDate: '2026-06-02', stationId: 1, outputQty: 520, visualReturnGood: 519, defectComponent: '左耳', defectType: '外观', defectLocation: '屏幕', defectCode: 'D001' },
  { id: 13, productId: 1, recordDate: '2026-06-02', stationId: 1, outputQty: 520, visualReturnGood: 518, defectComponent: '左耳', defectType: '气密性', defectLocation: '整机', defectCode: 'D010' },
  { id: 14, productId: 1, recordDate: '2026-06-02', stationId: 2, outputQty: 519, visualReturnGood: 518, defectComponent: '左耳', defectType: '外观', defectLocation: '壳体', defectCode: 'D004' },
  { id: 15, productId: 1, recordDate: '2026-06-02', stationId: 2, outputQty: 519, visualReturnGood: 516, defectComponent: '左耳', defectType: '功能', defectLocation: '触屏', defectCode: 'D008' },
  { id: 16, productId: 1, recordDate: '2026-06-02', stationId: 3, outputQty: 518, visualReturnGood: 517, defectComponent: '右耳', defectType: '外观', defectLocation: '屏幕', defectCode: 'D002' },
  { id: 17, productId: 1, recordDate: '2026-06-02', stationId: 4, outputQty: 500, visualReturnGood: 498, defectComponent: '右耳', defectType: '功能', defectLocation: '触屏', defectCode: 'D008' },
  { id: 18, productId: 1, recordDate: '2026-06-02', stationId: 5, outputQty: 498, visualReturnGood: 496, defectComponent: '右耳', defectType: '外观', defectLocation: '屏幕', defectCode: 'D003' },
  { id: 19, productId: 1, recordDate: '2026-06-02', stationId: 8, outputQty: 496, visualReturnGood: 495, defectComponent: '盒机', defectType: '外观', defectLocation: '壳体', defectCode: 'D012' },
  // === TX-100, 2026-06-03 ===
  { id: 20, productId: 1, recordDate: '2026-06-03', stationId: 1, outputQty: 550, visualReturnGood: 548, defectComponent: '左耳', defectType: '外观', defectLocation: '屏幕', defectCode: 'D001' },
  { id: 21, productId: 1, recordDate: '2026-06-03', stationId: 1, outputQty: 550, visualReturnGood: 547, defectComponent: '左耳', defectType: '功能', defectLocation: '按键', defectCode: 'D007' },
  { id: 22, productId: 1, recordDate: '2026-06-03', stationId: 2, outputQty: 548, visualReturnGood: 547, defectComponent: '左耳', defectType: '外观', defectLocation: '壳体', defectCode: 'D005' },
  { id: 23, productId: 1, recordDate: '2026-06-03', stationId: 3, outputQty: 547, visualReturnGood: 545, defectComponent: '右耳', defectType: '功能', defectLocation: '按键', defectCode: 'D007' },
  { id: 24, productId: 1, recordDate: '2026-06-03', stationId: 4, outputQty: 545, visualReturnGood: 543, defectComponent: '右耳', defectType: '外观', defectLocation: '屏幕', defectCode: 'D002' },
  { id: 25, productId: 1, recordDate: '2026-06-03', stationId: 5, outputQty: 543, visualReturnGood: 542, defectComponent: '右耳', defectType: '外观', defectLocation: '壳体', defectCode: 'D006' },
  { id: 26, productId: 1, recordDate: '2026-06-03', stationId: 6, outputQty: 542, visualReturnGood: 540, defectComponent: '充电盒', defectType: '气密性', defectLocation: '整机', defectCode: 'D010' },
  { id: 27, productId: 1, recordDate: '2026-06-03', stationId: 6, outputQty: 542, visualReturnGood: 539, defectComponent: '充电盒', defectType: '气密性', defectLocation: '接口', defectCode: 'D011' },
  { id: 28, productId: 1, recordDate: '2026-06-03', stationId: 7, outputQty: 540, visualReturnGood: 539, defectComponent: '充电盒', defectType: '外观', defectLocation: '壳体', defectCode: 'D006' },
  { id: 29, productId: 1, recordDate: '2026-06-03', stationId: 8, outputQty: 539, visualReturnGood: 538, defectComponent: '盒机', defectType: '外观', defectLocation: '屏幕', defectCode: 'D003' },
];

// ========== 外检记录 ==========
export const mockInspectionRecords: InspectionRecord[] = [
  { id: 1, productId: 1, productSn: 'SN-20260601-001', minorSection: '外观检查', majorSection: '包装', productionDefects: ['D001', 'D004'], fqcDefects: [], inspectionDate: '2026-06-01', createdAt: '' },
  { id: 2, productId: 1, productSn: 'SN-20260601-002', minorSection: '外观检查', majorSection: '包装', productionDefects: [], fqcDefects: ['D003'], inspectionDate: '2026-06-01', createdAt: '' },
  { id: 3, productId: 1, productSn: 'SN-20260602-001', minorSection: '外观检查', majorSection: '包装', productionDefects: ['D005'], fqcDefects: ['D005'], inspectionDate: '2026-06-02', createdAt: '' },
  { id: 4, productId: 2, productSn: 'SN-20260601-A01', minorSection: '外观检查', majorSection: '包装', productionDefects: ['D002'], fqcDefects: [], inspectionDate: '2026-06-01', createdAt: '' },
  { id: 5, productId: 2, productSn: 'SN-20260602-A01', minorSection: '外观检查', majorSection: '包装', productionDefects: ['D006', 'D010'], fqcDefects: ['D010'], inspectionDate: '2026-06-02', createdAt: '' },
];

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
 *  工段FPY = 该工段内各工站FPY的乘积（一次通过率）*/
export function getSectionFpy(productIds: number[], startDate?: string, endDate?: string) {
  const stations = getStationFpy(productIds, startDate, endDate);

  const bySection = new Map<string, { stations: { appearanceFpy: number; functionalFpy: number; airLeakFpy: number }[]; totalOutput: number }>();

  stations.forEach(s => {
    let sec = bySection.get(s.majorSection);
    if (!sec) { sec = { stations: [], totalOutput: 0 }; bySection.set(s.majorSection, sec); }
    sec.stations.push({ appearanceFpy: s.appearanceFpy, functionalFpy: s.functionalFpy, airLeakFpy: s.airLeakFpy });
    sec.totalOutput += s.totalOutput;
  });

  return [...bySection.entries()].map(([name, d]) => {
    // 工段 FPY = 各工站 FPY 乘积（除以 100 转回比例再乘）
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
      appearanceFpy,
      functionalFpy,
      airLeakFpy,
      appearanceTarget: targets?.visualFpyTarget ?? 97,
      functionalTarget: targets?.functionalFpyTarget ?? 95,
      airLeakTarget: targets?.airLeakFpyTarget ?? 98,
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
) {
  const pSet = new Set(productIds);
  const detailRecs = mockStationDetailRecords.filter(r => {
    if (!pSet.has(r.productId)) return false;
    if (startDate && r.recordDate < startDate) return false;
    if (endDate && r.recordDate > endDate) return false;
    return true;
  });

  // 筛选指定工段的记录
  const inSection = detailRecs.filter(r => {
    const st = mockStations.find(s => s.id === r.stationId);
    return st?.majorSection === section;
  });

  // 按缺陷代码汇总
  const byCode = new Map<string, number>();
  inSection.forEach(r => {
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
        type: d?.type || '',
        location: d?.location || '',
        count,
        rate: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
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
