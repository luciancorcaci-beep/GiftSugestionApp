import React, { type SelectHTMLAttributes } from 'react';

type SelectOption = {
  label: string;
  value: string;
};

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: SelectOption[];
  placeholder?: string;
};

export function Select({ id, label, className = '', options, placeholder, ...props }: SelectProps) {
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      <select className={`input ${className}`.trim()} id={id} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
