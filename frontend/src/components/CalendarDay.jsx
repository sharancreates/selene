import React from 'react';
import { motion } from 'framer-motion';

const CalendarDay = React.memo(({ 
  day, 
  dateStr, 
  phase, 
  predictedPhase, 
  isToday, 
  onClick, 
  darkCalendar,
  phaseConfig,
  predictedPhaseConfig 
}) => {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center justify-center h-9 w-9 mx-auto cursor-pointer focus:outline-none"
    >
      {phase && (
        <motion.div
          initial={{ scale: 0.85 }}
          animate={{ scale: 1 }}
          className="absolute inset-0 rounded-xl flex items-center justify-center opacity-80"
          style={{ backgroundColor: phaseConfig.color }}
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#1e2722]" fill="currentColor">
            <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.21l8.2-1.192z" />
          </svg>
        </motion.div>
      )}
      
      {predictedPhase && !phase && (
        <div
          className="absolute inset-0 rounded-xl border-2 border-dashed flex items-center justify-center"
          style={{ 
            borderColor: predictedPhaseConfig.color, 
            backgroundColor: `${predictedPhaseConfig.color}22` 
          }}
        >
          <span className="absolute bottom-0.5 right-1 text-[8px] font-sans font-bold" style={{ color: predictedPhaseConfig.textColor }}>P</span>
        </div>
      )}

      {isToday && (
        <div
          className="absolute inset-0 border-2 border-dashed rounded-xl border-[#df9b6d] z-10"
        />
      )}

      <span className={`relative z-10 font-bold text-sm ${
        phase 
          ? 'text-[#1e2722]' 
          : (darkCalendar ? 'text-white' : 'text-black')
      }`}>
        {day}
      </span>
    </button>
  );
});

export default CalendarDay;
