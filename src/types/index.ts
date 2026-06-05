// ========== 基础实体 ==========
export interface ProductLine {
  id: number;
  name: string;
  isActive: boolean;
  pwdRead?: string;    // 只读角色密码
  pwdEntry?: string;   // 数据录入角色密码
  pwdConfig?: string;  // 配置管理角色密码
}

export type AdminRole = 'super' | 'config' | 'viewer';

export type ProductRole = 'read' | 'entry' | 'config';

export interface AdminAccount {
  id: number;
  username: string;
  password: string;
  role: AdminRole;
  isActive: boolean;
}

export interface Product {
  id: number;
  code: string;
  status: 'active' | 'inactive';
  productLineId?: number;
}

export interface Station {
  id: number;
  majorSection: string;
  minorSection: string;
  stationName: string;
  stationType?: string;
  isDataEntryType: boolean;
  mesName?: string;
  abnormalPositions?: string[];
  sortOrder: number;
  isActive: boolean;
}

export interface DefectCode {
  id: number;
  defectCode: string;
  component: string;    // 组件 (原"大类")
  type: string;         // 类型
  location: string;     // 位置
  defect: string;       // 缺陷描述
  isActive: boolean;
}

// 缺陷字段选项（缺陷字段维护页面管理）
export interface DefectFieldOption {
  id: number;
  fieldType: 'component' | 'type' | 'location' | 'defect';
  name: string;
}

// 工站字段选项（工站字段维护页面管理）
export interface StationFieldOption {
  id: number;
  fieldType: 'majorSection' | 'minorSection' | 'stationType';
  name: string;
  isDataEntry?: boolean;  // 仅 stationType 有效：是否数据录入类
  visualFpyTarget?: number;      // 仅 majorSection 有效：外观FPY目标
  functionalFpyTarget?: number;  // 仅 majorSection 有效：功能FPY目标
  airLeakFpyTarget?: number;     // 仅 majorSection 有效：气密性FPY目标
}

// ========== 业务记录 ==========
export interface ProductionRecord {
  id: number;
  productId: number;
  recordDate: string;
  stationId: number;
  outputQty: number;
  visualReturnGood: number;
  defectComponent?: string;
  defectType?: string;
  defectLocation?: string;
  defectCode?: string;
  createdAt?: string;
}

export interface InspectionRecord {
  id: number;
  productId: number;
  productSn: string;
  minorSection: string;
  majorSection: string;
  productionDefects: string[];
  fqcDefects: string[];
  inspectionDate: string;
  createdAt: string;
}

// ========== 仪表盘 ==========
export interface YieldData {
  stationName: string;
  outputQty: number;
  defectQty: number;
  yieldRate: number;
}

export interface FpyData {
  majorSection: string;
  visualFpy: number;
  functionalFpy: number;
  airLeakFpy: number;
  overallFpy: number;
  targetFpy: number;
}

export interface TopDefect {
  defectCode: string;
  defectName: string;
  component: string;
  count: number;
  rate: number;
}

export interface TrendPoint {
  date: string;
  yieldRate: number;
  fpy: number;
  defectRate: number;
}

// ========== 通用 ==========
export type ModuleKey = 'dashboard' | 'data-stats' | 'data-config';
