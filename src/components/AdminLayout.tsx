import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography, Button } from 'antd';
import { ClusterOutlined, ControlOutlined, ArrowLeftOutlined } from '@ant-design/icons';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const adminMenuItems = [
  {
    key: 'admin',
    icon: <ControlOutlined />,
    label: '后台管理',
    children: [
      { key: '/admin/product-admin', icon: <ClusterOutlined />, label: '产品&预置管理' },
    ],
  },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const openKeys = ['admin'];
  const selectedKeys = [location.pathname];

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
        <Title level={4} style={{ margin: 0 }}>后台管理</Title>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>返回产品数据</Button>
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
