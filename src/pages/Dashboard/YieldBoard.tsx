import { useMemo } from 'react';
import { Card, Table, Typography, Tag } from 'antd';
import ReactECharts from 'echarts-for-react';
import { useProduct } from '../../store/ProductContext';
import { getMockYieldData } from '../../mockData';

const { Title } = Typography;

export default function YieldBoard() {
  const { currentProduct } = useProduct();
  const data = useMemo(() => getMockYieldData(currentProduct?.id || 1), [currentProduct]);

  const chartOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['投产数', '不良数', '良率'] },
    grid: { left: 60, right: 60, top: 40, bottom: 40 },
    xAxis: { type: 'category', data: data.map(d => d.stationName), axisLabel: { rotate: 30 } },
    yAxis: [
      { type: 'value', name: '数量' },
      { type: 'value', name: '良率(%)', min: 90, max: 100 },
    ],
    series: [
      { name: '投产数', type: 'bar', data: data.map(d => d.outputQty), itemStyle: { color: '#1677ff' } },
      { name: '不良数', type: 'bar', data: data.map(d => d.defectQty), itemStyle: { color: '#ff4d4f' } },
      { name: '良率', type: 'line', yAxisIndex: 1, data: data.map(d => d.yieldRate), itemStyle: { color: '#52c41a' }, label: { show: true, formatter: '{c}%' } },
    ],
  };

  const columns = [
    { title: '工站', dataIndex: 'stationName', key: 'stationName' },
    { title: '投产数', dataIndex: 'outputQty', key: 'outputQty' },
    { title: '不良数', dataIndex: 'defectQty', key: 'defectQty' },
    { title: '良率', dataIndex: 'yieldRate', key: 'yieldRate', render: (v: number) => (
      <Tag color={v >= 97 ? 'green' : v >= 94 ? 'orange' : 'red'}>{v}%</Tag>
    ) },
  ];

  return (
    <div>
      <Title level={4}>{currentProduct?.code} — 良率看板</Title>
      <Card style={{ marginBottom: 16 }}>
        <ReactECharts option={chartOption} style={{ height: 350 }} />
      </Card>
      <Card title="工站良率明细">
        <Table dataSource={data.map((d,i) => ({...d, key: i}))} columns={columns} pagination={false} size="small" />
      </Card>
    </div>
  );
}
