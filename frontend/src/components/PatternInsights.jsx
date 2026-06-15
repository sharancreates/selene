import React from 'react';
import { motion } from 'framer-motion';

export default function PatternInsights({ insights = [] }) {
  if (!insights || insights.length === 0) return null;

  // Extract medical disclaimer if present in any of the insights
  const disclaimer = insights[0]?.medical_disclaimer;

  const bgColors = {
    cycle: 'bg-[#fff3e0]/70 border-[#ffe0b2]',
    mood: 'bg-[#f3e5f5]/70 border-[#e1bee7]',
    pain: 'bg-[#ffebee]/70 border-[#ffcdd2]',
    condition: 'bg-[#fff8e1]/70 border-[#ffecb3]',
    trend: 'bg-[#e3f2fd]/70 border-[#bbdefb]'
  };

  const textColors = {
    cycle: 'text-[#e65100]',
    mood: 'text-[#4a148c]',
    pain: 'text-[#b71c1c]',
    condition: 'text-[#ff6f00]',
    trend: 'text-[#0d47a1]'
  };

  return (
    <div className="bg-white/40 backdrop-blur-sm rounded-[3rem] p-8 border border-black/5 shadow-md flex flex-col gap-6 w-full">
      <h2 className="font-handwriting text-3xl text-black font-black text-center sm:text-left">
        hormonal pattern insights
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {insights.map((insight, idx) => {
          const categoryBg = bgColors[insight.category] || 'bg-white/60 border-black/10';
          const categoryText = textColors[insight.category] || 'text-black';

          return (
            <motion.div
              key={idx}
              whileHover={{ y: -4 }}
              className={`rounded-3xl p-6 border flex flex-col justify-between shadow-sm transition-all duration-300 ${categoryBg}`}
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-[10px] font-sans font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/80 border border-black/5 shadow-sm ${categoryText}`}>
                    {insight.category} • {insight.confidence} confidence
                  </span>
                </div>
                <h4 className="font-handwriting text-2xl font-bold text-black mb-2">
                  {insight.title}
                </h4>
                <p className="font-sans text-sm text-black/70 leading-relaxed mb-4">
                  {insight.message}
                </p>
              </div>
              
              {/* Expandable Explanation */}
              <div className="mt-2 border-t border-black/5 pt-4">
                <details className="group cursor-pointer">
                  <summary className="font-sans text-xs font-bold text-black/60 flex items-center justify-between focus:outline-none select-none">
                    <span>clinical explanation</span>
                    <svg viewBox="0 0 24 24" className="w-4 h-4 transform group-open:rotate-180 transition-transform duration-200" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="mt-3 font-sans text-xs text-black/60 leading-normal flex flex-col gap-2">
                    <p className="italic">"{insight.explanation}"</p>
                    {insight.supporting_data && Object.keys(insight.supporting_data).length > 0 && (
                      <div className="bg-white/50 rounded-xl p-3 mt-1 border border-black/5">
                        <div className="font-semibold text-black/70 mb-1">extracted markers:</div>
                        <pre className="font-mono text-[10px] text-black/50 overflow-x-auto">
                          {JSON.stringify(insight.supporting_data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            </motion.div>
          );
        })}
      </div>

      {disclaimer && (
        <div className="mt-2 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900/80 font-sans italic text-center leading-normal shadow-sm">
          💡 {disclaimer}
        </div>
      )}
    </div>
  );
}
