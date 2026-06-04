import { useState, useMemo } from 'react';
import { Card, DatePicker, Select, Typography, Space, Radio } from 'antd';
import ReactECharts from 'echarts-for-react';
import { getSectionTrendData, mockProducts } from '../../mockData';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
dayjs.extend(isoWeek);

const { Title } = Typography;
const { RangePicker } = DatePicker;

const activeProductIds = mockProducts.filter(p => p.status === 'active').map(p => p.id);
const today = dayjs().format('YYYY-MM-DD');
const twoWeeksAgo = dayjs().subtract(13, 'day').format('YYYY-MM-DD');

const TYPE_OPTIONS = [
  { value: undefined, label: '综合' },
  { value: '外观', label: '外观' },
  { value: '功能', label: '功能' },
  { value: '气密性', label: '气密性' },
];

const GRANULARITY = [
  { value: 'day', label: '日' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
];

const SECTION_COLORS: Record<string, string> = { '组装': '#1890ff', '测试': '#52c41a', '包装': '#fa8c16' };
const SECTION_COLORS_LIST = ['#1890ff', '#52c41a', '#fa8c16', '#722ed1', '#eb2f96', '#13c2c2'];

function aggregateSections(
  dates: string[],
  sections: { sectionName: string; data: (number | null)[] }[],
  granularity: string,
) {
  if (granularity === 'day') return { dates, sections };

  const buckets = new Map<string, { idx: number; sectionVals: Map<string, { sum: number; count: number }> }>();
  dates.forEach((date, i) => {
    let key: string;
    if (granularity === 'week') {
      key = `${dayjs(date).isoWeek()}周`;
    } else {
      key = dayjs(date).format('YYYY-MM');
    }
    let b = buckets.get(key);
    if (!b) { b = { idx: i, sectionVals: new Map() }; buckets.set(key, b); }
    sections.forEach(sec => {
      const v = sec.data[i];
      if (v !== null) {
        let sv = b!.sectionVals.get(sec.sectionName);
        if (!sv) { sv = { sum: 0, count: 0 }; b!.sectionVals.set(sec.sectionName, sv); }
        sv.sum += v;
        sv.count++;
      }
    });
  });

  const sortedKeys = [...buckets.keys()].sort((a, b) => {
    const da = a.includes('周') ? dayjs().isoWeek(Number(a.replace('周', ''))) : dayjs(a);
    const db = b.includes('周') ? dayjs().isoWeek(Number(b.replace('周', ''))) : dayjs(b);
    return da.valueOf() - db.valueOf();
  });
  const newDates = sortedKeys;
  const newSections = sections.map(sec => ({
    ...sec,
    data: newDates.map(key => {
      const sv = buckets.get(key)?.sectionVals.get(sec.sectionName);
      return sv && sv.count > 0 ? Number((sv.sum / sv.count).toFixed(1)) : null;
    }),
  }));

  return { dates: newDates, sections: newSections };
}

export default function SectionTrend() {
  const [dates, setDates] = useState<[string, string] | null>([twoWeeksAgo, today]);
  const [productIds, setProductIds] = useState<number[]>(activeProductIds);
  const [defectType, setDefectType] = useState<string | undefined>(undefined);
  const [granularity, setGranularity] = useState<string>('day');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);

  const rawData = useMemo(() => {
    if (productIds.length === 0) return { dates: [], sections: [] };
    const startDate = granularity !== 'day' ? dayjs(dates?.[0]).subtract(6, 'day').format('YYYY-MM-DD') : dates?.[0];
    return getSectionTrendData(productIds, startDate, dates?.[1], defectType);
  }, [productIds, dates, defectType, granularity]);

  const data = useMemo(() => aggregateSections(rawData.dates, rawData.sections, granularity),
    [rawData, granularity]);

  const filteredSections = useMemo(() => {
    if (selectedSections.length === 0) return data.sections;
    return data.sections.filter(s => selectedSections.includes(s.sectionName));
  }, [data.sections, selectedSections]);

  const chartOption = useMemo(() => {
    if (data.dates.length === 0 || filteredSections.length === 0) return {};
    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          if (!params || params.length === 0) return '';
          let html = `<b>${params[0].axisValue}</b><br/>`;
          params.forEach((p: any) => {
            if (p.value !== null) html += `${p.marker} ${p.seriesName}: ${p.value}%<br/>`;
          });
          return html;
        },
      },
      legend: { bottom: 0, data: filteredSections.map(s => s.sectionName) },
      grid: { left: 60, right: 30, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: data.dates, boundaryGap: false },
      yAxis: { type: 'value', name: 'FPY(%)', min: (val: { min: number }) => Math.floor(Math.min(val.min, 90) / 5) * 5, max: 100 },
      series: filteredSections.map((s, idx) => ({
        name: s.sectionName,
        type: 'line',
        data: s.data,
        smooth: true,
        connectNulls: false,
        symbolSize: 8,
        lineStyle: { width: 3 },
        itemStyle: { color: SECTION_COLORS[s.sectionName] || SECTION_COLORS_LIST[idx % SECTION_COLORS_LIST.length] },
        label: { show: true, formatter: (p: any) => p.value !== null ? `${p.value}%` : '', fontSize: 10 },
      })),
    };
  }, [data, filteredSections]);

  return (
    <div>
      <Title level={4}>工段趋势图</Title>
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
          <span>粒度:</span>
          <Radio.Group size="small" value={granularity} onChange={e => setGranularity(e.target.value)}>
            {GRANULARITY.map(g => <Radio.Button key={g.value} value={g.value}>{g.label}</Radio.Button>)}
          </Radio.Group>
          <span>维度:</span>
          <Radio.Group size="small" value={defectType} onChange={e => setDefectType(e.target.value)}>
            {TYPE_OPTIONS.map(o => <Radio.Button key={String(o.value)} value={o.value}>{o.label}</Radio.Button>)}
          </Radio.Group>
          <span>工段:</span>
          <Select mode="multiple" size="small" style={{ minWidth: 200 }} value={selectedSections}
            onChange={setSelectedSections} placeholder="全选" maxTagCount={3}
            options={data.sections.map(s => ({ value: s.sectionName, label: s.sectionName }))} />
        </Space>
      </Card>
      <Card>
        <ReactECharts option={chartOption} style={{ height: 450 }} notMerge />
      </Card>
    </div>
  );
}
