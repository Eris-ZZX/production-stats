import { useState, useMemo, useEffect } from 'react';
import { Card, Table, DatePicker, Select, Typography, Tag, Space } from 'antd';
import { dashboardApi, productLinesApi } from '../../api';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const fpyColor = (v: number, t: number) => v >= t ? 'green' : v >= t - 2 ? 'orange' : 'red';

interface ProductLine {
  id: number; name: string; isActive: boolean;
}

interface SectionRow {
  majorSection: string;
  appearanceFpy: number; functionalFpy: number; airLeakFpy: number;
  appearanceTarget: number; functionalTarget: number; airLeakTarget: number;
}

interface FqcRow {
  majorSection: string;
  appearanceFpy: number; functionalFpy: number;
  appearanceTarget: number; functionalTarget: number;
}

export default function SectionFpyList() {
  const [dates, setDates] = useState<[string, string] | null>(['2026-06-01', '2026-06-03']);
  const [productIds, setProductIds] = useState<number[]>([]);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [data, setData] = useState<SectionRow[]>([]);
  const [fqcData, setFqcData] = useState<FqcRow[]>([]);

  useEffect(() => {
    productLinesApi.list().then((lines: ProductLine[]) => {
      setProductLines(lines);
      const activeIds = lines.filter(p => p.isActive).map(p => p.id);
      if (activeIds.length > 0) setProductIds(activeIds);
    });
  }, []);

  useEffect(() => {
    if (productIds.length === 0) { setData([]); setFqcData([]); return; }
    const params: any = { productIds: productIds.join(',') };
    if (dates?.[0]) params.startDate = dates[0];
    if (dates?.[1]) params.endDate = dates[1];
    dashboardApi.sectionFpy(params).then(d => setData(d));
    dashboardApi.fqcFpy(params).then(d => setFqcData(d));
  }, [productIds, dates]);

  const table = (title: string, fpyKey: keyof SectionRow, targetKey: keyof SectionRow) => {
    const cols: ColumnsType<SectionRow> = [
      { title: '工段', dataIndex: 'majorSection', key: 'sec', width: 80, render: (v: string) => <Tag color="blue">{v}</Tag> },
      {
        title: 'FPY', dataIndex: fpyKey, key: 'fpy', width: 100,
        sorter: (a, b) => (a[fpyKey] as number) - (b[fpyKey] as number),
        render: (v: number, r: SectionRow) => <Tag color={fpyColor(v, r[targetKey] as number)} style={{ fontSize: 14 }}>{v}%</Tag>,
      },
      {
        title: '目标', dataIndex: targetKey, key: 'tgt', width: 100,
        render: (v: number) => <Tag color="blue" style={{ fontSize: 14 }}>{v}%</Tag>,
      },
      {
        title: '差距', key: 'gap', width: 100,
        sorter: (a, b) => ((a[fpyKey] as number) - (a[targetKey] as number)) - ((b[fpyKey] as number) - (b[targetKey] as number)),
        render: (_: unknown, r: SectionRow) => {
          const gap = (r[fpyKey] as number) - (r[targetKey] as number);
          return <Tag color={gap >= 0 ? 'green' : 'red'} style={{ fontSize: 14 }}>{gap >= 0 ? '+' : ''}{gap.toFixed(1)}%</Tag>;
        },
      },
    ];
    return (
      <Card key={title} title={title} style={{ flex: 1, minWidth: 0 }}>
        <Table dataSource={data.map((d, i) => ({ ...d, key: i }))} columns={cols} pagination={false} size="small" />
      </Card>
    );
  };

  const fqcTable = (title: string, fpyKey: keyof FqcRow, targetKey: keyof FqcRow) => {
    const cols: ColumnsType<FqcRow> = [
      { title: '工段', dataIndex: 'majorSection', key: 'sec', width: 80, render: (v: string) => <Tag color="volcano">{v}</Tag> },
      {
        title: 'FPY', dataIndex: fpyKey, key: 'fpy', width: 100,
        sorter: (a, b) => (a[fpyKey] as number) - (b[fpyKey] as number),
        render: (v: number, r: FqcRow) => <Tag color={fpyColor(v, r[targetKey] as number)} style={{ fontSize: 14 }}>{v}%</Tag>,
      },
      {
        title: '目标', dataIndex: targetKey, key: 'tgt', width: 100,
        render: (v: number) => <Tag color="blue" style={{ fontSize: 14 }}>{v}%</Tag>,
      },
      {
        title: '差距', key: 'gap', width: 100,
        sorter: (a, b) => ((a[fpyKey] as number) - (a[targetKey] as number)) - ((b[fpyKey] as number) - (b[targetKey] as number)),
        render: (_: unknown, r: FqcRow) => {
          const gap = (r[fpyKey] as number) - (r[targetKey] as number);
          return <Tag color={gap >= 0 ? 'green' : 'red'} style={{ fontSize: 14 }}>{gap >= 0 ? '+' : ''}{gap.toFixed(1)}%</Tag>;
        },
      },
    ];
    return (
      <Card key={title} title={title} style={{ flex: 1, minWidth: 0 }}>
        <Table dataSource={fqcData.map((d, i) => ({ ...d, key: i }))} columns={cols} pagination={false} size="small" />
      </Card>
    );
  };

  return (
    <div>
      <Title level={4}>工段 FPY 列表</Title>
      <Card style={{ marginBottom: 12 }} bodyStyle={{ padding: '12px 16px' }}>
        <Space wrap>
          <span>品号:</span>
          <Select mode="multiple" size="small" style={{ minWidth: 200 }} value={productIds}
            onChange={setProductIds} placeholder="选择品号（默认全选）"
            options={productLines.filter(p => p.isActive).map(p => ({ value: p.id, label: p.name }))}
            maxTagCount={4} />
          <span>时间区间:</span>
          <RangePicker size="small"
            value={dates?.[0] && dates?.[1] ? [dayjs(dates[0]), dayjs(dates[1])] : undefined}
            onChange={(_d, ds) => setDates(ds?.[0] && ds?.[1] ? [ds[0], ds[1]] : null)} />
        </Space>
      </Card>
      <div style={{ display: 'flex', gap: 12 }}>
        {table('外观 FPY', 'appearanceFpy', 'appearanceTarget')}
        {table('功能 FPY', 'functionalFpy', 'functionalTarget')}
        {table('气密性 FPY', 'airLeakFpy', 'airLeakTarget')}
      </div>
      {fqcData.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          {fqcTable('FQC 外观 FPY', 'appearanceFpy', 'appearanceTarget')}
          {fqcTable('FQC 功能 FPY', 'functionalFpy', 'functionalTarget')}
        </div>
      )}
    </div>
  );
}
