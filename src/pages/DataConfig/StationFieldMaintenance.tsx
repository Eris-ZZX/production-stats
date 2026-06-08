import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, Table, Button, Form, Input, InputNumber, Switch, Tabs, Typography, Tag, message, Popconfirm, Space } from 'antd';
import { PlusOutlined, CheckOutlined, CloseOutlined, EditOutlined, DeleteOutlined, MenuOutlined } from '@ant-design/icons';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { stationFieldsApi } from '../../api';
import type { StationFieldOption } from '../../types';

const { Title } = Typography;

const FIELD_LABELS: Record<StationFieldOption['fieldType'], string> = { majorSection: '大工段', minorSection: '小工段', stationType: '工站类型' };
const FIELD_COLORS: Record<StationFieldOption['fieldType'], string> = { majorSection: 'blue', minorSection: 'green', stationType: 'orange' };

function SortableRow({ f, index }: { f: StationFieldOption; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: f.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform), transition,
    zIndex: isDragging ? 1000 : undefined,
    position: isDragging ? 'relative' : undefined,
    background: isDragging ? '#fafafa' : undefined,
    boxShadow: isDragging ? '0 2px 8px rgba(0,0,0,0.15)' : undefined,
  };
  return (
    <tr ref={setNodeRef} style={style} {...attributes}>
      <td style={{ width: 40, cursor: 'grab', textAlign: 'center' }} {...listeners}><MenuOutlined style={{ color: '#999' }} /></td>
      <td style={{ width: 50 }}>{index + 1}</td>
      <td><Tag color={FIELD_COLORS[f.fieldType]}>{f.name}</Tag></td>
    </tr>
  );
}

export default function StationFieldMaintenance() {
  const [fields, setFields] = useState<StationFieldOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingKey, setEditingKey] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [editForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState<StationFieldOption['fieldType']>('majorSection');
  const [viewMode, setViewMode] = useState<'table' | 'sort'>('table');

  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const role = isAdmin ? (sessionStorage.getItem('admin-role') || '') : '';
  const isViewer = role === 'viewer';
  const isLocked = !isViewer && !isAdmin && activeTab === 'stationType';

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await stationFieldsApi.list();
      setFields(data);
    } catch (e: any) { message.error(e?.message || '加载失败'); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadData(); }, []);

  const isEditing = (id: number) => id === editingKey || (adding && id === -1);
  const edit = (r: StationFieldOption) => { setEditingKey(r.id); setAdding(false); editForm.setFieldsValue(r); };
  const cancel = () => { setEditingKey(null); setAdding(false); editForm.resetFields(); };

  const saveEdit = async (id: number) => {
    const row = await editForm.validateFields();
    const original = fields.find(f => f.id === id);
    try {
      await stationFieldsApi.update(id, {
        fieldType: original?.fieldType || row.fieldType,
        name: row.name, isDataEntry: row.isDataEntry,
        visualFpyTarget: row.visualFpyTarget, functionalFpyTarget: row.functionalFpyTarget, airLeakFpyTarget: row.airLeakFpyTarget,
      });
      cancel(); message.success('已保存'); loadData();
    } catch (e: any) { message.error(e?.message || '保存失败'); }
  };

  const saveNew = async () => {
    const row = await editForm.validateFields();
    try {
      await stationFieldsApi.create({ fieldType: activeTab, name: row.name });
      cancel(); message.success('已新增'); loadData();
    } catch (e: any) { message.error(e?.message || '新增失败'); }
  };

  const add = () => { setAdding(true); setEditingKey(null); editForm.resetFields(); };
  const del = async (id: number) => {
    try { await stationFieldsApi.remove(id); message.success('已删除'); loadData(); }
    catch (e: any) { message.error(e?.message || '删除失败'); }
  };

  const actionCol = (locked: boolean) => ({
    title: '操作', key: 'action', width: 160,
    render: (_: unknown, r: StationFieldOption) =>
      isViewer ? <Tag color="default" style={{ fontSize: 11 }}>只读</Tag> :
      locked ? <Tag color="default" style={{ fontSize: 11 }}>锁定</Tag> :
      isEditing(r.id) ? <Space size={4}><Button type="link" size="small" icon={<CheckOutlined />} onClick={() => r.id === -1 ? saveNew() : saveEdit(r.id)}>保存</Button><Button type="link" size="small" icon={<CloseOutlined />} onClick={cancel}>取消</Button></Space>
      : <Space size={4}><Button type="link" size="small" icon={<EditOutlined />} onClick={() => edit(r)}>编辑</Button><Popconfirm title="确定删除?" onConfirm={() => del(r.id)}><Button type="link" size="small" danger icon={<DeleteOutlined />} /></Popconfirm></Space>,
  });

  const majorCols = [
    { title: '名称', dataIndex: 'name', key: 'name', width: 100, render: (_: unknown, r: StationFieldOption) => isEditing(r.id) ? <Form.Item name="name" style={{ margin: 0 }} rules={[{ required: true }]}><Input size="small" style={{ width: 90 }} /></Form.Item> : <Tag color={FIELD_COLORS[r.fieldType]}>{r.name}</Tag> },
    { title: '外观FPY目标', dataIndex: 'visualFpyTarget', key: 'vft', width: 110, render: (_: unknown, r: StationFieldOption) => isEditing(r.id) ? <Form.Item name="visualFpyTarget" style={{ margin: 0 }}><InputNumber size="small" min={0} max={100} style={{ width: 70 }} /></Form.Item> : <Tag color="blue">{r.visualFpyTarget ?? 97}%</Tag> },
    { title: '功能FPY目标', dataIndex: 'functionalFpyTarget', key: 'fft', width: 110, render: (_: unknown, r: StationFieldOption) => isEditing(r.id) ? <Form.Item name="functionalFpyTarget" style={{ margin: 0 }}><InputNumber size="small" min={0} max={100} style={{ width: 70 }} /></Form.Item> : <Tag color="cyan">{r.functionalFpyTarget ?? 95}%</Tag> },
    { title: '气密性FPY目标', dataIndex: 'airLeakFpyTarget', key: 'aft', width: 120, render: (_: unknown, r: StationFieldOption) => isEditing(r.id) ? <Form.Item name="airLeakFpyTarget" style={{ margin: 0 }}><InputNumber size="small" min={0} max={100} style={{ width: 70 }} /></Form.Item> : <Tag color="geekblue">{r.airLeakFpyTarget ?? 98}%</Tag> },
    actionCol(false),
  ];

  const stCols = [
    { title: '名称', dataIndex: 'name', key: 'name', render: (_: unknown, r: StationFieldOption) => isEditing(r.id) ? <Form.Item name="name" style={{ margin: 0 }} rules={[{ required: true }]}><Input size="small" style={{ width: 180 }} /></Form.Item> : <Tag color={FIELD_COLORS[r.fieldType]}>{r.name}</Tag> },
    { title: '数据录入类', dataIndex: 'isDataEntry', key: 'isDataEntry', width: 120, render: (_: unknown, r: StationFieldOption) => isEditing(r.id) ? <Form.Item name="isDataEntry" style={{ margin: 0 }} valuePropName="checked"><Switch size="small" checkedChildren="是" unCheckedChildren="否" /></Form.Item> : <Tag color={r.isDataEntry ? 'green' : 'default'}>{r.isDataEntry ? '是' : '否'}</Tag> },
    actionCol(!isAdmin),
  ];

  const baseCols = [
    { title: '名称', dataIndex: 'name', key: 'name', render: (_: unknown, r: StationFieldOption) => isEditing(r.id) ? <Form.Item name="name" style={{ margin: 0 }} rules={[{ required: true }]}><Input size="small" style={{ width: 180 }} /></Form.Item> : <Tag color={FIELD_COLORS[r.fieldType]}>{r.name}</Tag> },
    actionCol(false),
  ];

  // ===== 排序视图 =====
  const tabItems2 = useMemo(() => fields.filter(f => f.fieldType === activeTab).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)), [fields, activeTab]);
  const [sortOrder, setSortOrder] = useState<StationFieldOption[]>([]);
  const [hasUnsaved, setHasUnsaved] = useState(false);

  const enterSortView = useCallback(() => {
    setSortOrder([...tabItems2]);
    setHasUnsaved(false);
    setViewMode('sort');
  }, [tabItems2]);

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
    const updates = items.map(it => stationFieldsApi.update(it.id, { ...fields.find(f => f.id === it.id), sortOrder: it.sortOrder }).catch(() => {}));
    await Promise.all(updates);
    setHasUnsaved(false);
    message.success('排序已保存');
    loadData();
    setViewMode('table');
  }, [sortOrder, fields]);

  const ftArr = ['majorSection', 'minorSection', 'stationType'] as StationFieldOption['fieldType'][];
  const newItem: StationFieldOption = { id: -1, fieldType: 'majorSection', name: '' };
  const getColumns = (ft: StationFieldOption['fieldType']) => ft === 'majorSection' ? majorCols : ft === 'stationType' ? stCols : baseCols;

  const tabItems = ftArr.map(ft => {
    const items = fields.filter(f => f.fieldType === ft);
    const locked = !isAdmin && ft === 'stationType';
    return {
      key: ft,
      label: `${FIELD_LABELS[ft]} (${items.length})${locked ? ' 🔒' : ''}`,
      children: (
        <Table loading={loading}
          dataSource={[...(adding && !locked && activeTab === ft ? [{ ...newItem, key: -1, fieldType: ft }] : []), ...items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map(f => ({ ...f, key: f.id }))]}
          columns={getColumns(ft)} pagination={false} size="small" />
      ),
    };
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>工站字段维护</Title>
        <Space>
          {viewMode === 'table' && (
            <>
              {isViewer ? <Tag color="warning">只读模式，不可编辑</Tag> :
               isLocked ? <Tag color="warning">工站类型已锁定，不可新增或删除</Tag> :
               <Button type="primary" icon={<PlusOutlined />} onClick={add} disabled={adding}>新增{FIELD_LABELS[activeTab]}选项</Button>}
              {!isLocked && activeTab !== 'stationType' && (
                <Button icon={<MenuOutlined />} onClick={enterSortView}>排序视图</Button>
              )}
            </>
          )}
        </Space>
      </div>

      {viewMode === 'table' ? (
        <Card>
          <Form form={editForm} component={false}>
            <Tabs activeKey={activeTab} onChange={(k) => { setActiveTab(k as StationFieldOption['fieldType']); cancel(); }} items={tabItems} />
          </Form>
        </Card>
      ) : (
        <Card title={<span>拖拽排序 — {FIELD_LABELS[activeTab]} ({sortOrder.length} 条)</span>}
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
                      <th style={{ padding: '8px 4px', textAlign: 'left' }}>名称</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortOrder.map((f, i) => <SortableRow key={f.id} f={f} index={i} />)}
                  </tbody>
                </table>
              </div>
            </SortableContext>
          </DndContext>
          <div style={{ marginTop: 12, color: '#999', fontSize: 12 }}>
            拖动后点击"保存排序"生效，编号从 1 开始
          </div>
        </Card>
      )}
    </div>
  );
}
