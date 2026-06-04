import { useState, useMemo } from 'react';
import { Card, Table, Button, Form, Input, Select, Switch, Tag, Typography, message, Row, Col, Upload, Tooltip, Popconfirm, Space } from 'antd';
import { PlusOutlined, CheckOutlined, CloseOutlined, EditOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined, FileExcelOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import * as XLSX from 'xlsx';
import { mockDefects, ensureDefectField, getFieldOptions } from '../../mockData';
import SmartFilterBar, { applySmartFilters, type FilterCondition, type FilterField } from '../../components/SmartFilterBar';
import type { DefectCode } from '../../types';

const { Title } = Typography;

export default function DefectCodes() {
  const [defects, setDefects] = useState<DefectCode[]>(mockDefects);
  const [editingKey, setEditingKey] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [editForm] = Form.useForm();

  const componentOptions = useMemo(() => getFieldOptions('component'), []);
  const typeOptions = useMemo(() => getFieldOptions('type'), []);
  const locationOptions = useMemo(() => getFieldOptions('location'), []);
  const defectOptions = useMemo(() => getFieldOptions('defect'), []);

  const [searchText, setSearchText] = useState('');
  const [conditions, setConditions] = useState<FilterCondition[]>([{ field: 'isActive', op: 'include', values: ['启用'] }]);

  const filterFields: FilterField[] = [
    { key: 'defectCode', label: '缺陷代码', type: 'text' },
    { key: 'component', label: '组件', type: 'text', options: componentOptions.map(v => ({ value: v, label: v })) },
    { key: 'type', label: '类型', type: 'text', options: typeOptions.map(v => ({ value: v, label: v })) },
    { key: 'location', label: '位置', type: 'text', options: locationOptions.map(v => ({ value: v, label: v })) },
    { key: 'defect', label: '缺陷', type: 'text', options: defectOptions.map(v => ({ value: v, label: v })) },
    { key: 'isActive', label: '状态', type: 'text', options: [{ value: '启用', label: '启用' }, { value: '停用', label: '停用' }],
      getValue: (d: DefectCode) => d.isActive ? '启用' : '停用' },
  ];

  function syncGlobal(u: DefectCode[]) { mockDefects.length = 0; mockDefects.push(...u); }
  const isEditing = (id: number) => id === editingKey || (adding && id === -1);
  const edit = (r: DefectCode) => { setEditingKey(r.id); setAdding(false); editForm.setFieldsValue(r); };
  const cancel = () => { setEditingKey(null); setAdding(false); editForm.resetFields(); };
  const genCode = () => { const maxNum = defects.reduce((max, d) => { const m = d.defectCode.match(/^D(\d+)$/); return m ? Math.max(max, parseInt(m[1], 10)) : max; }, 0); return `D${String(maxNum + 1).padStart(3, '0')}`; };
  const add = () => { setAdding(true); setEditingKey(null); editForm.resetFields(); };
  const del = (id: number) => { const u = defects.filter(d => d.id !== id); setDefects(u); syncGlobal(u); message.success('已删除'); };

  const saveEdit = async (id: number) => {
    const row = await editForm.validateFields();
    ensureDefectField('component', row.component); ensureDefectField('type', row.type); ensureDefectField('location', row.location); ensureDefectField('defect', row.defect);
    if (defects.some(d => d.id !== id && d.component === row.component && d.type === row.type && d.location === row.location && d.defect === row.defect)) { message.error('已存在'); return; }
    setDefects(prev => { const u = prev.map(d => d.id === id ? { ...d, ...row } : d); syncGlobal(u); return u; });
    cancel(); message.success('已保存');
  };

  const saveNew = async () => {
    const row = await editForm.validateFields();
    ensureDefectField('component', row.component); ensureDefectField('type', row.type); ensureDefectField('location', row.location); ensureDefectField('defect', row.defect);
    if (defects.some(d => d.component === row.component && d.type === row.type && d.location === row.location && d.defect === row.defect)) { message.error('已存在'); return; }
    const maxId = defects.reduce((max, d) => Math.max(max, d.id), 0);
    const u = [...defects, { id: maxId + 1, ...row, defectCode: genCode(), isActive: true }];
    setDefects(u); syncGlobal(u); cancel(); message.success('已新增');
  };

  const filteredDefects = useMemo(() => applySmartFilters(defects, searchText, conditions, filterFields, [
    'defectCode', 'defect', 'component', 'type', 'location',
  ]), [defects, searchText, conditions]);

  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filteredDefects.map(d => ({ '缺陷代码': d.defectCode, '组件': d.component, '类型': d.type, '位置': d.location, '缺陷描述': d.defect, '状态': d.isActive ? '启用' : '停用' }))), '缺陷代码库');
    XLSX.writeFile(wb, '缺陷代码库数据.xlsx'); message.success('导出成功');
  };
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ '组件': '左耳', '类型': '外观', '位置': '屏幕', '缺陷描述': '示例描述' }]), '模板');
    XLSX.writeFile(wb, '缺陷代码导入模板.xlsx'); message.success('模板已下载');
  };
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = (ev) => { try {
      const wb = XLSX.read(ev.target?.result, { type: 'binary' }); const rows = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[wb.SheetNames[0]]);
      let added = 0; const nd = [...defects]; let curMax = nd.reduce((max, d) => { const m = d.defectCode.match(/^D(\d+)$/); return m ? Math.max(max, parseInt(m[1], 10)) : max; }, 0);
      for (const row of rows) { const a=row['组件']?.trim(),b=row['类型']?.trim(),c=row['位置']?.trim(),e=row['缺陷描述']?.trim(); if(!a||!b||!c||!e)continue; if(nd.some(d=>d.component===a&&d.type===b&&d.location===c&&d.defect===e))continue; ensureDefectField('component',a);ensureDefectField('type',b);ensureDefectField('location',c);ensureDefectField('defect',e);curMax++;nd.push({id:Date.now()+added,defectCode:`D${String(curMax).padStart(3,'0')}`,component:a,type:b,location:c,defect:e,isActive:true});added++;}
      setDefects(nd); syncGlobal(nd); message.success(`导入成功，新增 ${added} 条`);
    } catch { message.error('解析失败'); } }; reader.readAsBinaryString(file); e.target.value = '';
  };

  const newDefect: DefectCode = { id: -1, defectCode: '', component: '', type: '', location: '', defect: '', isActive: true };

  const columnsArr: ColumnsType<DefectCode> = [
    { title: '代码', dataIndex: 'defectCode', key: 'dc', width: 80, render: (v: string, r: DefectCode) => r.id === -1 ? <Tag color="processing">自动</Tag> : v },
    { title: '组件', dataIndex: 'component', key: 'cp', width: 90, render: (_: unknown, r: DefectCode) => isEditing(r.id) ? <Form.Item name="component" style={{ margin:0 }} rules={[{required:true}]}><Select size="small" style={{width:100}} options={componentOptions.map(v=>({value:v,label:v}))} mode="tags" maxCount={1} /></Form.Item> : <Tag color="blue">{r.component}</Tag> },
    { title: '类型', dataIndex: 'type', key: 'tp', width: 70, render: (_: unknown, r: DefectCode) => isEditing(r.id) ? <Form.Item name="type" style={{ margin:0 }} rules={[{required:true}]}><Select size="small" style={{width:80}} options={typeOptions.map(v=>({value:v,label:v}))} mode="tags" maxCount={1} /></Form.Item> : <Tag color="cyan">{r.type}</Tag> },
    { title: '位置', dataIndex: 'location', key: 'lc', width: 70, render: (_: unknown, r: DefectCode) => isEditing(r.id) ? <Form.Item name="location" style={{ margin:0 }} rules={[{required:true}]}><Select size="small" style={{width:80}} options={locationOptions.map(v=>({value:v,label:v}))} mode="tags" maxCount={1} /></Form.Item> : <Tag color="geekblue">{r.location}</Tag> },
    { title: '缺陷', dataIndex: 'defect', key: 'df', width: 130, render: (_: unknown, r: DefectCode) => isEditing(r.id) ? <Form.Item name="defect" style={{ margin:0 }} rules={[{required:true}]}><Select size="small" style={{width:140}} options={defectOptions.map(v=>({value:v,label:v}))} mode="tags" maxCount={1} /></Form.Item> : r.defect },
    { title: '状态', dataIndex: 'isActive', key: 'ia', width: 70, render: (_: unknown, r: DefectCode) => r.id === -1 ? <Tag color="green">启用</Tag> : (isEditing(r.id) ? <Form.Item name="isActive" style={{ margin:0 }} valuePropName="checked"><Switch size="small" checkedChildren="启用" unCheckedChildren="停用" /></Form.Item> : <Tag color={r.isActive ? 'green' : 'default'}>{r.isActive ? '启用' : '停用'}</Tag>) },
    { title: '操作', key: 'ac', width: 140, render: (_: unknown, r: DefectCode) => isEditing(r.id) ? <Space size={4}><Button type="link" size="small" icon={<CheckOutlined />} onClick={() => r.id === -1 ? saveNew() : saveEdit(r.id)}>保存</Button><Button type="link" size="small" icon={<CloseOutlined />} onClick={cancel}>取消</Button></Space> : <Space size={4}><Button type="link" size="small" icon={<EditOutlined />} onClick={() => edit(r)}>编辑</Button><Popconfirm title="确定删除?" onConfirm={() => del(r.id)}><Button type="link" size="small" danger icon={<DeleteOutlined />} /></Popconfirm></Space> },
  ];

  const dataSource = [...(adding ? [{ ...newDefect, key: -1 }] : []), ...filteredDefects.map(d => ({ ...d, key: d.id }))];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}>缺陷代码库 <Tag>{defects.length} 条</Tag></Title>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>导出</Button>
          <Button icon={<FileExcelOutlined />} onClick={handleDownloadTemplate}>模板</Button>
          <Upload accept=".xlsx,.xls" showUploadList={false} beforeUpload={() => false} onChange={handleImport as any}><Button icon={<UploadOutlined />}>导入</Button></Upload>
          <Button type="primary" icon={<PlusOutlined />} onClick={add} disabled={adding}>新增缺陷（自动编号）</Button>
        </Space>
      </div>

      <Card title={<span>缺陷代码列表 ({filteredDefects.length} 条) <SmartFilterBar fields={filterFields} searchText={searchText} onSearchChange={setSearchText} conditions={conditions} onConditionsChange={setConditions} /></span>}>
        <Form form={editForm} component={false}>
          <Table dataSource={dataSource} columns={columnsArr} pagination={{ pageSize: 15, showTotal: t => `共 ${t} 条` }} size="small" />
        </Form>
      </Card>
    </div>
  );
}
