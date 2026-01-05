import React from 'react';
import { LucideIcon } from 'lucide-react';

// --- Brand Logo ---
export const BrandLogo: React.FC<{ size?: 'small' | 'large', className?: string, theme?: 'light' | 'dark', layout?: 'vertical' | 'horizontal' }> = ({ size = 'small', className = '', theme = 'light', layout = 'vertical' }) => {
  const isDark = theme === 'dark';
  return (
    <div className={`flex ${layout === 'horizontal' ? 'flex-row gap-3' : 'flex-col mb-3'} items-center justify-center ${className}`}>
      <div className={`${size === 'large' ? 'w-16 h-16' : 'w-10 h-10'} ${isDark ? 'text-amber-400' : 'text-amber-500'} ${layout === 'vertical' ? 'mb-3' : ''}`}>
        {/* Crown SVG */}
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full drop-shadow-sm">
          <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5ZM19 19C19 19.6 18.6 20 18 20H6C5.4 20 5 19.6 5 19V18H19V19Z" />
        </svg>
      </div>
      <h1 className={`${size === 'large' ? 'text-3xl' : 'text-xl'} text-center font-bold ${isDark ? 'text-white' : 'text-slate-900'} font-['Playfair_Display'] tracking-tight leading-none`}>
        CONCURSOS <span className={`${isDark ? 'text-amber-400' : 'text-amber-500'} ${layout === 'horizontal' ? 'inline-block ml-1' : 'block mt-1'} text-sm tracking-widest`}>DPA</span>
      </h1>
    </div>
  );
};

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'success';
  fullWidth?: boolean;
  icon?: LucideIcon;
}

export const Button: React.FC<ButtonProps> = ({
  children, variant = 'primary', fullWidth, className = '', icon: Icon, ...props
}) => {
  // Mobile: min-height 44px (h-11), text-base (16px) for legibility
  // Desktop (md): text-sm
  const baseStyles = "inline-flex items-center justify-center px-4 h-11 md:h-auto md:py-3 text-base md:text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none rounded-2xl active:scale-[0.98]";

  const variants = {
    // Primary is now Black (Slate-900)
    primary: "bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-500 shadow-md shadow-slate-200",
    outline: "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 focus:ring-slate-200",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    danger: "bg-rose-50 text-rose-600 hover:bg-rose-100 focus:ring-rose-500",
    success: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 focus:ring-emerald-500",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-5 h-5 md:w-4 md:h-4 mr-2" />}
      {children}
    </button>
  );
};

// --- Card ---
export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white border border-slate-100 shadow-sm rounded-2xl p-4 md:p-6 ${onClick ? 'cursor-pointer hover:border-amber-200 transition-colors' : ''} ${className}`}
  >
    {children}
  </div>
);

// --- Input ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => (
  <div className="w-full space-y-1">
    {label && <label className="text-base md:text-sm font-medium text-slate-700 ml-1">{label}</label>}
    <input
      // Mobile: text-base (16px) prevents iOS zoom. h-11 (44px) for touch target.
      className={`w-full px-4 h-11 md:h-auto md:py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all text-base md:text-sm ${error ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-amber-400'} ${className}`}
      {...props}
    />
    {error && <p className="text-sm text-rose-500 ml-1">{error}</p>}
  </div>
);

// --- Text Area ---
interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, error, className = '', ...props }) => (
  <div className="w-full space-y-1">
    {label && <label className="text-base md:text-sm font-medium text-slate-700 ml-1">{label}</label>}
    <textarea
      // Mobile: text-base to prevent zoom
      className={`w-full px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all min-h-[100px] resize-y text-base md:text-sm ${error ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-amber-400'} ${className}`}
      {...props}
    />
    {error && <p className="text-sm text-rose-500 ml-1">{error}</p>}
  </div>
);

// --- Select ---
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => (
  <div className="w-full space-y-1">
    {label && <label className="text-base md:text-sm font-medium text-slate-700 ml-1">{label}</label>}
    <div className="relative">
      <select
        // Mobile: text-base (16px), h-11 (44px)
        className={`w-full px-4 h-11 md:h-auto md:py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-400 transition-all appearance-none text-base md:text-sm ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {/* Custom arrow for consistent look if desired, but native is usually fine. Adding styling just in case */}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
        <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
      </div>
    </div>
  </div>
);

// --- Badge ---
export const Badge: React.FC<{ children: React.ReactNode; color?: 'blue' | 'green' | 'red' | 'gray' | 'amber' }> = ({ children, color = 'blue' }) => {
  const colors = {
    // Mapping 'blue' to amber/slate mix for backward compatibility with existing code calls, or just amber
    blue: 'bg-amber-50 text-amber-700 border border-amber-100',
    green: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    red: 'bg-rose-50 text-rose-700 border border-rose-100',
    gray: 'bg-slate-100 text-slate-700 border border-slate-200',
    amber: 'bg-amber-50 text-amber-700 border border-amber-100',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
};

// --- Modal ---
export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode; title?: string }> = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;
  return (
    <div className="!fixed !inset-0 !z-[99999] flex items-center justify-center p-4 !bg-black/60 !backdrop-blur-[5px] !w-screen !h-screen transition-opacity">
      <div className="bg-white w-[90%] max-w-[400px] max-h-[90vh] flex flex-col rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.2)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {title && (
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
            <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
            <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};