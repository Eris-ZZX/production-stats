import { useState, useMemo } from 'react';
import { Card, Table, DatePicker, Select, Typography, Tag, Space } from 'antd';
import { getStationFpy, mockProducts } from '../../mockData';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

interface StationFpyRow {
  stationId: number; stationName: string; majorSection: string; minorSection: string; stationType: string;
  totalOutput: number; appearanceDefects: number; functionalDefects: number; airLeakDefects: number;
  appearanceFpy: number; functionalFpy: number; airLeakFpy: number;
}

const activeProductIds = mockProducts.filter(p => p.status === 'active').map(p => p.id);

export default function StationFpyList() {
  const [dates, setDates] = useState<[string, string] | null>(['2026-06-01', '2026-06-03']);
  const [productIds, setProductIds] = useState<number[]>(activeProductIds);

  const allData = useMemo(() => {
    if (productIds.length === 0) return [];
    return getStationFpy(productIds, dates?.[0], dates?.[1]);
  }, [productIds, dates]);

  const fqcData = useMemo(() => allData.filter(d => d.stationType === 'FQC'), [allData]);
  const stationData = useMemo(() => allData.filter(d => d.stationType !== 'FQC'), [allData]);

  const columns: ColumnsType<StationFpyRow> = [
    { title: '工站', dataIndex: 'stationName', key: 'sn', width: 120, sorter: (a, b) => a.stationName.localeCompare(b.stationName) },
    { title: '大工段', dataIndex: 'majorSection', key: 'ms', width: 70, render: (v: string) => <Tag color="blue">{v}</Tag> },
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
            options={mockProducts.filter(p => p.status === 'active').map(p => ({ value: p.id, label: p.code }))}
            maxTagCount={4} />
          <span>时间区间:</span>
          <RangePicker size="small"
            value={dates?.[0] && dates?.[1] ? [dayjs(dates[0]), dayjs(dates[1])] : undefined}
            onChange={(_d, ds) => setDates(ds?.[0] && ds?.[1] ? [ds[0], ds[1]] : null)} />
        </Space>
      </Card>
      <Card title={`工站 FPY 明细 (${stationData.length} 个工站)`}>
        <Table dataSource={stationData.map((d, i) => ({ ...d, key: i }))} columns={columns}
          pagination={false} size="small" />
      </Card>
      {fqcData.length > 0 && (
        <Card title={`FQC 工站 FPY (${fqcData.length} 个工站)`} style={{ marginTop: 12 }}>
          <Table dataSource={fqcData.map((d, i) => ({ ...d, key: i }))} columns={columns}
            pagination={false} size="small" />
        </Card>
      )}
    </div>
  );
}
