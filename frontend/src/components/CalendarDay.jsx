import React from 'react';
import { motion } from 'framer-motion';

const CalendarDay = React.memo(({ 
  day, 
  dateStr, 
  loggedDay,
  phaseConfig,
  isPredicted,
  isToday, 
  isSelected,
  isPast,
  isFuture,
  onClick, 
  darkCalendar
}) => {
  const hasLog = Boolean(loggedDay);
  const phaseId = phaseConfig?.id;
  const isMenstrual = phaseId === 'menstrual';
  const isOvulatory = phaseId === 'ovulatory';
  const flow = loggedDay?.flow_intensity;

  // Determine text color based on background and theme
  let textColor = darkCalendar ? 'text-white' : 'text-black';
  if (hasLog && phaseConfig) {
    textColor = 'text-[#1e2722] font-black';
  } else if (isPast && !hasLog) {
    textColor = darkCalendar ? 'text-white/30' : 'text-black/30';
  }

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      title={`${dateStr}: ${hasLog ? `Logged ${phaseConfig?.name || 'Day'}` : (isPredicted ? `Predicted ${phaseConfig?.name || 'Phase'}` : 'Unlogged')}`}
      className={`relative flex flex-col items-center justify-center h-10 w-10 sm:h-11 sm:w-11 mx-auto rounded-2xl cursor-pointer focus:outline-none transition-all duration-200 ${
        isSelected 
          ? `ring-2 ${darkCalendar ? 'ring-white bg-white/10' : 'ring-[#1e2722] bg-black/10'} shadow-md z-20` 
          : ''
      } ${
        isToday && !isSelected
          ? `ring-2 ring-[#df9b6d] ring-offset-1 ${darkCalendar ? 'ring-offset-[#1e2722]' : 'ring-offset-white'} font-black`
          : ''
      }`}
    >
      {/* 1. Logged Day Solid Pill */}
      {hasLog && phaseConfig && (
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="absolute inset-0 rounded-2xl opacity-90 shadow-sm"
          style={{ backgroundColor: phaseConfig.color }}
        />
      )}
      
      {/* 2. Predicted Future Day Soft Pill */}
      {!hasLog && isPredicted && phaseConfig && (isFuture || isToday) && (
        <div
          className={`absolute inset-0.5 rounded-xl transition-opacity duration-200 ${
            isMenstrual 
              ? 'border border-[#df9b6d] bg-[#df9b6d]/25' 
              : isOvulatory 
                ? 'border border-[#dfbe7e] bg-[#dfbe7e]/25' 
                : 'bg-current opacity-5'
          }`}
          style={!isMenstrual && !isOvulatory ? { backgroundColor: `${phaseConfig.color}20` } : {}}
        />
      )}

      {/* Day Number */}
      <span className={`relative z-10 text-xs sm:text-sm font-bold leading-none ${textColor}`}>
        {day}
      </span>

      {/* Bottom Indicators: Blood Drop or Logged Data Dot */}
      <div className="relative z-10 flex items-center justify-center gap-0.5 h-2 mt-0.5">
        {hasLog && isMenstrual && (
          <span className="text-[9px] leading-none select-none" title={`Flow: ${flow ?? 'recorded'}`}>
            🩸
          </span>
        )}
        {hasLog && !isMenstrual && (
          <span 
            className="w-1.5 h-1.5 rounded-full shadow-xs" 
            style={{ backgroundColor: darkCalendar ? '#1e2722' : '#ffffff' }} 
            title="Symptoms recorded"
          />
        )}
        {!hasLog && isPredicted && isMenstrual && (isFuture || isToday) && (
          <span className="w-1.5 h-1.5 rounded-full bg-[#df9b6d] opacity-80" title="Expected period" />
        )}
        {!hasLog && isPredicted && isOvulatory && (isFuture || isToday) && (
          <span className="w-1.5 h-1.5 rounded-full bg-[#dfbe7e] opacity-90" title="Fertile window" />
        )}
      </div>
    </motion.button>
  );
});

export default CalendarDay;
