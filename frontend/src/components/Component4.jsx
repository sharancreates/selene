import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const features = [
  {
    id: 0,
    text: "Built on a local-first architecture. Your data lives on your device, heavily encrypted. No cloud, no trackers, no targeted ads. Even we can't see your logs.",
  },
  {
    id: 1,
    text: "Selene's on-device machine learning doesn't just count days. It learns your unique physiological markers—like basal body temperature and pain types—to map unpredictable cycles, PCOS, and Endometriosis",
  },
  {
    id: 2,
    text: "No jarring red alerts or childish icons. A calming, editorial interface that shifts colors with your biological phases. Logging your symptoms should feel like a moment of peace, not a medical exam.",
  }
];

export default function Component4() {
  const [activeIndex, setActiveIndex] = useState(0);

  // Cycle the active box every 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative w-full min-h-[60vh] bg-[var(--color-selene-beige)] flex flex-col items-center justify-center p-6 sm:p-12 overflow-hidden">
      
      {/* Subtle animated background elements */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -20, 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 4 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
            className="absolute bg-[var(--color-selene-brown)] rounded-full"
            style={{
              width: Math.random() * 4 + 2 + 'px',
              height: Math.random() * 4 + 2 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              boxShadow: '0 0 10px rgba(134,85,56,0.3)'
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-3xl mx-auto flex flex-col items-center gap-8">
        {/* Single animatable feature box */}
        <motion.div
          className="w-full rounded-[2.5rem] bg-[#8c593b] p-8 sm:p-12 flex items-center justify-center text-center border border-[#a66d48]/30 min-h-[280px] sm:min-h-[240px] shadow-2xl relative overflow-hidden"
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.3 }}
        >
          {/* Subtle inside gradient shine */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />

          <AnimatePresence mode="wait">
            <motion.p
              key={activeIndex}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="font-handwriting text-[#fdfcfb] text-2xl sm:text-3xl leading-relaxed tracking-wide"
            >
              {features[activeIndex].text}
            </motion.p>
          </AnimatePresence>
        </motion.div>

        {/* Pagination Dots */}
        <div className="flex gap-2">
          {features.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className="w-2.5 h-2.5 rounded-full transition-all duration-300 relative focus:outline-none"
              aria-label={`Go to slide ${idx + 1}`}
            >
              <span 
                className={`absolute inset-0 rounded-full transition-all duration-300 ${
                  idx === activeIndex 
                    ? 'bg-[var(--color-selene-brown)] scale-125 shadow-[0_0_8px_rgba(134,85,56,0.4)]' 
                    : 'bg-[var(--color-selene-brown)]/30 hover:bg-[var(--color-selene-brown)]/50'
                }`} 
              />
            </button>
          ))}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .font-handwriting {
          font-family: 'Caveat', cursive;
        }
      `}} />
    </section>
  );
}
