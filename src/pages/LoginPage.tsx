import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Card, Select, Input, Button, Tag, Space, Divider, message, Modal, Form } from 'antd';
import {
  LockOutlined, UserOutlined, LoginOutlined, SafetyOutlined,
  AppstoreOutlined, EyeOutlined, EditOutlined, SettingOutlined,
} from '@ant-design/icons';
import { useProduct } from '../store/ProductContext';
import { authApi, productLinesApi } from '../api';
import { setAdminToken, setProductToken } from '../api/client';

const { Title, Text } = Typography;

const ROLE_OPTIONS = [
  { value: 'read', label: '只读', icon: <EyeOutlined />, color: 'green', desc: '查看仪表盘' },
  { value: 'entry', label: '数据录入', icon: <EditOutlined />, color: 'blue', desc: '仪表盘+录入' },
  { value: 'config', label: '配置管理', icon: <SettingOutlined />, color: 'orange', desc: '全部功能' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { loginProduct } = useProduct();
  const [products, setProducts] = useState<{ id: number; name: string }[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('read');
  const [productPassword, setProductPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // 后台登录弹窗
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminForm] = Form.useForm();

  useEffect(() => { productLinesApi.list().then(setProducts).catch(() => {}); }, []);

  const handleProductLogin = async () => {
    if (!selectedProduct) { message.warning('请选择产品'); return; }
    if (!productPassword) { message.warning('请输入访问密码'); return; }
    setLoading(true);
    try {
      const result = await authApi.productLogin(selectedProduct, productPassword);
      setProductToken(result.token);
      loginProduct(result.product.id, result.role as any, result.product.name);
      message.success(`已进入「${result.product.name}」`);
      navigate('/app/dashboard/station-fpy');
    } catch (e: any) { message.error(e.message || '密码错误'); }
    finally { setLoading(false); }
  };

  const handleAdminLogin = async () => {
    const row = await adminForm.validateFields();
    setAdminLoading(true);
    try {
      const result = await authApi.adminLogin(row.username, row.password);
      setAdminToken(result.token);
      sessionStorage.setItem('admin-role', result.role);
      message.success('登录成功');
      setAdminModalOpen(false);
      adminForm.resetFields();
      navigate('/admin/product-lines');
    } catch (e: any) { message.error(e.message || '账号或密码错误'); }
    finally { setAdminLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <Title level={1} style={{ color: '#fff', marginBottom: 4, fontSize: 36 }}>生产数据统计系统</Title>
        <Tag color="blue" style={{ fontSize: 14, padding: '2px 12px' }}>制程版</Tag>
      </div>

      <Card
        style={{ maxWidth: 520, width: '100%', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
        title={<Space><AppstoreOutlined style={{ fontSize: 18 }} /><span style={{ fontSize: 16 }}>产品登录</span></Space>}
      >
        <div style={{ marginBottom: 16 }}>
          <Text strong>选择产品</Text>
          <Select style={{ width: '100%', marginTop: 4 }} size="large"
            placeholder="请选择要访问的产品" value={selectedProduct} onChange={setSelectedProduct}
            showSearch filterOption={(input, option) => (option?.label as string || '').includes(input)}
            options={products.filter(p => (p as any).isActive !== false).map(p => ({ value: p.id, label: p.name }))} />
        </div>

        {selectedProduct && (
          <>
            <div style={{ marginBottom: 16 }}>
              <Text strong>角色</Text>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {ROLE_OPTIONS.map(r => (
                  <Card key={r.value} size="small" hoverable onClick={() => setSelectedRole(r.value)}
                    style={{
                      flex: 1, cursor: 'pointer', textAlign: 'center',
                      borderColor: selectedRole === r.value ? '#1890ff' : '#d9d9d9',
                      borderWidth: selectedRole === r.value ? 2 : 1,
                      background: selectedRole === r.value ? '#e6f7ff' : '#fff',
                    }}>
                    <Space direction="vertical" size={2}>
                      <span style={{ fontSize: 20, color: r.color }}>{r.icon}</span>
                      <Text strong style={{ fontSize: 13 }}>{r.label}</Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>{r.desc}</Text>
                    </Space>
                  </Card>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>访问密码</Text>
              <Input.Password size="large" style={{ marginTop: 4 }} prefix={<LockOutlined />}
                placeholder="输入访问密码" value={productPassword}
                onChange={e => setProductPassword(e.target.value)} onPressEnter={handleProductLogin} />
              <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                密码由管理员在产品管理中设置，不同密码对应不同角色
              </Text>
            </div>

            <Button type="primary" size="large" icon={<LoginOutlined />} loading={loading}
              onClick={handleProductLogin} block style={{ height: 44, fontSize: 15 }}>
              进入系统
            </Button>
          </>
        )}

        <Divider style={{ margin: '20px 0 12px' }} />

        <Button type="text" size="large" icon={<SafetyOutlined />} block
          onClick={() => setAdminModalOpen(true)}
          style={{ fontSize: 14, color: '#8c8c8c' }}>
          后台管理
        </Button>
      </Card>

      {/* 后台管理登录弹窗 */}
      <Modal title="后台管理登录" open={adminModalOpen}
        onCancel={() => { setAdminModalOpen(false); adminForm.resetFields(); }}
        onOk={handleAdminLogin} okText="登录" width={360} destroyOnClose
        confirmLoading={adminLoading}>
        <Form form={adminForm} layout="vertical" style={{ marginTop: 16 }} autoComplete="off">
          <Form.Item name="username" label="管理员账号" rules={[{ required: true, message: '请输入账号' }]}>
            <Input prefix={<UserOutlined />} placeholder="请输入账号" size="large" />
          </Form.Item>
          <Form.Item name="password" label="管理员密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" size="large" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
