import React from 'react';

export default function CustomSlider({ label, leftLabel, rightLabel, value, onChange }) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <span className="font-handwriting text-black text-2xl pl-1">{label}</span>
      <div className="relative w-full flex items-center h-6">
        {/* Track background */}
        <div className="absolute inset-x-0 h-2 bg-[#694b3a]/30 rounded-full overflow-hidden">
          {/* Active bar */}
          <div 
            className="h-full bg-red-500 rounded-full" 
            style={{ width: `${value}%` }}
          />
        </div>
        
        {/* Invisible range input for dragging */}
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={value} 
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-x-0 w-full h-full opacity-0 cursor-pointer z-20"
          aria-label={label}
        />
        
        {/* Thumb */}
        <div 
          className="absolute w-5 h-5 bg-black rounded-full border-2 border-white pointer-events-none -translate-x-1/2 z-10 shadow"
          style={{ left: `${value}%` }}
        />
      </div>
      
      {/* Labels */}
      <div className="flex justify-between px-1">
        <span className="font-handwriting text-black/70 text-lg italic">{leftLabel}</span>
        <span className="font-handwriting text-black/70 text-lg italic">{rightLabel}</span>
      </div>
    </div>
  );
}
