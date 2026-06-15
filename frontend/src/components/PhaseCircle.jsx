import React from 'react';
import { motion } from 'framer-motion';

export default function PhaseCircle({ currentPhaseConfig }) {
  return (
    <div className="md:col-span-5 flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm rounded-[3rem] p-8 border border-black/5 shadow-md">
      <motion.div 
        whileHover={{ scale: 1.05, rotate: 2 }}
        className="w-48 h-48 sm:w-56 sm:h-56 rounded-full border-[14px] flex items-center justify-center shadow-inner transition-colors duration-500 cursor-pointer"
        style={{ 
          borderColor: currentPhaseConfig.color,
          backgroundColor: currentPhaseConfig.bg
        }}
      >
        <span className="font-handwriting text-black text-3xl sm:text-4xl text-center leading-tight font-bold">
          {currentPhaseConfig.name}<br />Phase
        </span>
      </motion.div>
    </div>
  );
}
