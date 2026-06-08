import { useState, useMemo, useEffect } from 'react';
import { Card, DatePicker, Select, Typography, Space, Radio } from 'antd';
import ReactECharts from 'echarts-for-react';
import { dashboardApi, productLinesApi } from '../../api';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
dayjs.extend(isoWeek);

const { Title } = Typography;
const { RangePicker } = DatePicker;

const today = dayjs().format('YYYY-MM-DD');
const twoWeeksAgo = dayjs().subtract(13, 'day').format('YYYY-MM-DD');

const GRANULARITY = [
  { value: 'day', label: '日' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
];

const colors = ['#f5222d', '#fa8c16', '#faad14', '#52c41a', '#1890ff', '#722ed1', '#eb2f96', '#13c2c2', '#2f54eb', '#a0d911',
  '#fa541c', '#9254de', '#36cfc9', '#d48806', '#cf1322'];


function aggregateDefects(
  dates: string[],
  defects: { defectName: string; component: string; count: number[] }[],
  granularity: string,
) {
  if (granularity === 'day') return { dates, defects };

  const bucketMap = new Map<string, number[]>();
  const allKeys: string[] = [];
  dates.forEach((date, i) => {
    let key: string;
    if (granularity === 'week') {
      key = `${dayjs(date).isoWeek()}周`;
    } else {
      key = dayjs(date).format('YYYY-MM');
    }
    if (!bucketMap.has(key)) {
      bucketMap.set(key, new Array(defects.length).fill(0));
      allKeys.push(key);
    }
    defects.forEach((df, di) => {
      bucketMap.get(key)![di] += df.count[i];
    });
  });

  const sortedKeys = allKeys.sort((a, b) => {
    const da = a.includes('周') ? dayjs().isoWeek(Number(a.replace('周', ''))) : dayjs(a);
    const db = b.includes('周') ? dayjs().isoWeek(Number(b.replace('周', ''))) : dayjs(b);
    return da.valueOf() - db.valueOf();
  });

  const newDefects = defects.map((df, di) => ({
    ...df,
    count: sortedKeys.map(k => bucketMap.get(k)?.[di] ?? 0),
  }));

  return { dates: sortedKeys, defects: newDefects };
}

export default function DefectTrend() {
  const [dates, setDates] = useState<[string, string] | null>(() => { const saved = sessionStorage.getItem('dashboard-dates'); if (saved) { try { const p = JSON.parse(saved); if (p?.[0] && p?.[1]) return p; } catch {} } return [twoWeeksAgo, today]; });  const [productIds, setProductIds] = useState<number[]>([]);
  const [skus, setSkus] = useState<any[]>([]);
  const [selectedDefects, setSelectedDefects] = useState<string[]>([]);
  const [granularity, setGranularity] = useState<string>('day');
  const [rawData, setRawData] = useState<{ dates: string[]; defects: any[] }>({ dates: [], defects: [] });

  useEffect(() => {
    productLinesApi.listSkus().then((lines: any[]) => {
      setSkus(lines);
      const activeIds = lines.filter(p => p.isActive).map(p => p.id);
      if (activeIds.length > 0) setProductIds(activeIds);
    });
  }, []);

  useEffect(() => {
    if (productIds.length === 0) { setRawData({ dates: [], defects: [] }); return; }
    const startDate = granularity !== 'day' ? dayjs(dates?.[0]).subtract(6, 'day').format('YYYY-MM-DD') : dates?.[0];
    const params: any = { skuIds: productIds.join(','), topN: 15 };
    if (startDate) params.startDate = startDate;
    if (dates?.[1]) params.endDate = dates[1];
    dashboardApi.defectTrend(params).then(data => setRawData(data));
  }, [productIds, dates, granularity]);

  const data = useMemo(() => {
    const aggregated = aggregateDefects(rawData.dates, rawData.defects, granularity);
    if (selectedDefects.length === 0) return { dates: aggregated.dates, defects: [] };
    return {
      dates: aggregated.dates,
      defects: aggregated.defects.filter(d => selectedDefects.includes(d.defectName)),
    };
  }, [rawData, granularity, selectedDefects]);

  const chartOption = useMemo(() => {
    if (data.dates.length === 0) return {};
    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          if (!params || params.length === 0) return '';
          let html = `<b>${params[0].axisValue}</b><br/>`;
          const items = params.filter((p: any) => p.value > 0);
          if (items.length === 0) return `${html}该时段无数据`;
          items.forEach((p: any) => {
            html += `${p.marker} ${p.seriesName}: ${p.value}<br/>`;
          });
          return html;
        },
      },
      legend: { type: 'scroll', bottom: 0, data: data.defects.map(d => d.defectName) },
      grid: { left: 60, right: 30, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: data.dates, boundaryGap: false },
      yAxis: { type: 'value', name: '缺陷数量', minInterval: 1 },
      series: data.defects.map((d, i) => ({
        name: `${d.component || ''} ${d.defectName}`,
        type: 'line',
        data: d.count,
        smooth: false,
        symbolSize: 6,
        lineStyle: { width: 2 },
        itemStyle: { color: colors[i % colors.length] },
        label: { show: true, formatter: (p: any) => p.value > 0 ? `${p.value}` : '', fontSize: 10 },
      })),
    };
  }, [data]);

  const defectOptions = useMemo(() => {
    const aggregated = aggregateDefects(rawData.dates, rawData.defects, granularity);
    return aggregated.defects.map(d => ({
      value: d.defectName,
      label: `${d.component || ''} ${d.defectName}`,
    }));
  }, [rawData, granularity]);

  return (
    <div>
      <Title level={4}>缺陷趋势图</Title>
      <Card style={{ marginBottom: 12 }} bodyStyle={{ padding: '12px 16px' }}>
        <Space wrap>
          <span>品号:</span>
          <Select mode="multiple" size="small" style={{ minWidth: 200 }} value={productIds}
            onChange={setProductIds} placeholder="选择品号（默认全选）"
            options={skus.filter(s => s.isActive).map(s => ({ value: s.id, label: s.code }))}
            maxTagCount={4} />
          <span>时间区间:</span>
          <RangePicker size="small"
            value={dates?.[0] && dates?.[1] ? [dayjs(dates[0]), dayjs(dates[1])] : undefined}
            onChange={(_d, ds) => { const d = ds?.[0] && ds?.[1] ? [ds[0], ds[1]] as [string,string] : null; setDates(d); sessionStorage.setItem('dashboard-dates', JSON.stringify(d)); }} />
          <span>粒度:</span>
          <Radio.Group size="small" value={granularity} onChange={e => setGranularity(e.target.value)}>
            {GRANULARITY.map(g => <Radio.Button key={g.value} value={g.value}>{g.label}</Radio.Button>)}
          </Radio.Group>
          <span>缺陷:</span>
          <Select mode="multiple" size="small" style={{ minWidth: 220 }} value={selectedDefects}
            onChange={setSelectedDefects} placeholder="请选择缺陷" maxTagCount={4}
            options={defectOptions} />
        </Space>
      </Card>
      <Card>
        <ReactECharts option={chartOption} style={{ height: 450 }} notMerge />
      </Card>
    </div>
  );
}
