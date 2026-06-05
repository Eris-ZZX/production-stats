import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, Form, Input, Select, DatePicker, Button, Table, message, Typography, Tag, Popconfirm, Space } from 'antd';
import { PlusOutlined, CheckOutlined, CloseOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import SmartFilterBar, { applySmartFilters, type FilterCondition, type FilterField } from '../../components/SmartFilterBar';
import { useProduct } from '../../store/ProductContext';
import { stationsApi, defectCodesApi, inspectionRecordsApi } from '../../api';
import type { Station, DefectCode } from '../../types';
import dayjs from 'dayjs';

const { Title } = Typography;

interface InspRecord {
  id: number; productId: number; productSn: string; minorSection: string; majorSection: string;
  productionDefects: string[]; fqcDefects: string[]; inspectionDate: string; createdAt: string;
}

export default function InspectionEntry() {
  const { currentProduct } = useProduct();
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  // ===== 远端数据 =====
  const [stations, setStations] = useState<Station[]>([]);
  const [defects, setDefects] = useState<DefectCode[]>([]);

  // ===== 状态 =====
  const [records, setRecords] = useState<InspRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingKey, setEditingKey] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  // 筛选
  const [inspSearch, setInspSearch] = useState('');
  const [inspConditions, setInspConditions] = useState<FilterCondition[]>([]);

  const activeStations = useMemo(() => stations.filter(s => s.isActive), [stations]);
  const activeDefects = useMemo(() => defects.filter(d => d.isActive), [defects]);

  // ===== 加载数据 =====
  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      const data = await inspectionRecordsApi.list();
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
    defectCodesApi.list().then(setDefects).catch((e: any) => message.error('加载缺陷失败: ' + (e.message || '未知错误')));
  }, [loadRecords]);

  const isEditing = (id: number) => id === editingKey || (adding && id === -1);

  const edit = (r: InspRecord) => { setEditingKey(r.id); setAdding(false); editForm.setFieldsValue({ ...r, inspectionDate: dayjs(r.inspectionDate) }); };
  const cancel = () => { setEditingKey(null); setAdding(false); editForm.resetFields(); };

  const saveEdit = async (id: number) => {
    const row = await editForm.validateFields();
    try {
      await inspectionRecordsApi.update(id, {
        productSn: row.productSn,
        minorSection: row.minorSection || '-',
        majorSection: row.majorSection || '-',
        productionDefects: row.productionDefects || [],
        fqcDefects: row.fqcDefects || [],
        inspectionDate: row.inspectionDate.format('YYYY-MM-DD'),
      });
      cancel();
      message.success('已保存');
      loadRecords();
    } catch (e: any) {
      message.error('保存失败: ' + (e.message || '未知错误'));
    }
  };

  const saveNew = async () => {
    const row = await editForm.validateFields();
    if (!row.productSn || !row.inspectionDate) { message.warning('请填写产品编号和日期'); return; }
    try {
      await inspectionRecordsApi.create({
        productId: currentProduct?.id || 1,
        productSn: row.productSn,
        minorSection: row.minorSection || '-',
        majorSection: row.majorSection || '-',
        productionDefects: row.productionDefects || [],
        fqcDefects: row.fqcDefects || [],
        inspectionDate: row.inspectionDate.format('YYYY-MM-DD'),
      });
      cancel();
      message.success('已新增');
      loadRecords();
    } catch (e: any) {
      message.error('新增失败: ' + (e.message || '未知错误'));
    }
  };

  const add = () => { setAdding(true); setEditingKey(null); editForm.resetFields(); };

  const del = async (id: number) => {
    try {
      await inspectionRecordsApi.remove(id);
      message.success('已删除');
      loadRecords();
    } catch (e: any) {
      message.error('删除失败: ' + (e.message || '未知错误'));
    }
  };

  const handleStationChange = (stationId: number) => {
    const s = activeStations.find(x => x.id === stationId);
    if (s) { form.setFieldsValue({ majorSection: s.majorSection, minorSection: s.minorSection }); }
  };

  const handleSingleAdd = async () => {
    const values = form.getFieldsValue();
    if (!values.productSn || !values.inspectionDate) { message.warning('请填写产品编号和日期'); return; }
    try {
      await inspectionRecordsApi.create({
        productId: currentProduct?.id || 1,
        productSn: values.productSn,
        minorSection: values.minorSection || '-',
        majorSection: values.majorSection || '-',
        productionDefects: values.productionDefects || [],
        fqcDefects: values.fqcDefects || [],
        inspectionDate: values.inspectionDate.format('YYYY-MM-DD'),
      });
      form.resetFields(['productSn', 'productionDefects', 'fqcDefects']);
      message.success('录入成功');
      loadRecords();
    } catch (e: any) {
      message.error('录入失败: ' + (e.message || '未知错误'));
    }
  };

  const newRecord: InspRecord = { id: -1, productId: currentProduct?.id || 1, productSn: '', minorSection: '-', majorSection: '-', productionDefects: [], fqcDefects: [], inspectionDate: '', createdAt: '' };

  // 筛选逻辑
  const inspFilterFields: FilterField[] = [
    { key: 'inspectionDate', label: '日期', type: 'date' },
    { key: 'productSn', label: 'SN', type: 'text' },
    { key: 'majorSection', label: '大段', type: 'text', options: ['组装','测试','包装'].map(v => ({ value: v, label: v })) },
    { key: 'minorSection', label: '小段', type: 'text' },
  ];

  const filteredInspRecords = useMemo(() => applySmartFilters(records, inspSearch, inspConditions, inspFilterFields, [
    'productSn', 'inspectionDate', 'majorSection', 'minorSection',
    r => r.productionDefects?.join(',') || '',
    r => r.fqcDefects?.join(',') || '',
  ]), [records, inspSearch, inspConditions]);

  const getColumns = () => [
    { title: '日期', dataIndex: 'inspectionDate', key: 'date', width: 120,
      render: (_: unknown, r: InspRecord) => isEditing(r.id) ? <Form.Item name="inspectionDate" style={{ margin: 0 }} rules={[{ required: true }]}><DatePicker size="small" style={{ width: 110 }} /></Form.Item> : r.inspectionDate },
    { title: 'SN', dataIndex: 'productSn', key: 'sn', width: 170,
      render: (_: unknown, r: InspRecord) => isEditing(r.id) ? <Form.Item name="productSn" style={{ margin: 0 }} rules={[{ required: true }]}><Input size="small" style={{ width: 160 }} /></Form.Item> : r.productSn },
    { title: '大段', dataIndex: 'majorSection', key: 'major', width: 70,
      render: (_: unknown, r: InspRecord) => isEditing(r.id) ? <Form.Item name="majorSection" style={{ margin: 0 }}><Select size="small" style={{ width: 70 }} options={['组装','测试','包装'].map(v => ({ value: v, label: v }))} /></Form.Item> : <Tag color="blue">{r.majorSection}</Tag> },
    { title: '小段', dataIndex: 'minorSection', key: 'minor', width: 80,
      render: (_: unknown, r: InspRecord) => isEditing(r.id) ? <Form.Item name="minorSection" style={{ margin: 0 }}><Input size="small" style={{ width: 80 }} /></Form.Item> : <Tag color="green">{r.minorSection}</Tag> },
    { title: '生产外检缺陷', dataIndex: 'productionDefects', key: 'pd', width: 200,
      render: (_: unknown, r: InspRecord) => isEditing(r.id) ? <Form.Item name="productionDefects" style={{ margin: 0 }}><Select size="small" mode="multiple" allowClear style={{ width: 200 }} options={activeDefects.map(d => ({ value: d.defectCode, label: `${d.component}/${d.location}/${d.defect}` }))} /></Form.Item> : (r.productionDefects?.length ? r.productionDefects.map(d => { const def = activeDefects.find(x => x.defectCode === d); return <Tag key={d}>{def?.defect || d}</Tag>; }) : <Tag color="green">无</Tag>) },
    { title: 'FQC缺陷', dataIndex: 'fqcDefects', key: 'fd', width: 200,
      render: (_: unknown, r: InspRecord) => isEditing(r.id) ? <Form.Item name="fqcDefects" style={{ margin: 0 }}><Select size="small" mode="multiple" allowClear style={{ width: 200 }} options={activeDefects.map(d => ({ value: d.defectCode, label: `${d.component}/${d.location}/${d.defect}` }))} /></Form.Item> : (r.fqcDefects?.length ? r.fqcDefects.map(d => { const def = activeDefects.find(x => x.defectCode === d); return <Tag key={d} color="red">{def?.defect || d}</Tag>; }) : <Tag color="green">无</Tag>) },
    { title: '操作', key: 'action', width: 140,
      render: (_: unknown, r: InspRecord) => isEditing(r.id) ? <Space size={4}><Button type="link" size="small" icon={<CheckOutlined />} onClick={() => r.id === -1 ? saveNew() : saveEdit(r.id)}>保存</Button><Button type="link" size="small" icon={<CloseOutlined />} onClick={cancel}>取消</Button></Space>
        : <Space size={4}><Button type="link" size="small" icon={<EditOutlined />} onClick={() => edit(r)}>编辑</Button><Popconfirm title="确定删除?" onConfirm={() => del(r.id)}><Button type="link" size="small" danger icon={<DeleteOutlined />} /></Popconfirm></Space> },
  ];

  return (
    <div>
      <Title level={4}>{currentProduct?.code} — 多缺陷外检录入</Title>

      {/* 单条录入 */}
      <Card style={{ marginBottom: 12 }}>
        <Form form={form} layout="inline" style={{ flexWrap: 'wrap', gap: 8 }}>
          <Form.Item name="inspectionDate" label="日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name="productSn" label="产品编号" rules={[{ required: true }]}>
            <Input placeholder="SN-YYYYMMDD-XXX" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="stationId" label="工站">
            <Select style={{ width: 220 }} showSearch optionFilterProp="label" placeholder="选择工站（自动填大/小段）" allowClear onChange={handleStationChange}
              options={activeStations.map(s => ({ value: s.id, label: `${s.majorSection} / ${s.minorSection} / ${s.stationName}` }))} />
          </Form.Item>
          <Form.Item name="majorSection" noStyle><Input type="hidden" /></Form.Item>
          <Form.Item name="minorSection" noStyle><Input type="hidden" /></Form.Item>
          <Form.Item name="productionDefects" label="生产外检缺陷">
            <Select mode="multiple" allowClear style={{ width: 280 }} placeholder="可多选"
              options={activeDefects.map(d => ({ value: d.defectCode, label: `${d.component} / ${d.type} / ${d.location} / ${d.defect}` }))} />
          </Form.Item>
          <Form.Item name="fqcDefects" label="FQC缺陷">
            <Select mode="multiple" allowClear style={{ width: 280 }} placeholder="可多选"
              options={activeDefects.map(d => ({ value: d.defectCode, label: `${d.component} / ${d.type} / ${d.location} / ${d.defect}` }))} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleSingleAdd}>录入</Button>
          </Form.Item>
        </Form>
      </Card>

      {/* 可编辑表格 */}
      <Card title={<span>已录入记录 ({filteredInspRecords.length} 条) <SmartFilterBar fields={inspFilterFields} searchText={inspSearch} onSearchChange={setInspSearch} conditions={inspConditions} onConditionsChange={setInspConditions} /></span>}>
        <Form form={editForm} component={false}>
          <Table
            dataSource={[...(adding ? [{ ...newRecord, key: -1 }] : []), ...filteredInspRecords.map(r => ({ ...r, key: r.id }))]}
            columns={getColumns() as any} loading={loading} pagination={{ pageSize: 10 }} size="small" />
        </Form>
      </Card>
    </div>
  );
}
