import React from 'react';
import { motion } from 'framer-motion';

export default function DashboardHeader({
  currentPhaseConfig,
  username,
  selectedDate,
  isOnline,
  isSyncing,
  setView,
  onLogout
}) {
  return (
    <>
      {/* Offline Status Banner */}
      {!isOnline && (
        <div className="w-full bg-[#df9b6d] text-[#362113] py-2 px-6 text-center font-bold font-sans text-xs sm:text-sm shadow-inner">
          ⚠️ You are currently offline. Selene will queue your tracking logs locally and sync automatically when connection is restored.
        </div>
      )}

      {/* Syncing State Banner */}
      {isSyncing && (
        <div className="w-full bg-emerald-500 text-white py-1.5 px-6 text-center font-bold font-sans text-xs flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Synchronizing offline logs with server...
        </div>
      )}

      {/* Dynamic Top Navigation Bar */}
      <motion.div 
        className="w-full py-5 px-6 sm:px-12 flex flex-col md:flex-row justify-between items-center text-black border-b border-black/10 transition-colors duration-500 shadow-sm"
        style={{ backgroundColor: currentPhaseConfig.color }}
      >
        <button
          onClick={() => setView('landing')}
          className="text-2xl font-black text-black tracking-widest hover:opacity-80 transition-opacity cursor-pointer mb-4 md:mb-0 focus:outline-none"
        >
          SELENE
        </button>

        <div className="flex flex-col items-center text-center mb-4 md:mb-0">
          <h1 className="font-handwriting text-3xl sm:text-4xl font-bold tracking-wide leading-none" style={{ color: currentPhaseConfig.textColor }}>
            Hellove, {username}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-handwriting text-xl sm:text-2xl opacity-90" style={{ color: currentPhaseConfig.textColor }}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap justify-end">
          <button
            onClick={() => setView('public-health')}
            className="border border-black text-black hover:bg-black hover:text-white font-handwriting text-xl px-4 py-1.5 rounded-full transition-all duration-300 cursor-pointer focus:outline-none"
          >
            Public Health Stats
          </button>
          <button
            onClick={() => setView('calendar')}
            className="border border-black text-black hover:bg-black hover:text-white font-handwriting text-xl px-4 py-1.5 rounded-full transition-all duration-300 cursor-pointer focus:outline-none"
          >
            ← Calendar View
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
    </>
  );
}
