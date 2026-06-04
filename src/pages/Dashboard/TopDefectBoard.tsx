import { useState, useMemo } from 'react';
import { Card, Table, DatePicker, Select, Typography, Tag, Space } from 'antd';
import { getSectionTopDefects, mockProducts } from '../../mockData';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const activeProductIds = mockProducts.filter(p => p.status === 'active').map(p => p.id);

const SECTIONS = ['组装', '测试', '包装'];

const TYPES = [
  { key: '外观', label: '外观', color: 'blue' },
  { key: '功能', label: '功能', color: 'cyan' },
  { key: '气密性', label: '气密性', color: 'geekblue' },
];

export default function TopDefectBoard() {
  const [dates, setDates] = useState<[string, string] | null>(['2026-06-01', '2026-06-03']);
  const [productIds, setProductIds] = useState<number[]>(activeProductIds);
  const [activeTabs, setActiveTabs] = useState<Record<string, string>>({ '外观': '组装', '功能': '组装', '气密性': '组装' });

  const columns = [
    { title: '#', key: 'rank', width: 40, render: (_: unknown, __: unknown, i: number) => <Tag color={i < 3 ? 'red' : 'default'}>{i + 1}</Tag> },
    { title: '缺陷', dataIndex: 'defectName', key: 'name', ellipsis: true },
    { title: '组件', dataIndex: 'component', key: 'comp', width: 70, render: (v: string) => <Tag>{v}</Tag> },
    { title: '位置', dataIndex: 'location', key: 'loc', width: 60, render: (v: string) => <Tag color="geekblue">{v}</Tag> },
    { title: '数量', dataIndex: 'count', key: 'cnt', width: 60 },
    { title: '占比', dataIndex: 'rate', key: 'rate', width: 55, render: (v: number) => `${v}%` },
  ];

  return (
    <div>
      <Title level={4}>TOP 缺陷排名</Title>
      <Card style={{ marginBottom: 12 }} bodyStyle={{ padding: '12px 16px' }}>
        <Space wrap>
          <span>品号:</span>
          <Select mode="multiple" size="small" style={{ minWidth: 200 }} value={productIds}
            onChange={setProductIds} placeholder="选择品号（默认全选）"
            options={mockProducts.filter(p => p.status === 'active').map(p => ({ value: p.id, label: p.code }))}
            maxTagCount={4} />
          <span>时间区间:</span>
          <RangePicker size="small"
            value={dates?.[0] && dates?.[1] ? [dayjs(dates[0]), dayjs(dates[1])] : undefined}
            onChange={(_d, ds) => setDates(ds?.[0] && ds?.[1] ? [ds[0], ds[1]] : null)} />
        </Space>
      </Card>
      {TYPES.map(t => (
        <Card key={t.key} style={{ marginBottom: 12 }}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <Tag color={t.color} style={{ fontSize: 14 }}>{t.key}</Tag>
              <div style={{ width: 1, height: 20, background: '#d9d9d9', margin: '0 8px' }} />
              <div style={{ display: 'flex', marginLeft: 0 }}>
                {SECTIONS.map(s => (
                  <Tag key={s}
                    color={activeTabs[t.key] === s ? 'blue' : 'default'}
                    style={{ cursor: 'pointer', opacity: activeTabs[t.key] === s ? 1 : 0.6 }}
                    onClick={() => setActiveTabs(prev => ({ ...prev, [t.key]: s }))}
                  >{s}</Tag>
                ))}
              </div>
            </div>
          }>
          {(() => {
            const data = productIds.length === 0 ? [] : getSectionTopDefects(activeTabs[t.key], productIds, dates?.[0], dates?.[1], 10);
            return (
              <Table dataSource={data.map((d, i) => ({ ...d, key: i }))} columns={columns}
                pagination={false} size="small" />
            );
          })()}
        </Card>
      ))}
    </div>
  );
}
