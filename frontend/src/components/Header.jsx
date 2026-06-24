import React from 'react';
import { motion } from 'framer-motion';

export default function Header({ currentView, setView }) {
  return (
    <header className="w-full py-6 px-6 sm:px-12 flex justify-between items-center z-50 absolute top-0 left-0 bg-transparent">
      {/* Logo / Brand Name */}
      <motion.button 
        onClick={() => setView('landing')}
        className="text-3xl font-black text-black tracking-widest focus:outline-none cursor-pointer"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        SELENE
      </motion.button>
      
      {/* Navigation action */}
      <div className="flex gap-4 items-center">
        {currentView === 'landing' && (
          <motion.button 
            onClick={() => setView('public-health')}
            className="border-2 border-[#4d5b4a] text-[#4d5b4a] hover:bg-[#4d5b4a] hover:text-white font-handwriting text-2xl px-6 py-2 rounded-full transition-all duration-300 cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Public Health Stats
          </motion.button>
        )}
        {currentView === 'landing' ? (
          <motion.button 
            onClick={() => setView('login')}
            className="bg-[#4d5b4a] hover:bg-[#3d493a] text-white font-handwriting text-2xl px-8 py-2.5 rounded-full shadow-lg transition-colors duration-300 cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Log In
          </motion.button>
        ) : (
          <motion.button 
            onClick={() => setView('landing')}
            className="border-2 border-[var(--color-selene-brown)] text-[var(--color-selene-brown)] hover:bg-[var(--color-selene-brown)] hover:text-white font-handwriting text-2xl px-8 py-2 rounded-full transition-all duration-300 cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Back to Home
          </motion.button>
        )}
      </div>
    </header>
  );
}
