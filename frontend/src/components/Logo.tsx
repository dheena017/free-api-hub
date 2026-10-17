import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  withText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  withText = false
}) => {
  const sizeMap = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className={`relative ${sizeMap[size]} rounded-xl overflow-hidden border border-[#26272C] flex-shrink-0 bg-[#0D0E11]`}>
        <img
          src="/logo.png"
          alt="FreeAPIHub Logo"
          className="w-full h-full object-cover"
        />
      </div>

      {withText && (
        <div className="flex flex-col">
          <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
            FreeAPI<span className="text-accent">Hub</span>
            <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              100% Free
            </span>
          </span>
        </div>
      )}
    </div>
  );
};
