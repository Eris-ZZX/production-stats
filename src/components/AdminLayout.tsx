import { useState, useEffect, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography, Button, message, Tag } from 'antd';
import { ControlOutlined, ArrowLeftOutlined, AppstoreOutlined, ToolOutlined, BugOutlined, UserOutlined } from '@ant-design/icons';
import type { AdminRole } from '../types';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const ROLE_LABELS: Record<AdminRole, string> = { super: '超级管理', config: '配置管理', viewer: '只读查看' };
const ROLE_COLORS: Record<AdminRole, string> = { super: 'red', config: 'blue', viewer: 'green' };

const ALL_MENU_ITEMS = [
  { key: '/admin/product-lines', icon: <AppstoreOutlined />, label: '产品管理', roles: ['super'] as AdminRole[] },
  { key: '/admin/accounts', icon: <UserOutlined />, label: '账号管理', roles: ['super'] as AdminRole[] },
  { key: '/admin/station-fields', icon: <ToolOutlined />, label: '工站字段', roles: ['super', 'config', 'viewer'] as AdminRole[] },
  { key: '/admin/defect-fields', icon: <BugOutlined />, label: '缺陷字段', roles: ['super', 'config', 'viewer'] as AdminRole[] },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const role = (sessionStorage.getItem('admin-role') || '') as AdminRole;

  useEffect(() => {
    if (!role) {
      message.warning('请先登录后台管理');
      navigate('/', { replace: true });
    }
  }, [navigate, role]);

  const menuItems = useMemo(() => {
    return ALL_MENU_ITEMS.filter(item => item.roles.includes(role));
  }, [role]);

  const adminMenuItems = [{
    key: 'admin',
    icon: <ControlOutlined />,
    label: '后台管理',
    children: menuItems,
  }];

  const openKeys = ['admin'];
  const selectedKeys = [location.pathname];

  const handleBack = () => {
    sessionStorage.removeItem('admin-role');
    import('../api/client').then(({ clearAdminToken }) => clearAdminToken());
    navigate('/');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{
        background: '#fff',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #f0f0f0',
        height: 56,
        lineHeight: '56px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Title level={4} style={{ margin: 0 }}>后台管理</Title>
          <Tag color={ROLE_COLORS[role]}>{ROLE_LABELS[role]}</Tag>
        </div>
        <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>返回产品数据</Button>
      </Header>

      <Layout style={{ height: 'calc(100vh - 56px)' }}>
        <Sider
          collapsed={collapsed}
          width={220}
          collapsedWidth={60}
          trigger={null}
          style={{
            background: '#fff',
            overflow: 'auto',
            height: '100%',
            position: 'sticky',
            top: 0,
          }}
        >
          <div
            onClick={() => setCollapsed(!collapsed)}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: 18,
              color: '#666',
              borderBottom: '1px solid #f0f0f0',
              textAlign: 'right',
            }}
          >
            {collapsed ? '»' : '«'}
          </div>
          <Menu
            mode="inline"
            selectedKeys={selectedKeys}
            defaultOpenKeys={openKeys}
            items={adminMenuItems}
            onClick={({ key }) => navigate(key)}
            style={{ borderRight: 0, marginTop: 4 }}
          />
        </Sider>

        <Content style={{ padding: 24, background: '#f5f5f5', overflow: 'auto', height: '100%' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
