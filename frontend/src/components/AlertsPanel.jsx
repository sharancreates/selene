import React from 'react';
import { motion } from 'framer-motion';

export default function AlertsPanel({ isLutealCrashIncoming, isMenorrhagiaDetected, bleedingDays }) {
  if (!isLutealCrashIncoming && !isMenorrhagiaDetected) return null;

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* PMDD Luteal Transition Warning */}
      {isLutealCrashIncoming && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.01 }}
          className="bg-[#df9b6d]/20 border border-[#df9b6d] rounded-[2rem] p-6 sm:p-8 flex gap-5 items-start shadow-md text-black transition-all duration-300"
        >
          <div className="p-3 bg-[#df9b6d] rounded-full text-white mt-1 shrink-0">
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex flex-col gap-1.5">
            <h4 className="font-handwriting text-3xl font-black uppercase tracking-wide">
              PMDD Luteal Phase Transition Alert (Expected in ~48 hours)
            </h4>
            <p className="font-handwriting text-2xl text-black/85 leading-snug">
              Progesterone shifts will begin in approximately 48 hours. For users tracking PMDD, this transition (the luteal drop) can cause sudden changes in neuro-steroid activity, bringing on feelings of anxiety, fatigue, or mood shifts. Establish gentle boundaries, stock up on comfort foods, and prioritize emotional buffer time.
            </p>
          </div>
        </motion.div>
      )}

      {/* PCOS/Endo Prolonged Bleeding (Menorrhagia) Warning */}
      {isMenorrhagiaDetected && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.01 }}
          className="bg-red-500/10 border border-red-500 rounded-[2rem] p-6 sm:p-8 flex gap-5 items-start shadow-md text-black transition-all duration-300"
        >
          <div className="p-3 bg-red-500 rounded-full text-white mt-1 shrink-0">
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex flex-col gap-1.5">
            <h4 className="font-handwriting text-3xl font-black uppercase tracking-wide text-red-600">
              Prolonged Bleeding Warning (Menorrhagia detected)
            </h4>
            <p className="font-handwriting text-2xl text-black/85 leading-snug">
              You have logged menstrual flow for {bleedingDays} consecutive days. For individuals managing PCOS or Endometriosis, prolonged bleeding can cause iron deficiency anemia and physical exhaustion. Consider tracking flow volume closely and consulting your primary care provider if bleeding continues.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
