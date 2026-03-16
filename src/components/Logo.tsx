import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  variant?: 'light' | 'dark';
  onClick?: () => void;
}

export default function Logo({ className = "h-8", showText = true, variant = 'light', onClick }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`} onClick={onClick}>
      <div className="relative w-10 h-10 flex items-center justify-center">
        {/* Shield Background */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-indigo-500">
          <path 
            d="M50 5 L90 20 V50 C90 75 50 95 50 95 C50 95 10 75 10 50 V20 L50 5 Z" 
            fill="currentColor" 
            fillOpacity="0.1"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
        
        {/* Globe & Compass */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full p-2 text-indigo-400">
          <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M20 50 H80 M50 20 V80" stroke="currentColor" strokeWidth="1" opacity="0.5" />
          <path d="M50 25 L55 45 L75 50 L55 55 L50 75 L45 55 L25 50 L45 45 Z" fill="currentColor" />
        </svg>

        {/* Graduation Cap on Top */}
        <svg viewBox="0 0 100 100" className="absolute -top-2 w-12 h-12 text-indigo-600">
          <path d="M20 40 L50 25 L80 40 L50 55 Z" fill="currentColor" />
          <path d="M35 48 V55 C35 55 40 60 50 60 C60 60 65 55 65 55 V48" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M80 40 V55" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <span className={`font-black tracking-tighter text-xl leading-none ${variant === 'light' ? 'text-white' : 'text-gray-900'}`}>
            LEARNOVA
          </span>
          <span className={`text-[6px] font-bold tracking-[0.2em] uppercase opacity-60 ${variant === 'light' ? 'text-indigo-300' : 'text-indigo-600'}`}>
            Stop Cramming. Start Mastering.
          </span>
        </div>
      )}
    </div>
  );
}
