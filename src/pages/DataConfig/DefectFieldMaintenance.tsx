import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, Table, Button, Form, Input, Tabs, Typography, Tag, message, Popconfirm, Space } from 'antd';
import { PlusOutlined, CheckOutlined, CloseOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { defectFieldsApi } from '../../api';
import type { DefectFieldOption } from '../../types';

const { Title } = Typography;

const FIELD_LABELS: Record<DefectFieldOption['fieldType'], string> = { component: '组件', type: '类型', location: '位置', defect: '缺陷' };
const FIELD_COLORS: Record<DefectFieldOption['fieldType'], string> = { component: 'blue', type: 'cyan', location: 'geekblue', defect: 'purple' };

export default function DefectFieldMaintenance() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const isViewer = isAdmin && sessionStorage.getItem('admin-role') === 'viewer';

  const [fields, setFields] = useState<DefectFieldOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingKey, setEditingKey] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [editForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState<DefectFieldOption['fieldType']>('component');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await defectFieldsApi.list();
      setFields(data);
    } catch (e: any) {
      message.error(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const isEditing = (id: number) => id === editingKey || (adding && id === -1);

  const edit = (r: DefectFieldOption) => { setEditingKey(r.id); setAdding(false); editForm.setFieldsValue(r); };
  const cancel = () => { setEditingKey(null); setAdding(false); editForm.resetFields(); };

  const saveEdit = async (id: number) => {
    const row = await editForm.validateFields();
    try {
      await defectFieldsApi.update(id, { name: row.name });
      cancel();
      message.success('已保存');
      loadData();
    } catch (e: any) {
      message.error(e?.message || '保存失败');
    }
  };

  const saveNew = async () => {
    const row = await editForm.validateFields();
    try {
      await defectFieldsApi.create({ fieldType: activeTab, name: row.name });
      cancel();
      message.success('已新增');
      loadData();
    } catch (e: any) {
      message.error(e?.message || '新增失败');
    }
  };

  const add = () => { setAdding(true); setEditingKey(null); editForm.resetFields(); };

  const del = async (id: number) => {
    try {
      await defectFieldsApi.remove(id);
      message.success('已删除');
      loadData();
    } catch (e: any) {
      message.error(e?.message || '删除失败');
    }
  };

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', width: 200,
      render: (_: unknown, r: DefectFieldOption) => isEditing(r.id) ? <Form.Item name="name" style={{ margin: 0 }} rules={[{ required: true }]}><Input size="small" style={{ width: 180 }} /></Form.Item> : <Tag color={FIELD_COLORS[r.fieldType]}>{r.name}</Tag> },
    { title: '操作', key: 'action', width: 160,
      render: (_: unknown, r: DefectFieldOption) =>
        isViewer ? <Tag color="default" style={{ fontSize: 11 }}>只读</Tag> :
        isEditing(r.id) ? <Space size={4}><Button type="link" size="small" icon={<CheckOutlined />} onClick={() => r.id === -1 ? saveNew() : saveEdit(r.id)}>保存</Button><Button type="link" size="small" icon={<CloseOutlined />} onClick={cancel}>取消</Button></Space>
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
          loading={loading}
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
        {isViewer ? <Tag color="warning">只读模式，不可编辑</Tag> :
         <Button type="primary" icon={<PlusOutlined />} onClick={add} disabled={adding}>新增{FIELD_LABELS[activeTab]}选项</Button>}
      </div>
      <Card>
        <Form form={editForm} component={false}>
          <Tabs activeKey={activeTab} onChange={(k) => { setActiveTab(k as DefectFieldOption['fieldType']); cancel(); }} items={tabItems} />
        </Form>
      </Card>
    </div>
  );
}
