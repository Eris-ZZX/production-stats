import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, Form, Select, InputNumber, DatePicker, Button, Table, Modal, message, Typography, Tag, Popconfirm, Upload, Space, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, UnorderedListOutlined, CheckOutlined, CloseOutlined, DownloadOutlined, UploadOutlined, FileExcelOutlined } from '@ant-design/icons';
import SmartFilterBar, { applySmartFilters, type FilterCondition, type FilterField } from '../../components/SmartFilterBar';
import { useProduct } from '../../store/ProductContext';
import { stationsApi, productionRecordsApi } from '../../api';
import type { Station } from '../../types';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

const { Title } = Typography;

interface BatchRow {
  id: number; stationId: number; outputQty: number | null;
  recordDate: string; productSkuId: number;
}

interface SavedRecord {
  id: number; recordDate: string; productSkuId: number; stationId: number; outputQty: number; key: number;
}

export default function ProductionEntry() {
  const { currentProduct, skus } = useProduct();
  const [form] = Form.useForm();

  // ===== 远端数据 =====
  const [stations, setStations] = useState<Station[]>([]);

  // 品号 数据
  const activeSkus = useMemo(() => skus.filter(s => s.isActive), [skus]);
  const lineSkus = useMemo(() => activeSkus.filter(s => !currentProduct || s.productLineId === currentProduct.id), [activeSkus, currentProduct]);

  // ===== 状态 =====
  const [records, setRecords] = useState<SavedRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingKey, setEditingKey] = useState<number | null>(null);
  const [editForm] = Form.useForm();

  // 筛选
  const [recSearch, setRecSearch] = useState('');
  const [recConditions, setRecConditions] = useState<FilterCondition[]>([]);

  // 批量录入
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchDate, setBatchDate] = useState<string>('');
  const [batchProductSkuId, setBatchProductSkuId] = useState<number | null>(null);
  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);

  // ===== 加载数据 =====
  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      const data = await productionRecordsApi.list();
      setRecords(data.map((r: any) => ({ ...r, key: r.id })));
    } catch (e: any) {
      message.error('加载记录失败: ' + (e.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
    stationsApi.list().then(setStations).catch((e: any) => message.error('加载工站失败: ' + (e.message || '未知错误')));
  }, [loadRecords]);

  const dataEntryStations = useMemo(() =>
    stations.filter(s => s.isActive && s.isDataEntryType),
  [stations]);

  // ===== 单条录入 =====
  const handleSingleAdd = async () => {
    const values = form.getFieldsValue();
    if (!values.recordDate || !values.productSkuId || !values.stationId || !values.outputQty) {
      message.warning('请填写日期、品号、工站和投产数'); return;
    }
    const date = values.recordDate.format('YYYY-MM-DD');
    // 查重：日期+品号+工站
    if (records.some(r => r.recordDate === date && r.productSkuId === values.productSkuId && r.stationId === values.stationId)) {
      message.error('该日期+品号+工站的记录已存在，不可重复录入'); return;
    }
    try {
      await productionRecordsApi.create({
        recordDate: date,
        productSkuId: values.productSkuId,
        stationId: values.stationId,
        outputQty: values.outputQty,
      });
      message.success('录入成功');
      form.resetFields(['stationId', 'outputQty']);
      loadRecords();
    } catch (e: any) {
      message.error('录入失败: ' + (e.message || '未知错误'));
    }
  };

  // ===== 行内编辑 =====
  const startEdit = (r: SavedRecord) => {
    setEditingKey(r.id);
    editForm.setFieldsValue({
      recordDate: dayjs(r.recordDate),
      productSkuId: r.productSkuId,
      stationId: r.stationId,
      outputQty: r.outputQty,
    });
  };

  const cancelEdit = () => {
    setEditingKey(null);
    editForm.resetFields();
  };

  const saveEdit = async (id: number) => {
    const values = await editForm.validateFields();
    try {
      await productionRecordsApi.update(id, {
        recordDate: values.recordDate.format('YYYY-MM-DD'),
        productSkuId: values.productSkuId,
        stationId: values.stationId,
        outputQty: values.outputQty,
      });
      setEditingKey(null);
      editForm.resetFields();
      message.success('已保存');
      loadRecords();
    } catch (e: any) {
      message.error('保存失败: ' + (e.message || '未知错误'));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await productionRecordsApi.remove(id);
      message.success('已删除');
      loadRecords();
    } catch (e: any) {
      message.error('删除失败: ' + (e.message || '未知错误'));
    }
  };

  const isEditing = (r: SavedRecord) => r.id === editingKey;

  // 筛选逻辑
  const recFilterFields: FilterField[] = [
    { key: 'recordDate', label: '日期', type: 'date' },
    { key: 'productSkuId', label: '品号', type: 'text', options: lineSkus.map(s => ({ value: s.code, label: s.code })), getValue: (r: SavedRecord) => skus.find(s => s.id === r.productSkuId)?.code || '' },
    { key: 'stationId', label: '工站', type: 'text', options: dataEntryStations.map(s => ({ value: s.stationName, label: s.stationName })), getValue: (r: SavedRecord) => dataEntryStations.find(s => s.id === r.stationId)?.stationName || '' },
    { key: 'outputQty', label: '投产数', type: 'number' },
  ];

  const filteredRecords = useMemo(() => applySmartFilters(records, recSearch, recConditions, recFilterFields, [
    'recordDate', r => skus.find(s => s.id === r.productSkuId)?.code || '',
    r => dataEntryStations.find(s => s.id === r.stationId)?.stationName || '', 'outputQty',
  ]), [records, recSearch, recConditions, skus, dataEntryStations]);

  // ===== 批量录入 =====
  // 已有记录的 "日期_品号_工站" 查重key
  const existingKeys = useMemo(() => new Set(records.map(r => `${r.recordDate}_${r.productSkuId}_${r.stationId}`)), [records]);

  const handleGenerateBatch = () => {
    if (!batchDate || !batchProductSkuId) { message.warning('请选择日期和品号'); return; }
    setBatchRows(dataEntryStations.map((s, i) => ({
      id: Date.now() + i, stationId: s.id, outputQty: null,
      recordDate: batchDate, productSkuId: batchProductSkuId,
    })));
  };

  const updateBatchQty = (rowId: number, val: number | null) => {
    setBatchRows(prev => prev.map(r => r.id === rowId ? { ...r, outputQty: val } : r));
  };

  const removeBatchRow = (rowId: number) => setBatchRows(prev => prev.filter(r => r.id !== rowId));

  const isBatchRowDup = (r: BatchRow) => existingKeys.has(`${r.recordDate}_${r.productSkuId}_${r.stationId}`);

  const handleBatchSave = async () => {
    // 检查填了投产数的行是否有重复
    const filled = batchRows.filter(r => r.outputQty != null && r.outputQty > 0);
    if (filled.length === 0) { message.warning('请至少填写一行的投产数'); return; }
    const filledDups = filled.filter(r => isBatchRowDup(r));
    if (filledDups.length > 0) {
      message.error(`有 ${filledDups.length} 条记录已存在（日期+品号+工站重复），请删除重复行后重试`);
      return;
    }
    try {
      await productionRecordsApi.batchCreate(filled.map(r => ({
        recordDate: r.recordDate,
        productSkuId: r.productSkuId,
        stationId: r.stationId,
        outputQty: r.outputQty,
      })));
      message.success(`录入成功，共 ${filled.length} 条`);
      setBatchRows(prev => prev.filter(r => r.outputQty == null || r.outputQty <= 0));
      loadRecords();
    } catch (e: any) {
      message.error('批量录入失败: ' + (e.message || '未知错误'));
    }
  };

  // ===== Excel 导入/导出/模板 =====
  const handleExport = () => {
    const data = records.map(r => ({
      '日期': r.recordDate,
      '品号编码': skus.find(s => s.id === r.productSkuId)?.code || '',
      '大工段': dataEntryStations.find(s => s.id === r.stationId)?.majorSection || '',
      '小工段': dataEntryStations.find(s => s.id === r.stationId)?.minorSection || '',
      '工站': dataEntryStations.find(s => s.id === r.stationId)?.stationName || '',
      '投产数': r.outputQty,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '制程投产记录');
    XLSX.writeFile(wb, '制程投产记录.xlsx');
    message.success('导出成功');
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      '日期': '2026-06-01',
      '品号编码': 'TX-100',
      '工站名称': '贴膜',
      '投产数': 500,
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '模板');
    XLSX.writeFile(wb, '制程投产导入模板.xlsx');
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
        const qty = Number(r['投产数']);

        if (!date || !skuCode || !stationName || isNaN(qty) || qty <= 0) {
          errors.push(`第${i + 2}行: 数据不完整`);
          continue;
        }
        const sku = skus.find(s => s.code === skuCode);
        if (!sku) { errors.push(`第${i + 2}行: 品号编码"${skuCode}"不存在`); continue; }
        const st = dataEntryStations.find(s => s.stationName === stationName);
        if (!st) { errors.push(`第${i + 2}行: 工站"${stationName}"不存在`); continue; }
        if (records.some(r => r.recordDate === date && r.productSkuId === sku.id && r.stationId === st.id)) {
          errors.push(`第${i + 2}行: 记录已存在(${date}/${skuCode}/${stationName})`);
          continue;
        }
        toImport.push({ recordDate: date, productSkuId: sku.id, stationId: st.id, outputQty: qty });
      }
      if (toImport.length === 0) {
        message.error(`无有效数据可导入。${errors.length > 0 ? ' 错误: ' + errors.join('; ') : ''}`);
        return;
      }
      await productionRecordsApi.batchCreate(toImport);
      message.success(`导入成功: ${toImport.length} 条${errors.length > 0 ? `, 跳过 ${errors.length} 条` : ''}`);
      if (errors.length > 0) message.warning(errors.join('; '));
      loadRecords();
    } catch (e: any) {
      message.error('导入失败: ' + (e.message || '文件格式错误'));
    }
  };

  // ===== 表格列（含编辑视图） =====
  const getEditableColumns = () => [
    {
      title: '日期', dataIndex: 'recordDate', key: 'date', width: 140,
      render: (_: unknown, r: SavedRecord) => {
        if (isEditing(r)) {
          return (
            <Form.Item name="recordDate" style={{ margin: 0 }} rules={[{ required: true }]}>
              <DatePicker style={{ width: 130 }} size="small" />
            </Form.Item>
          );
        }
        return r.recordDate;
      },
    },
    {
      title: '品号', dataIndex: 'productSkuId', key: 'sku', width: 120,
      render: (_: unknown, r: SavedRecord) => {
        if (isEditing(r)) {
          return (
            <Form.Item name="productSkuId" style={{ margin: 0 }} rules={[{ required: true }]}>
              <Select size="small" style={{ width: 110 }} showSearch optionFilterProp="label"
                options={lineSkus.map(s => ({ value: s.id, label: s.code }))} />
            </Form.Item>
          );
        }
        return skus.find(s => s.id === r.productSkuId)?.code || '-';
      },
    },
    {
      title: '大工段', dataIndex: 'stationId', key: 'major', width: 80,
      render: (_: unknown, r: SavedRecord) => {
        const s = dataEntryStations.find(x => x.id === r.stationId);
        return <Tag color="blue">{s?.majorSection || '-'}</Tag>;
      },
    },
    {
      title: '小工段', dataIndex: 'stationId', key: 'minor', width: 90,
      render: (_: unknown, r: SavedRecord) => {
        const s = dataEntryStations.find(x => x.id === r.stationId);
        return <Tag color="green">{s?.minorSection || '-'}</Tag>;
      },
    },
    {
      title: '工站', dataIndex: 'stationId', key: 'name', width: 120,
      render: (_: unknown, r: SavedRecord) => {
        if (isEditing(r)) {
          return (
            <Form.Item name="stationId" style={{ margin: 0 }} rules={[{ required: true }]}>
              <Select size="small" style={{ width: 200 }} showSearch optionFilterProp="label"
                options={dataEntryStations.map(s => ({ value: s.id, label: `${s.majorSection} / ${s.stationName}` }))} />
            </Form.Item>
          );
        }
        return dataEntryStations.find(s => s.id === r.stationId)?.stationName || '-';
      },
    },
    {
      title: '投产数', dataIndex: 'outputQty', key: 'qty', width: 110,
      render: (_: unknown, r: SavedRecord) => {
        if (isEditing(r)) {
          return (
            <Form.Item name="outputQty" style={{ margin: 0 }} rules={[{ required: true }]}>
              <InputNumber min={0} size="small" style={{ width: 90 }} />
            </Form.Item>
          );
        }
        return r.outputQty;
      },
    },
    {
      title: '操作', key: 'action', width: 140,
      render: (_: unknown, r: SavedRecord) => {
        if (isEditing(r)) {
          return (
            <span style={{ whiteSpace: 'nowrap' }}>
              <Button type="link" size="small" icon={<CheckOutlined />} onClick={() => saveEdit(r.id)}>保存</Button>
              <Button type="link" size="small" icon={<CloseOutlined />} onClick={cancelEdit}>取消</Button>
            </span>
          );
        }
        return (
          <span style={{ whiteSpace: 'nowrap' }}>
            <Button type="link" size="small" onClick={() => startEdit(r)}>编辑</Button>
            <Popconfirm title="确定删除?" onConfirm={() => handleDelete(r.id)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </span>
        );
      },
    },
  ];

  // 批量录入弹窗列
  const batchColumns = [
    { title: '#', key: 'seq', width: 40, render: (_: unknown, __: unknown, i: number) => i + 1 },
    { title: '大工段', dataIndex: 'stationId', key: 'major', render: (id: number) => <Tag color="blue">{dataEntryStations.find(x => x.id === id)?.majorSection || '-'}</Tag> },
    { title: '小工段', dataIndex: 'stationId', key: 'minor', render: (id: number) => <Tag color="green">{dataEntryStations.find(x => x.id === id)?.minorSection || '-'}</Tag> },
    { title: '工站', dataIndex: 'stationId', key: 'name', render: (id: number) => dataEntryStations.find(s => s.id === id)?.stationName || '-' },
    {
      title: '投产数', dataIndex: 'outputQty', key: 'qty', width: 120,
      render: (_: unknown, r: BatchRow) => (
        <InputNumber min={0} value={r.outputQty} onChange={v => updateBatchQty(r.id, v)}
          style={{ width: 100, background: isBatchRowDup(r) ? '#fff1f0' : undefined, borderColor: isBatchRowDup(r) ? '#ff4d4f' : undefined }}
          placeholder={isBatchRowDup(r) ? '重复!' : '投产数'} />
      ),
    },
    {
      title: '状态', key: 'status', width: 80,
      render: (_: unknown, r: BatchRow) => isBatchRowDup(r)
        ? <Tag color="red">已存在</Tag>
        : <Tag color="green" style={{ visibility: 'hidden' }}>-</Tag>,
    },
    { title: '操作', key: 'action', width: 60, render: (_: unknown, r: BatchRow) => (
      <Button type="link" danger icon={<DeleteOutlined />} onClick={() => removeBatchRow(r.id)} />
    ) },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>{currentProduct?.name} — 制程投产录入</Title>
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
        <Form form={form} layout="inline" style={{ flexWrap: 'wrap', gap: 8 }}>
          <Form.Item name="recordDate" label="日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name="productSkuId" label="品号" rules={[{ required: true }]}>
            <Select style={{ width: 150 }} showSearch optionFilterProp="label" placeholder="选择品号"
              options={lineSkus.map(s => ({ value: s.id, label: s.code }))} />
          </Form.Item>
          <Form.Item name="stationId" label="工站" rules={[{ required: true }]}>
            <Select style={{ width: 240 }} showSearch optionFilterProp="label" placeholder="选择工站"
              options={dataEntryStations.map(s => ({ value: s.id, label: `${s.majorSection} / ${s.minorSection} / ${s.stationName}` }))} />
          </Form.Item>
          <Form.Item name="outputQty" label="投产数" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: 100 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleSingleAdd}>录入</Button>
          </Form.Item>
          <Form.Item>
            <Button icon={<UnorderedListOutlined />} onClick={() => setBatchOpen(true)}>批量录入</Button>
          </Form.Item>
        </Form>
      </Card>

      {/* 已录入记录 */}
      <Card title={<span>已录入记录 ({filteredRecords.length} 条) <SmartFilterBar fields={recFilterFields} searchText={recSearch} onSearchChange={setRecSearch} conditions={recConditions} onConditionsChange={setRecConditions} /></span>}>
        <Form form={editForm} component={false}>
          <Table scroll={{ x: 'max-content' }} dataSource={filteredRecords.map(r => ({ ...r, key: r.id }))} columns={getEditableColumns()}
            loading={loading} pagination={{ pageSize: 10, showTotal: t => `共 ${t} 条` }} size="small" />
        </Form>
      </Card>

      {/* 批量录入弹窗 */}
      <Modal title="批量录入" open={batchOpen} onCancel={() => { setBatchOpen(false); setBatchDate(''); setBatchProductSkuId(null); setBatchRows([]); }} width={820} footer={null}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <DatePicker style={{ width: 140 }} placeholder="选择日期" onChange={(d) => setBatchDate(d ? d.format('YYYY-MM-DD') : '')} />
          <Select style={{ width: 160 }} showSearch optionFilterProp="label" placeholder="选择品号" value={batchProductSkuId} onChange={setBatchProductSkuId}
            options={lineSkus.map(s => ({ value: s.id, label: s.code }))} />
          <Button type="primary" onClick={handleGenerateBatch}>一键生成工站列表</Button>
          {batchDate && batchProductSkuId && <Tag color="processing">{batchDate} / {skus.find(s => s.id === batchProductSkuId)?.code} — {dataEntryStations.length} 个工站</Tag>}
        </div>
        {batchRows.length > 0 && (
          <>
            <Table scroll={{ x: 'max-content' }} dataSource={batchRows.map(r => ({ ...r, key: r.id }))} columns={batchColumns} pagination={false} size="small" style={{ marginBottom: 16 }} />
            <div style={{ textAlign: 'right' }}>
              <Button type="primary" onClick={handleBatchSave}>
                提交已填写 ({batchRows.filter(r => r.outputQty != null && r.outputQty > 0).length} 行)
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
