import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const phases = [
  { 
    id: 'menstrual', name: 'Menstrual', color: '#df9b6d', bg: '#eed9c4', textColor: '#5a3d28',
    calendarHighlight: [24, 25, 26, 27],
  },
  { 
    id: 'follicular', name: 'Follicular', color: '#8ca090', bg: '#e2eae5', textColor: '#2e3a32',
    calendarHighlight: [5, 6, 7, 8, 9, 10, 11, 12],
  },
  { 
    id: 'ovulatory', name: 'Ovulatory', color: '#dfbe7e', bg: '#f5eedc', textColor: '#544629',
    calendarHighlight: [13, 14, 15],
  },
  { 
    id: 'luteal', name: 'Luteal', color: '#9d8ea6', bg: '#e8e2eb', textColor: '#3a2f42',
    calendarHighlight: [16, 17, 18, 19, 20, 21, 22, 23],
  }
];

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

// Determine which phase a day falls in (simplified cyclic model)
function getPhaseForDay(day) {
  if ([24, 25, 26, 27, 28, 1, 2, 3, 4].includes(day)) return phases[0]; // Menstrual
  if ([5, 6, 7, 8, 9, 10, 11, 12].includes(day)) return phases[1]; // Follicular
  if ([13, 14, 15].includes(day)) return phases[2]; // Ovulatory
  if ([16, 17, 18, 19, 20, 21, 22, 23].includes(day)) return phases[3]; // Luteal
  return null;
}

function MonthCalendar({ year, month, today }) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const isCurrentMonth = today && today.year === year && today.month === month;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-[#1e2722] rounded-[2.5rem] p-6 sm:p-8 shadow-2xl border border-white/5"
    >
      {/* Month Header */}
      <div className="flex justify-between items-center mb-5">
        <span className="font-handwriting text-2xl sm:text-3xl font-bold text-[#df9b6d]">
          {monthNames[month]} {year}
        </span>
        <div className="flex gap-1.5">
          {phases.map(p => (
            <div key={p.id} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-[10px] text-white/40 font-sans hidden sm:inline">{p.name.slice(0,3)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-y-2.5 gap-x-1.5 text-center text-sm font-sans">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-white/40 font-bold text-xs uppercase pb-1">{d}</div>
        ))}

        {/* Empty leading cells */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const phase = getPhaseForDay(day);
          const isToday = isCurrentMonth && day === today.day;

          return (
            <div key={day} className="relative flex items-center justify-center h-9 w-9 mx-auto">
              {phase && (
                <motion.div
                  initial={{ scale: 0.85 }}
                  animate={{ scale: 1 }}
                  className="absolute inset-0 rounded-xl flex items-center justify-center opacity-80"
                  style={{ backgroundColor: phase.color }}
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#1e2722]" fill="currentColor">
                    <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.21l8.2-1.192z" />
                  </svg>
                </motion.div>
              )}
              {isToday && (
                <div
                  className="absolute inset-0 border-2 border-dashed rounded-xl border-[#df9b6d] z-10"
                />
              )}
              <span className={`relative z-10 font-bold text-sm ${phase ? 'text-[#1e2722]' : 'text-white'}`}>
                {day}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

export default function CalendarView({ username = 'user', setView }) {
  const now = new Date();
  const today = { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
  
  // Start viewing from 2 months ago so the current month is centered
  const [startYear, setStartYear] = useState(now.getFullYear());
  const [startMonth, setStartMonth] = useState(now.getMonth() > 0 ? now.getMonth() - 1 : 11);
  const [goToMonth, setGoToMonth] = useState(now.getMonth());
  const [goToYear, setGoToYear] = useState(now.getFullYear());

  // Generate 3 months to display
  const months = [];
  for (let i = 0; i < 3; i++) {
    let m = startMonth + i;
    let y = startYear;
    if (m > 11) { m -= 12; y += 1; }
    months.push({ year: y, month: m });
  }

  const handleGoTo = () => {
    // Center the selected month (show month-1, month, month+1)
    let prevMonth = goToMonth - 1;
    let prevYear = goToYear;
    if (prevMonth < 0) { prevMonth = 11; prevYear -= 1; }
    setStartMonth(prevMonth);
    setStartYear(prevYear);
  };

  const handlePrev = () => {
    let m = startMonth - 3;
    let y = startYear;
    while (m < 0) { m += 12; y -= 1; }
    setStartMonth(m);
    setStartYear(y);
  };

  const handleNext = () => {
    let m = startMonth + 3;
    let y = startYear;
    while (m > 11) { m -= 12; y += 1; }
    setStartMonth(m);
    setStartYear(y);
  };

  return (
    <motion.div
      className="w-full min-h-screen flex flex-col font-sans"
      style={{ backgroundColor: '#eed9c4' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >

      {/* Top Banner */}
      <motion.div
        className="w-full py-5 px-6 sm:px-12 flex flex-col md:flex-row justify-between items-center text-black border-b border-black/10 shadow-sm"
        style={{ backgroundColor: '#df9b6d' }}
      >
        {/* Left: Brand */}
        <button
          onClick={() => setView('landing')}
          className="text-2xl font-black text-black tracking-widest hover:opacity-80 transition-opacity cursor-pointer mb-4 md:mb-0 focus:outline-none"
        >
          SELENE
        </button>

        {/* Center: Welcome */}
        <div className="flex flex-col items-center text-center mb-4 md:mb-0">
          <h1 className="font-handwriting text-3xl sm:text-4xl font-bold tracking-wide leading-none">
            Hellove, {username}
          </h1>
          <p className="font-handwriting text-xl sm:text-2xl opacity-90 mt-1">
            {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('dashboard')}
            className="border border-black text-black hover:bg-black hover:text-white font-handwriting text-xl px-6 py-1.5 rounded-full transition-all duration-300 cursor-pointer focus:outline-none"
          >
            ← Dashboard
          </button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="w-full max-w-5xl mx-auto px-6 py-10 flex flex-col gap-10">

        {/* Go To Month Control */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <span className="font-sans text-black text-xl font-bold tracking-widest uppercase">GO TO:</span>
          <div className="flex items-center gap-2">
            <select
              value={goToMonth}
              onChange={(e) => setGoToMonth(Number(e.target.value))}
              className="bg-white/60 backdrop-blur-sm border border-black/10 text-black font-handwriting text-xl px-4 py-2 rounded-2xl focus:outline-none cursor-pointer shadow-sm"
            >
              {monthNames.map((name, idx) => (
                <option key={idx} value={idx}>{name}</option>
              ))}
            </select>
            <select
              value={goToYear}
              onChange={(e) => setGoToYear(Number(e.target.value))}
              className="bg-white/60 backdrop-blur-sm border border-black/10 text-black font-handwriting text-xl px-4 py-2 rounded-2xl focus:outline-none cursor-pointer shadow-sm"
            >
              {[2024, 2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleGoTo}
              className="bg-[#1e2722] text-white font-handwriting text-xl px-6 py-2 rounded-2xl shadow-md hover:bg-[#2a3830] transition-colors duration-200 cursor-pointer focus:outline-none"
            >
              Go
            </motion.button>
          </div>
        </div>

        {/* Navigation Arrows */}
        <div className="flex justify-between items-center">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handlePrev}
            className="w-12 h-12 rounded-full bg-white/40 backdrop-blur-sm border border-black/10 flex items-center justify-center text-black hover:bg-white/70 transition-colors cursor-pointer focus:outline-none shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </motion.button>
          <span className="font-handwriting text-black/50 text-lg">
            {monthNames[months[0].month]} – {monthNames[months[2].month]} {months[2].year}
          </span>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleNext}
            className="w-12 h-12 rounded-full bg-white/40 backdrop-blur-sm border border-black/10 flex items-center justify-center text-black hover:bg-white/70 transition-colors cursor-pointer focus:outline-none shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </motion.button>
        </div>

        {/* Month Grids */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${startYear}-${startMonth}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-8"
          >
            {months.map(({ year, month }) => (
              <MonthCalendar key={`${year}-${month}`} year={year} month={month} today={today} />
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Phase Legend */}
        <div className="bg-white/40 backdrop-blur-sm rounded-3xl p-6 border border-black/5 shadow-md">
          <h3 className="font-handwriting text-2xl text-black font-bold mb-4 text-center">Phase Legend</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {phases.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-2xl" style={{ backgroundColor: p.bg }}>
                <div className="w-5 h-5 rounded-lg flex-shrink-0" style={{ backgroundColor: p.color }}>
                  <svg viewBox="0 0 24 24" className="w-full h-full p-0.5" fill={p.textColor}>
                    <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.21l8.2-1.192z" />
                  </svg>
                </div>
                <div>
                  <span className="font-handwriting text-lg font-bold" style={{ color: p.textColor }}>{p.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <AppFooter />
    </motion.div>
  );
}

function AppFooter() {
  return (
    <footer className="w-full mt-auto">
      <div className="w-full bg-[var(--color-selene-brown)] py-8 px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <span className="font-handwriting text-white text-xl tracking-wider">SELENE</span>
        <div className="flex gap-6 font-handwriting text-white/80 text-lg">
          <span className="hover:text-white cursor-pointer transition-colors">privacy manifesto</span>
          <span className="hover:text-white cursor-pointer transition-colors">github</span>
          <span className="hover:text-white cursor-pointer transition-colors">contact</span>
        </div>
        <span className="font-handwriting text-white/50 text-sm">© 2026 selene</span>
      </div>
    </footer>
  );
}
