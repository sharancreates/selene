import React, { useState } from 'react';

export default function CustomSlider({ 
  label, 
  leftLabel, 
  rightLabel, 
  value, 
  onChange, 
  min = 0, 
  max = 100,
  showValueBadge = true,
  valueSuffix = ""
}) {
  const [isFocused, setIsFocused] = useState(false);
  
  // Calculate percentage for styling the track
  const percentage = Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);

  return (
    <div className="flex flex-col gap-1 w-full group">
      <div className="flex justify-between items-center px-1">
        <span className="font-handwriting text-black text-2xl font-bold tracking-wide transition-colors duration-200 group-hover:text-[var(--color-selene-brown)]">
          {label}
        </span>
        {showValueBadge && (
          <span className="font-sans text-xs bg-black/10 text-black px-2 py-0.5 rounded-full font-bold shadow-sm backdrop-blur-sm transition-transform duration-200 group-hover:scale-105">
            {value}{valueSuffix}
          </span>
        )}
      </div>
      
      <div className="relative w-full flex items-center h-6">
        {/* Track background */}
        <div className="absolute inset-x-0 h-2 bg-[#694b3a]/20 rounded-full overflow-hidden transition-all duration-300 group-hover:h-[9px]">
          {/* Active bar */}
          <div 
            className="h-full bg-gradient-to-r from-[var(--color-selene-brown)] to-[var(--color-selene-brown-light)] rounded-full transition-all duration-100" 
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        {/* Invisible range input for dragging */}
        <input 
          type="range" 
          min={min} 
          max={max} 
          value={value} 
          onChange={(e) => onChange(Number(e.target.value))}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="absolute inset-x-0 w-full h-full opacity-0 cursor-pointer z-20"
          aria-label={label}
        />
        
        {/* Thumb */}
        <div 
          className={`absolute w-5 h-5 bg-black rounded-full border-2 border-white pointer-events-none -translate-x-1/2 z-10 shadow-lg transition-all duration-200 group-hover:scale-125 group-hover:bg-[var(--color-selene-brown)] ${
            isFocused ? 'ring-4 ring-[var(--color-selene-brown-light)]/40 scale-125' : ''
          }`}
          style={{ left: `${percentage}%` }}
        />
      </div>
      
      {/* Labels */}
      <div className="flex justify-between px-1">
        <span className="font-handwriting text-black/70 text-lg italic transition-all duration-200 group-hover:text-black/90">{leftLabel}</span>
        <span className="font-handwriting text-black/70 text-lg italic transition-all duration-200 group-hover:text-black/90">{rightLabel}</span>
      </div>
    </div>
  );
}
