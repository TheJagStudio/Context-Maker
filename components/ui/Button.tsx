
import React from 'react';

type ButtonProps = React.ComponentPropsWithoutRef<'button'> & {
  children: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
}

function Button({ children, icon, variant = 'primary', size = 'md', ...props }: ButtonProps): React.ReactNode {
  const baseClasses = 'inline-flex items-center justify-center font-black uppercase tracking-wider border-[3px] border-black neubrutal-shadow-sm transition-all duration-75 active:neubrutal-shadow-active disabled:opacity-50 disabled:cursor-not-allowed disabled:active:transform-none';

  const variantClasses = {
    primary: 'bg-sky-400 text-black hover:bg-sky-300',
    secondary: 'bg-white text-black hover:bg-gray-100',
    danger: 'bg-rose-400 text-black hover:bg-rose-300',
    success: 'bg-emerald-400 text-black hover:bg-emerald-300',
  };

  const sizeClasses = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-6 py-3 text-sm',
      lg: 'px-8 py-4 text-lg',
  };
  
  const iconMargin = children ? 'mr-2' : '';

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
      {...props}
    >
      {icon && <span className={`${iconMargin} w-5 h-5 flex-shrink-0`}>{icon}</span>}
      {children}
    </button>
  );
}

export default Button;
