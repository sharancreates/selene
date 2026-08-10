import React from 'react';
import { motion } from 'framer-motion';
import BBTTrendChart from './BBTTrendChart';

export default function WakingVitalsCard({ bbtInput, setBbtInput, handleSaveLog, isSyncing, bbtData }) {
  return (
    <div className="bg-white/40 backdrop-blur-md rounded-[3.5rem] p-8 sm:p-10 border border-black/5 shadow-md grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
      {/* Left Column: Waking Vitals Log Form */}
      <div className="md:col-span-4 flex flex-col gap-6">
        <div>
          <h3 className="font-handwriting text-black text-4xl font-black uppercase tracking-wide leading-none mb-1">
            waking vitals
          </h3>
          <p className="font-handwriting text-black/60 text-xl">
            Log daily basal temperature
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="font-sans text-xs tracking-widest uppercase font-bold text-black/50">basal body temperature</span>
            <input 
              type="text"
              placeholder="e.g. 97.80"
              value={bbtInput}
              onChange={(e) => setBbtInput(e.target.value)}
              className="w-full bg-white/70 border border-black/10 rounded-2xl px-4 py-3 font-mono text-lg text-black focus:outline-none focus:bg-white shadow-inner"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isSyncing}
            onClick={handleSaveLog}
            className="w-full bg-[#1e2722] hover:bg-[#2a3830] text-white font-handwriting text-2xl py-3 rounded-2xl shadow-md transition-colors duration-200 cursor-pointer focus:outline-none font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSyncing ? "Syncing..." : "Update Waking Temp"}
          </motion.button>
        </div>
      </div>

      {/* Right Column: Chart */}
      <BBTTrendChart bbtData={bbtData} />
    </div>
  );
}
