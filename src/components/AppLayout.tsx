import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Tag, Typography, Button, Space } from 'antd';
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
  SwapOutlined,
} from '@ant-design/icons';
import { useProduct } from '../store/ProductContext';
import type { ProductRole } from '../types';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const ROLE_LABELS: Record<ProductRole, string> = { read: '只读', entry: '数据录入', config: '配置管理' };
const ROLE_COLORS: Record<ProductRole, string> = { read: 'green', entry: 'blue', config: 'orange' };

const ALL_MENU_ITEMS = [
  { key: 'data-stats', icon: <EditOutlined />, label: '数据统计', roles: ['entry', 'config'] as ProductRole[], children: [
    { key: '/app/data-stats/production', icon: <FormOutlined />, label: '制程投产录入' },
    { key: '/app/data-stats/station-detail', icon: <UnorderedListOutlined />, label: '工站明细录入' },
    { key: '/app/data-stats/inspection', icon: <FileSearchOutlined />, label: '多缺陷外检录入' },
  ]},
  { key: 'dashboard', icon: <DashboardOutlined />, label: '仪表盘', roles: ['read', 'entry', 'config'] as ProductRole[], children: [
    { key: '/app/dashboard/station-fpy', icon: <BarChartOutlined />, label: '工站FPY列表' },
    { key: '/app/dashboard/section-fpy', icon: <LineChartOutlined />, label: '工段FPY列表' },
    { key: '/app/dashboard/top', icon: <TrophyOutlined />, label: 'TOP缺陷排名' },
    { key: '/app/dashboard/station-trend', icon: <StockOutlined />, label: '工站趋势图' },
    { key: '/app/dashboard/section-trend', icon: <FundOutlined />, label: '工段趋势图' },
    { key: '/app/dashboard/defect-trend', icon: <DotChartOutlined />, label: '缺陷趋势图' },
  ]},
  { key: 'data-config', icon: <SettingOutlined />, label: '数据配置', roles: ['config'] as ProductRole[], children: [
    { key: '/app/data-config/products', icon: <AppstoreOutlined />, label: '品号管理' },
    { key: '/app/data-config/stations', icon: <NodeIndexOutlined />, label: '工站层级' },
    { key: '/app/data-config/defects', icon: <BugOutlined />, label: '缺陷代码库' },
    { key: '/app/data-config/defect-fields', icon: <ToolOutlined />, label: '缺陷字段维护' },
    { key: '/app/data-config/station-fields', icon: <ToolOutlined />, label: '工站字段维护' },
  ]},
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentProduct, currentRole, logoutProduct } = useProduct();
  const [collapsed, setCollapsed] = useState(false);

  // Protect: redirect to login if not authenticated
  useEffect(() => {
    if (!currentRole) { navigate('/', { replace: true }); }
  }, [currentRole, navigate]);

  const menuItems = ALL_MENU_ITEMS.filter(m => m.roles.includes(currentRole!)).map(m => ({
    ...m, children: m.children,
  }));

  const openKeys = [(location.pathname.split('/')[2] || 'dashboard')];
  const selectedKeys = [location.pathname];

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
        <Space>
          <span style={{ color: '#999', fontSize: 14 }}>{currentProduct?.name}</span>
          {currentRole && <Tag color={ROLE_COLORS[currentRole]}>{ROLE_LABELS[currentRole]}</Tag>}
          <Button type="text" size="small" icon={<SwapOutlined />}
            onClick={() => { logoutProduct(); navigate('/'); }}>切换</Button>
        </Space>
      </Header>

      <Layout style={{ height: 'calc(100vh - 56px)' }}>
        <Sider collapsed={collapsed} width={220} collapsedWidth={60} trigger={null}
          style={{ background: '#fff', overflow: 'auto', height: '100%', position: 'sticky', top: 0 }}>
          <div onClick={() => setCollapsed(!collapsed)}
            style={{ padding: '8px 16px', cursor: 'pointer', fontSize: 18, color: '#666',
              borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>
            {collapsed ? '»' : '«'}
          </div>
          <Menu mode="inline" selectedKeys={selectedKeys} defaultOpenKeys={openKeys}
            items={menuItems} onClick={({ key }) => navigate(key)}
            style={{ borderRight: 0, marginTop: 4 }} />
        </Sider>
        <Content style={{ padding: 24, background: '#f5f5f5', overflow: 'auto', height: '100%' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
