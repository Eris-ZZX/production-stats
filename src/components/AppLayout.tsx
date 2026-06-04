import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Select, Tag, Typography } from 'antd';
import {
  DashboardOutlined,
  EditOutlined,
  SettingOutlined,
  BarChartOutlined,
  LineChartOutlined,
  TrophyOutlined,
  PieChartOutlined,
  FormOutlined,
  FileSearchOutlined,
  AppstoreOutlined,
  NodeIndexOutlined,
  BugOutlined,
  ToolOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { useProduct } from '../store/ProductContext';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const menuItems = [
  {
    key: 'data-stats',
    icon: <EditOutlined />,
    label: '数据统计',
    children: [
      { key: '/data-stats/production', icon: <FormOutlined />, label: '制程投产录入' },
      { key: '/data-stats/station-detail', icon: <UnorderedListOutlined />, label: '工站明细录入' },
      { key: '/data-stats/inspection', icon: <FileSearchOutlined />, label: '多缺陷外检录入' },
    ],
  },
  {
    key: 'dashboard',
    icon: <DashboardOutlined />,
    label: '仪表盘',
    children: [
      { key: '/dashboard/station-fpy', icon: <BarChartOutlined />, label: '工站FPY列表' },
      { key: '/dashboard/section-fpy', icon: <LineChartOutlined />, label: '工段FPY列表' },
      { key: '/dashboard/top', icon: <TrophyOutlined />, label: 'TOP缺陷排名' },
      { key: '/dashboard/trend', icon: <PieChartOutlined />, label: '趋势图' },
    ],
  },
  {
    key: 'data-config',
    icon: <SettingOutlined />,
    label: '数据配置',
    children: [
      { key: '/data-config/products', icon: <AppstoreOutlined />, label: '品号管理' },
      { key: '/data-config/stations', icon: <NodeIndexOutlined />, label: '工站层级' },
      { key: '/data-config/defects', icon: <BugOutlined />, label: '缺陷代码库' },
      { key: '/data-config/defect-fields', icon: <ToolOutlined />, label: '缺陷字段维护' },
      { key: '/data-config/station-fields', icon: <ToolOutlined />, label: '工站字段维护' },
    ],
  },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentProduct, products, setCurrentProduct } = useProduct();
  const [collapsed, setCollapsed] = useState(false);

  const openKeys = [location.pathname.split('/')[1] || 'data-stats'];
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
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Title level={4} style={{ margin: 0, whiteSpace: 'nowrap' }}>
            生产数据统计系统
          </Title>
          <Tag color="blue">制程版</Tag>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#666', fontSize: 14 }}>当前产品:</span>
          <Select
            value={currentProduct?.id}
            onChange={(id) => {
              const p = products.find(x => x.id === id);
              if (p) setCurrentProduct(p);
            }}
            style={{ width: 200 }}
            options={products.map(p => ({
              value: p.id,
              label: (
                <span>
                  {p.code}
                  {p.status === 'inactive' && <Tag color="default" style={{ marginLeft: 8, fontSize: 10 }}>停用</Tag>}
                </span>
              ),
            }))}
          />
        </div>
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
          {/* 折叠按钮 — 上方 */}
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
            items={menuItems}
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
