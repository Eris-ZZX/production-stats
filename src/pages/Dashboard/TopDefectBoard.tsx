import { useState, useEffect } from 'react';
import { Card, Table, DatePicker, Select, Typography, Tag, Space, Popover } from 'antd';
import { dashboardApi, productLinesApi, stationsApi } from '../../api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const TYPES = [
  { key: '外观', label: '外观', color: 'blue' },
  { key: '功能', label: '功能', color: 'cyan' },
  { key: '气密性', label: '气密性', color: 'geekblue' },
];

const FQC_TYPES = [
  { key: '外观', label: 'FQC外观', color: 'volcano' },
  { key: '功能', label: 'FQC功能', color: 'purple' },
];


const columns = [
  { title: '#', key: 'rank', width: 40, render: (_: unknown, __: unknown, i: number) => <Tag color={i < 3 ? 'red' : 'default'}>{i + 1}</Tag> },
  { title: '组件', dataIndex: 'component', key: 'comp', width: 70, render: (v: string) => <Tag>{v}</Tag> },
  { title: '位置', dataIndex: 'location', key: 'loc', width: 60, render: (v: string) => <Tag color="geekblue">{v}</Tag> },
  { title: '缺陷', dataIndex: 'defectName', key: 'name', width: 100, ellipsis: true },
  { title: '工站', dataIndex: 'stations', key: 'sts', width: 150, render: (v: string[]) => {
    if (!v || v.length === 0) return '-';
    if (v.length === 1) return <Tag color="purple" style={{ fontSize: 11 }}>{v[0]}</Tag>;
    return (
      <Space size={2}>
        {v.slice(0, 2).map(s => <Tag key={s} color="purple" style={{ fontSize: 11, lineHeight: '18px' }}>{s}</Tag>)}
        {v.length > 2 && (
          <Popover content={<Space direction="vertical" size={2}>{v.map(s => <Tag key={s} color="purple">{s}</Tag>)}</Space>}>
            <Tag style={{ cursor: 'pointer', fontSize: 11 }}>+{v.length - 2}</Tag>
          </Popover>
        )}
      </Space>
    );
  } },
  { title: '投产数', dataIndex: 'output', key: 'out', width: 75 },
  { title: '数量', dataIndex: 'count', key: 'cnt', width: 60 },
  { title: '占比', dataIndex: 'rate', key: 'rate', width: 55, render: (v: number) => `${v}%` },
  { title: '不良率', dataIndex: 'defectRate', key: 'dr', width: 70, sorter: (a: any, b: any) => a.defectRate - b.defectRate,
    render: (v: number) => <Tag color={v >= 5 ? 'red' : v >= 2 ? 'orange' : 'green'}>{v}%</Tag> },
];

export default function TopDefectBoard() {
  const [dates, setDates] = useState<[string, string] | null>(() => { const saved = sessionStorage.getItem('dashboard-dates'); if (saved) { try { const p = JSON.parse(saved); if (p?.[0] && p?.[1]) return p; } catch {} } return ['2026-06-01', '2026-06-03']; });  const [productIds, setProductIds] = useState<number[]>([]);
  const [skus, setSkus] = useState<any[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [defectData, setDefectData] = useState<Record<string, any[]>>({});
  const [activeTabs, setActiveTabs] = useState<Record<string, string>>({ '外观': '', '功能': '', '气密性': '' });
  // 加载品号列表
  useEffect(() => {
    productLinesApi.listSkus().then((lines: any[]) => {
      setSkus(lines);
      const activeIds = lines.filter(p => p.isActive).map(p => p.id);
      if (activeIds.length > 0) setProductIds(activeIds);
    });
  }, []);

  // 从工站数据中提取大工段列表
  useEffect(() => {
    stationsApi.list().then((stations: any[]) => {
      const names = [...new Set(stations.map((s: any) => s.majorSection).filter(Boolean))];
      setSections(names);
      if (names.length > 0) {
        const first = names[0];
        setActiveTabs({ '外观': first, '功能': first, '气密性': first });
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (productIds.length === 0 || sections.length === 0) { setDefectData({}); return; }
    const pidStr = productIds.join(',');
    const sectionKeys: { key: string; section: string; defectType?: string }[] = [];
    sections.forEach(s => TYPES.forEach(t => sectionKeys.push({ key: `${t.key}-${s}`, section: s, defectType: t.key })));
    const fqcKeys: { key: string; section: string; defectType?: string }[] = FQC_TYPES.map(t => ({ key: `FQC-${t.key}`, section: 'FQC', defectType: t.key }));

    Promise.all(
      [...sectionKeys, ...fqcKeys].map(k => {
        const params: any = { section: k.section, skuIds: pidStr, topN: 10 };
        if (dates?.[0]) params.startDate = dates[0];
        if (dates?.[1]) params.endDate = dates[1];
        if (k.defectType) params.defectType = k.defectType;
        return dashboardApi.topDefects(params).then(data => [k.key, data] as [string, any[]]);
      })
    ).then(results => {
      const map: Record<string, any[]> = {};
      results.forEach(([key, data]) => { map[key] = data; });
      setDefectData(map);
    }).catch(() => {});
  }, [productIds, dates, sections]);

  const filterCard = (
    <Card key="filter" style={{ marginBottom: 12 }} bodyStyle={{ padding: '12px 16px' }}>
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
      </Space>
    </Card>
  );

  return (
    <div>
      <Title level={4}>TOP 缺陷排名</Title>
      {filterCard}
      {TYPES.map(t => (
        <Card key={t.key} style={{ marginBottom: 12 }}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <Tag color={t.color} style={{ fontSize: 14 }}>{t.key}</Tag>
              <div style={{ width: 1, height: 20, background: '#d9d9d9', margin: '0 8px' }} />
              <div style={{ display: 'flex', marginLeft: 0 }}>
                {sections.map(s => (
                  <Tag key={s}
                    color={activeTabs[t.key] === s ? 'blue' : 'default'}
                    style={{ cursor: 'pointer', opacity: activeTabs[t.key] === s ? 1 : 0.6 }}
                    onClick={() => setActiveTabs(prev => ({ ...prev, [t.key]: s }))}
                  >{s}</Tag>
                ))}
              </div>
            </div>
          }>
          <Table
scroll={{ x: 'max-content' }}             dataSource={(defectData[`${t.key}-${activeTabs[t.key]}`] || []).map((d: any, i: number) => ({ ...d, key: i }))}
            columns={columns} pagination={false} size="small" />
        </Card>
      ))}
      {FQC_TYPES.map(t => (
        <Card key={`fqc-${t.key}`} style={{ marginBottom: 12 }}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <Tag color={t.color} style={{ fontSize: 14 }}>{t.label}</Tag>
            </div>
          }>
          <Table
scroll={{ x: 'max-content' }}             dataSource={(defectData[`FQC-${t.key}`] || []).map((d: any, i: number) => ({ ...d, key: i }))}
            columns={columns} pagination={false} size="small" />
        </Card>
      ))}
    </div>
  );
}
