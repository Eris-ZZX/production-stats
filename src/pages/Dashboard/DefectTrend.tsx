import { useState, useMemo, useEffect } from 'react';
import { Card, DatePicker, Select, Typography, Space, Radio, Switch } from 'antd';
import ReactECharts from 'echarts-for-react';
import { dashboardApi, productLinesApi, defectCodesApi } from '../../api';
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
  defects: any[],
  granularity: string,
) {
  if (granularity === 'day') return { dates, defects };
  const bucketMap = new Map<string, number[]>();
  const allKeys: string[] = [];
  dates.forEach((date, i) => {
    let key: string;
    if (granularity === 'week') key = `${dayjs(date).isoWeek()}周`;
    else key = dayjs(date).format('YYYY-MM');
    if (!bucketMap.has(key)) { bucketMap.set(key, new Array(defects.length).fill(0)); allKeys.push(key); }
    defects.forEach((df, di) => { bucketMap.get(key)![di] += df.count[i]; });
  });
  const sortedKeys = allKeys.sort((a, b) => {
    const da = a.includes('周') ? dayjs().isoWeek(Number(a.replace('周', ''))) : dayjs(a);
    const db = b.includes('周') ? dayjs().isoWeek(Number(b.replace('周', ''))) : dayjs(b);
    return da.valueOf() - db.valueOf();
  });
  const newDefects = defects.map((df, di) => ({ ...df, count: sortedKeys.map(k => bucketMap.get(k)?.[di] ?? 0) }));
  return { dates: sortedKeys, defects: newDefects };
}

export default function DefectTrend() {
  const [dates, setDates] = useState<[string, string] | null>(() => { const saved = sessionStorage.getItem('dashboard-dates'); if (saved) { try { const p = JSON.parse(saved); if (p?.[0] && p?.[1]) return p; } catch {} } return [twoWeeksAgo, today]; });
  const [productIds, setProductIds] = useState<number[]>([]);
  const [skus, setSkus] = useState<any[]>([]);
  const [defectCodes, setDefectCodes] = useState<any[]>([]);
  const [granularity, setGranularity] = useState<string>('day');
  const [rawData, setRawData] = useState<{ dates: string[]; defects: any[] }>({ dates: [], defects: [] });
  const [bySection, setBySection] = useState(false);

  // 四级筛选
  const [selComponent, setSelComponent] = useState<string | undefined>(undefined);
  const [selType, setSelType] = useState<string | undefined>(undefined);
  const [selLocation, setSelLocation] = useState<string | undefined>(undefined);
  const [selDefects, setSelDefects] = useState<string[]>([]);

  useEffect(() => {
    productLinesApi.listSkus().then((lines: any[]) => {
      setSkus(lines);
      const activeIds = lines.filter(p => p.isActive).map(p => p.id);
      if (activeIds.length > 0) setProductIds(activeIds);
    });
    defectCodesApi.list().then(setDefectCodes).catch(() => {});
  }, []);

  useEffect(() => {
    if (productIds.length === 0) { setRawData({ dates: [], defects: [] }); return; }
    const startDate = granularity !== 'day' ? dayjs(dates?.[0]).subtract(6, 'day').format('YYYY-MM-DD') : dates?.[0];
    const params: any = { skuIds: productIds.join(','), topN: 15, bySection: bySection ? '1' : '0' };
    if (startDate) params.startDate = startDate;
    if (dates?.[1]) params.endDate = dates[1];
    dashboardApi.defectTrend(params).then(data => setRawData(data));
  }, [productIds, dates, granularity, bySection]);

  // 逐级过滤选项（基于实际缺陷代码库，而非趋势数据）
  const componentOptions = useMemo(() =>
    [...new Set(defectCodes.map(d => d.component).filter(Boolean))].sort().map(v => ({ value: v, label: v })),
  [defectCodes]);

  const typeOptions = useMemo(() =>
    [...new Set(defectCodes.filter(d => !selComponent || d.component === selComponent).map(d => d.type).filter(Boolean))].sort().map(v => ({ value: v, label: v })),
  [defectCodes, selComponent]);

  const locationOptions = useMemo(() =>
    [...new Set(defectCodes.filter(d => (!selComponent || d.component === selComponent) && (!selType || d.type === selType)).map(d => d.location).filter(Boolean))].sort().map(v => ({ value: v, label: v })),
  [defectCodes, selComponent, selType]);

  // 缺陷选项：精确匹配四级，避免同名缺陷跨组件
  const defectOptions = useMemo(() =>
    defectCodes.filter(d => (!selComponent || d.component === selComponent) && (!selType || d.type === selType) && (!selLocation || d.location === selLocation))
      .map(d => ({ value: d.defectCode, label: d.defect })),
  [defectCodes, selComponent, selType, selLocation]);

  const onComponentChange = (v: string | undefined) => { setSelComponent(v); setSelType(undefined); setSelLocation(undefined); setSelDefects([]); };
  const onTypeChange = (v: string | undefined) => { setSelType(v); setSelLocation(undefined); setSelDefects([]); };
  const onLocationChange = (v: string | undefined) => { setSelLocation(v); setSelDefects([]); };

  // 按 defectCode 精确匹配（避免同名缺陷跨组件），支持 bySection
  const data = useMemo(() => {
    const aggregated = aggregateDefects(rawData.dates, rawData.defects, granularity);
    if (selDefects.length === 0) return { dates: aggregated.dates, defects: [] };
    const selSet = new Set(selDefects);
    const filtered = aggregated.defects.filter(d => selSet.has(d.defectCode));
    return { dates: aggregated.dates, defects: filtered };
  }, [rawData, granularity, selDefects]);

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
          items.forEach((p: any) => { html += `${p.marker} ${p.seriesName}: ${p.value}<br/>`; });
          return html;
        },
      },
      legend: { type: 'scroll', bottom: 0, data: data.defects.map(d => bySection ? `${d.section || d.component} ${d.defectName}` : `${d.component || ''} ${d.defectName}`) },
      grid: { left: 60, right: 30, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: data.dates, boundaryGap: false },
      yAxis: { type: 'value', name: '缺陷数量', minInterval: 1 },
      series: data.defects.map((d, i) => ({
        name: bySection ? `${d.section || d.component} ${d.defectName}` : `${d.component || ''} ${d.defectName}`,
        type: 'line',
        data: d.count,
        smooth: false,
        symbolSize: 6,
        lineStyle: { width: 2 },
        itemStyle: { color: colors[i % colors.length] },
        label: { show: true, formatter: (p: any) => p.value > 0 ? `${p.value}` : '', fontSize: 10 },
      })),
    };
  }, [data, bySection]);

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
        </Space>
        <div style={{ marginTop: 8 }}>
          <Space wrap>
            <span style={{ fontWeight: 500 }}>组件:</span>
            <Select size="small" style={{ minWidth: 120 }} value={selComponent} onChange={onComponentChange}
              allowClear placeholder="全部" options={componentOptions} />
            <span style={{ fontWeight: 500 }}>类型:</span>
            <Select size="small" style={{ minWidth: 100 }} value={selType} onChange={onTypeChange}
              allowClear placeholder="全部" disabled={!selComponent} options={typeOptions} />
            <span style={{ fontWeight: 500 }}>位置:</span>
            <Select size="small" style={{ minWidth: 100 }} value={selLocation} onChange={onLocationChange}
              allowClear placeholder="全部" disabled={!selType} options={locationOptions} />
            <span style={{ fontWeight: 500 }}>缺陷:</span>
            <Select mode="multiple" size="small" style={{ minWidth: 200 }} value={selDefects}
              onChange={setSelDefects} placeholder="选择缺陷" maxTagCount={4}
              disabled={!selLocation} options={defectOptions} />
            <span style={{ fontWeight: 500, marginLeft: 8 }}>按工段:</span>
            <Switch size="small" checked={bySection} onChange={setBySection} />
          </Space>
        </div>
      </Card>
      <Card>
        <ReactECharts option={chartOption} style={{ height: 450 }} notMerge />
      </Card>
    </div>
  );
}
