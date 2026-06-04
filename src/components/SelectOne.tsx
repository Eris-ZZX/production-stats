import { useState, useCallback } from 'react';
import { Select, type SelectProps } from 'antd';

/**
 * 单选下拉框，选择后自动收回。
 * 替换 mode="tags" maxCount={1} 避免下拉不关闭的问题。
 */
export default function SelectOne(props: SelectProps) {
  const [open, setOpen] = useState(false);

  const handleChange = useCallback((value: any, option: any) => {
    // 选中后关闭下拉
    setTimeout(() => setOpen(false), 0);
    props.onChange?.(value, option);
  }, [props.onChange]);

  const { onChange: _onChange, ...rest } = props;

  return (
    <Select
      showSearch
      optionFilterProp="label"
      mode="tags"
      maxCount={1}
      open={open}
      onDropdownVisibleChange={(visible) => setOpen(visible)}
      onChange={handleChange}
      {...rest}
    />
  );
}
