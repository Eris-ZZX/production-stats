import { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Input, Typography, Tag, message, Popconfirm, Space } from 'antd';
import { PlusOutlined, CheckOutlined, CloseOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useProduct } from '../../store/ProductContext';
import { productLinesApi } from '../../api';

const { Title } = Typography;

export default function ProductList() {
  const { currentProduct, refresh } = useProduct();
  const [skusList, setSkusList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingKey, setEditingKey] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [editForm] = Form.useForm();

  const loadData = async () => {
    if (!currentProduct) return;
    setLoading(true);
    try {
      const allSkus = await productLinesApi.listSkus();
      // 只显示当前产品的品号
      setSkusList(allSkus.filter((s: any) => s.productLineId === currentProduct.id));
    } catch (e: any) {
      message.error(e?.message || '加载失败');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [currentProduct]);

  const isEditing = (id: number) => id === editingKey || (adding && id === -1);

  const saveEdit = async (id: number) => {
    const row = await editForm.validateFields();
    try {
      await productLinesApi.updateSku(id, row);
      cancel();
      message.success('已保存');
      loadData(); refresh();
    } catch (e: any) { message.error(e?.message || '保存失败'); }
  };

  const saveNew = async () => {
    const row = await editForm.validateFields();
    try {
      await productLinesApi.createSku({ productLineId: currentProduct!.id, code: row.code });
      cancel();
      message.success('已新增');
      loadData(); refresh();
    } catch (e: any) { message.error(e?.message || '新增失败'); }
  };

  const cancel = () => { setEditingKey(null); setAdding(false); editForm.resetFields(); };

  const del = async (id: number) => {
    try {
      await productLinesApi.removeSku(id);
      message.success('已删除');
      loadData(); refresh();
    } catch (e: any) { message.error(e?.message || '删除失败'); }
  };

  const columns = [
    { title: '#', key: 'idx', width: 50, render: (_: unknown, __: unknown, i: number) => i + 1 },
    { title: '品号编码', dataIndex: 'code', key: 'code',
      render: (v: string, r: any) => isEditing(r.id)
        ? <Form.Item name="code" style={{ margin: 0 }} rules={[{ required: true }]}><Input size="small" style={{ width: 150 }} /></Form.Item>
        : v },
    { title: '状态', dataIndex: 'isActive', key: 'st', width: 80,
      render: (v: boolean, r: any) => isEditing(r.id)
        ? <Form.Item name="isActive" style={{ margin: 0 }} valuePropName="checked" />
        : <Tag color={v ? 'green' : 'default'}>{v ? '启用' : '停用'}</Tag> },
    { title: '操作', key: 'action', width: 160,
      render: (_: unknown, r: any) => isEditing(r.id)
        ? <Space size={4}>
            <Button type="link" size="small" icon={<CheckOutlined />} onClick={() => r.id === -1 ? saveNew() : saveEdit(r.id)}>保存</Button>
            <Button type="link" size="small" icon={<CloseOutlined />} onClick={cancel}>取消</Button>
          </Space>
        : <Space size={4}>
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setEditingKey(r.id); editForm.setFieldsValue(r); }}>编辑</Button>
            <Popconfirm title="确定删除?" onConfirm={() => del(r.id)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space> },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>{currentProduct?.name || ''} — 品号管理</Title>
        <Button type="primary" icon={<PlusOutlined />} disabled={adding}
          onClick={() => { setAdding(true); editForm.resetFields(); }}>
          新增品号</Button>
      </div>
      <Card>
        <Form form={editForm} component={false}>
          <Table
scroll={{ x: 'max-content' }}             dataSource={[...(adding ? [{ id: -1, key: -1 }] : []), ...skusList.map((s: any) => ({ ...s, key: s.id }))]}
            columns={columns} pagination={false} size="small" loading={loading} />
        </Form>
      </Card>
    </div>
  );
}
