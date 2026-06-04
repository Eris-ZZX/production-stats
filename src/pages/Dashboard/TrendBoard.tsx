import { useMemo } from 'react';
import { Card, Typography } from 'antd';
import ReactECharts from 'echarts-for-react';
import { useProduct } from '../../store/ProductContext';
import { getMockTrendData } from '../../mockData';

const { Title } = Typography;

export default function TrendBoard() {
  const { currentProduct } = useProduct();
  const data = useMemo(() => getMockTrendData(currentProduct?.id || 1), [currentProduct]);

  const chartOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['良率', '不良率'] },
    grid: { left: 60, right: 60, top: 30, bottom: 40 },
    xAxis: { type: 'category', data: data.map(d => d.date) },
    yAxis: [
      { type: 'value', name: '良率(%)', min: 90, max: 100 },
      { type: 'value', name: '不良率(%)' },
    ],
    series: [
      { name: '良率', type: 'line', data: data.map(d => d.yieldRate), smooth: true, itemStyle: { color: '#52c41a' }, areaStyle: { opacity: 0.1 }, label: { show: true, formatter: '{c}%' } },
      { name: '不良率', type: 'line', yAxisIndex: 1, data: data.map(d => d.defectRate), smooth: true, itemStyle: { color: '#ff4d4f' }, label: { show: true, formatter: '{c}%' } },
    ],
  };

  return (
    <div>
      <Title level={4}>{currentProduct?.code} — 趋势图</Title>
      <Card>
        <ReactECharts option={chartOption} style={{ height: 400 }} />
      </Card>
    </div>
  );
}
