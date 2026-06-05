# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

生产数据统计系统（制程版） — 基于 React 18 + TypeScript + Vite + Ant Design 的生产制造良率管理前端应用。全程前端 mock 数据，无后端。

## 常用命令

```bash
npm run dev          # 启动 Vite 开发服务器 (localhost:5173)
npx tsc --noEmit    # TypeScript 类型检查
npm run build       # 生产构建 (tsc + vite build)
```

## 架构

### 路由: 双 Layout 结构

```
/  → AppLayout (侧边栏 + 品号选择器)
  ├── /dashboard/*          仪表盘 (6 页)
  ├── /data-stats/*         数据统计 (3 页)
  ├── /data-config/*        数据配置 (5 页)
  └── (右上角 🔒 登录弹窗 → 跳转到 /admin)

/admin → AdminLayout (独立侧边栏 + 返回按钮)
  └── /admin/product-admin  产品&预置管理
```

`router.tsx` 中两个顶层路由使用不同的 Layout 组件，彼此独立。

### 数据层

**`mockData.ts`** 是所有数据的唯一来源。所有 `export const mock*` 都是可变数组，页面通过 `syncGlobal()` 直接修改它们实现"持久化"。没有后端，数据仅在内存中，刷新即丢失。

核心 mock 数据结构（全部已初始化为空数组）:
- `mockProducts: Product[]` — 品号
- `mockProductLines: ProductLine[]` — 产品线（品号的上级分组）
- `mockStations: Station[]` — 工站
- `mockDefects: DefectCode[]` — 缺陷代码
- `mockDefectFields: DefectFieldOption[]` — 缺陷字段选项（组件/类型/位置/缺陷）
- `mockStationFields: StationFieldOption[]` — 工站字段选项（大工段/小工段/工站类型，含 FPY 目标值）
- `mockProductionRecords: ProductionRecord[]` — 制程投产记录
- `mockStationDetailRecords: StationDetailRecord[]` — 工站明细记录（缺陷细分）
- `mockInspectionRecords: InspectionRecord[]` — 外检记录
- `mockGlobalPreset: GlobalPreset` — 全局预置（新建产品时的默认选项 ID 集合）
- `mockProductTemplates: ProductTemplate[]` — 已废弃，仅保留兼容

**数据同步模式**: 页面从 mock 数组初始化 local state → 修改后写回 mock 数组:
```ts
function syncGlobal(u: Product[]) { mockProducts.length = 0; mockProducts.push(...u); }
```

**动态注册**: `ensureDefectField()` / `ensureStationField()` 在数据录入时自动补全新选项。

### 产品上下文 (`store/ProductContext.tsx`)

`useProduct()` 提供 `{ currentProduct, products, setCurrentProduct }`。顶部栏通过此上下文切换当前品号，数据录入页面自动关联当前品号。

### FPY 计算 (`mockData.ts` 中的核心函数)

数据分离为两个独立集合:
- **投产数**: 来源 `mockProductionRecords`，按 `productId+stationId+recordDate` 去重
- **不良数**: 来源 `mockStationDetailRecords`，按 `defectType` 归类为外观/功能/气密性

关键函数:
- `getStationFpy(productIds, startDate?, endDate?)` — 每个工站的 FPY，返回 `{ stationType, totalOutput, appearanceDefects, ... }`
- `getSectionFpy(...)` — 工段 FPY = 各工站 FPY 乘积（FQC 工站排除在外）
- `getFqcFpy(...)` — FQC 工站按大工段分组的 FPY（仅外观/功能两个维度）
- `getSectionTopDefects(section, productIds, startDate?, endDate?, topN?, defectType?)` — TOP 缺陷排名，支持 `section='FQC'` 时按 `stationType==='FQC'` 筛选
- `getStationTrendData(...)` / `getSectionTrendData(...)` / `getDefectTrendData(...)` — 趋势图数据

### SmartFilterBar (`components/SmartFilterBar.tsx`)

通用筛选组件，导出两部分:
- `<SmartFilterBar>` — Popover 弹窗 UI，每行 [字段选择] [操作符] [值输入] [删除]
- `applySmartFilters<T>(data, conditions, fields)` — 纯逻辑筛选函数

字段定义 `FilterField[]` 支持 text/number/date 三种类型，可选 `getValue()` 用于布尔转换（如 `isActive` → "启用"/"停用"）。

### SelectOne (`components/SelectOne.tsx`)

解决 antd `mode="tags" maxCount={1}` 选择后下拉不自动关闭的问题。单选用 SelectOne，多选用 Select。

### 缺陷体系 (四层)

```
组件 (component): 左耳/右耳/充电盒/盒机
  → 类型 (type): 外观/功能/气密性
    → 位置 (location)
      → 缺陷 (defect)
```

### 工站体系

```
大工段 (majorSection): 组装/测试/包装
  → 小工段 (minorSection)
    → 工站 (stationName)
       - stationType: 必过工站/被合并工站/前加工记录工站/可选工站/FQC (5 种，锁定不可增删)
       - isDataEntryType: 是否出现在数据录入页的工站列表中
       - isActive: 启用/停用（停用工站不显示在默认筛选和录入中）
```

### FQC 特殊处理

FQC 工站 (`stationType === 'FQC'`) 在仪表盘中独立于三大工段:
- 工站 FPY 列表: 独立 "FQC 工站 FPY" 卡片
- 工段 FPY 列表: FQC 外观/FQC 功能两张独立卡片，按大工段分类
- TOP 缺陷排名: FQC 外观/FQC 功能两张独立卡片，通过 `defectType` 参数按类型过滤
- 趋势图: FQC 数据不参与工站/工段趋势计算
- FQC 只有外观和功能两个维度，无气密性
