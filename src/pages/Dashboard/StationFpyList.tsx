import { useState, useMemo, useEffect } from 'react';
import { Card, Table, DatePicker, Select, Typography, Tag, Space, Collapse } from 'antd';
import { dashboardApi, productLinesApi } from '../../api';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Panel } = Collapse;

interface StationFpyRow {
  stationId: number; stationName: string; majorSection: string; minorSection: string; stationType: string;
  totalOutput: number; appearanceDefects: number; functionalDefects: number; airLeakDefects: number;
  appearanceFpy: number; functionalFpy: number; airLeakFpy: number;
}

export default function StationFpyList() {
  const [dates, setDates] = useState<[string, string] | null>(() => {
    const saved = sessionStorage.getItem('dashboard-dates');
    if (saved) { try { const p = JSON.parse(saved); if (p?.[0] && p?.[1]) return p; } catch {} }
    return ['2026-06-01', '2026-06-03'];
  });
  const [productIds, setProductIds] = useState<number[]>([]);
  const [skus, setSkus] = useState<any[]>([]);
  const [allData, setAllData] = useState<StationFpyRow[]>([]);

  useEffect(() => {
    productLinesApi.listSkus().then((lines: any[]) => {
      setSkus(lines);
      const activeIds = lines.filter(p => p.isActive).map(p => p.id);
      if (activeIds.length > 0) setProductIds(activeIds);
    });
  }, []);

  useEffect(() => {
    if (productIds.length === 0) { setAllData([]); return; }
    const params: any = { skuIds: productIds.join(',') };
    if (dates?.[0]) params.startDate = dates[0];
    if (dates?.[1]) params.endDate = dates[1];
    dashboardApi.stationFpy(params).then(data => setAllData(data));
  }, [productIds, dates]);

  // 按大工段分组（FQC 单独一组在最后）
  const sectionGroups = useMemo(() => {
    const map = new Map<string, StationFpyRow[]>();
    allData.forEach(d => {
      const sec = d.stationType === 'FQC' ? 'FQC' : (d.majorSection || '未分类');
      let arr = map.get(sec);
      if (!arr) { arr = []; map.set(sec, arr); }
      arr.push(d);
    });
    // Keep insertion order from collapse; FQC last
    const entries = [...map.entries()];
    const fqcIdx = entries.findIndex(e => e[0] === 'FQC');
    if (fqcIdx >= 0) { entries.push(entries.splice(fqcIdx, 1)[0]); }
    return entries;
  }, [allData]);

  const columns: ColumnsType<StationFpyRow> = [
    { title: '工站', dataIndex: 'stationName', key: 'sn', width: 120, sorter: (a, b) => a.stationName.localeCompare(b.stationName) },
    { title: '小工段', dataIndex: 'minorSection', key: 'ns', width: 100, render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '投产数', dataIndex: 'totalOutput', key: 'out', width: 80, sorter: (a, b) => a.totalOutput - b.totalOutput },
    { title: '外观不良', dataIndex: 'appearanceDefects', key: 'ad', width: 90, sorter: (a, b) => a.appearanceDefects - b.appearanceDefects },
    { title: '功能不良', dataIndex: 'functionalDefects', key: 'fd', width: 90, sorter: (a, b) => a.functionalDefects - b.functionalDefects },
    { title: '气密性不良', dataIndex: 'airLeakDefects', key: 'ald', width: 100, sorter: (a, b) => a.airLeakDefects - b.airLeakDefects },
    {
      title: '外观FPY', dataIndex: 'appearanceFpy', key: 'afpy', width: 110, sorter: (a, b) => a.appearanceFpy - b.appearanceFpy,
      render: (v: number) => <Tag color={v >= 98 ? 'green' : v >= 95 ? 'orange' : 'red'}>{v}%</Tag>,
    },
    {
      title: '功能FPY', dataIndex: 'functionalFpy', key: 'ffpy', width: 110, sorter: (a, b) => a.functionalFpy - b.functionalFpy,
      render: (v: number) => <Tag color={v >= 97 ? 'green' : v >= 94 ? 'orange' : 'red'}>{v}%</Tag>,
    },
    {
      title: '气密性FPY', dataIndex: 'airLeakFpy', key: 'afpy2', width: 120, sorter: (a, b) => a.airLeakFpy - b.airLeakFpy,
      render: (v: number) => <Tag color={v >= 97 ? 'green' : v >= 94 ? 'orange' : 'red'}>{v}%</Tag>,
    },
  ];

  return (
    <div>
      <Title level={4}>工站 FPY 列表</Title>
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
        </Space>
      </Card>

      {allData.length === 0 ? (
        <Card><div style={{ textAlign: 'center', color: '#999', padding: 24 }}>暂无数据</div></Card>
      ) : (
        <Collapse size="small">
          {sectionGroups.map(([sec, items]) => (
            <Panel
              key={sec}
              header={
                <span>
                  <Tag color={sec === 'FQC' ? 'volcano' : 'blue'} style={{ fontSize: 13 }}>{sec}</Tag>
                  <span style={{ fontSize: 13, marginLeft: 4 }}>{items.length} 个工站</span>
                </span>
              }
              extra={<Tag color="default">折叠/展开</Tag>}
            >
              <Table
scroll={{ x: 'max-content' }}                 dataSource={items.map((d, i) => ({ ...d, key: i }))}
                columns={columns}
                pagination={false}
                size="small"
              />
            </Panel>
          ))}
        </Collapse>
      )}

    </div>
  );
}
