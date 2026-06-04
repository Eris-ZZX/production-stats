import { useState } from 'react';
import { Card, Table, Button, Form, Input, Typography, Tag, message, Popconfirm, Space, Tabs, Checkbox } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import {
  mockProductLines, mockStations, mockDefects,
  mockStationFields, mockDefectFields, mockGlobalPreset,
} from '../../mockData';
import type { ProductLine, GlobalPreset } from '../../types';

const { Title } = Typography;

export default function ProductAdmin() {
  const [productLines, setProductLines] = useState<ProductLine[]>([...mockProductLines]);
  const [preset, setPreset] = useState<GlobalPreset>({
    defaultMajorSectionIds: [...mockGlobalPreset.defaultMajorSectionIds],
    defaultMinorSectionIds: [...mockGlobalPreset.defaultMinorSectionIds],
    defaultStationTypeIds: [...mockGlobalPreset.defaultStationTypeIds],
    defaultComponentIds: [...mockGlobalPreset.defaultComponentIds],
    defaultTypeIds: [...mockGlobalPreset.defaultTypeIds],
    defaultLocationIds: [...mockGlobalPreset.defaultLocationIds],
    defaultDefectIds: [...mockGlobalPreset.defaultDefectIds],
  });
  const [activeTab, setActiveTab] = useState('products');
  const [editForm] = Form.useForm();

  function syncLines(list: ProductLine[]) { mockProductLines.length = 0; mockProductLines.push(...list); }
  function syncPreset(p: GlobalPreset) {
    mockGlobalPreset.defaultMajorSectionIds = p.defaultMajorSectionIds;
    mockGlobalPreset.defaultMinorSectionIds = p.defaultMinorSectionIds;
    mockGlobalPreset.defaultStationTypeIds = p.defaultStationTypeIds;
    mockGlobalPreset.defaultComponentIds = p.defaultComponentIds;
    mockGlobalPreset.defaultTypeIds = p.defaultTypeIds;
    mockGlobalPreset.defaultLocationIds = p.defaultLocationIds;
    mockGlobalPreset.defaultDefectIds = p.defaultDefectIds;
  }

  // ==================== 产品线管理 ====================
  const [lineEditingId, setLineEditingId] = useState<number | null>(null);
  const [lineAdding, setLineAdding] = useState(false);

  const saveLine = async (id: number) => {
    const row = await editForm.validateFields();
    const u = productLines.map(l => l.id === id ? { ...l, ...row } : l);
    setProductLines(u); syncLines(u); setLineEditingId(null); editForm.resetFields(); message.success('已保存');
  };

  const addLine = async () => {
    const row = await editForm.validateFields();
    const maxId = productLines.reduce((m, l) => Math.max(m, l.id), 0);
    const u = [...productLines, { id: maxId + 1, name: row.name, isActive: true }];
    setProductLines(u); syncLines(u); setLineAdding(false); editForm.resetFields(); message.success('已新增');
  };

  const delLine = (id: number) => {
    const u = productLines.filter(l => l.id !== id);
    setProductLines(u); syncLines(u); message.success('已删除');
  };

  const isLineEditing = (id: number) => id === lineEditingId || (lineAdding && id === -1);

  const applyPreset = () => {
    let count = 0;
    const addFields = (ids: number[], source: { id: number; fieldType: string; name: string }[], target: { fieldType: string; name: string; id: number }[]) => {
      ids.forEach(id => {
        const f = source.find(x => x.id === id);
        if (f && !target.some(x => x.fieldType === f.fieldType && x.name === f.name)) {
          const maxId = target.reduce((m, x) => Math.max(m, x.id), 0);
          target.push({ ...f, id: maxId + 1 } as any);
          count++;
        }
      });
    };
    addFields(preset.defaultMajorSectionIds, mockStationFields.filter(f => f.fieldType === 'majorSection'), mockStationFields);
    addFields(preset.defaultMinorSectionIds, mockStationFields.filter(f => f.fieldType === 'minorSection'), mockStationFields);
    addFields(preset.defaultStationTypeIds, mockStationFields.filter(f => f.fieldType === 'stationType'), mockStationFields);
    addFields(preset.defaultComponentIds, mockDefectFields.filter(f => f.fieldType === 'component'), mockDefectFields);
    addFields(preset.defaultTypeIds, mockDefectFields.filter(f => f.fieldType === 'type'), mockDefectFields);
    addFields(preset.defaultLocationIds, mockDefectFields.filter(f => f.fieldType === 'location'), mockDefectFields);
    addFields(preset.defaultDefectIds, mockDefectFields.filter(f => f.fieldType === 'defect'), mockDefectFields);
    message.success(`已从预置同步 ${count} 项基础数据`);
  };

  const lineCols = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 50, render: (v: number) => v === -1 ? <Tag>新</Tag> : v },
    { title: '产品名称', dataIndex: 'name', key: 'name',
      render: (_: unknown, r: ProductLine) => isLineEditing(r.id)
        ? <Form.Item name="name" style={{ margin: 0 }} rules={[{ required: true }]}><Input size="small" style={{ width: 200 }} /></Form.Item>
        : <Tag color="blue">{r.name}</Tag> },
    { title: '状态', dataIndex: 'isActive', key: 'st', width: 70,
      render: (v: boolean, r: ProductLine) => isLineEditing(r.id)
        ? <Form.Item name="isActive" style={{ margin: 0 }} valuePropName="checked" />
        : <Tag color={v ? 'green' : 'default'}>{v ? '启用' : '停用'}</Tag> },
    { title: '操作', key: 'action', width: 200,
      render: (_: unknown, r: ProductLine) => isLineEditing(r.id)
        ? <Space size={4}>
            <Button type="link" size="small" onClick={() => r.id === -1 ? addLine() : saveLine(r.id)}>保存</Button>
            <Button type="link" size="small" onClick={() => { setLineEditingId(null); setLineAdding(false); editForm.resetFields(); }}>取消</Button>
          </Space>
        : <Space size={4}>
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setLineEditingId(r.id); editForm.setFieldsValue(r); }}>编辑</Button>
            <Button type="link" size="small" icon={<CopyOutlined />} onClick={applyPreset}>应用预置</Button>
            <Popconfirm title="确定删除?" onConfirm={() => delLine(r.id)}><Button type="link" size="small" danger icon={<DeleteOutlined />} /></Popconfirm>
          </Space> },
  ];

  // ==================== 预置选项 ====================
  const togglePreset = (key: keyof GlobalPreset, id: number, checked: boolean) => {
    setPreset(prev => {
      const next = { ...prev, [key]: checked ? [...prev[key], id] : prev[key].filter(x => x !== id) };
      syncPreset(next);
      return next;
    });
  };

  const presetCard = (
    title: string,
    presetKey: keyof GlobalPreset,
    items: { id: number; label: string }[],
  ) => {
    const selectedSet = new Set(preset[presetKey]);
    const cols = [
      { title: '名称', dataIndex: 'label', key: 'name' },
      { title: '默认', key: 'def', width: 50, render: (_: unknown, r: typeof items[0]) =>
        <Checkbox checked={selectedSet.has(r.id)} onChange={e => togglePreset(presetKey, r.id, e.target.checked)} /> },
    ];
    return (
      <Card title={`${title} (${selectedSet.size}/${items.length})`} size="small" style={{ marginBottom: 8 }}>
        <Table dataSource={items.map(i => ({ ...i, key: i.id }))} columns={cols} pagination={false} size="small" showHeader={false} />
      </Card>
    );
  };

  const majorItems = mockStationFields.filter(f => f.fieldType === 'majorSection').map(f => ({ id: f.id, label: f.name }));
  const minorItems = mockStationFields.filter(f => f.fieldType === 'minorSection').map(f => ({ id: f.id, label: f.name }));
  const stypeItems = mockStationFields.filter(f => f.fieldType === 'stationType').map(f => ({ id: f.id, label: f.name }));
  const compItems = mockDefectFields.filter(f => f.fieldType === 'component').map(f => ({ id: f.id, label: f.name }));
  const typeItems = mockDefectFields.filter(f => f.fieldType === 'type').map(f => ({ id: f.id, label: f.name }));
  const locItems = mockDefectFields.filter(f => f.fieldType === 'location').map(f => ({ id: f.id, label: f.name }));
  const defItems = mockDefectFields.filter(f => f.fieldType === 'defect').map(f => ({ id: f.id, label: f.name }));

  const lineData = [
    ...(lineAdding ? [{ id: -1, name: '', isActive: true, key: -1 }] : []),
    ...productLines.map(l => ({ ...l, key: l.id })),
  ];

  return (
    <div>
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}
          tabBarExtraContent={activeTab === 'products'
            ? <Button type="primary" size="small" icon={<PlusOutlined />} disabled={lineAdding}
                onClick={() => { setLineAdding(true); editForm.resetFields(); editForm.setFieldValue('isActive', true); }}>
                新增产品</Button>
            : <Space>
                <span style={{ color: '#999', fontSize: 12 }}>勾选的项将在新建产品时自动创建</span>
                <Button type="primary" size="small" icon={<CopyOutlined />} onClick={applyPreset}>应用预置</Button>
              </Space>
          }
          items={[
          {
            key: 'products',
            label: `产品管理 (${productLines.length})`,
            children: (
              <Form form={editForm} component={false}>
                <Table dataSource={lineData} columns={lineCols} pagination={false} size="small" />
              </Form>
            ),
          },
          {
            key: 'presets',
            label: '预置选项',
            children: (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <Title level={5} style={{ margin: 0 }}>工站字段</Title>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {presetCard('大工段', 'defaultMajorSectionIds', majorItems)}
                  {presetCard('小工段', 'defaultMinorSectionIds', minorItems)}
                  {presetCard('工站类型', 'defaultStationTypeIds', stypeItems)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, marginTop: 12 }}>
                  <Title level={5} style={{ margin: 0 }}>缺陷字段</Title>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {presetCard('组件', 'defaultComponentIds', compItems)}
                  {presetCard('类型', 'defaultTypeIds', typeItems)}
                  {presetCard('位置', 'defaultLocationIds', locItems)}
                  {presetCard('缺陷', 'defaultDefectIds', defItems)}
                </div>
              </>
            ),
          },
        ]} />
      </Card>
    </div>
  );
}
