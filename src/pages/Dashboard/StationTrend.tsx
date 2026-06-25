import { useState, useMemo, useEffect } from 'react';
import { Card, DatePicker, Select, Typography, Space, Radio } from 'antd';
import ReactECharts from 'echarts-for-react';
import { dashboardApi, productLinesApi } from '../../api';
import { useProduct } from '../../store/ProductContext';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
dayjs.extend(isoWeek);

const { Title } = Typography;
const { RangePicker } = DatePicker;

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

const colors = ['#1890ff', '#52c41a', '#fa8c16', '#722ed1', '#eb2f96', '#13c2c2', '#f5222d', '#2f54eb', '#faad14', '#a0d911'];


function aggregateByGranularity(
  dates: string[],
  stations: { stationId: number; stationName: string; majorSection: string; data: (number | null)[] }[],
  granularity: string,
) {
  if (granularity === 'day') return { dates, stations };

  const buckets = new Map<string, { idx: number; stationVals: Map<number, { sum: number; count: number }> }>();
  dates.forEach((date, i) => {
    let key: string;
    if (granularity === 'week') {
      key = `${dayjs(date).isoWeek()}周`;
    } else {
      key = dayjs(date).format('YYYY-MM');
    }
    let b = buckets.get(key);
    if (!b) { b = { idx: i, stationVals: new Map() }; buckets.set(key, b); }
    stations.forEach(st => {
      const v = st.data[i];
      if (v !== null) {
        let sv = b!.stationVals.get(st.stationId);
        if (!sv) { sv = { sum: 0, count: 0 }; b!.stationVals.set(st.stationId, sv); }
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
  const newStations = stations.map(st => ({
    ...st,
    data: newDates.map(key => {
      const sv = buckets.get(key)?.stationVals.get(st.stationId);
      return sv && sv.count > 0 ? Number((sv.sum / sv.count).toFixed(1)) : null;
    }),
  }));

  return { dates: newDates, stations: newStations };
}

export default function StationTrend() {
  const { currentProduct } = useProduct();
  const [dates, setDates] = useState<[string, string] | null>(() => { const saved = sessionStorage.getItem('dashboard-dates'); if (saved) { try { const p = JSON.parse(saved); if (p?.[0] && p?.[1]) return p; } catch {} } return [twoWeeksAgo, today]; });  const [productIds, setProductIds] = useState<number[]>([]);
  const [skus, setSkus] = useState<any[]>([]);
  const [defectType, setDefectType] = useState<string | undefined>(undefined);
  const [selectedStationIds, setSelectedStationIds] = useState<number[]>([]);
  const [granularity, setGranularity] = useState<string>('day');
  const [rawData, setRawData] = useState<{ dates: string[]; stations: any[] }>({ dates: [], stations: [] });

  useEffect(() => {
    productLinesApi.listSkus().then((lines: any[]) => {
      const mySkus = currentProduct ? lines.filter((s: any) => s.productLineId === currentProduct.id) : [];
      setSkus(mySkus);
      const activeIds = mySkus.filter(p => p.isActive).map(p => p.id);
      if (activeIds.length > 0) setProductIds(activeIds);
    });
  }, [currentProduct]);

  useEffect(() => {
    if (productIds.length === 0) { setRawData({ dates: [], stations: [] }); return; }
    const startDate = granularity !== 'day' ? dayjs(dates?.[0]).subtract(6, 'day').format('YYYY-MM-DD') : dates?.[0];
    const params: any = { skuIds: productIds.join(',') };
    if (startDate) params.startDate = startDate;
    if (dates?.[1]) params.endDate = dates[1];
    if (defectType) params.defectType = defectType;
    dashboardApi.stationTrend(params).then(data => setRawData(data)).catch(() => {});  }, [productIds, dates, defectType]);

  const data = useMemo(() => aggregateByGranularity(rawData.dates, rawData.stations, granularity),
    [rawData, granularity]);

  const filteredStations = useMemo(() => {
    if (selectedStationIds.length === 0) return [];
    return data.stations.filter(s => selectedStationIds.includes(s.stationId));
  }, [data.stations, selectedStationIds]);

  const chartOption = useMemo(() => {
    if (filteredStations.length === 0) return {};
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
      legend: { type: 'scroll', bottom: 0, data: filteredStations.map(s => s.stationName) },
      grid: { left: 60, right: 30, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: data.dates, boundaryGap: false },
      yAxis: { type: 'value', name: 'FPY(%)', min: (val: { min: number }) => Math.floor(Math.min(val.min, 90) / 5) * 5, max: 100 },
      series: filteredStations.map((s, i) => ({
        name: s.stationName,
        type: 'line',
        data: s.data,
        smooth: false,
        connectNulls: false,
        symbolSize: 6,
        lineStyle: { width: 2 },
        itemStyle: { color: colors[i % colors.length] },
        label: { show: true, formatter: (p: any) => p.value !== null ? `${p.value}%` : '', fontSize: 10 },
      })),
    };
  }, [data, filteredStations]);

  // 工站下拉选项始终从原始数据提取（不受选择影响）
  const stationOptions = useMemo(() =>
    data.stations.map(s => ({ value: s.stationId, label: `${s.majorSection}-${s.stationName}` })),
    [data.stations]);

  return (
    <div>
      <Title level={4}>工站趋势图</Title>
      <Card style={{ marginBottom: 12 }} styles={{ body: { padding: '12px 16px' } }}>
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
          <span>维度:</span>
          <Radio.Group size="small" value={defectType} onChange={e => setDefectType(e.target.value)}>
            {TYPE_OPTIONS.map(o => <Radio.Button key={String(o.value)} value={o.value}>{o.label}</Radio.Button>)}
          </Radio.Group>
          <span>工站:</span>
          <Select mode="multiple" size="small" style={{ minWidth: 200 }} value={selectedStationIds}
            onChange={setSelectedStationIds} placeholder="全选" maxTagCount={3}
            options={stationOptions} />
        </Space>
      </Card>
      <Card>
        <ReactECharts key={granularity} option={chartOption} style={{ height: 450 }} notMerge />
      </Card>
    </div>
  );
}
