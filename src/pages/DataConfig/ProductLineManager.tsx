import { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Input, Switch, Typography, Tag, message, Popconfirm, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { productLinesApi } from '../../api';
import type { ProductLine, AdminRole } from '../../types';

const { Title } = Typography;

const ROLE_DESC: Record<string, string> = {
  pwdRead: '只读', pwdEntry: '数据录入', pwdConfig: '配置管理',
};

export default function ProductLineManager() {
  const role = (sessionStorage.getItem('admin-role') || '') as AdminRole;
  const isSuper = role === 'super';

  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [editForm] = Form.useForm();

  const fetchList = async () => {
    setLoading(true);
    try {
      const list = await productLinesApi.list();
      setProductLines(list as ProductLine[]);
    } catch (e: any) {
      message.error('获取产品列表失败: ' + (e.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  const isEditing = (id: number) => id === editingId || (adding && id === -1);

  const save = async (id: number) => {
    const row = await editForm.validateFields();
    try {
      await productLinesApi.update(id, row);
      message.success('已保存');
      setEditingId(null);
      editForm.resetFields();
      await fetchList();
    } catch (e: any) {
      message.error('保存失败: ' + (e.message || e));
    }
  };

  const add = async () => {
    const row = await editForm.validateFields();
    try {
      await productLinesApi.create({ name: row.name, isActive: true, pwdRead: row.pwdRead, pwdEntry: row.pwdEntry, pwdConfig: row.pwdConfig });
      message.success('已新增');
      setAdding(false);
      editForm.resetFields();
      await fetchList();
    } catch (e: any) {
      message.error('新增失败: ' + (e.message || e));
    }
  };

  const del = async (id: number) => {
    try {
      await productLinesApi.remove(id);
      message.success('已删除');
      await fetchList();
    } catch (e: any) {
      message.error('删除失败: ' + (e.message || e));
    }
  };

  const pwdCol = (field: keyof ProductLine) => ({
    title: ROLE_DESC[field] || '', width: 100,
    render: (_: unknown, r: ProductLine) => isEditing(r.id)
      ? <Form.Item name={field} style={{ margin: 0 }}><Input size="small" style={{ width: 90 }} placeholder="密码" /></Form.Item>
      : r[field] ? '••••••' : <span style={{ color: '#ccc' }}>未设</span>,
  });

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 50, render: (v: number) => v === -1 ? <Tag>新</Tag> : v },
    { title: '产品名称', dataIndex: 'name', key: 'name', width: 120,
      render: (_: unknown, r: ProductLine) => isEditing(r.id)
        ? <Form.Item name="name" style={{ margin: 0 }} rules={[{ required: true }]}><Input size="small" style={{ width: 120 }} /></Form.Item>
        : <Tag color="blue">{r.name}</Tag> },
    { title: '状态', dataIndex: 'isActive', key: 'st', width: 60,
      render: (v: boolean, r: ProductLine) => isEditing(r.id)
        ? <Form.Item name="isActive" style={{ margin: 0 }} valuePropName="checked"><Switch size="small" /></Form.Item>
        : <Tag color={v ? 'green' : 'default'}>{v ? '启用' : '停用'}</Tag> },
    pwdCol('pwdRead'),
    pwdCol('pwdEntry'),
    pwdCol('pwdConfig'),
    ...(isSuper ? [{ title: '操作', key: 'action', width: 160,
      render: (_: unknown, r: ProductLine) => isEditing(r.id)
        ? <Space size={4}>
            <Button type="link" size="small" onClick={() => r.id === -1 ? add() : save(r.id)}>保存</Button>
            <Button type="link" size="small" onClick={() => { setEditingId(null); setAdding(false); editForm.resetFields(); }}>取消</Button>
          </Space>
        : <Space size={4}>
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setEditingId(r.id); editForm.setFieldsValue(r); }}>编辑</Button>
            <Popconfirm title="确定删除?" onConfirm={() => del(r.id)}><Button type="link" size="small" danger icon={<DeleteOutlined />} /></Popconfirm>
          </Space> }] : []),
  ];

  const dataSource = [
    ...(adding ? [{ id: -1, name: '', isActive: true, key: -1 } as ProductLine & { key: number }] : []),
    ...productLines.map(l => ({ ...l, key: l.id })),
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>产品管理</Title>
        {isSuper && <Button type="primary" icon={<PlusOutlined />} disabled={adding}
          onClick={() => { setAdding(true); editForm.resetFields(); editForm.setFieldValue('isActive', true); }}>
          新增产品</Button>}
      </div>
      <Card>
        <Form form={editForm} component={false}>
          <Table scroll={{ x: 'max-content' }} dataSource={dataSource} columns={columns} pagination={false} size="small" loading={loading} />
        </Form>
      </Card>
    </div>
  );
}
