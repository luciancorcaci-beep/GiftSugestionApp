import React, { type InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Input({ id, label, className = '', ...props }: InputProps) {
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      <input className={`input ${className}`.trim()} id={id} {...props} />
    </label>
  );
}