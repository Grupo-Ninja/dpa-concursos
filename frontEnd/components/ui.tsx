import React from 'react';
import { LucideIcon } from 'lucide-react';

// --- Brand Logo ---
export const BrandLogo: React.FC<{ size?: 'small' | 'large', className?: string, theme?: 'light' | 'dark' }> = ({ size = 'small', className = '', theme = 'light' }) => {
  const isDark = theme === 'dark';
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`${size === 'large' ? 'w-16 h-16' : 'w-10 h-10'} ${isDark ? 'text-amber-400' : 'text-amber-500'} mb-3`}>
         {/* Crown SVG */}
         <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full drop-shadow-sm">
           <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5ZM19 19C19 19.6 18.6 20 18 20H6C5.4 20 5 19.6 5 19V18H19V19Z"/>
         </svg>
      </div>
      <h1 className={`${size === 'large' ? 'text-3xl' : 'text-xl'} text-center font-bold ${isDark ? 'text-white' : 'text-slate-900'} font-['Playfair_Display'] tracking-tight leading-none`}>
        CONCURSOS <span className={`${isDark ? 'text-amber-400' : 'text-amber-500'} block text-sm tracking-widest mt-1`}>DPA</span>
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
  const baseStyles = "inline-flex items-center justify-center px-4 py-3 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none rounded-2xl active:scale-[0.98]";
  
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
      {Icon && <Icon className="w-4 h-4 mr-2" />}
      {children}
    </button>
  );
};

// --- Card ---
export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white border border-slate-100 shadow-sm rounded-2xl p-4 sm:p-6 ${onClick ? 'cursor-pointer hover:border-amber-200 transition-colors' : ''} ${className}`}
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
    {label && <label className="text-sm font-medium text-slate-700 ml-1">{label}</label>}
    <input 
      className={`w-full px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all ${error ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-amber-400'} ${className}`}
      {...props}
    />
    {error && <p className="text-xs text-rose-500 ml-1">{error}</p>}
  </div>
);

// --- Text Area ---
interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, error, className = '', ...props }) => (
  <div className="w-full space-y-1">
    {label && <label className="text-sm font-medium text-slate-700 ml-1">{label}</label>}
    <textarea 
      className={`w-full px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all min-h-[100px] resize-y ${error ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-amber-400'} ${className}`}
      {...props}
    />
    {error && <p className="text-xs text-rose-500 ml-1">{error}</p>}
  </div>
);

// --- Select ---
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => (
  <div className="w-full space-y-1">
    {label && <label className="text-sm font-medium text-slate-700 ml-1">{label}</label>}
    <select 
      className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-400 transition-all ${className}`}
      {...props}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-100">
        {title && (
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-semibold text-slate-800">{title}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};