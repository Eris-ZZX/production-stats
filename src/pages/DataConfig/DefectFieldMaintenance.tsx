import { useState } from 'react';
import { Card, Table, Button, Form, Input, Switch, Tabs, Typography, Tag, message, Popconfirm, Space } from 'antd';
import { PlusOutlined, CheckOutlined, CloseOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { mockDefectFields, ensureDefectField } from '../../mockData';
import type { DefectFieldOption } from '../../types';

const { Title } = Typography;

const FIELD_LABELS: Record<DefectFieldOption['fieldType'], string> = { component: '组件', type: '类型', location: '位置', defect: '缺陷' };
const FIELD_COLORS: Record<DefectFieldOption['fieldType'], string> = { component: 'blue', type: 'cyan', location: 'geekblue', defect: 'purple' };

export default function DefectFieldMaintenance() {
  const [fields, setFields] = useState<DefectFieldOption[]>([...mockDefectFields]);
  const [editingKey, setEditingKey] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [editForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState<DefectFieldOption['fieldType']>('component');

  function syncGlobal(u: DefectFieldOption[]) { mockDefectFields.length = 0; mockDefectFields.push(...u); }
  const isEditing = (id: number) => id === editingKey || (adding && id === -1);

  const edit = (r: DefectFieldOption) => { setEditingKey(r.id); setAdding(false); editForm.setFieldsValue(r); };
  const cancel = () => { setEditingKey(null); setAdding(false); editForm.resetFields(); };

  const saveEdit = async (id: number) => {
    const row = await editForm.validateFields();
    const u = fields.map(f => f.id === id ? { ...f, name: row.name } : f);
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

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', width: 200,
      render: (_: unknown, r: DefectFieldOption) => isEditing(r.id) ? <Form.Item name="name" style={{ margin: 0 }} rules={[{ required: true }]}><Input size="small" style={{ width: 180 }} /></Form.Item> : <Tag color={FIELD_COLORS[r.fieldType]}>{r.name}</Tag> },
    { title: '操作', key: 'action', width: 160,
      render: (_: unknown, r: DefectFieldOption) => isEditing(r.id) ? <Space size={4}><Button type="link" size="small" icon={<CheckOutlined />} onClick={() => r.id === -1 ? saveNew() : saveEdit(r.id)}>保存</Button><Button type="link" size="small" icon={<CloseOutlined />} onClick={cancel}>取消</Button></Space>
        : <Space size={4}><Button type="link" size="small" icon={<EditOutlined />} onClick={() => edit(r)}>编辑</Button><Popconfirm title="确定删除?" onConfirm={() => del(r.id)}><Button type="link" size="small" danger icon={<DeleteOutlined />} /></Popconfirm></Space> },
  ];

  const ftArr = ['component', 'type', 'location', 'defect'] as DefectFieldOption['fieldType'][];
  const newItem: DefectFieldOption = { id: -1, fieldType: 'component', name: '' };

  const tabItems = ftArr.map(ft => {
    const items = fields.filter(f => f.fieldType === ft);
    return {
      key: ft, label: `${FIELD_LABELS[ft]} (${items.length})`,
      children: (
        <Table
          dataSource={[
            ...(adding && activeTab === ft ? [{ ...newItem, key: -1, fieldType: ft }] : []),
            ...items.map(f => ({ ...f, key: f.id })),
          ]}
          columns={columns} pagination={false} size="small" />
      ),
    };
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>缺陷字段维护</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={add} disabled={adding}>新增{FIELD_LABELS[activeTab]}选项</Button>
      </div>
      <Card>
        <Form form={editForm} component={false}>
          <Tabs activeKey={activeTab} onChange={(k) => { setActiveTab(k as DefectFieldOption['fieldType']); cancel(); }} items={tabItems} />
        </Form>
      </Card>
    </div>
  );
}
