import { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Input, Select, Typography, Tag, message, Popconfirm, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { adminAccountsApi } from '../../api';
import type { AdminAccount, AdminRole } from '../../types';

const { Title } = Typography;

const ROLE_OPTIONS: { value: AdminRole; label: string; color: string }[] = [
  { value: 'super', label: '超级管理', color: 'red' },
  { value: 'config', label: '配置管理', color: 'blue' },
  { value: 'viewer', label: '只读查看', color: 'green' },
];

const ROLE_MAP: Record<AdminRole, string> = { super: '超级管理', config: '配置管理', viewer: '只读查看' };
const ROLE_COLORS: Record<AdminRole, string> = { super: 'red', config: 'blue', viewer: 'green' };

export default function AdminAccountManager() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [editForm] = Form.useForm();

  const fetchList = async () => {
    setLoading(true);
    try {
      const list = await adminAccountsApi.list();
      setAccounts(list as AdminAccount[]);
    } catch (e: any) {
      message.error('获取账号列表失败: ' + (e.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  const isEditing = (id: number) => id === editingId || (adding && id === -1);

  const save = async (id: number) => {
    const row = await editForm.validateFields();
    try {
      await adminAccountsApi.update(id, row);
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
      await adminAccountsApi.create({ ...row, isActive: true });
      message.success('已新增');
      setAdding(false);
      editForm.resetFields();
      await fetchList();
    } catch (e: any) {
      message.error('新增失败: ' + (e.message || e));
    }
  };

  const del = async (id: number) => {
    if (accounts.length <= 1) { message.warning('至少保留一个账号'); return; }
    try {
      await adminAccountsApi.remove(id);
      message.success('已删除');
      await fetchList();
    } catch (e: any) {
      message.error('删除失败: ' + (e.message || e));
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 50, render: (v: number) => v === -1 ? <Tag>新</Tag> : v },
    { title: '账号', dataIndex: 'username', key: 'un', width: 120,
      render: (_: unknown, r: AdminAccount) => isEditing(r.id)
        ? <Form.Item name="username" style={{ margin: 0 }} rules={[{ required: true }]}><Input size="small" style={{ width: 120 }} /></Form.Item>
        : r.username },
    { title: '密码', dataIndex: 'password', key: 'pw', width: 120,
      render: (_: unknown, r: AdminAccount) => isEditing(r.id)
        ? <Form.Item name="password" style={{ margin: 0 }} rules={[{ required: true }]}><Input size="small" style={{ width: 120 }} /></Form.Item>
        : '••••••' },
    { title: '角色', dataIndex: 'role', key: 'r', width: 120,
      render: (v: AdminRole, r: AdminAccount) => isEditing(r.id)
        ? <Form.Item name="role" style={{ margin: 0 }} rules={[{ required: true }]}>
            <Select size="small" style={{ width: 100 }} options={ROLE_OPTIONS} />
          </Form.Item>
        : <Tag color={ROLE_COLORS[v]}>{ROLE_MAP[v]}</Tag> },
    { title: '权限说明', key: 'desc', render: (_: unknown, r: AdminAccount) =>
        <span style={{ color: '#999', fontSize: 12 }}>
          {r.role === 'super' ? '全部权限：产品管理、字段维护、账号管理' :
           r.role === 'config' ? '配置权限：字段维护' :
           '仅查看：只读访问'}
        </span> },
    { title: '操作', key: 'action', width: 120,
      render: (_: unknown, r: AdminAccount) => isEditing(r.id)
        ? <Space size={4}>
            <Button type="link" size="small" onClick={() => r.id === -1 ? add() : save(r.id)}>保存</Button>
            <Button type="link" size="small" onClick={() => { setEditingId(null); setAdding(false); editForm.resetFields(); }}>取消</Button>
          </Space>
        : <Space size={4}>
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setEditingId(r.id); editForm.setFieldsValue(r); }}>编辑</Button>
            <Popconfirm title="确定删除?" onConfirm={() => del(r.id)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />} disabled={accounts.length <= 1} />
            </Popconfirm>
          </Space> },
  ];

  const dataSource = [
    ...(adding ? [{ id: -1, username: '', password: '', role: 'viewer' as AdminRole, isActive: true, key: -1 }] : []),
    ...accounts.map(a => ({ ...a, key: a.id })),
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>账号管理</Title>
        <Button type="primary" icon={<PlusOutlined />} disabled={adding}
          onClick={() => { setAdding(true); editForm.resetFields(); editForm.setFieldValue('role', 'viewer'); }}>
          新增账号</Button>
      </div>
      <Card>
        <Form form={editForm} component={false}>
          <Table scroll={{ x: 'max-content' }} dataSource={dataSource} columns={columns} pagination={false} size="small" loading={loading} />
        </Form>
      </Card>
    </div>
  );
}
