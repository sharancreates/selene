import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CalendarDay from './CalendarDay';
import { decryptData } from '../utils/crypto';
import { getPhaseForCalendarDay } from './Dashboard';

const phases = [
  { 
    id: 'menstrual', 
    name: 'Menstrual', 
    color: '#df9b6d', 
    bg: '#eed9c4', 
    textColor: '#362113',
    description: 'Uterine shedding & rest. Low estrogen & progesterone. Ideal for restorative movement.'
  },
  { 
    id: 'follicular', 
    name: 'Follicular', 
    color: '#8ca090', 
    bg: '#e2eae5', 
    textColor: '#1d2b20',
    description: 'Follicle growth & rising estrogen. High mental clarity, motivation, and physical stamina.'
  },
  { 
    id: 'ovulatory', 
    name: 'Ovulatory', 
    color: '#dfbe7e', 
    bg: '#f5eedc', 
    textColor: '#382c16',
    description: 'Estrogen peak & LH surge. Peak fertility, social confidence, libido, and energy.'
  },
  { 
    id: 'luteal', 
    name: 'Luteal', 
    color: '#9d8ea6', 
    bg: '#e8e2eb', 
    textColor: '#2a1f33',
    description: 'Progesterone dominance. Calmer pace, nesting energy; monitor for PMS/PMDD cues.'
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

function MonthCalendar({ 
  year, 
  month, 
  todayDateStr, 
  selectedDate, 
  logs, 
  prediction, 
  user, 
  onDayClick, 
  darkCalendar 
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Fast lookup map for logs of this month
  const logMap = useMemo(() => {
    const map = {};
    if (Array.isArray(logs)) {
      logs.forEach(log => {
        if (log && log.log_date) {
          map[log.log_date] = log;
        }
      });
    }
    return map;
  }, [logs]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-3xl p-6 sm:p-8 shadow-xl border transition-colors duration-300 ${
        darkCalendar 
          ? "bg-[#1e2722] text-white border-white/10" 
          : "bg-white/85 text-black border-black/5"
      }`}
    >
      {/* Month Header */}
      <div className="flex justify-between items-center mb-6">
        <span className={`font-handwriting text-2xl sm:text-3xl font-bold tracking-wide ${
          darkCalendar ? "text-[#df9b6d]" : "text-[var(--color-selene-brown)]"
        }`}>
          {monthNames[month]} {year}
        </span>
        <div className="flex gap-2 font-sans">
          {phases.map(p => (
            <div key={p.id} className="flex items-center gap-1.5" title={p.name}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
              <span className={`text-[11px] hidden sm:inline ${
                darkCalendar ? "text-white/50" : "text-black/50"
              }`}>{p.name.slice(0,3)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Day of Week Headers */}
      <div className="grid grid-cols-7 gap-y-3 gap-x-1 sm:gap-x-2 text-center text-xs font-sans">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className={`font-bold uppercase pb-1 ${
            darkCalendar ? "text-white/40" : "text-black/40"
          }`}>{d}</div>
        ))}

        {/* Empty leading cells */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          
          const loggedDay = logMap[dateStr] || null;
          const isToday = dateStr === todayDateStr;
          const isSelected = dateStr === selectedDate;
          const isPast = dateStr < todayDateStr;
          const isFuture = dateStr > todayDateStr;

          // Determine phase
          let phaseId = null;
          let isPredicted = false;

          if (loggedDay && loggedDay.phase) {
            phaseId = loggedDay.phase;
          } else {
            phaseId = getPhaseForCalendarDay(dateStr, logs, prediction, user);
            isPredicted = true;
          }

          const phaseConfig = phaseId ? phases.find(p => p.id === phaseId) : null;

          return (
            <CalendarDay
              key={dateStr}
              day={day}
              dateStr={dateStr}
              loggedDay={loggedDay}
              phaseConfig={phaseConfig}
              isPredicted={isPredicted}
              isToday={isToday}
              isSelected={isSelected}
              isPast={isPast}
              isFuture={isFuture}
              onClick={() => onDayClick(dateStr)}
              darkCalendar={darkCalendar}
            />
          );
        })}
      </div>
    </motion.div>
  );
}

export default function CalendarView({ 
  username = 'user', 
  setView, 
  token, 
  user, 
  onLogout, 
  selectedDate, 
  setSelectedDate 
}) {
  const now = new Date();
  const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  const [logs, setLogs] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [activeDate, setActiveDate] = useState(selectedDate || todayDateStr);
  const [darkCalendar, setDarkCalendar] = useState(() => {
    const saved = localStorage.getItem('selene_dark_calendar');
    return saved === null ? true : saved === 'true';
  });

  const toggleCalendarTheme = () => {
    setDarkCalendar(prev => {
      const next = !prev;
      localStorage.setItem('selene_dark_calendar', String(next));
      return next;
    });
  };

  // Set start month from active date
  const initialDateObj = activeDate ? new Date(activeDate + 'T00:00:00') : now;
  const [startYear, setStartYear] = useState(initialDateObj.getFullYear());
  const [startMonth, setStartMonth] = useState(initialDateObj.getMonth());
  const [goToMonth, setGoToMonth] = useState(initialDateObj.getMonth());
  const [goToYear, setGoToYear] = useState(initialDateObj.getFullYear());

  // Fetch logs and decrypt
  useEffect(() => {
    const fetchLogsAndPredictions = async () => {
      if (!token) return;
      try {
        const [logsRes, predRes] = await Promise.all([
          fetch('/api/logs', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/predict/next-cycle', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        
        const logsData = await logsRes.json();
        if (logsRes.ok && logsData.logs) {
          const dek = sessionStorage.getItem('selene_dek');
          const processedLogs = [];
          for (const log of logsData.logs) {
            if (log.encrypted_data && dek) {
              try {
                const decryptedStr = await decryptData(log.encrypted_data, dek);
                const decryptedJson = JSON.parse(decryptedStr);
                processedLogs.push({
                  ...log,
                  ...decryptedJson
                });
              } catch (err) {
                console.error("Failed to decrypt log in calendar view:", err);
                processedLogs.push(log);
              }
            } else {
              processedLogs.push(log);
            }
          }
          setLogs(processedLogs);
        }
        
        const predData = await predRes.json();
        if (predRes.ok && predData.prediction) {
          setPrediction(predData.prediction);
        }
      } catch (e) {
        console.error("Failed to fetch logs/predictions in calendar view", e);
      }
    };
    fetchLogsAndPredictions();
  }, [token]);

  // Handle day click: update active inspected date
  const handleDayClick = useCallback((dateStr) => {
    setActiveDate(dateStr);
    if (setSelectedDate) {
      setSelectedDate(dateStr);
    }
  }, [setSelectedDate]);

  // Open the selected date directly in dashboard daily logger
  const handleOpenInDashboard = () => {
    if (setSelectedDate) {
      setSelectedDate(activeDate);
    }
    setView('dashboard');
  };

  // Direct Jump to chosen month & year
  const handleGoTo = () => {
    setStartMonth(goToMonth);
    setStartYear(goToYear);
  };

  // Month navigation: step month by month
  const handlePrev = () => {
    const d = new Date(startYear, startMonth - 1, 1);
    setStartMonth(d.getMonth());
    setStartYear(d.getFullYear());
    setGoToMonth(d.getMonth());
    setGoToYear(d.getFullYear());
  };

  const handleNext = () => {
    const d = new Date(startYear, startMonth + 1, 1);
    setStartMonth(d.getMonth());
    setStartYear(d.getFullYear());
    setGoToMonth(d.getMonth());
    setGoToYear(d.getFullYear());
  };

  const handleJumpToToday = () => {
    setStartMonth(now.getMonth());
    setStartYear(now.getFullYear());
    setGoToMonth(now.getMonth());
    setGoToYear(now.getFullYear());
    handleDayClick(todayDateStr);
  };

  // Generate 3 consecutive months to display
  const months = useMemo(() => {
    const list = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(startYear, startMonth + i, 1);
      list.push({ year: d.getFullYear(), month: d.getMonth() });
    }
    return list;
  }, [startYear, startMonth]);

  // Find active inspected day data
  const activeLog = useMemo(() => {
    return logs.find(l => l.log_date === activeDate) || null;
  }, [logs, activeDate]);

  const activePhaseId = useMemo(() => {
    if (activeLog && activeLog.phase) return activeLog.phase;
    return getPhaseForCalendarDay(activeDate, logs, prediction, user);
  }, [activeLog, activeDate, logs, prediction, user]);

  const activePhaseConfig = phases.find(p => p.id === activePhaseId) || phases[0];
  const isActiveFuture = activeDate > todayDateStr;
  const isActiveToday = activeDate === todayDateStr;

  const formattedActiveDate = useMemo(() => {
    try {
      const d = new Date(activeDate + 'T00:00:00');
      return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return activeDate;
    }
  }, [activeDate]);

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
        <button
          onClick={() => setView('landing')}
          className="text-2xl font-black text-black tracking-widest hover:opacity-80 transition-opacity cursor-pointer mb-4 md:mb-0 focus:outline-none"
        >
          SELENE
        </button>

        <div className="flex flex-col items-center text-center mb-4 md:mb-0">
          <h1 className="font-handwriting text-3xl sm:text-4xl font-bold tracking-wide leading-none text-[#362113]">
            Cycle Calendar
          </h1>
          <p className="font-handwriting text-lg sm:text-xl opacity-85 mt-1 text-[#362113]">
            {username} • {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          <button
            onClick={toggleCalendarTheme}
            className="w-10 h-10 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors cursor-pointer focus:outline-none"
            title={`Switch to ${darkCalendar ? 'Light' : 'Dark'} Calendar Theme`}
          >
            {darkCalendar ? (
              <span className="text-sm select-none" role="img" aria-label="light-mode">☀️</span>
            ) : (
              <span className="text-sm select-none" role="img" aria-label="dark-mode">🌙</span>
            )}
          </button>
          <button
            onClick={() => setView('dashboard')}
            className="border border-black text-black hover:bg-black hover:text-white font-handwriting text-xl px-4 py-1.5 rounded-full transition-all duration-300 cursor-pointer focus:outline-none"
          >
            ← Daily Logger
          </button>
          <button
            onClick={() => setView('settings')}
            className="w-10 h-10 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors cursor-pointer focus:outline-none"
            title="Settings"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-black" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            onClick={onLogout}
            className="border border-black text-black hover:bg-black hover:text-white font-handwriting text-xl px-4 py-1.5 rounded-full transition-all duration-300 cursor-pointer focus:outline-none"
          >
            Log Out
          </button>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
        
        {/* Selected Day Inspector Card */}
        <motion.div
          layout
          className="rounded-3xl p-6 sm:p-7 border shadow-lg transition-all duration-300"
          style={{ 
            backgroundColor: darkCalendar ? '#1e2722' : 'rgba(255, 255, 255, 0.9)',
            borderColor: activePhaseConfig.color,
            borderWidth: '2px'
          }}
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className={`text-xl sm:text-2xl font-black ${darkCalendar ? 'text-white' : 'text-black'}`}>
                  {formattedActiveDate}
                </span>
                {isActiveToday && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#df9b6d] text-[#1e2722]">
                    Today
                  </span>
                )}
                <span 
                  className="px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider shadow-xs"
                  style={{ 
                    backgroundColor: activePhaseConfig.color, 
                    color: activePhaseConfig.textColor 
                  }}
                >
                  {activePhaseConfig.name} Phase {activeLog ? '• Logged' : (isActiveFuture ? '• Projected' : '• Estimated')}
                </span>
              </div>
              <p className={`text-sm ${darkCalendar ? 'text-white/70' : 'text-black/70'} max-w-2xl`}>
                {activePhaseConfig.description}
              </p>
            </div>

            {/* Action CTA */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={handleJumpToToday}
                className={`px-4 py-2 rounded-2xl text-xs font-bold border transition-colors cursor-pointer ${
                  darkCalendar ? 'border-white/20 text-white/80 hover:bg-white/10' : 'border-black/20 text-black/80 hover:bg-black/5'
                }`}
              >
                Go to Today
              </button>
              <button
                onClick={handleOpenInDashboard}
                className="px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-wider bg-[#df9b6d] hover:bg-[#d08b5e] text-[#1e2722] shadow-md transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>{activeLog ? 'Edit Daily Entry' : 'Log Daily Symptoms'}</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* Active Log Highlights if logged */}
          {activeLog && (
            <div className={`mt-5 pt-4 border-t grid grid-cols-2 sm:grid-cols-4 gap-3 ${
              darkCalendar ? 'border-white/10' : 'border-black/10'
            }`}>
              {activeLog.flow_intensity !== null && activeLog.flow_intensity !== undefined && (
                <div className={`p-3 rounded-2xl ${darkCalendar ? 'bg-white/5' : 'bg-black/5'}`}>
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${darkCalendar ? 'text-white/50' : 'text-black/50'}`}>
                    Flow Intensity
                  </span>
                  <p className={`text-base font-black mt-0.5 ${darkCalendar ? 'text-white' : 'text-black'}`}>
                    {activeLog.flow_intensity}% {activeLog.flow_intensity > 60 ? '🌊 Heavy' : activeLog.flow_intensity > 25 ? '🩸 Moderate' : '✨ Light'}
                  </p>
                </div>
              )}
              {activeLog.pelvic_pain !== null && activeLog.pelvic_pain !== undefined && (
                <div className={`p-3 rounded-2xl ${darkCalendar ? 'bg-white/5' : 'bg-black/5'}`}>
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${darkCalendar ? 'text-white/50' : 'text-black/50'}`}>
                    Pelvic Pain / Cramps
                  </span>
                  <p className={`text-base font-black mt-0.5 ${darkCalendar ? 'text-white' : 'text-black'}`}>
                    {activeLog.pelvic_pain}% {activeLog.pelvic_pain > 50 ? '⚡ Severe' : '🌱 Mild'}
                  </p>
                </div>
              )}
              {activeLog.energy_level !== null && activeLog.energy_level !== undefined && (
                <div className={`p-3 rounded-2xl ${darkCalendar ? 'bg-white/5' : 'bg-black/5'}`}>
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${darkCalendar ? 'text-white/50' : 'text-black/50'}`}>
                    Energy Level
                  </span>
                  <p className={`text-base font-black mt-0.5 ${darkCalendar ? 'text-white' : 'text-black'}`}>
                    {activeLog.energy_level}%
                  </p>
                </div>
              )}
              {activeLog.basal_body_temp && (
                <div className={`p-3 rounded-2xl ${darkCalendar ? 'bg-white/5' : 'bg-black/5'}`}>
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${darkCalendar ? 'text-white/50' : 'text-black/50'}`}>
                    Basal Body Temp
                  </span>
                  <p className={`text-base font-black mt-0.5 ${darkCalendar ? 'text-white' : 'text-black'}`}>
                    {activeLog.basal_body_temp}°F
                  </p>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Month Navigation & Go To Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/50 backdrop-blur-sm p-4 rounded-3xl border border-black/5 shadow-xs">
          {/* Go To Control */}
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
            <span className="font-sans text-black text-xs font-black tracking-widest uppercase">Go to:</span>
            <select
              value={goToMonth}
              onChange={(e) => setGoToMonth(Number(e.target.value))}
              className="bg-white/80 border border-black/10 text-black font-sans text-sm font-bold px-3 py-1.5 rounded-xl focus:outline-none cursor-pointer shadow-xs"
            >
              {monthNames.map((name, idx) => (
                <option key={idx} value={idx}>{name}</option>
              ))}
            </select>
            <select
              value={goToYear}
              onChange={(e) => setGoToYear(Number(e.target.value))}
              className="bg-white/80 border border-black/10 text-black font-sans text-sm font-bold px-3 py-1.5 rounded-xl focus:outline-none cursor-pointer shadow-xs"
            >
              {[2024, 2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleGoTo}
              className="bg-[#1e2722] text-white font-sans text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl shadow-xs hover:bg-[#2a3830] transition-colors cursor-pointer focus:outline-none"
            >
              Jump
            </motion.button>
          </div>

          {/* Stepper Buttons */}
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={handlePrev}
              title="Previous Month"
              className="w-10 h-10 rounded-2xl bg-white/70 border border-black/10 flex items-center justify-center text-black hover:bg-white transition-colors cursor-pointer focus:outline-none shadow-xs"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </motion.button>
            <span className="font-sans text-black/70 text-xs font-bold uppercase tracking-wider min-w-[140px] text-center">
              {monthNames[months[0].month]} {months[0].year} – {monthNames[months[2].month]} {months[2].year}
            </span>
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={handleNext}
              title="Next Month"
              className="w-10 h-10 rounded-2xl bg-white/70 border border-black/10 flex items-center justify-center text-black hover:bg-white transition-colors cursor-pointer focus:outline-none shadow-xs"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </motion.button>
          </div>
        </div>

        {/* 3-Month Grids */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${startYear}-${startMonth}-${darkCalendar}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-8"
          >
            {months.map(({ year, month }) => (
              <MonthCalendar 
                key={`${year}-${month}`} 
                year={year} 
                month={month} 
                todayDateStr={todayDateStr}
                selectedDate={activeDate}
                logs={logs} 
                prediction={prediction}
                user={user}
                onDayClick={handleDayClick} 
                darkCalendar={darkCalendar} 
              />
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Phase Legend */}
        <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 sm:p-7 border border-black/5 shadow-md">
          <h3 className="font-handwriting text-2xl text-black font-bold mb-4 text-center">
            Cycle Phases & Visual Guide
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {phases.map(p => (
              <div 
                key={p.id} 
                className="flex flex-col gap-2 p-4 rounded-2xl transition-all" 
                style={{ backgroundColor: p.bg }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="font-bold text-base" style={{ color: p.textColor }}>
                    {p.name}
                  </span>
                </div>
                <p className="text-xs leading-relaxed opacity-85" style={{ color: p.textColor }}>
                  {p.description}
                </p>
                <div className="mt-auto pt-2 text-[10px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1.5" style={{ color: p.textColor }}>
                  <span>Solid: Logged</span>
                  <span>•</span>
                  <span>Soft: Projected</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

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
