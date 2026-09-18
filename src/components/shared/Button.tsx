import React, { type ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ className = '', type = 'button', ...props }: ButtonProps) {
  return <button className={`button ${className}`.trim()} type={type} {...props} />;
}