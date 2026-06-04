import { useMemo } from 'react';
import { Input, Select, Row, Col, Button, Space } from 'antd';
import { ClearOutlined, SearchOutlined } from '@ant-design/icons';

export interface FilterFieldDef {
  key: string;
  label: string;
  options?: { value: string; label: string }[];
}

interface RecordFilterBarProps {
  searchText: string;
  onSearchChange: (v: string) => void;
  selectedFields: string[];
  onFieldsChange: (v: string[]) => void;
  filterValues: Record<string, string[]>;
  onFilterChange: (key: string, values: string[]) => void;
  onClear: () => void;
  fields: FilterFieldDef[];
  placeholder?: string;
}

export default function RecordFilterBar({
  searchText, onSearchChange, selectedFields, onFieldsChange,
  filterValues, onFilterChange, onClear, fields, placeholder,
}: RecordFilterBarProps) {
  const hasFilters = searchText || Object.keys(filterValues).some(k => filterValues[k]?.length > 0);

  return (
    <div style={{ marginBottom: 12, padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
      <Row gutter={[8, 8]} align="middle">
        <Col>
          <Input placeholder={placeholder || '搜索'} prefix={<SearchOutlined />} allowClear
            style={{ width: 180 }} value={searchText} onChange={e => onSearchChange(e.target.value)} />
        </Col>
        <Col>
          <Select mode="multiple" size="small" placeholder="选择筛选字段" style={{ minWidth: 150 }}
            value={selectedFields} onChange={onFieldsChange}
            options={fields.map(f => ({ value: f.key, label: f.label }))} maxTagCount={3} />
        </Col>
        {selectedFields.map(fk => {
          const fd = fields.find(f => f.key === fk);
          if (!fd) return null;
          return (
            <Col key={fk}>
              {fd.options ? (
                <Select
                  mode="multiple"
                  allowClear
                  size="small"
                  placeholder={fd.label}
                  style={{ minWidth: 140, maxWidth: 240 }}
                  value={filterValues[fk] || []}
                  onChange={(v) => onFilterChange(fk, v)}
                  options={fd.options}
                  maxTagCount={2}
                />
              ) : (
                <Input allowClear size="small" placeholder={fd.label} style={{ width: 140 }}
                  value={filterValues[fk]?.[0] || ''}
                  onChange={e => onFilterChange(fk, e.target.value ? [e.target.value] : [])} />
              )}
            </Col>
          );
        })}
        {hasFilters && (
          <Col>
            <Button size="small" icon={<ClearOutlined />} onClick={onClear}>清除</Button>
          </Col>
        )}
      </Row>
    </div>
  );
}

/** 多值筛选逻辑：filters 中某字段有值时，任意一个值匹配即通过 */
export function applyFilters<T extends Record<string, any>>(
  list: T[],
  filters: Record<string, string[]>,
  fieldDefs: FilterFieldDef[],
  searchText: string,
  searchKeys: (keyof T)[],
): T[] {
  let result = [...list];

  if (searchText.trim()) {
    const kw = searchText.trim().toLowerCase();
    result = result.filter(item => searchKeys.some(k => String(item[k] ?? '').toLowerCase().includes(kw)));
  }

  for (const [key, vals] of Object.entries(filters)) {
    if (!vals || vals.length === 0) continue;
    const fd = fieldDefs.find(f => f.key === key);
    result = result.filter(item => {
      const fieldVal = String(item[key] ?? '').toLowerCase();
      return vals.some(v => fieldVal.includes(v.trim().toLowerCase()));
    });
  }

  return result;
}
