import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <input
      className={`px-3 py-2 border rounded-lg text-sm outline-none transition-colors
        ${error ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'}
        disabled:bg-gray-50 disabled:text-gray-400 ${className}`}
      {...props}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);
