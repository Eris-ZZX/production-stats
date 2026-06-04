import { useMemo } from 'react';
import { Card, Table, Typography, Tag } from 'antd';
import ReactECharts from 'echarts-for-react';
import { useProduct } from '../../store/ProductContext';
import { getMockFpyData } from '../../mockData';

const { Title } = Typography;

export default function FpyBoard() {
  const { currentProduct } = useProduct();
  const data = useMemo(() => getMockFpyData(currentProduct?.id || 1), [currentProduct]);

  const chartOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['FPY实际', 'FPY目标'] },
    grid: { left: 60, right: 30, top: 30, bottom: 40 },
    xAxis: { type: 'category', data: data.map(d => d.majorSection) },
    yAxis: { type: 'value', name: '%', min: 90, max: 100 },
    series: [
      { name: 'FPY实际', type: 'bar', data: data.map(d => d.overallFpy), itemStyle: { color: '#1677ff' }, label: { show: true, formatter: '{c}%' } },
      { name: 'FPY目标', type: 'bar', data: data.map(d => d.targetFpy), itemStyle: { color: '#faad14' }, label: { show: true, formatter: '{c}%' } },
    ],
  };

  const columns = [
    { title: '大工段', dataIndex: 'majorSection', key: 'majorSection' },
    { title: '综合FPY', dataIndex: 'overallFpy', key: 'overallFpy', render: (v: number) => <Tag color={v >= 97 ? 'green' : 'orange'}>{v.toFixed(1)}%</Tag> },
    { title: '目标值', dataIndex: 'targetFpy', key: 'targetFpy', render: (v: number) => <Tag color="blue">{v}%</Tag> },
    { title: '差距', key: 'gap', render: (_: unknown, r: { overallFpy: number; targetFpy: number }) => {
      const gap = r.overallFpy - r.targetFpy;
      return <Tag color={gap >= 0 ? 'green' : 'red'}>{gap >= 0 ? '+' : ''}{gap.toFixed(1)}%</Tag>;
    }},
  ];

  return (
    <div>
      <Title level={4}>{currentProduct?.code} — 直通率看板</Title>
      <Card style={{ marginBottom: 16 }}>
        <ReactECharts option={chartOption} style={{ height: 300 }} />
      </Card>
      <Card title="分段直通率">
        <Table dataSource={data.map((d,i) => ({...d, key: i}))} columns={columns} pagination={false} size="small" />
      </Card>
    </div>
  );
}
