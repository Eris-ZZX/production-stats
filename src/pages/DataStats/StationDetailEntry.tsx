import { useState, useMemo } from 'react';
import { Card, Form, Select, InputNumber, DatePicker, Button, Table, Modal, Switch, message, Typography, Tag, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, UnorderedListOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import SmartFilterBar, { applySmartFilters, type FilterCondition, type FilterField } from '../../components/SmartFilterBar';
import { useProduct } from '../../store/ProductContext';
import { mockStations, mockProducts, mockDefects, mockStationDetailRecords } from '../../mockData';
import dayjs from 'dayjs';

const { Title } = Typography;

interface StationDetailRecord {
  id: number; productId: number; recordDate: string; stationId: number;
  defectCategory: string; defectType: string; defectLocation: string; defectCode: string; qty: number;
}

interface BatchDefectRow {
  id: number; defectCode: string | null; qty: number | null;
}

export default function StationDetailEntry() {
  const { currentProduct } = useProduct();
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const [records, setRecords] = useState<StationDetailRecord[]>(() =>
    mockStationDetailRecords.map((r, i) => {
      const d = mockDefects.find(x => x.defectCode === r.defectCode);
      return {
        id: i + 1,
        productId: r.productId,
        recordDate: r.recordDate,
        stationId: r.stationId,
        defectCategory: d?.component || '',
        defectType: r.defectType,
        defectLocation: d?.location || '',
        defectCode: r.defectCode,
        qty: r.qty,
      };
    })
  );
  const [editingKey, setEditingKey] = useState<number | null>(null);
  const [selectedDefectCode, setSelectedDefectCode] = useState<string | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [filterByPosition, setFilterByPosition] = useState(true);

  const [recSearch2, setRecSearch2] = useState('');
  const [recConditions2, setRecConditions2] = useState<FilterCondition[]>([]);

  const [batchOpen, setBatchOpen] = useState(false);
  const [batchDate, setBatchDate] = useState<string>('');
  const [batchProductId, setBatchProductId] = useState<number | null>(null);
  const [batchStationId, setBatchStationId] = useState<number | null>(null);
  const [batchRows, setBatchRows] = useState<BatchDefectRow[]>([]);
  let nextBatchRowId = Date.now();

  const stations = mockStations.filter(s => s.isActive && s.isDataEntryType);
  const defects = mockDefects.filter(d => d.isActive);

  const batchFilteredDefects = useMemo(() => {
    if (!batchStationId) return defects;
    const station = stations.find(s => s.id === batchStationId);
    if (!station || !station.abnormalPositions?.length) return defects;
    return defects.filter(d => station.abnormalPositions!.includes(d.location));
  }, [batchStationId, defects, stations]);

  // 单条录入缺陷选项：根据开关决定是否按工站异常位置过滤
  const shownDefects = useMemo(() => {
    if (!filterByPosition || !selectedStationId) return defects;
    const station = stations.find(s => s.id === selectedStationId);
    if (!station || !station.abnormalPositions?.length) return defects;
    return defects.filter(d => station.abnormalPositions!.includes(d.location));
  }, [filterByPosition, selectedStationId, defects, stations]);

  const handleStationChange = (stationId: number) => {
    setSelectedStationId(stationId);
    form.resetFields(['defectCode']);
    setSelectedDefectCode(null);
    const s = stations.find(x => x.id === stationId);
    if (s) form.setFieldsValue({ majorSection: s.majorSection, minorSection: s.minorSection });
  };

  const handleDefectCodeChange = (code: string | null) => {
    setSelectedDefectCode(code);
    if (code) {
      const d = defects.find(x => x.defectCode === code);
      if (d) form.setFieldsValue({ defectCategory: d.component, defectType: d.type, defectLocation: d.location });
    }
  };

  const handleSingleAdd = () => {
    const values = form.getFieldsValue();
    if (!values.recordDate || !values.productId || !values.stationId || !values.defectCode || !values.qty) {
      message.warning('请填写日期、品号、工站、缺陷和数量'); return;
    }
    const date = values.recordDate.format('YYYY-MM-DD');
    if (records.some(r => r.recordDate === date && r.productId === values.productId && r.stationId === values.stationId && r.defectCode === values.defectCode)) {
      message.error('该日期+品号+工站+缺陷的记录已存在，不可重复录入'); return;
    }
    setRecords(prev => [{
      id: Date.now(), productId: values.productId, recordDate: date,
      stationId: values.stationId, defectCategory: values.defectCategory, defectType: values.defectType,
      defectLocation: values.defectLocation, defectCode: values.defectCode, qty: values.qty,
    }, ...prev]);
    form.resetFields(['stationId', 'defectCode', 'defectCategory', 'defectType', 'defectLocation', 'qty']);
    setSelectedDefectCode(null);
    message.success('录入成功');
  };

  const startEdit = (r: StationDetailRecord) => {
    setEditingKey(r.id);
    editForm.setFieldsValue({ recordDate: dayjs(r.recordDate), productId: r.productId, stationId: r.stationId, defectCode: r.defectCode, qty: r.qty });
  };
  const cancelEdit = () => { setEditingKey(null); editForm.resetFields(); };
  const saveEdit = async (id: number) => {
    const values = await editForm.validateFields();
    const d = defects.find(x => x.defectCode === values.defectCode);
    setRecords(prev => prev.map(r => r.id === id ? { ...r, recordDate: values.recordDate.format('YYYY-MM-DD'), productId: values.productId, stationId: values.stationId, defectCode: values.defectCode, defectCategory: d?.component || r.defectCategory, defectType: d?.type || r.defectType, defectLocation: d?.location || r.defectLocation, qty: values.qty } : r));
    setEditingKey(null); editForm.resetFields(); message.success('已保存');
  };

  const isEditing = (r: StationDetailRecord) => r.id === editingKey;

  const openBatch = () => { setBatchOpen(true); setBatchDate(''); setBatchProductId(null); setBatchStationId(null); setBatchRows([]); };
  const addBatchRow = () => { setBatchRows(prev => [...prev, { id: ++nextBatchRowId, defectCode: null, qty: null }]); };
  const updateBatchRowDefect = (rowId: number, code: string | null) => setBatchRows(prev => prev.map(r => r.id === rowId ? { ...r, defectCode: code } : r));
  const updateBatchRowQty = (rowId: number, val: number | null) => setBatchRows(prev => prev.map(r => r.id === rowId ? { ...r, qty: val } : r));
  const removeBatchRow = (rowId: number) => setBatchRows(prev => prev.filter(r => r.id !== rowId));

  const existingDetailKeys = useMemo(() => new Set(records.map(r => `${r.recordDate}_${r.productId}_${r.stationId}_${r.defectCode}`)), [records]);
  const isBatchRowDup = (r: BatchDefectRow) => batchDate && batchProductId && batchStationId && r.defectCode
    ? existingDetailKeys.has(`${batchDate}_${batchProductId}_${batchStationId}_${r.defectCode}`) : false;

  const handleBatchSave = () => {
    if (!batchDate || !batchProductId || !batchStationId) { message.warning('请填写日期、品号和工站'); return; }
    const filled = batchRows.filter(r => r.defectCode && r.qty != null && r.qty > 0);
    if (filled.length === 0) { message.warning('请至少添加一行缺陷并填写数量'); return; }
    const filledDups = filled.filter(r => isBatchRowDup(r));
    if (filledDups.length > 0) { message.error(`有 ${filledDups.length} 条已存在，请删除重复行后重试`); return; }
    setRecords(prev => [...filled.map(r => { const d = defects.find(x => x.defectCode === r.defectCode)!; return { id: Date.now() + Math.random() * 10000, productId: batchProductId!, recordDate: batchDate, stationId: batchStationId!, defectCategory: d.component, defectType: d.type, defectLocation: d.location, defectCode: d.defectCode, qty: r.qty! }; }), ...prev]);
    setBatchRows([]); message.success(`批量录入成功，共 ${filled.length} 条`);
  };

  const recFilterFields2: FilterField[] = [
    { key: 'recordDate', label: '日期', type: 'date' },
    { key: 'productId', label: '品号', type: 'text', options: mockProducts.map(p => ({ value: p.code, label: p.code })) },
    { key: 'stationId', label: '工站', type: 'text', options: stations.map(s => ({ value: s.stationName, label: s.stationName })), getValue: (r: StationDetailRecord) => stations.find(x => x.id === r.stationId)?.stationName || '' },
    { key: 'defectCategory', label: '组件', type: 'text' }, { key: 'defectType', label: '类型', type: 'text' }, { key: 'defectLocation', label: '位置', type: 'text' },
    { key: 'defect', label: '缺陷', type: 'text', options: defects.map(d => ({ value: d.defect, label: d.defect })), getValue: (r: StationDetailRecord) => defects.find(x => x.defectCode === r.defectCode)?.defect || '' },
    { key: 'qty', label: '数量', type: 'number' },
  ];

  const filteredRecords2 = useMemo(() => applySmartFilters(records, recSearch2, recConditions2, recFilterFields2, [
    'recordDate', r => mockProducts.find(p => p.id === r.productId)?.code || '', r => stations.find(s => s.id === r.stationId)?.stationName || '',
    'defectCategory', 'defectType', 'defectLocation', r => defects.find(x => x.defectCode === r.defectCode)?.defect || '', 'qty',
  ]), [records, recSearch2, recConditions2]);

  const getEditableColumns = () => [
    { title: '日期', dataIndex: 'recordDate', key: 'date', width: 130, render: (_: unknown, r: StationDetailRecord) => isEditing(r) ? <Form.Item name="recordDate" style={{ margin: 0 }} rules={[{ required: true }]}><DatePicker style={{ width: 120 }} size="small" /></Form.Item> : r.recordDate },
    { title: '品号', dataIndex: 'productId', key: 'product', width: 100, render: (_: unknown, r: StationDetailRecord) => isEditing(r) ? <Form.Item name="productId" style={{ margin: 0 }} rules={[{ required: true }]}><Select size="small" style={{ width: 90 }} showSearch optionFilterProp="label" options={mockProducts.filter(p => p.status === 'active').map(p => ({ value: p.id, label: p.code }))} /></Form.Item> : mockProducts.find(p => p.id === r.productId)?.code || '-' },
    { title: '大工段', dataIndex: 'stationId', key: 'major', width: 70, render: (id: number) => <Tag color="blue">{stations.find(x => x.id === id)?.majorSection || '-'}</Tag> },
    { title: '小工段', dataIndex: 'stationId', key: 'minor', width: 80, render: (id: number) => <Tag color="green">{stations.find(x => x.id === id)?.minorSection || '-'}</Tag> },
    { title: '工站', dataIndex: 'stationId', key: 'name', width: 100, render: (_: unknown, r: StationDetailRecord) => isEditing(r) ? <Form.Item name="stationId" style={{ margin: 0 }} rules={[{ required: true }]}><Select size="small" style={{ width: 180 }} showSearch optionFilterProp="label" options={stations.map(s => ({ value: s.id, label: `${s.majorSection} / ${s.stationName}` }))} /></Form.Item> : stations.find(s => s.id === r.stationId)?.stationName || '-' },
    { title: '组件', dataIndex: 'defectCategory', key: 'cat', width: 80, render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '类型', dataIndex: 'defectType', key: 'type', width: 60, render: (v: string) => <Tag color="cyan">{v}</Tag> },
    { title: '位置', dataIndex: 'defectLocation', key: 'loc', width: 60, render: (v: string) => <Tag color="geekblue">{v}</Tag> },
    { title: '缺陷', dataIndex: 'defectCode', key: 'defect', width: 220, render: (_: unknown, r: StationDetailRecord) => { if (isEditing(r)) { const stn = stations.find(s => s.id === editForm.getFieldValue('stationId') || r.stationId); const opts = stn?.abnormalPositions?.length ? defects.filter(d => stn.abnormalPositions!.includes(d.location)) : defects; return <Form.Item name="defectCode" style={{ margin: 0 }} rules={[{ required: true }]}><Select size="small" style={{ width: 200 }} showSearch optionFilterProp="label" options={opts.map(d => ({ value: d.defectCode, label: `${d.component}/${d.type}/${d.location}/${d.defect}` }))} /></Form.Item>; } const d = defects.find(x => x.defectCode === r.defectCode); return d?.defect || r.defectCode; } },
    { title: '数量', dataIndex: 'qty', key: 'qty', width: 80, render: (_: unknown, r: StationDetailRecord) => isEditing(r) ? <Form.Item name="qty" style={{ margin: 0 }} rules={[{ required: true }]}><InputNumber min={1} size="small" style={{ width: 70 }} /></Form.Item> : r.qty },
    { title: '操作', key: 'action', width: 130, render: (_: unknown, r: StationDetailRecord) => isEditing(r) ? <span style={{ whiteSpace: 'nowrap' }}><Button type="link" size="small" icon={<CheckOutlined />} onClick={() => saveEdit(r.id)}>保存</Button><Button type="link" size="small" icon={<CloseOutlined />} onClick={cancelEdit}>取消</Button></span> : <span style={{ whiteSpace: 'nowrap' }}><Button type="link" size="small" onClick={() => startEdit(r)}>编辑</Button><Popconfirm title="确定删除?" onConfirm={() => setRecords(prev => prev.filter(x => x.id !== r.id))}><Button type="link" size="small" danger icon={<DeleteOutlined />} /></Popconfirm></span> },
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
      <Title level={4}>{currentProduct?.code} — 工站明细录入</Title>

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
            <Form.Item name="productId" rules={[{ required: true }]} style={{ margin: 0, flex: 1, minWidth: 120 }}>
              <Select style={{ width: '100%' }} showSearch optionFilterProp="label" placeholder="选择品号"
                options={mockProducts.filter(p => p.status === 'active').map(p => ({ value: p.id, label: p.code }))} />
            </Form.Item>
            <span style={{ fontWeight: 500, fontSize: 14, flexShrink: 0 }}>工站</span>
            <Form.Item name="stationId" rules={[{ required: true }]} style={{ margin: 0, flex: 1.5, minWidth: 160 }}>
              <Select style={{ width: '100%' }} showSearch optionFilterProp="label" placeholder="选择工站"
                onChange={handleStationChange}
                options={stations.map(s => ({ value: s.id, label: `${s.majorSection} / ${s.minorSection} / ${s.stationName}` }))} />
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
          <Table dataSource={filteredRecords2.map((r, i) => ({ ...r, key: i }))} columns={getEditableColumns()} pagination={{ pageSize: 10, showTotal: t => `共 ${t} 条` }} size="small" />
        </Form>
      </Card>

      {/* 批量录入弹窗 */}
      <Modal title="批量录入" open={batchOpen} onCancel={() => { setBatchOpen(false); setBatchRows([]); }} width={800} footer={null}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 500 }}>日期</span>
          <DatePicker style={{ width: 140 }} placeholder="选择日期" onChange={(d) => setBatchDate(d ? d.format('YYYY-MM-DD') : '')} />
          <span style={{ fontWeight: 500, marginLeft: 8 }}>品号</span>
          <Select style={{ width: 150 }} showSearch optionFilterProp="label" placeholder="选择品号" value={batchProductId} onChange={setBatchProductId} options={mockProducts.filter(p => p.status === 'active').map(p => ({ value: p.id, label: p.code }))} />
          <span style={{ fontWeight: 500, marginLeft: 8 }}>工站</span>
          <Select style={{ width: 220 }} showSearch optionFilterProp="label" placeholder="选择工站" value={batchStationId} onChange={v => { setBatchStationId(v); setBatchRows([]); }} options={stations.map(s => ({ value: s.id, label: `${s.majorSection} / ${s.minorSection} / ${s.stationName}` }))} />
        </div>
        {batchStationId && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Tag color="processing">缺陷列表 ({batchRows.length} 行)</Tag>
              <Button icon={<PlusOutlined />} size="small" onClick={addBatchRow}>添加缺陷行</Button>
            </div>
            <Table dataSource={batchRows.map(r => ({ ...r, key: r.id }))} columns={batchColumns} pagination={false} size="small" style={{ marginBottom: 16 }} locale={{ emptyText: '点击"添加缺陷行"开始' }} />
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
