import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Select, Tag, Typography, Button, Modal, Form, Input, message, Space } from 'antd';
import {
  DashboardOutlined,
  EditOutlined,
  SettingOutlined,
  BarChartOutlined,
  LineChartOutlined,
  TrophyOutlined,
  StockOutlined,
  DotChartOutlined,
  FundOutlined,
  FormOutlined,
  FileSearchOutlined,
  AppstoreOutlined,
  NodeIndexOutlined,
  BugOutlined,
  ToolOutlined,
  UnorderedListOutlined,
  LockOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useProduct } from '../store/ProductContext';
import type { ProductRole } from '../types';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const ROLE_LABELS: Record<ProductRole, string> = { read: '只读', entry: '数据录入', config: '配置管理' };
const ROLE_COLORS: Record<ProductRole, string> = { read: 'green', entry: 'blue', config: 'orange' };

const ALL_MENU_ITEMS = [
  { key: 'data-stats', icon: <EditOutlined />, label: '数据统计', roles: ['entry', 'config'] as ProductRole[], children: [
    { key: '/data-stats/production', icon: <FormOutlined />, label: '制程投产录入' },
    { key: '/data-stats/station-detail', icon: <UnorderedListOutlined />, label: '工站明细录入' },
    { key: '/data-stats/inspection', icon: <FileSearchOutlined />, label: '多缺陷外检录入' },
  ]},
  { key: 'dashboard', icon: <DashboardOutlined />, label: '仪表盘', roles: ['read', 'entry', 'config'] as ProductRole[], children: [
    { key: '/dashboard/station-fpy', icon: <BarChartOutlined />, label: '工站FPY列表' },
    { key: '/dashboard/section-fpy', icon: <LineChartOutlined />, label: '工段FPY列表' },
    { key: '/dashboard/top', icon: <TrophyOutlined />, label: 'TOP缺陷排名' },
    { key: '/dashboard/station-trend', icon: <StockOutlined />, label: '工站趋势图' },
    { key: '/dashboard/section-trend', icon: <FundOutlined />, label: '工段趋势图' },
    { key: '/dashboard/defect-trend', icon: <DotChartOutlined />, label: '缺陷趋势图' },
  ]},
  { key: 'data-config', icon: <SettingOutlined />, label: '数据配置', roles: ['config'] as ProductRole[], children: [
    { key: '/data-config/products', icon: <AppstoreOutlined />, label: '品号管理' },
    { key: '/data-config/stations', icon: <NodeIndexOutlined />, label: '工站层级' },
    { key: '/data-config/defects', icon: <BugOutlined />, label: '缺陷代码库' },
    { key: '/data-config/defect-fields', icon: <ToolOutlined />, label: '缺陷字段维护' },
    { key: '/data-config/station-fields', icon: <ToolOutlined />, label: '工站字段维护' },
  ]},
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentProduct, products, currentRole, setCurrentProduct, loginProduct, logoutProduct, refresh } = useProduct();
  const [collapsed, setCollapsed] = useState(false);
  // Admin login
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [adminLoginForm] = Form.useForm();
  // Product login
  const [productLoginOpen, setProductLoginOpen] = useState(false);
  const [productLoginForm] = Form.useForm();
  const [pendingProductId, setPendingProductId] = useState<number | null>(null);

  useEffect(() => { refresh(); }, [location.pathname, refresh]);

  // Redirect to first allowed page when role changes
  useEffect(() => {
    if (currentRole && location.pathname === '/') {
      const firstMenu = ALL_MENU_ITEMS.find(m => m.roles.includes(currentRole));
      if (firstMenu?.children?.[0]) navigate(firstMenu.children[0].key);
    }
  }, [currentRole, navigate, location.pathname]);

  // Build menu from role
  const menuItems = ALL_MENU_ITEMS.filter(m => m.roles.includes(currentRole!)).map(m => ({
    ...m,
    children: m.children,
  }));

  const openKeys = [location.pathname.split('/')[1] || ''];
  const selectedKeys = [location.pathname];

  // Admin login
  const handleAdminLogin = async () => {
    const row = await adminLoginForm.validateFields();
    try {
      const { authApi } = await import('../api');
      const result = await authApi.adminLogin(row.username, row.password);
      const { setAdminToken } = await import('../api/client');
      setAdminToken(result.token);
      message.success('登录成功');
      setAdminLoginOpen(false);
      adminLoginForm.resetFields();
      sessionStorage.setItem('admin-role', result.role);
      navigate('/admin/product-lines');
    } catch (e: any) {
      message.error(e.message || '账号或密码错误');
    }
  };

  // Product login
  const handleProductSwitch = (productId: number) => {
    const p = products.find(x => x.id === productId);
    if (!p) return;
    import('../api/client').then(({ getProductAuths }) => {
      const auths = getProductAuths();
      const existing = auths.find((a: any) => a.productId === productId);
      if (existing) {
        loginProduct(productId, existing.role, existing.productName || p.name);
        return;
      }
      setPendingProductId(productId);
      productLoginForm.resetFields();
      setProductLoginOpen(true);
    });
  };

  const handleProductLogin = async () => {
    const row = await productLoginForm.validateFields();
    const { authApi } = await import('../api');
    const { setProductToken } = await import('../api/client');
    try {
      const result = await authApi.productLogin(pendingProductId!, row.password);
      setProductToken(result.token);
      loginProduct(result.product.id, result.role as ProductRole, result.product.name);
      setProductLoginOpen(false);
      productLoginForm.resetFields();
      message.success(`已进入「${result.product.name}」— ${ROLE_LABELS[result.role as ProductRole]}`);
    } catch (e: any) {
      message.error(e.message || '密码错误');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{
        background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0',
        height: 56, lineHeight: '56px', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Title level={4} style={{ margin: 0, whiteSpace: 'nowrap' }}>生产数据统计系统</Title>
          <Tag color="blue">制程版</Tag>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#666', fontSize: 14 }}>当前产品:</span>
          <Select value={currentProduct?.id} style={{ width: 200 }}
            onChange={(id) => handleProductSwitch(id!)}
            options={products.filter(p => p.isActive).map(p => ({ value: p.id, label: p.name }))} />
          {currentRole && (
            <Tag color={ROLE_COLORS[currentRole]}>{ROLE_LABELS[currentRole]}</Tag>
          )}
          {currentRole && (
            <Button type="text" size="small" icon={<LogoutOutlined />} onClick={logoutProduct} />
          )}
          <Button type="text" icon={<LockOutlined />} style={{ marginLeft: 8 }}
            onClick={() => setAdminLoginOpen(true)}>后台管理</Button>
        </div>
      </Header>

      <Layout style={{ height: 'calc(100vh - 56px)' }}>
        <Sider collapsed={collapsed} width={220} collapsedWidth={60} trigger={null}
          style={{ background: '#fff', overflow: 'auto', height: '100%', position: 'sticky', top: 0 }}>
          <div onClick={() => setCollapsed(!collapsed)}
            style={{ padding: '8px 16px', cursor: 'pointer', fontSize: 18, color: '#666',
              borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>
            {collapsed ? '»' : '«'}
          </div>
          {currentRole ? (
            <Menu mode="inline" selectedKeys={selectedKeys} defaultOpenKeys={openKeys}
              items={menuItems} onClick={({ key }) => navigate(key)}
              style={{ borderRight: 0, marginTop: 4 }} />
          ) : (
            <div style={{ padding: 24, color: '#999', textAlign: 'center', fontSize: 13 }}>
              请选择产品并登录
            </div>
          )}
        </Sider>
        <Content style={{ padding: 24, background: '#f5f5f5', overflow: 'auto', height: '100%' }}>
          <Outlet />
        </Content>
      </Layout>

      {/* Admin login modal */}
      <Modal title="后台管理登录" open={adminLoginOpen}
        onCancel={() => { setAdminLoginOpen(false); adminLoginForm.resetFields(); }}
        onOk={handleAdminLogin} okText="登录" width={360} destroyOnClose>
        <Form form={adminLoginForm} layout="vertical" style={{ marginTop: 16 }} autoComplete="off">
          <Form.Item name="username" label="账号" rules={[{ required: true }]}>
            <Input prefix={<LockOutlined />} placeholder="请输入账号" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Product login modal */}
      <Modal title="产品访问验证" open={productLoginOpen}
        onCancel={() => { setProductLoginOpen(false); productLoginForm.resetFields(); }}
        onOk={handleProductLogin} okText="进入" width={360} destroyOnClose>
        <div style={{ marginBottom: 16, color: '#666' }}>
          产品：<Tag color="blue">{products.find(p => p.id === pendingProductId)?.name}</Tag>
        </div>
        <Form form={productLoginForm} layout="vertical" autoComplete="off">
          <Form.Item name="password" label="访问密码" rules={[{ required: true, message: '请输入产品访问密码' }]}>
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
        </Form>
        <div style={{ color: '#999', fontSize: 12 }}>
          输入不同密码进入不同角色（只读/数据录入/配置管理）
        </div>
      </Modal>
    </Layout>
  );
}
