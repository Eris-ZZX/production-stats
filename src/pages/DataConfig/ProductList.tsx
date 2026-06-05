import { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Input, Typography, Tag, message, Popconfirm, Space } from 'antd';
import { PlusOutlined, CheckOutlined, CloseOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useProduct } from '../../store/ProductContext';
import { productLinesApi } from '../../api';
import type { ProductLine } from '../../types';

const { Title } = Typography;

export default function ProductList() {
  const { currentProduct, setCurrentProduct, refresh } = useProduct();
  const [products, setProducts] = useState<ProductLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingKey, setEditingKey] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [editForm] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await productLinesApi.list();
      setProducts(data);
    } catch (e: any) {
      message.error(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const isEditing = (id: number) => id === editingKey || (adding && id === -1);

  const edit = (r: ProductLine) => { setEditingKey(r.id); setAdding(false); editForm.setFieldsValue(r); };
  const cancel = () => { setEditingKey(null); setAdding(false); editForm.resetFields(); };

  const saveEdit = async (id: number) => {
    const row = await editForm.validateFields();
    try {
      await productLinesApi.update(id, row);
      if (id === currentProduct?.id) setCurrentProduct({ ...currentProduct!, ...row });
      refresh();
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
      await productLinesApi.create(row);
      refresh();
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
      await productLinesApi.remove(id);
      refresh();
      message.success('已删除');
      loadData();
    } catch (e: any) {
      message.error(e?.message || '删除失败');
    }
  };

  const dataSource = [...(adding ? [{ id: -1, name: '', isActive: true as boolean, key: -1 }] : []), ...products.map(p => ({ ...p, key: p.id }))];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>产品管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={add} disabled={adding}>新增产品</Button>
      </div>
      <Card>
        <Form form={editForm} component={false}>
          <Table dataSource={dataSource} pagination={false} size="small" loading={loading}>
            <Table.Column title="ID" dataIndex="id" key="id" width={60}
              render={(id: number) => id === -1 ? <Tag>新</Tag> : id} />
            <Table.Column title="产品名称" dataIndex="name" key="name"
              render={(v: string, r: ProductLine) => isEditing(r.id)
                ? <Form.Item name="name" style={{ margin: 0 }} rules={[{ required: true }]}><Input size="small" style={{ width: 150 }} /></Form.Item>
                : <Tag color="blue">{v}</Tag>} />
            <Table.Column title="状态" dataIndex="isActive" key="isActive" width={80}
              render={(v: boolean, r: ProductLine) => isEditing(r.id)
                ? <Form.Item name="isActive" style={{ margin: 0 }} valuePropName="checked" />
                : <Tag color={v ? 'green' : 'default'}>{v ? '启用' : '停用'}</Tag>} />
            <Table.Column title="操作" key="action" width={160}
              render={(_: unknown, r: ProductLine) => isEditing(r.id)
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
