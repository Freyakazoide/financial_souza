
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const Card: React.FC<CardProps> = ({ children, className, title }) => (
  <div className={`bg-base-100 shadow-xl rounded-xl p-4 sm:p-6 border border-neutral/50 ${className}`}>
    {title && <h2 className="text-xl font-bold text-slate-100 mb-4">{title}</h2>}
    {children}
  </div>
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}

export const Button: React.FC<ButtonProps> = ({ children, className, variant = 'primary', ...props }) => {
  const baseClasses = "px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";
  const variantClasses = {
    primary: 'bg-primary text-slate-900 hover:bg-secondary focus:ring-primary',
    secondary: 'bg-neutral text-slate-200 hover:bg-slate-600 focus:ring-slate-500',
    danger: 'bg-danger text-white hover:bg-red-500 focus:ring-danger',
    ghost: 'bg-transparent text-primary hover:bg-primary/10 focus:ring-primary'
  };

  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input: React.FC<InputProps> = ({ label, id, ...props }) => (
  <div className="w-full">
    <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
    <input id={id} className="w-full px-3 py-2 bg-neutral/50 border border-neutral rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm text-slate-200 placeholder-slate-400" {...props} />
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

export const Select: React.FC<SelectProps> = ({ label, id, children, ...props }) => (
  <div className="w-full">
    <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
    <select id={id} className="w-full px-3 py-2 bg-neutral/50 border border-neutral rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm text-slate-200" {...props}>
        {children}
    </select>
  </div>
);