import { useState } from 'react';
import { Card, Table, Button, Form, Input, Select, Typography, Tag, message, Popconfirm, Space } from 'antd';
import { PlusOutlined, CheckOutlined, CloseOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useProduct } from '../../store/ProductContext';
import { mockProducts } from '../../mockData';
import type { Product } from '../../types';

const { Title } = Typography;

export default function ProductList() {
  const { currentProduct, setCurrentProduct } = useProduct();
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [editingKey, setEditingKey] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [editForm] = Form.useForm();

  function syncGlobal(u: Product[]) { mockProducts.length = 0; mockProducts.push(...u); }
  const isEditing = (id: number) => id === editingKey || (adding && id === -1);

  const edit = (r: Product) => { setEditingKey(r.id); setAdding(false); editForm.setFieldsValue(r); };
  const cancel = () => { setEditingKey(null); setAdding(false); editForm.resetFields(); };

  const saveEdit = async (id: number) => {
    const row = await editForm.validateFields();
    const u = products.map(p => p.id === id ? { ...p, ...row } : p);
    setProducts(u); syncGlobal(u);
    if (id === currentProduct?.id) setCurrentProduct({ ...currentProduct!, ...row });
    cancel(); message.success('已保存');
  };

  const saveNew = async () => {
    const row = await editForm.validateFields();
    const maxId = products.reduce((max, p) => Math.max(max, p.id), 0);
    const u = [...products, { id: maxId + 1, ...row }];
    setProducts(u); syncGlobal(u);
    cancel(); message.success('已新增');
  };

  const add = () => { setAdding(true); setEditingKey(null); editForm.resetFields(); editForm.setFieldValue('status', 'active'); };

  const del = (id: number) => { const u = products.filter(p => p.id !== id); setProducts(u); syncGlobal(u); message.success('已删除'); };

  const dataSource = [...(adding ? [{ id: -1, code: '', status: 'active' as const, key: -1 }] : []), ...products.map(p => ({ ...p, key: p.id }))];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>品号管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={add} disabled={adding}>新增品号</Button>
      </div>
      <Card>
        <Form form={editForm} component={false}>
          <Table dataSource={dataSource} pagination={false} size="small">
            <Table.Column title="ID" dataIndex="id" key="id" width={60}
              render={(id: number) => id === -1 ? <Tag>新</Tag> : id} />
            <Table.Column title="品号编码" dataIndex="code" key="code"
              render={(v: string, r: Product) => isEditing(r.id)
                ? <Form.Item name="code" style={{ margin: 0 }} rules={[{ required: true }]}><Input size="small" style={{ width: 150 }} /></Form.Item>
                : v} />
            <Table.Column title="状态" dataIndex="status" key="status" width={90}
              render={(v: string, r: Product) => isEditing(r.id)
                ? <Form.Item name="status" style={{ margin: 0 }} rules={[{ required: true }]}>
                    <Select size="small" style={{ width: 90 }} options={[{ value: 'active', label: '启用' }, { value: 'inactive', label: '停用' }]} />
                  </Form.Item>
                : <Tag color={v === 'active' ? 'green' : 'default'}>{v === 'active' ? '启用' : '停用'}</Tag>} />
            <Table.Column title="操作" key="action" width={160}
              render={(_: unknown, r: Product) => isEditing(r.id)
                ? <Space size={4}>
                    <Button type="link" size="small" icon={<CheckOutlined />} onClick={() => r.id === -1 ? saveNew() : saveEdit(r.id)}>保存</Button>
                    <Button type="link" size="small" icon={<CloseOutlined />} onClick={cancel}>取消</Button>
                  </Space>
                : <Space size={4}>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => edit(r)}>编辑</Button>
                    <Popconfirm title="确定删除?" onConfirm={() => del(r.id)}>
                      <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>} />
          </Table>
        </Form>
      </Card>
    </div>
  );
}
