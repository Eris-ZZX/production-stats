import { useState } from 'react';
import { Card, Table, Button, Form, Input, InputNumber, Switch, Tabs, Typography, Tag, message, Popconfirm, Space } from 'antd';
import { PlusOutlined, CheckOutlined, CloseOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { mockStationFields } from '../../mockData';
import type { StationFieldOption } from '../../types';

const { Title } = Typography;

const FIELD_LABELS: Record<StationFieldOption['fieldType'], string> = { majorSection: '大工段', minorSection: '小工段', stationType: '工站类型' };
const FIELD_COLORS: Record<StationFieldOption['fieldType'], string> = { majorSection: 'blue', minorSection: 'green', stationType: 'orange' };

export default function StationFieldMaintenance() {
  const [fields, setFields] = useState<StationFieldOption[]>([...mockStationFields]);
  const [editingKey, setEditingKey] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [editForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState<StationFieldOption['fieldType']>('majorSection');

  const isLocked = activeTab === 'stationType';
  const isMajor = activeTab === 'majorSection';

  function syncGlobal(u: StationFieldOption[]) { mockStationFields.length = 0; mockStationFields.push(...u); }
  const isEditing = (id: number) => id === editingKey || (adding && id === -1);

  const edit = (r: StationFieldOption) => { setEditingKey(r.id); setAdding(false); editForm.setFieldsValue(r); };
  const cancel = () => { setEditingKey(null); setAdding(false); editForm.resetFields(); };

  const saveEdit = async (id: number) => {
    const row = await editForm.validateFields();
    const u = fields.map(f => f.id === id ? { ...f, name: row.name, isDataEntry: row.isDataEntry, visualFpyTarget: row.visualFpyTarget, functionalFpyTarget: row.functionalFpyTarget, airLeakFpyTarget: row.airLeakFpyTarget } : f);
    setFields(u); syncGlobal(u); cancel(); message.success('已保存');
  };

  const saveNew = async () => {
    const row = await editForm.validateFields();
    const maxId = fields.reduce((max, f) => Math.max(max, f.id), 0);
    const u = [...fields, { id: maxId + 1, fieldType: activeTab, name: row.name }];
    setFields(u); syncGlobal(u); cancel(); message.success('已新增');
  };

  const add = () => { setAdding(true); setEditingKey(null); editForm.resetFields(); };
  const del = (id: number) => { const u = fields.filter(f => f.id !== id); setFields(u); syncGlobal(u); message.success('已删除'); };

  const actionCol = (locked: boolean) => ({
    title: '操作', key: 'action', width: 160,
    render: (_: unknown, r: StationFieldOption) =>
      locked ? <Tag color="default" style={{ fontSize: 11 }}>锁定</Tag> :
      isEditing(r.id) ? <Space size={4}><Button type="link" size="small" icon={<CheckOutlined />} onClick={() => r.id === -1 ? saveNew() : saveEdit(r.id)}>保存</Button><Button type="link" size="small" icon={<CloseOutlined />} onClick={cancel}>取消</Button></Space>
        : <Space size={4}><Button type="link" size="small" icon={<EditOutlined />} onClick={() => edit(r)}>编辑</Button><Popconfirm title="确定删除?" onConfirm={() => del(r.id)}><Button type="link" size="small" danger icon={<DeleteOutlined />} /></Popconfirm></Space>,
  });

  const majorCols = [
    { title: '名称', dataIndex: 'name', key: 'name', width: 100,
      render: (_: unknown, r: StationFieldOption) => isEditing(r.id)
        ? <Form.Item name="name" style={{ margin: 0 }} rules={[{ required: true }]}><Input size="small" style={{ width: 90 }} /></Form.Item>
        : <Tag color={FIELD_COLORS[r.fieldType]}>{r.name}</Tag> },
    { title: '外观FPY目标', dataIndex: 'visualFpyTarget', key: 'vft', width: 110,
      render: (_: unknown, r: StationFieldOption) => isEditing(r.id)
        ? <Form.Item name="visualFpyTarget" style={{ margin: 0 }}><InputNumber size="small" min={0} max={100} style={{ width: 70 }} /></Form.Item>
        : <Tag color="blue">{r.visualFpyTarget ?? 97}%</Tag> },
    { title: '功能FPY目标', dataIndex: 'functionalFpyTarget', key: 'fft', width: 110,
      render: (_: unknown, r: StationFieldOption) => isEditing(r.id)
        ? <Form.Item name="functionalFpyTarget" style={{ margin: 0 }}><InputNumber size="small" min={0} max={100} style={{ width: 70 }} /></Form.Item>
        : <Tag color="cyan">{r.functionalFpyTarget ?? 95}%</Tag> },
    { title: '气密性FPY目标', dataIndex: 'airLeakFpyTarget', key: 'aft', width: 120,
      render: (_: unknown, r: StationFieldOption) => isEditing(r.id)
        ? <Form.Item name="airLeakFpyTarget" style={{ margin: 0 }}><InputNumber size="small" min={0} max={100} style={{ width: 70 }} /></Form.Item>
        : <Tag color="geekblue">{r.airLeakFpyTarget ?? 98}%</Tag> },
    actionCol(false),
  ];

  const stCols = [
    { title: '名称', dataIndex: 'name', key: 'name',
      render: (_: unknown, r: StationFieldOption) => isEditing(r.id)
        ? <Form.Item name="name" style={{ margin: 0 }} rules={[{ required: true }]}><Input size="small" style={{ width: 180 }} /></Form.Item>
        : <Tag color={FIELD_COLORS[r.fieldType]}>{r.name}</Tag> },
    { title: '数据录入类', dataIndex: 'isDataEntry', key: 'isDataEntry', width: 120,
      render: (_: unknown, r: StationFieldOption) => isEditing(r.id)
        ? <Form.Item name="isDataEntry" style={{ margin: 0 }} valuePropName="checked"><Switch size="small" checkedChildren="是" unCheckedChildren="否" /></Form.Item>
        : <Tag color={r.isDataEntry ? 'green' : 'default'}>{r.isDataEntry ? '是' : '否'}</Tag> },
    actionCol(true),
  ];

  const baseCols = [
    { title: '名称', dataIndex: 'name', key: 'name',
      render: (_: unknown, r: StationFieldOption) => isEditing(r.id)
        ? <Form.Item name="name" style={{ margin: 0 }} rules={[{ required: true }]}><Input size="small" style={{ width: 180 }} /></Form.Item>
        : <Tag color={FIELD_COLORS[r.fieldType]}>{r.name}</Tag> },
    actionCol(false),
  ];

  const ftArr = ['majorSection', 'minorSection', 'stationType'] as StationFieldOption['fieldType'][];
  const newItem: StationFieldOption = { id: -1, fieldType: 'majorSection', name: '' };

  const getColumns = (ft: StationFieldOption['fieldType']) => {
    if (ft === 'majorSection') return majorCols;
    if (ft === 'stationType') return stCols;
    return baseCols;
  };

  const tabItems = ftArr.map(ft => {
    const items = fields.filter(f => f.fieldType === ft);
    const locked = ft === 'stationType';
    return {
      key: ft,
      label: `${FIELD_LABELS[ft]} (${items.length})${locked ? ' 🔒' : ''}`,
      children: (
        <Table
          dataSource={[...(adding && !locked && activeTab === ft ? [{ ...newItem, key: -1, fieldType: ft }] : []), ...items.map(f => ({ ...f, key: f.id }))]}
          columns={getColumns(ft)} pagination={false} size="small" />
      ),
    };
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>工站字段维护</Title>
        {isLocked ? <Tag color="warning">工站类型已锁定，不可新增或删除</Tag> :
         <Button type="primary" icon={<PlusOutlined />} onClick={add} disabled={adding}>新增{FIELD_LABELS[activeTab]}选项</Button>}
      </div>
      <Card>
        <Form form={editForm} component={false}>
          <Tabs activeKey={activeTab} onChange={(k) => { setActiveTab(k as StationFieldOption['fieldType']); cancel(); }} items={tabItems} />
        </Form>
      </Card>
    </div>
  );
}
