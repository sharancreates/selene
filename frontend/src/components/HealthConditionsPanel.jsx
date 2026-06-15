import React from 'react';
import { motion } from 'framer-motion';

export default function HealthConditionsPanel({ user }) {
  const hasPCOS = user?.has_pcos;
  const hasPMDD = user?.has_pmdd;
  const hasEndo = user?.has_endo;

  if (!hasPCOS && !hasPMDD && !hasEndo) return null;

  return (
    <div className="bg-white/40 backdrop-blur-sm rounded-[3rem] p-8 border border-black/5 shadow-md flex flex-col gap-6 w-full mt-6">
      <h2 className="font-handwriting text-3xl text-black font-black text-center sm:text-left">
        your health conditions companion
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hasPCOS && (
          <motion.div
            whileHover={{ y: -4 }}
            className="rounded-3xl p-6 border bg-[#fff8e1]/70 border-[#ffecb3] flex flex-col justify-between shadow-sm transition-all duration-300"
          >
            <div>
              <span className="text-[10px] font-sans font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/80 border border-black/5 shadow-sm text-[#ff6f00]">
                PCOS Support Active
              </span>
              <h4 className="font-handwriting text-2xl font-bold text-black mt-3 mb-2">
                PCOS & Metabolic Health
              </h4>
              <p className="font-sans text-sm text-black/70 leading-relaxed mb-4">
                Tracking cycle length variation is key for PCOS. Prioritize glucose-steady meals, focus on strength training over excessive high-intensity cardio, and monitor changes in sleep quality.
              </p>
            </div>
            <div className="border-t border-black/5 pt-4 text-xs font-semibold text-black/50">
              💡 Tip: Prioritize fiber and protein breakfasts.
            </div>
          </motion.div>
        )}

        {hasPMDD && (
          <motion.div
            whileHover={{ y: -4 }}
            className="rounded-3xl p-6 border bg-[#f3e5f5]/70 border-[#e1bee7] flex flex-col justify-between shadow-sm transition-all duration-300"
          >
            <div>
              <span className="text-[10px] font-sans font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/80 border border-black/5 shadow-sm text-[#4a148c]">
                PMDD Support Active
              </span>
              <h4 className="font-handwriting text-2xl font-bold text-black mt-3 mb-2">
                PMDD Emotional Safety
              </h4>
              <p className="font-sans text-sm text-black/70 leading-relaxed mb-4">
                Neurosteroid sensitivity during the luteal drop can cause severe emotional swings. Use this panel to track early mood changes, reduce social commitments, and buffer stress.
              </p>
            </div>
            <div className="border-t border-black/5 pt-4 text-xs font-semibold text-black/50">
              💡 Tip: Sleep hygiene is critical during luteal transitions.
            </div>
          </motion.div>
        )}

        {hasEndo && (
          <motion.div
            whileHover={{ y: -4 }}
            className="rounded-3xl p-6 border bg-[#ffebee]/70 border-[#ffcdd2] flex flex-col justify-between shadow-sm transition-all duration-300"
          >
            <div>
              <span className="text-[10px] font-sans font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/80 border border-black/5 shadow-sm text-[#b71c1c]">
                Endo Monitor Active
              </span>
              <h4 className="font-handwriting text-2xl font-bold text-black mt-3 mb-2">
                Endometriosis Pain Management
              </h4>
              <p className="font-sans text-sm text-black/70 leading-relaxed mb-4">
                Track pelvic and lower back pain levels daily to identify flare triggers. Focus on anti-inflammatory diet protocols, warm baths, and moderate stretches.
              </p>
            </div>
            <div className="border-t border-black/5 pt-4 text-xs font-semibold text-black/50">
              💡 Tip: Log use of heating pads or anti-inflammatory relief.
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
