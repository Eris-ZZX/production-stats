import { useState, useMemo } from 'react';
import { Card, Form, Select, InputNumber, DatePicker, Button, Table, Modal, message, Typography, Tag, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, UnorderedListOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import SmartFilterBar, { applySmartFilters, type FilterCondition, type FilterField } from '../../components/SmartFilterBar';
import { useProduct } from '../../store/ProductContext';
import { mockStations, mockProducts } from '../../mockData';
import dayjs from 'dayjs';

const { Title } = Typography;

interface BatchRow {
  id: number; stationId: number; outputQty: number | null;
  recordDate: string; productId: number;
}

interface SavedRecord {
  id: number; recordDate: string; productId: number; stationId: number; outputQty: number; key: number;
}

export default function ProductionEntry() {
  const { currentProduct } = useProduct();
  const [form] = Form.useForm();

  // ===== 状态 =====
  const [records, setRecords] = useState<SavedRecord[]>([]);
  const [editingKey, setEditingKey] = useState<number | null>(null);
  const [editForm] = Form.useForm();

  // 筛选
  const [recSearch, setRecSearch] = useState('');
  const [recConditions, setRecConditions] = useState<FilterCondition[]>([]);

  // 批量录入
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchDate, setBatchDate] = useState<string>('');
  const [batchProductId, setBatchProductId] = useState<number | null>(null);
  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);

  const dataEntryStations = useMemo(() =>
    mockStations.filter(s => s.isActive && s.isDataEntryType),
  []);

  // ===== 单条录入 =====
  const handleSingleAdd = () => {
    const values = form.getFieldsValue();
    if (!values.recordDate || !values.productId || !values.stationId || !values.outputQty) {
      message.warning('请填写日期、品号、工站和投产数'); return;
    }
    const date = values.recordDate.format('YYYY-MM-DD');
    // 查重：日期+品号+工站
    if (records.some(r => r.recordDate === date && r.productId === values.productId && r.stationId === values.stationId)) {
      message.error('该日期+品号+工站的记录已存在，不可重复录入'); return;
    }
    setRecords(prev => [{
      id: Date.now(), recordDate: date,
      productId: values.productId, stationId: values.stationId, outputQty: values.outputQty, key: Date.now(),
    }, ...prev]);
    form.resetFields(['stationId', 'outputQty']);
    message.success('录入成功');
  };

  // ===== 行内编辑 =====
  const startEdit = (r: SavedRecord) => {
    setEditingKey(r.id);
    editForm.setFieldsValue({
      recordDate: dayjs(r.recordDate),
      productId: r.productId,
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
    setRecords(prev => prev.map(r => r.id === id ? {
      ...r,
      recordDate: values.recordDate.format('YYYY-MM-DD'),
      productId: values.productId,
      stationId: values.stationId,
      outputQty: values.outputQty,
    } : r));
    setEditingKey(null);
    editForm.resetFields();
    message.success('已保存');
  };

  const isEditing = (r: SavedRecord) => r.id === editingKey;

  // 筛选逻辑
  const recFilterFields: FilterField[] = [
    { key: 'recordDate', label: '日期', type: 'date' },
    { key: 'productId', label: '品号', type: 'text', options: mockProducts.map(p => ({ value: p.code, label: p.code })) },
    { key: 'stationId', label: '工站', type: 'text', options: dataEntryStations.map(s => ({ value: s.stationName, label: s.stationName })) },
    { key: 'outputQty', label: '投产数', type: 'number' },
  ];

  const filteredRecords = useMemo(() => applySmartFilters(records, recSearch, recConditions, recFilterFields, [
    'recordDate', r => mockProducts.find(p => p.id === r.productId)?.code || '',
    r => dataEntryStations.find(s => s.id === r.stationId)?.stationName || '', 'outputQty',
  ]), [records, recSearch, recConditions]);

  // ===== 批量录入 =====
  // 已有记录的 "日期_品号_工站" 查重key
  const existingKeys = useMemo(() => new Set(records.map(r => `${r.recordDate}_${r.productId}_${r.stationId}`)), [records]);

  const handleGenerateBatch = () => {
    if (!batchDate || !batchProductId) { message.warning('请选择日期和品号'); return; }
    setBatchRows(dataEntryStations.map((s, i) => ({
      id: Date.now() + i, stationId: s.id, outputQty: null,
      recordDate: batchDate, productId: batchProductId,
    })));
  };

  const updateBatchQty = (rowId: number, val: number | null) => {
    setBatchRows(prev => prev.map(r => r.id === rowId ? { ...r, outputQty: val } : r));
  };

  const removeBatchRow = (rowId: number) => setBatchRows(prev => prev.filter(r => r.id !== rowId));

  const isBatchRowDup = (r: BatchRow) => existingKeys.has(`${r.recordDate}_${r.productId}_${r.stationId}`);
  const dupCount = batchRows.filter(r => isBatchRowDup(r)).length;

  const handleBatchSave = () => {
    // 检查填了投产数的行是否有重复
    const filled = batchRows.filter(r => r.outputQty != null && r.outputQty > 0);
    if (filled.length === 0) { message.warning('请至少填写一行的投产数'); return; }
    const filledDups = filled.filter(r => isBatchRowDup(r));
    if (filledDups.length > 0) {
      message.error(`有 ${filledDups.length} 条记录已存在（日期+品号+工站重复），请删除重复行后重试`);
      return;
    }
    setRecords(prev => [...filled.map(r => ({
      id: Date.now() + Math.random() * 10000, recordDate: r.recordDate,
      productId: r.productId, stationId: r.stationId, outputQty: r.outputQty!, key: Date.now(),
    })), ...prev]);
    setBatchRows(prev => prev.filter(r => r.outputQty == null || r.outputQty <= 0));
    message.success(`录入成功，共 ${filled.filter(r => !isBatchRowDup(r)).length} 条`);
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
      title: '品号', dataIndex: 'productId', key: 'product', width: 120,
      render: (_: unknown, r: SavedRecord) => {
        if (isEditing(r)) {
          return (
            <Form.Item name="productId" style={{ margin: 0 }} rules={[{ required: true }]}>
              <Select size="small" style={{ width: 110 }} showSearch optionFilterProp="label"
                options={mockProducts.filter(p => p.status === 'active').map(p => ({ value: p.id, label: p.code }))} />
            </Form.Item>
          );
        }
        return mockProducts.find(p => p.id === r.productId)?.code || '-';
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
            <Popconfirm title="确定删除?" onConfirm={() => setRecords(prev => prev.filter(x => x.id !== r.id))}>
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
      <Title level={4}>{currentProduct?.code} — 制程投产录入</Title>

      {/* 单条录入 */}
      <Card style={{ marginBottom: 12 }}>
        <Form form={form} layout="inline" style={{ flexWrap: 'wrap', gap: 8 }}>
          <Form.Item name="recordDate" label="日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name="productId" label="品号" rules={[{ required: true }]}>
            <Select style={{ width: 150 }} showSearch optionFilterProp="label" placeholder="选择品号"
              options={mockProducts.filter(p => p.status === 'active').map(p => ({ value: p.id, label: p.code }))} />
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
          <Table dataSource={filteredRecords.map(r => ({ ...r, key: r.id }))} columns={getEditableColumns()}
            pagination={{ pageSize: 10, showTotal: t => `共 ${t} 条` }} size="small" />
        </Form>
      </Card>

      {/* 批量录入弹窗 */}
      <Modal title="批量录入" open={batchOpen} onCancel={() => { setBatchOpen(false); setBatchDate(''); setBatchProductId(null); setBatchRows([]); }} width={820} footer={null}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <DatePicker style={{ width: 140 }} placeholder="选择日期" onChange={(d) => setBatchDate(d ? d.format('YYYY-MM-DD') : '')} />
          <Select style={{ width: 160 }} showSearch optionFilterProp="label" placeholder="选择品号" value={batchProductId} onChange={setBatchProductId}
            options={mockProducts.filter(p => p.status === 'active').map(p => ({ value: p.id, label: p.code }))} />
          <Button type="primary" onClick={handleGenerateBatch}>一键生成工站列表</Button>
          {batchDate && batchProductId && <Tag color="processing">{batchDate} / {mockProducts.find(p => p.id === batchProductId)?.code} — {dataEntryStations.length} 个工站</Tag>}
        </div>
        {batchRows.length > 0 && (
          <>
            <Table dataSource={batchRows.map(r => ({ ...r, key: r.id }))} columns={batchColumns} pagination={false} size="small" style={{ marginBottom: 16 }} />
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
