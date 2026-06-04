import { useState, useCallback } from 'react';
import { Input, InputNumber, Select, DatePicker, Button, Popover, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined, ClearOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

export interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date';
  options?: { value: string; label: string }[];
  getValue?: (item: any) => string;
}

export interface FilterCondition {
  field: string;
  op: string;
  values: string[];
}

interface FilterRow {
  id: number;
  field: string;
  op: string;
  values: string[];
}

const NUMBER_OPS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte'];
const TEXT_OPS = ['include', 'exclude'];
const DATE_OPS = ['between', 'eq', 'gt', 'lt'];

const OP_LABELS: Record<string, string> = {
  eq: '等于', neq: '≠', gt: '大于', gte: '≥', lt: '小于', lte: '≤',
  include: '包含', exclude: '不含', between: '区间',
};

const DEFAULT_OP: Record<string, string> = { text: 'include', number: 'eq', date: 'between' };

let _filterId = 1;

export function applySmartFilters<T extends Record<string, any>>(
  list: T[], searchText: string, conditions: FilterCondition[], fields: FilterField[],
  searchKeys: (keyof T | ((item: T) => string))[],
): T[] {
  let r = [...list];
  if (searchText.trim()) {
    const kw = searchText.trim().toLowerCase();
    r = r.filter(item => searchKeys.some(k => typeof k === 'function' ? k(item).toLowerCase().includes(kw) : String(item[k] ?? '').toLowerCase().includes(kw)));
  }
  for (const c of conditions) {
    const fd = fields.find(f => f.key === c.field);
    if (!fd || !c.values.length || !c.values[0]?.trim()) continue;
    const op = c.op;

    r = r.filter(item => {
      const raw = fd.getValue ? fd.getValue(item) : String(item[fd.key] ?? '');
      if (fd.type === 'number') {
        const num = Number(raw); if (isNaN(num)) return false;
        const v = Number(c.values[0]); if (isNaN(v)) return true;
        if (op === 'eq') return num === v; if (op === 'neq') return num !== v;
        if (op === 'gt') return num > v; if (op === 'gte') return num >= v;
        if (op === 'lt') return num < v; if (op === 'lte') return num <= v;
        return true;
      }
      if (fd.type === 'date') {
        const d = raw.substring(0, 10);
        if (op === 'eq') return d === c.values[0];
        if (op === 'gt') return d > c.values[0];
        if (op === 'lt') return d < c.values[0];
        if (op === 'between') return (!c.values[0] || d >= c.values[0]) && (!c.values[1] || d <= c.values[1]);
        return true;
      }
      const low = raw.toLowerCase(); const v = c.values[0]?.toLowerCase() || '';
      if (op === 'include') return low.includes(v);
      if (op === 'exclude') return !low.includes(v);
      return true;
    });
  }
  return r;
}

interface Props {
  fields: FilterField[];
  searchText: string;
  onSearchChange: (v: string) => void;
  conditions: FilterCondition[];
  onConditionsChange: (conds: FilterCondition[]) => void;
}

interface FilterRowContentProps {
  r: FilterRow;
  fields: FilterField[];
  onUpdate: (id: number, patch: Partial<FilterRow>) => void;
  onRemove: (id: number) => void;
}

function FilterRowContent({ r, fields, onUpdate, onRemove }: FilterRowContentProps) {
  const fd = fields.find(f => f.key === r.field);
  const ops = fd?.type === 'number' ? NUMBER_OPS : fd?.type === 'date' ? DATE_OPS : TEXT_OPS;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, width: '100%' }}>
      <Select size="small" placeholder="字段" style={{ width: 100 }} value={r.field || undefined}
        onChange={k => onUpdate(r.id, { field: k || '', op: '', values: [] })}
        options={fields.map(f => ({ value: f.key, label: f.label }))} />
      {r.field && (
        <>
          <Select size="small" style={{ width: 70 }} value={r.op || DEFAULT_OP[fd?.type || 'text']}
            onChange={op => onUpdate(r.id, { op, values: [] })}
            options={ops.map(o => ({ value: o, label: OP_LABELS[o] || o }))} />
          {fd?.type === 'number' ? (
            <InputNumber size="small" style={{ width: 90 }} placeholder="数值"
              value={r.values[0] ? Number(r.values[0]) : undefined}
              onChange={n => onUpdate(r.id, { values: [String(n ?? '')] })} />
          ) : fd?.type === 'date' ? (
            r.op === 'between' ? (
              <DatePicker.RangePicker size="small" style={{ width: 210 }}
                value={r.values[0] && r.values[1] ? [dayjs(r.values[0]), dayjs(r.values[1])] : undefined}
                onChange={(_d, ds) => onUpdate(r.id, { values: ds?.[0] && ds?.[1] ? [ds[0], ds[1]] : [] })} />
            ) : (
              <DatePicker size="small" style={{ width: 130 }}
                value={r.values[0] ? dayjs(r.values[0]) : undefined}
                onChange={d => onUpdate(r.id, { values: [d ? d.format('YYYY-MM-DD') : ''] })} />
            )
          ) : fd?.options ? (
            <Select mode="multiple" allowClear size="small" style={{ width: 170 }} placeholder={fd.label}
              value={r.values} onChange={vals => onUpdate(r.id, { values: vals || [] })}
              options={fd.options.slice(0, 50)} maxTagCount={1} dropdownMatchSelectWidth={false} />
          ) : (
            <Input allowClear size="small" style={{ width: 120 }} placeholder="输入..."
              value={r.values[0] || ''} onChange={e => onUpdate(r.id, { values: [e.target.value] })} />
          )}
          <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => onRemove(r.id)} />
        </>
      )}
      {!r.field && (
        <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => onRemove(r.id)} />
      )}
    </div>
  );
}

export default function SmartFilterBar({ fields, searchText, onSearchChange, conditions, onConditionsChange }: Props) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<FilterRow[]>(
    conditions.length > 0
      ? conditions.map(c => ({ id: ++_filterId, field: c.field, op: c.op, values: c.values }))
      : [{ id: ++_filterId, field: '', op: 'include', values: [] }]
  );

  const syncParent = useCallback((r: FilterRow[]) => {
    onConditionsChange(
      r.filter(rw => rw.field && rw.values.length > 0 && rw.values.some(v => v.trim()))
       .map(rw => ({ field: rw.field, op: rw.op, values: rw.values }))
    );
  }, [onConditionsChange]);

  const addRow = () => setRows(prev => { const n = [...prev, { id: ++_filterId, field: '', op: 'include', values: [] }]; return n; });

  const updateRow = (id: number, patch: Partial<FilterRow>) => {
    setRows(prev => {
      const n = prev.map(r => r.id === id ? { ...r, ...patch } : r);
      if (patch.field) {
        const idx = n.findIndex(r => r.id === id);
        if (idx >= 0 && !patch.op) {
          const fd = fields.find(f => f.key === patch.field);
          n[idx] = { ...n[idx], op: DEFAULT_OP[fd?.type || 'text'], values: [] };
        }
      }
      syncParent(n); return n;
    });
  };

  const removeRow = (id: number) => {
    setRows(prev => {
      const n = prev.filter(r => r.id !== id);
      const final = n.length === 0 ? [{ id: ++_filterId, field: '', op: 'include', values: [] }] : n;
      syncParent(final); return final;
    });
  };

  const clear = () => {
    setRows([{ id: ++_filterId, field: '', op: 'include', values: [] }]);
    onSearchChange('');
    onConditionsChange([]);
    setOpen(false);
  };

  const activeCount = rows.filter(r => r.field && r.values.length > 0 && r.values.some(v => v.trim())).length;

  const popContent = (
    <div style={{ minWidth: 420, maxWidth: 560 }}>
      {/* 搜索行 */}
      <div style={{ marginBottom: 8 }}>
        <Input placeholder="全局搜索" prefix={<SearchOutlined />} allowClear size="small"
          value={searchText} onChange={e => onSearchChange(e.target.value)} />
      </div>

      <Divider style={{ margin: '8px 0' }} />

      {/* 条件行 */}
      {rows.map(r => (
        <FilterRowContent key={r.id} r={r} fields={fields} onUpdate={updateRow} onRemove={removeRow} />
      ))}

      {/* 操作按钮 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <Button size="small" icon={<PlusOutlined />} onClick={addRow}>添加条件</Button>
        {(activeCount > 0 || searchText) && (
          <Button size="small" icon={<ClearOutlined />} onClick={clear}>清除筛选</Button>
        )}
      </div>
    </div>
  );

  return (
    <Popover
      content={popContent}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomLeft"
      overlayStyle={{ maxWidth: 600 }}
    >
      <Button size="small" icon={<FilterOutlined />}>
        筛选{activeCount > 0 ? ` (${activeCount})` : ''}
      </Button>
      {searchText && (
        <span style={{ marginLeft: 8, color: '#999', fontSize: 12 }}>搜索: "{searchText}"</span>
      )}
    </Popover>
  );
}
