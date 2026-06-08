import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, Table, Button, Form, Input, Switch, InputNumber, Select, Tag, Typography, message, Upload, Popconfirm, Space } from 'antd';
import { PlusOutlined, CheckOutlined, CloseOutlined, EditOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined, FileExcelOutlined, MenuOutlined, UnorderedListOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import * as XLSX from 'xlsx';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { stationsApi, stationFieldsApi, defectFieldsApi } from '../../api';
import SmartFilterBar, { applySmartFilters, type FilterCondition, type FilterField } from '../../components/SmartFilterBar';
import type { Station, StationFieldOption, DefectFieldOption } from '../../types';

const { Title } = Typography;

/** 单排序行组件 */
function SortableRow({ s, index }: { s: Station; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1000 : undefined,
    position: isDragging ? 'relative' : undefined,
    background: isDragging ? '#fafafa' : undefined,
    boxShadow: isDragging ? '0 2px 8px rgba(0,0,0,0.15)' : undefined,
  };
  return (
    <tr ref={setNodeRef} style={style} {...attributes}>
      <td style={{ width: 40, cursor: 'grab', textAlign: 'center' }} {...listeners}>
        <MenuOutlined style={{ color: '#999' }} />
      </td>
      <td style={{ width: 40, color: '#999', fontSize: 12 }}>{index + 1}</td>
      <td style={{ width: 80 }}><Tag color="blue">{s.majorSection}</Tag></td>
      <td style={{ width: 90 }}><Tag color="green">{s.minorSection}</Tag></td>
      <td style={{ width: 100 }}>{s.stationName}</td>
      <td style={{ width: 70 }}>{s.stationType ? <Tag>{s.stationType}</Tag> : '-'}</td>
      <td style={{ width: 100 }}>{s.mesName || '-'}</td>
      <td style={{ width: 120 }}>{s.abnormalPositions?.length ? s.abnormalPositions.map(p => <Tag key={p} color="red">{p}</Tag>) : '-'}</td>
      <td style={{ width: 70 }}><Tag color="green">启用</Tag></td>
    </tr>
  );
}

export default function StationTree() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [stationFields, setStationFields] = useState<StationFieldOption[]>([]);
  const [defectFields, setDefectFields] = useState<DefectFieldOption[]>([]);
  const [editingKey, setEditingKey] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [editForm] = Form.useForm();
  const [viewMode, setViewMode] = useState<'table' | 'sort'>('table');

  const [searchText, setSearchText] = useState('');
  const [conditions, setConditions] = useState<FilterCondition[]>([{ field: 'isActive', op: 'include', values: ['启用'] }]);

  const loadStations = async () => {
    setLoading(true);
    try {
      const data = await stationsApi.list();
      setStations(data);
    } catch (e: any) {
      message.error(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStations();
    stationFieldsApi.list().then(setStationFields).catch(() => {});
    defectFieldsApi.list().then(setDefectFields).catch(() => {});
  }, []);

  function getStationFieldOptions(fieldType: StationFieldOption['fieldType']): string[] {
    return stationFields.filter(f => f.fieldType === fieldType).map(f => f.name);
  }

  function getFieldOptions(fieldType: DefectFieldOption['fieldType']): string[] {
    return defectFields.filter(f => f.fieldType === fieldType).map(f => f.name);
  }

  async function ensureStationField(fieldType: StationFieldOption['fieldType'], name: string) {
    if (!name || !name.trim()) return;
    if (!stationFields.some(f => f.fieldType === fieldType && f.name === name)) {
      try {
        const created = await stationFieldsApi.create({ fieldType, name });
        setStationFields(prev => [...prev, created]);
      } catch { /* best-effort */ }
    }
  }

  const majorOptions = useMemo(() => getStationFieldOptions('majorSection'), [stationFields]);
  const minorOptions = useMemo(() => getStationFieldOptions('minorSection'), [stationFields]);
  const typeOptions = useMemo(() => getStationFieldOptions('stationType'), [stationFields]);
  const locationOptions = useMemo(() => getFieldOptions('location'), [defectFields]);

  const filterFields: FilterField[] = [
    { key: 'majorSection', label: '大工段', type: 'text', options: majorOptions.map(v => ({ value: v, label: v })) },
    { key: 'minorSection', label: '小工段', type: 'text', options: minorOptions.map(v => ({ value: v, label: v })) },
    { key: 'stationType', label: '工站类型', type: 'text', options: typeOptions.map(v => ({ value: v, label: v })) },
    { key: 'stationName', label: '工站名称', type: 'text' },
    { key: 'mesName', label: 'MES名称', type: 'text' },
    { key: 'sortOrder', label: '排序', type: 'number' },
    { key: 'isActive', label: '状态', type: 'text', options: [{ value: '启用', label: '启用' }, { value: '停用', label: '停用' }],
      getValue: (s: Station) => s.isActive ? '启用' : '停用' },
  ];

  const isEditing = (id: number) => id === editingKey || (adding && id === -1);
  const edit = (r: Station) => { setEditingKey(r.id); setAdding(false); editForm.setFieldsValue(r); };
  const cancel = () => { setEditingKey(null); setAdding(false); editForm.resetFields(); };
  const add = () => { setAdding(true); setEditingKey(null); editForm.resetFields(); editForm.setFieldsValue({ isActive: true, isDataEntryType: true, sortOrder: 1 }); };

  const del = async (id: number) => {
    try {
      await stationsApi.remove(id);
      message.success('已删除');
      loadStations();
    } catch (e: any) {
      message.error(e?.message || '删除失败');
    }
  };

  const saveEdit = async (id: number) => {
    const row = await editForm.validateFields();
    ensureStationField('majorSection', row.majorSection);
    ensureStationField('minorSection', row.minorSection);
    const dup = stations.find(s => s.majorSection === row.majorSection && s.minorSection === row.minorSection && s.stationName === row.stationName && s.id !== id);
    if (dup) { message.error('该工站已存在'); return; }
    try {
      await stationsApi.update(id, row);
      cancel();
      message.success('已保存');
      loadStations();
    } catch (e: any) {
      message.error(e?.message || '保存失败');
    }
  };

  const saveNew = async () => {
    const row = await editForm.validateFields();
    ensureStationField('majorSection', row.majorSection);
    ensureStationField('minorSection', row.minorSection);
    if (stations.some(s => s.majorSection === row.majorSection && s.minorSection === row.minorSection && s.stationName === row.stationName)) { message.error('该工站已存在'); return; }
    try {
      await stationsApi.create({ ...row, isActive: row.isActive ?? true, isDataEntryType: row.isDataEntryType ?? true });
      cancel();
      message.success('已新增');
      loadStations();
    } catch (e: any) {
      message.error(e?.message || '新增失败');
    }
  };

  const filteredStations = useMemo(() => {
    const result = applySmartFilters(stations, searchText, conditions, filterFields, [
      'majorSection', 'minorSection', 'stationName', s => s.mesName || '',
    ]);
    return [...result].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [stations, searchText, conditions]);

  // --- 拖拽排序 ---
  const activeStations = useMemo(() => stations.filter(s => s.isActive), [stations]);
  const [sortOrder, setSortOrder] = useState<Station[]>(() => [...activeStations].sort((a, b) => a.sortOrder - b.sortOrder));
  const [hasUnsaved, setHasUnsaved] = useState(false);

  // 进入排序视图时从全局同步
  const enterSortView = useCallback(() => {
    const active = stations.filter(s => s.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
    setSortOrder(active);
    setHasUnsaved(false);
    setViewMode('sort');
  }, [stations]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setSortOrder(prev => {
        const oldIdx = prev.findIndex(s => s.id === active.id);
        const newIdx = prev.findIndex(s => s.id === over.id);
        if (oldIdx < 0 || newIdx < 0) return prev;
        return arrayMove(prev, oldIdx, newIdx);
      });
      setHasUnsaved(true);
    }
  }, []);

  const handleSaveSort = useCallback(async () => {
    const items = sortOrder.map((s, i) => ({ id: s.id, sortOrder: i + 1 }));
    try {
      await stationsApi.reorder(items);
      setHasUnsaved(false);
      message.success('排序已保存');
      loadStations();
      setViewMode('table');
    } catch (e: any) {
      message.error(e?.message || '排序保存失败');
    }
  }, [sortOrder]);

  // --- 导出 ---
  const handleExport = () => {
    const data = filteredStations.map(s => ({ '排序': s.sortOrder, '大工段': s.majorSection, '小工段': s.minorSection, '工站名称': s.stationName, '工站类型': s.stationType || '', 'MES名称': s.mesName || '', '异常位置': (s.abnormalPositions || []).join(', '), '状态': s.isActive ? '启用' : '停用' }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), '工站层级');
    XLSX.writeFile(wb, '工站层级数据.xlsx'); message.success('导出成功');
  };

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ '大工段': '组装', '小工段': '前段组装', '工站名称': '示例', '工站类型': '必过工站', 'MES名称': 'ASSY-XXX', '异常位置': '位置A, 位置B', '排序': 0, '状态': '启用' }]), '模板');
    XLSX.writeFile(wb, '工站导入模板.xlsx'); message.success('模板已下载');
  };

  const handleImport = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[wb.SheetNames[0]]);
      let added = 0, skipped = 0;
      for (const row of rows) {
        const a = row['大工段']?.trim(), b = row['小工段']?.trim(), c = row['工站名称']?.trim();
        if (!a || !b || !c) continue;
        if (stations.some(s => s.majorSection === a && s.minorSection === b && s.stationName === c)) { skipped++; continue; }
        ensureStationField('majorSection', a); ensureStationField('minorSection', b);
        if (row['工站类型']) ensureStationField('stationType', row['工站类型']);
        try {
          await stationsApi.create({
            majorSection: a, minorSection: b, stationName: c,
            stationType: row['工站类型']?.trim() || '',
            mesName: row['MES名称']?.trim() || '',
            abnormalPositions: (row['异常位置'] || '').split(/[,，、]/).map(s => s.trim()).filter(Boolean),
            sortOrder: Number(row['排序']) || 0,
            isActive: row['状态'] !== '停用',
          });
          added++;
        } catch { skipped++; }
      }
      message.success(`导入成功：新增 ${added} 条${skipped > 0 ? `，跳过 ${skipped} 条` : ''}`);
      loadStations();
    } catch { message.error('解析失败，请检查文件格式'); }
  };

  const makeInput = (name: string, opts?: string[]) => opts
    ? <Form.Item name={name} style={{ margin: 0 }} rules={[{ required: true }]}><Select size="small" style={{ width: 100 }} options={opts.map(v => ({ value: v, label: v }))} mode="tags" maxCount={1} /></Form.Item>
    : <Form.Item name={name} style={{ margin: 0 }} rules={[{ required: true }]}><Input size="small" style={{ width: 110 }} /></Form.Item>;

  const columnsArr: ColumnsType<Station> = [
    { title: '#', dataIndex: 'sortOrder', key: 'so', width: 50, render: (_: unknown, r: Station) => isEditing(r.id) ? <Form.Item name="sortOrder" style={{ margin: 0 }}><InputNumber size="small" min={0} style={{ width: 60 }} /></Form.Item> : (r.isActive ? r.sortOrder : <span style={{ color: '#999' }}>/</span>) },
    { title: '大工段', dataIndex: 'majorSection', key: 'ms', width: 90, render: (_: unknown, r: Station) => isEditing(r.id) ? makeInput('majorSection', majorOptions) : <Tag color="blue">{r.majorSection}</Tag> },
    { title: '小工段', dataIndex: 'minorSection', key: 'ns', width: 90, render: (_: unknown, r: Station) => isEditing(r.id) ? makeInput('minorSection', minorOptions) : <Tag color="green">{r.minorSection}</Tag> },
    { title: '工站名称', dataIndex: 'stationName', key: 'sn', width: 100, render: (_: unknown, r: Station) => isEditing(r.id) ? makeInput('stationName') : r.stationName },
    { title: '类型', dataIndex: 'stationType', key: 'st', width: 100, render: (_: unknown, r: Station) => isEditing(r.id) ? <Form.Item name="stationType" style={{ margin: 0 }}><Select size="small" style={{ width: 130 }} options={typeOptions.map(v => ({ value: v, label: v }))} /></Form.Item> : r.stationType ? <Tag>{r.stationType}</Tag> : '-' },
    { title: 'MES', dataIndex: 'mesName', key: 'mn', width: 100, render: (_: unknown, r: Station) => isEditing(r.id) ? <Form.Item name="mesName" style={{ margin: 0 }}><Input size="small" style={{ width: 100 }} /></Form.Item> : r.mesName || '-' },
    { title: '异常位置', dataIndex: 'abnormalPositions', key: 'ap', width: 120, render: (_: unknown, r: Station) => isEditing(r.id) ? <Form.Item name="abnormalPositions" style={{ margin: 0 }}><Select size="small" mode="multiple" allowClear style={{ width: 140 }} options={locationOptions.map(v => ({ value: v, label: v }))} /></Form.Item> : (r.abnormalPositions?.length ? r.abnormalPositions.map(p => <Tag key={p} color="red">{p}</Tag>) : '-') },
    { title: '录入', dataIndex: 'isDataEntryType', key: 'de', width: 60, render: (_: unknown, r: Station) => <Tag color={r.isDataEntryType ? 'green' : 'default'}>{r.isDataEntryType ? '是' : '否'}</Tag> },
    { title: '状态', dataIndex: 'isActive', key: 'ia', width: 70, render: (_: unknown, r: Station) => isEditing(r.id) ? <Form.Item name="isActive" style={{ margin: 0 }} valuePropName="checked"><Switch size="small" checkedChildren="启用" unCheckedChildren="停用" /></Form.Item> : <Tag color={r.isActive ? 'green' : 'default'}>{r.isActive ? '启用' : '停用'}</Tag> },
    { title: '操作', key: 'ac', width: 140, render: (_: unknown, r: Station) => isEditing(r.id) ? <Space size={4}><Button type="link" size="small" icon={<CheckOutlined />} onClick={() => r.id === -1 ? saveNew() : saveEdit(r.id)}>保存</Button><Button type="link" size="small" icon={<CloseOutlined />} onClick={cancel}>取消</Button></Space> : <Space size={4}><Button type="link" size="small" icon={<EditOutlined />} onClick={() => edit(r)}>编辑</Button><Popconfirm title="确定删除?" onConfirm={() => del(r.id)}><Button type="link" size="small" danger icon={<DeleteOutlined />} /></Popconfirm></Space> },
  ];

  const newStation: Station = { id: -1, majorSection: '', minorSection: '', stationName: '', stationType: '', isDataEntryType: true, sortOrder: 1, isActive: true };
  const dataSource = [...(adding ? [{ ...newStation, key: -1 }] : []), ...filteredStations.map(s => ({ ...s, key: s.id }))];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}>工站层级管理</Title>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>导出</Button>
          <Button icon={<FileExcelOutlined />} onClick={handleDownloadTemplate}>模板</Button>
          <Upload accept=".xlsx,.xls" showUploadList={false} beforeUpload={(file) => { handleImport(file); return false; }}><Button icon={<UploadOutlined />}>导入</Button></Upload>
          <Button
            icon={viewMode === 'sort' ? <UnorderedListOutlined /> : <MenuOutlined />}
            onClick={() => viewMode === 'sort' ? setViewMode('table') : enterSortView()}
          >
            {viewMode === 'sort' ? '表格视图' : '排序视图'}
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={add} disabled={adding || viewMode === 'sort'}>
            新增工站
          </Button>
        </Space>
      </div>

      {viewMode === 'table' ? (
        <Card title={<span>工站列表 ({filteredStations.length} 条) <SmartFilterBar fields={filterFields} searchText={searchText} onSearchChange={setSearchText} conditions={conditions} onConditionsChange={setConditions} /></span>}>
          <Form form={editForm} component={false}>
            <Table scroll={{ x: 'max-content' }} dataSource={dataSource} columns={columnsArr} pagination={{ pageSize: 15, showTotal: t => `共 ${t} 条` }} size="small" loading={loading} />
          </Form>
        </Card>
      ) : (
        <Card title={<span>拖拽排序 — 仅启用工站 ({sortOrder.length} 条)</span>}
          extra={
            <Space>
              <Button onClick={() => setViewMode('table')}>取消</Button>
              <Button type="primary" icon={<CheckOutlined />} onClick={handleSaveSort} disabled={!hasUnsaved}>
                保存排序{hasUnsaved ? ' *' : ''}
              </Button>
            </Space>
          }>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortOrder.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#fafafa', borderBottom: '2px solid #f0f0f0' }}>
                      <th style={{ width: 40, padding: '8px 4px' }}></th>
                      <th style={{ width: 50, padding: '8px 4px', textAlign: 'left' }}>#</th>
                      <th style={{ width: 80, padding: '8px 4px', textAlign: 'left' }}>大工段</th>
                      <th style={{ width: 90, padding: '8px 4px', textAlign: 'left' }}>小工段</th>
                      <th style={{ width: 100, padding: '8px 4px', textAlign: 'left' }}>工站名称</th>
                      <th style={{ width: 70, padding: '8px 4px', textAlign: 'left' }}>类型</th>
                      <th style={{ width: 100, padding: '8px 4px', textAlign: 'left' }}>MES</th>
                      <th style={{ width: 120, padding: '8px 4px', textAlign: 'left' }}>异常位置</th>
                      <th style={{ width: 70, padding: '8px 4px', textAlign: 'left' }}>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortOrder.map((s, i) => (
                      <SortableRow key={s.id} s={s} index={i} />
                    ))}
                  </tbody>
                </table>
              </div>
            </SortableContext>
          </DndContext>
          <div style={{ marginTop: 12, color: '#999', fontSize: 12 }}>
            停用工站自动排除。拖动后点击"保存排序"生效，编号从 1 开始
          </div>
        </Card>
      )}
    </div>
  );
}
