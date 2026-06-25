import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, Form, Select, InputNumber, DatePicker, Button, Table, Modal, Switch, message, Typography, Tag, Popconfirm, Upload, Space, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, UnorderedListOutlined, CheckOutlined, CloseOutlined, DownloadOutlined, UploadOutlined, FileExcelOutlined } from '@ant-design/icons';
import SmartFilterBar, { applySmartFilters, type FilterCondition, type FilterField } from '../../components/SmartFilterBar';
import { useProduct } from '../../store/ProductContext';
import { stationsApi, defectCodesApi, stationDetailsApi } from '../../api';
import type { Station, DefectCode } from '../../types';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

const { Title } = Typography;

interface StationDetailRecord {
  id: number; productSkuId: number; recordDate: string; stationId: number;
  defectCategory: string; defectType: string; defectLocation: string; defectCode: string; qty: number;
}

interface BatchDefectRow {
  id: number; defectCode: string | null; qty: number | null;
}

export default function StationDetailEntry() {
  const { currentProduct, skus } = useProduct();
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  // ===== 远端数据 =====
  const [stations, setStations] = useState<Station[]>([]);
  const [defects, setDefects] = useState<DefectCode[]>([]);

  // 品号 数据
  const activeSkus = useMemo(() => skus.filter(s => s.isActive), [skus]);
  const lineSkus = useMemo(() => activeSkus.filter(s => !currentProduct || s.productLineId === currentProduct.id), [activeSkus, currentProduct]);

  // ===== 状态 =====
  const [records, setRecords] = useState<StationDetailRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingKey, setEditingKey] = useState<number | null>(null);
  const [_selectedDefectCode, setSelectedDefectCode] = useState<string | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [filterByPosition, setFilterByPosition] = useState(true);

  const [recSearch2, setRecSearch2] = useState('');
  const [recConditions2, setRecConditions2] = useState<FilterCondition[]>([]);

  const [batchOpen, setBatchOpen] = useState(false);
  const [batchDate, setBatchDate] = useState<string>('');
  const [batchProductSkuId, setBatchProductSkuId] = useState<number | null>(null);
  const [batchStationId, setBatchStationId] = useState<number | null>(null);
  const [batchRows, setBatchRows] = useState<BatchDefectRow[]>([]);

  // ===== 加载数据 =====
  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      const data = await stationDetailsApi.list();
      setRecords(data.map((r: any) => ({
        id: r.id,
        productSkuId: r.productSkuId,
        recordDate: r.recordDate,
        stationId: r.stationId,
        defectCategory: r.defectCategory || (defects.find((d: DefectCode) => d.defectCode === r.defectCode)?.component || ''),
        defectType: r.defectType || (defects.find((d: DefectCode) => d.defectCode === r.defectCode)?.type || ''),
        defectLocation: r.defectLocation || (defects.find((d: DefectCode) => d.defectCode === r.defectCode)?.location || ''),
        defectCode: r.defectCode,
        qty: r.qty,
      })));
    } catch (e: any) {
      message.error('加载记录失败: ' + (e.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  }, [defects]);

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [stationList, defectList] = await Promise.all([
          stationsApi.list(),
          defectCodesApi.list(),
        ]);
        setStations(stationList);
        setDefects(defectList);
      } catch (e: any) {
        message.error('加载基础数据失败: ' + (e.message || '未知错误'));
      }
    };
    loadDropdowns();
  }, []);

  useEffect(() => {
    if (defects.length > 0) {
      loadRecords();
    }
  }, [loadRecords]);

  const stations2 = useMemo(() => stations.filter(s => s.isActive && s.isDataEntryType), [stations]);
  const activeDefects = useMemo(() => defects.filter(d => d.isActive), [defects]);

  const batchFilteredDefects = useMemo(() => {
    if (!batchStationId) return activeDefects;
    const station = stations2.find(s => s.id === batchStationId);
    if (!station || !station.abnormalPositions?.length) return activeDefects;
    return activeDefects.filter(d => station.abnormalPositions!.includes(d.location));
  }, [batchStationId, activeDefects, stations2]);

  // 单条录入缺陷选项：根据开关决定是否按工站异常位置过滤
  const shownDefects = useMemo(() => {
    if (!filterByPosition || !selectedStationId) return activeDefects;
    const station = stations2.find(s => s.id === selectedStationId);
    if (!station || !station.abnormalPositions?.length) return activeDefects;
    return activeDefects.filter(d => station.abnormalPositions!.includes(d.location));
  }, [filterByPosition, selectedStationId, activeDefects, stations2]);

  const handleStationChange = (stationId: number) => {
    setSelectedStationId(stationId);
    form.resetFields(['defectCode']);
    setSelectedDefectCode(null);
    const s = stations2.find(x => x.id === stationId);
    if (s) form.setFieldsValue({ majorSection: s.majorSection, minorSection: s.minorSection });
  };

  const handleDefectCodeChange = (code: string | null) => {
    setSelectedDefectCode(code);
    if (code) {
      const d = activeDefects.find(x => x.defectCode === code);
      if (d) form.setFieldsValue({ defectCategory: d.component, defectType: d.type, defectLocation: d.location });
    }
  };

  const handleSingleAdd = async () => {
    const values = form.getFieldsValue();
    if (!values.recordDate || !values.productSkuId || !values.stationId || !values.defectCode || !values.qty) {
      message.warning('请填写日期、品号、工站、缺陷和数量'); return;
    }
    const date = values.recordDate.format('YYYY-MM-DD');
    if (records.some(r => r.recordDate === date && r.productSkuId === values.productSkuId && r.stationId === values.stationId && r.defectCode === values.defectCode)) {
      message.error('该日期+品号+工站+缺陷的记录已存在，不可重复录入'); return;
    }
    try {
      const dc = activeDefects.find((d: DefectCode) => d.defectCode === values.defectCode);
      await stationDetailsApi.create({
        recordDate: date,
        productSkuId: values.productSkuId,
        stationId: values.stationId,
        defectType: dc?.type || '',
        defectCode: values.defectCode,
        qty: values.qty,
      });
      message.success('录入成功');
      form.resetFields(['stationId', 'defectCode', 'defectCategory', 'defectType', 'defectLocation', 'qty']);
      setSelectedDefectCode(null);
      loadRecords();
    } catch (e: any) {
      message.error('录入失败: ' + (e.message || '未知错误'));
    }
  };

  const startEdit = (r: StationDetailRecord) => {
    setEditingKey(r.id);
    editForm.setFieldsValue({ recordDate: dayjs(r.recordDate), productSkuId: r.productSkuId, stationId: r.stationId, defectCode: r.defectCode, qty: r.qty });
  };
  const cancelEdit = () => { setEditingKey(null); editForm.resetFields(); };
  const saveEdit = async (id: number) => {
    const values = await editForm.validateFields();
    try {
      const edc = activeDefects.find((d: DefectCode) => d.defectCode === values.defectCode);
      await stationDetailsApi.update(id, {
        recordDate: values.recordDate.format('YYYY-MM-DD'),
        productSkuId: values.productSkuId,
        stationId: values.stationId,
        defectType: edc?.type || '',
        defectCode: values.defectCode,
        qty: values.qty,
      });
      setEditingKey(null); editForm.resetFields(); message.success('已保存');
      loadRecords();
    } catch (e: any) {
      message.error('保存失败: ' + (e.message || '未知错误'));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await stationDetailsApi.remove(id);
      message.success('已删除');
      loadRecords();
    } catch (e: any) {
      message.error('删除失败: ' + (e.message || '未知错误'));
    }
  };

  const isEditing = (r: StationDetailRecord) => r.id === editingKey;

  const openBatch = () => { setBatchOpen(true); setBatchDate(''); setBatchProductSkuId(null); setBatchStationId(null); setBatchRows([]); };
  const addBatchRow = () => { setBatchRows(prev => [...prev, { id: Date.now(), defectCode: null, qty: null }]); };
  const updateBatchRowDefect = (rowId: number, code: string | null) => setBatchRows(prev => prev.map(r => r.id === rowId ? { ...r, defectCode: code } : r));
  const updateBatchRowQty = (rowId: number, val: number | null) => setBatchRows(prev => prev.map(r => r.id === rowId ? { ...r, qty: val } : r));
  const removeBatchRow = (rowId: number) => setBatchRows(prev => prev.filter(r => r.id !== rowId));

  const existingDetailKeys = useMemo(() => new Set(records.map(r => `${r.recordDate}_${r.productSkuId}_${r.stationId}_${r.defectCode}`)), [records]);
  const isBatchRowDup = (r: BatchDefectRow) => batchDate && batchProductSkuId && batchStationId && r.defectCode
    ? existingDetailKeys.has(`${batchDate}_${batchProductSkuId}_${batchStationId}_${r.defectCode}`) : false;

  const handleBatchSave = async () => {
    if (!batchDate || !batchProductSkuId || !batchStationId) { message.warning('请填写日期、品号和工站'); return; }
    const filled = batchRows.filter(r => r.defectCode && r.qty != null && r.qty > 0);
    if (filled.length === 0) { message.warning('请至少添加一行缺陷并填写数量'); return; }
    const filledDups = filled.filter(r => isBatchRowDup(r));
    if (filledDups.length > 0) { message.error(`有 ${filledDups.length} 条已存在，请删除重复行后重试`); return; }
    try {
      await stationDetailsApi.batchCreate(filled.map(r => {
        const d = activeDefects.find(x => x.defectCode === r.defectCode)!;
        return {
          recordDate: batchDate,
          productSkuId: batchProductSkuId!,
          stationId: batchStationId!,
          defectCode: r.defectCode!,
          defectType: d.type,
          qty: r.qty!,
        };
      }));
      message.success(`批量录入成功，共 ${filled.length} 条`);
      setBatchRows([]);
      loadRecords();
    } catch (e: any) {
      message.error('批量录入失败: ' + (e.message || '未知错误'));
    }
  };

  // ===== Excel 导入/导出/模板 =====
  const handleExport = () => {
    const data = records.map(r => {
      const st = stations2.find(s => s.id === r.stationId);
      const d = activeDefects.find(x => x.defectCode === r.defectCode);
      return {
        '日期': r.recordDate,
        '品号编码': skus.find(s => s.id === r.productSkuId)?.code || '',
        '大工段': st?.majorSection || '',
        '小工段': st?.minorSection || '',
        '工站': st?.stationName || '',
        '缺陷代码': r.defectCode,
        '组件': d?.component || r.defectCategory,
        '类型': d?.type || r.defectType,
        '位置': d?.location || r.defectLocation,
        '缺陷': d?.defect || '',
        '数量': r.qty,
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '工站明细');
    XLSX.writeFile(wb, '工站明细记录.xlsx');
    message.success('导出成功');
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      '日期': '2026-06-01',
      '品号编码': 'TX-100',
      '工站名称': '贴膜',
      '缺陷代码': 'D001',
      '数量': 2,
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '模板');
    XLSX.writeFile(wb, '工站明细导入模板.xlsx');
    message.success('模板已下载');
  };

  const handleImport = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets[wb.SheetNames[0]]);
      if (rows.length === 0) { message.warning('文件中无数据'); return; }

      const toImport: any[] = [];
      const errors: string[] = [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const date = String(r['日期'] || '').trim();
        const skuCode = String(r['品号编码'] || '').trim();
        const stationName = String(r['工站名称'] || '').trim();
        const defectCode = String(r['缺陷代码'] || '').trim();
        const qty = Number(r['数量']);

        if (!date || !skuCode || !stationName || !defectCode || isNaN(qty) || qty <= 0) {
          errors.push(`第${i + 2}行: 数据不完整`);
          continue;
        }
        const sku = skus.find(s => s.code === skuCode);
        if (!sku) { errors.push(`第${i + 2}行: 品号编码"${skuCode}"不存在`); continue; }
        const st = stations2.find(s => s.stationName === stationName);
        if (!st) { errors.push(`第${i + 2}行: 工站"${stationName}"不存在`); continue; }
        const d = activeDefects.find(x => x.defectCode === defectCode);
        if (!d) { errors.push(`第${i + 2}行: 缺陷代码"${defectCode}"不存在`); continue; }
        if (records.some(r => r.recordDate === date && r.productSkuId === sku.id && r.stationId === st.id && r.defectCode === defectCode)) {
          errors.push(`第${i + 2}行: 记录已存在(${date}/${skuCode}/${stationName}/${defectCode})`);
          continue;
        }
        toImport.push({ recordDate: date, productSkuId: sku.id, stationId: st.id, defectCode, defectType: d.type, qty });
      }
      if (toImport.length === 0) {
        message.error(`无有效数据可导入。${errors.length > 0 ? ' 错误: ' + errors.join('; ') : ''}`);
        return;
      }
      await stationDetailsApi.batchCreate(toImport);
      message.success(`导入成功: ${toImport.length} 条${errors.length > 0 ? `, 跳过 ${errors.length} 条` : ''}`);
      if (errors.length > 0) message.warning(errors.join('; '));
      loadRecords();
    } catch (e: any) {
      message.error('导入失败: ' + (e.message || '文件格式错误'));
    }
  };

  const recFilterFields2: FilterField[] = [
    { key: 'recordDate', label: '日期', type: 'date' },
    { key: 'productSkuId', label: '品号', type: 'text', options: lineSkus.map(s => ({ value: s.code, label: s.code })), getValue: (r: StationDetailRecord) => skus.find(s => s.id === r.productSkuId)?.code || '' },
    { key: 'stationId', label: '工站', type: 'text', options: stations2.map(s => ({ value: s.stationName, label: s.stationName })), getValue: (r: StationDetailRecord) => stations2.find(x => x.id === r.stationId)?.stationName || '' },
    { key: 'defectCategory', label: '组件', type: 'text', options: [...new Set(activeDefects.map(d => d.component))].map(v => ({ value: v, label: v })) },
    { key: 'defectType', label: '类型', type: 'text', options: [...new Set(activeDefects.map(d => d.type))].map(v => ({ value: v, label: v })) },
    { key: 'defectLocation', label: '位置', type: 'text', options: [...new Set(activeDefects.map(d => d.location))].map(v => ({ value: v, label: v })) },
    { key: 'defect', label: '缺陷', type: 'text', options: activeDefects.map(d => ({ value: d.defect, label: d.defect })), getValue: (r: StationDetailRecord) => activeDefects.find(x => x.defectCode === r.defectCode)?.defect || '' },
    { key: 'qty', label: '数量', type: 'number' },
  ];

  const filteredRecords2 = useMemo(() => applySmartFilters(records, recSearch2, recConditions2, recFilterFields2, [
    'recordDate', r => skus.find(s => s.id === r.productSkuId)?.code || '', r => stations2.find(s => s.id === r.stationId)?.stationName || '',
    'defectCategory', 'defectType', 'defectLocation', r => activeDefects.find(x => x.defectCode === r.defectCode)?.defect || '', 'qty',
  ]), [records, recSearch2, recConditions2, skus, stations2, activeDefects]);

  const getEditableColumns = () => [
    { title: '日期', dataIndex: 'recordDate', key: 'date', width: 130, render: (_: unknown, r: StationDetailRecord) => isEditing(r) ? <Form.Item name="recordDate" style={{ margin: 0 }} rules={[{ required: true }]}><DatePicker style={{ width: 120 }} size="small" /></Form.Item> : r.recordDate },
    { title: '品号', dataIndex: 'productSkuId', key: 'sku', width: 100, render: (_: unknown, r: StationDetailRecord) => isEditing(r) ? <Form.Item name="productSkuId" style={{ margin: 0 }} rules={[{ required: true }]}><Select size="small" style={{ width: 90 }} showSearch optionFilterProp="label" options={lineSkus.map(s => ({ value: s.id, label: s.code }))} /></Form.Item> : skus.find(s => s.id === r.productSkuId)?.code || '-' },
    { title: '大工段', dataIndex: 'stationId', key: 'major', width: 70, render: (id: number) => <Tag color="blue">{stations2.find(x => x.id === id)?.majorSection || '-'}</Tag> },
    { title: '小工段', dataIndex: 'stationId', key: 'minor', width: 80, render: (id: number) => <Tag color="green">{stations2.find(x => x.id === id)?.minorSection || '-'}</Tag> },
    { title: '工站', dataIndex: 'stationId', key: 'name', width: 100, render: (_: unknown, r: StationDetailRecord) => isEditing(r) ? <Form.Item name="stationId" style={{ margin: 0 }} rules={[{ required: true }]}><Select size="small" style={{ width: 180 }} showSearch optionFilterProp="label" options={stations2.map(s => ({ value: s.id, label: `${s.majorSection} / ${s.stationName}` }))} /></Form.Item> : stations2.find(s => s.id === r.stationId)?.stationName || '-' },
    { title: '组件', dataIndex: 'defectCategory', key: 'cat', width: 80, render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '类型', dataIndex: 'defectType', key: 'type', width: 60, render: (v: string) => <Tag color="cyan">{v}</Tag> },
    { title: '位置', dataIndex: 'defectLocation', key: 'loc', width: 60, render: (v: string) => <Tag color="geekblue">{v}</Tag> },
    { title: '缺陷', dataIndex: 'defectCode', key: 'defect', width: 220, render: (_: unknown, r: StationDetailRecord) => { if (isEditing(r)) { const stn = stations2.find(s => s.id === editForm.getFieldValue('stationId') || r.stationId); const opts = stn?.abnormalPositions?.length ? activeDefects.filter(d => stn.abnormalPositions!.includes(d.location)) : activeDefects; return <Form.Item name="defectCode" style={{ margin: 0 }} rules={[{ required: true }]}><Select size="small" style={{ width: 200 }} showSearch optionFilterProp="label" options={opts.map(d => ({ value: d.defectCode, label: `${d.component}/${d.type}/${d.location}/${d.defect}` }))} /></Form.Item>; } const d = activeDefects.find(x => x.defectCode === r.defectCode); return d?.defect || r.defectCode; } },
    { title: '数量', dataIndex: 'qty', key: 'qty', width: 80, render: (_: unknown, r: StationDetailRecord) => isEditing(r) ? <Form.Item name="qty" style={{ margin: 0 }} rules={[{ required: true }]}><InputNumber min={1} size="small" style={{ width: 70 }} /></Form.Item> : r.qty },
    { title: '操作', key: 'action', width: 130, render: (_: unknown, r: StationDetailRecord) => isEditing(r) ? <span style={{ whiteSpace: 'nowrap' }}><Button type="link" size="small" icon={<CheckOutlined />} onClick={() => saveEdit(r.id)}>保存</Button><Button type="link" size="small" icon={<CloseOutlined />} onClick={cancelEdit}>取消</Button></span> : <span style={{ whiteSpace: 'nowrap' }}><Button type="link" size="small" onClick={() => startEdit(r)}>编辑</Button><Popconfirm title="确定删除?" onConfirm={() => handleDelete(r.id)}><Button type="link" size="small" danger icon={<DeleteOutlined />} /></Popconfirm></span> },
  ];

  const batchColumns = [
    { title: '#', key: 'seq', width: 40, render: (_: unknown, __: unknown, i: number) => i + 1 },
    { title: '缺陷', dataIndex: 'defectCode', key: 'defect', width: 300, render: (_: unknown, r: BatchDefectRow) => <Select style={{ width: 280 }} showSearch optionFilterProp="label" placeholder="选择缺陷" value={r.defectCode} onChange={v => updateBatchRowDefect(r.id, v)} options={batchFilteredDefects.map(d => ({ value: d.defectCode, label: `${d.component} / ${d.type} / ${d.location} / ${d.defect}` }))} /> },
    { title: '数量', dataIndex: 'qty', key: 'qty', width: 100, render: (_: unknown, r: BatchDefectRow) => <InputNumber min={1} value={r.qty} onChange={v => updateBatchRowQty(r.id, v)} style={{ width: 80, background: isBatchRowDup(r) ? '#fff1f0' : undefined, borderColor: isBatchRowDup(r) ? '#ff4d4f' : undefined }} placeholder={isBatchRowDup(r) ? '重复!' : '数量'} /> },
    { title: '', key: 'status', width: 70, render: (_: unknown, r: BatchDefectRow) => isBatchRowDup(r) ? <Tag color="red">已存在</Tag> : null },
    { title: '操作', key: 'action', width: 60, render: (_: unknown, r: BatchDefectRow) => <Button type="link" danger icon={<DeleteOutlined />} onClick={() => removeBatchRow(r.id)} /> },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>{currentProduct?.name} — 工站明细录入</Title>
        <Space>
          <Tooltip title="导出当前数据"><Button icon={<DownloadOutlined />} onClick={handleExport}>导出</Button></Tooltip>
          <Tooltip title="下载导入模板"><Button icon={<FileExcelOutlined />} onClick={handleDownloadTemplate}>模板</Button></Tooltip>
          <Upload accept=".xlsx,.xls" showUploadList={false} beforeUpload={(file) => { handleImport(file); return false; }}>
            <Button icon={<UploadOutlined />}>导入</Button>
          </Upload>
        </Space>
      </div>

      {/* 单条录入 */}
      <Card style={{ marginBottom: 12 }}>
        <Form form={form} component={false}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* 第一行：日期、品号、工站、缺陷、数量 — 充满整行 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 500, fontSize: 14, flexShrink: 0 }}>日期</span>
            <Form.Item name="recordDate" rules={[{ required: true }]} style={{ margin: 0, flex: 1, minWidth: 120 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <span style={{ fontWeight: 500, fontSize: 14, flexShrink: 0 }}>品号</span>
            <Form.Item name="productSkuId" rules={[{ required: true }]} style={{ margin: 0, flex: 1, minWidth: 120 }}>
              <Select style={{ width: '100%' }} showSearch optionFilterProp="label" placeholder="选择品号"
                options={lineSkus.map(s => ({ value: s.id, label: s.code }))} />
            </Form.Item>
            <span style={{ fontWeight: 500, fontSize: 14, flexShrink: 0 }}>工站</span>
            <Form.Item name="stationId" rules={[{ required: true }]} style={{ margin: 0, flex: 1.5, minWidth: 160 }}>
              <Select style={{ width: '100%' }} showSearch optionFilterProp="label" placeholder="选择工站"
                onChange={handleStationChange}
                options={stations2.map(s => ({ value: s.id, label: `${s.majorSection} / ${s.minorSection} / ${s.stationName}` }))} />
            </Form.Item>
            <span style={{ fontWeight: 500, fontSize: 14, flexShrink: 0 }}>缺陷</span>
            <Form.Item name="defectCode" rules={[{ required: true }]} style={{ margin: 0, flex: 2, minWidth: 200 }}>
              <Select style={{ width: '100%' }} showSearch optionFilterProp="label"
                placeholder={selectedStationId ? '选择缺陷' : '请先选择工站'} disabled={!selectedStationId}
                onChange={handleDefectCodeChange} notFoundContent={selectedStationId ? '该工站无匹配缺陷' : '请先选择工站'}
                options={shownDefects.map(d => ({ value: d.defectCode, label: `${d.component} / ${d.type} / ${d.location} / ${d.defect}` }))} />
            </Form.Item>
            <span style={{ fontWeight: 500, fontSize: 14, flexShrink: 0 }}>数量</span>
            <Form.Item name="qty" rules={[{ required: true }]} style={{ margin: 0, flex: 0.6, minWidth: 60 }}>
              <InputNumber min={1} style={{ width: '100%' }} placeholder="数量" />
            </Form.Item>
          </div>
          {/* 第二行：过滤开关、录入、批量录入 — 末端对齐 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 13, color: '#666', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
              过滤异常位置<Switch size="small" checked={filterByPosition} onChange={setFilterByPosition} />
            </span>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleSingleAdd}>录入</Button>
            <Button icon={<UnorderedListOutlined />} onClick={openBatch}>批量录入</Button>
          </div>
        </div>
        </Form>
      </Card>

      {/* 可编辑表格 */}
      <Card title={<span>已录入记录 ({filteredRecords2.length} 条) <SmartFilterBar fields={recFilterFields2} searchText={recSearch2} onSearchChange={setRecSearch2} conditions={recConditions2} onConditionsChange={setRecConditions2} /></span>}>
        <Form form={editForm} component={false}>
          <Table scroll={{ x: 'max-content' }} dataSource={filteredRecords2.map(r => ({ ...r, key: r.id }))} columns={getEditableColumns()} loading={loading} pagination={{ pageSize: 10, showTotal: t => `共 ${t} 条` }} size="small" />
        </Form>
      </Card>

      {/* 批量录入弹窗 */}
      <Modal title="批量录入" open={batchOpen} onCancel={() => { setBatchOpen(false); setBatchRows([]); }} width={800} footer={null}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 500 }}>日期</span>
          <DatePicker style={{ width: 140 }} placeholder="选择日期" onChange={(d) => setBatchDate(d ? d.format('YYYY-MM-DD') : '')} />
          <span style={{ fontWeight: 500, marginLeft: 8 }}>品号</span>
          <Select style={{ width: 150 }} showSearch optionFilterProp="label" placeholder="选择品号" value={batchProductSkuId} onChange={setBatchProductSkuId} options={lineSkus.map(s => ({ value: s.id, label: s.code }))} />
          <span style={{ fontWeight: 500, marginLeft: 8 }}>工站</span>
          <Select style={{ width: 220 }} showSearch optionFilterProp="label" placeholder="选择工站" value={batchStationId} onChange={v => { setBatchStationId(v); setBatchRows([]); }} options={stations2.map(s => ({ value: s.id, label: `${s.majorSection} / ${s.minorSection} / ${s.stationName}` }))} />
        </div>
        {batchStationId && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Tag color="processing">缺陷列表 ({batchRows.length} 行)</Tag>
              <Button icon={<PlusOutlined />} size="small" onClick={addBatchRow}>添加缺陷行</Button>
            </div>
            <Table scroll={{ x: 'max-content' }} dataSource={batchRows.map(r => ({ ...r, key: r.id }))} columns={batchColumns} pagination={false} size="small" style={{ marginBottom: 16 }} locale={{ emptyText: '点击"添加缺陷行"开始' }} />
          </>
        )}
        {batchRows.length > 0 && (
          <div style={{ textAlign: 'right' }}>
            <Button type="primary" onClick={handleBatchSave}>提交 {batchRows.filter(r => r.defectCode && r.qty != null && r.qty > 0).length} / {batchRows.length} 行</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
