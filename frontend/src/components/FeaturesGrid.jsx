import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

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

export default function FeaturesGrid() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative w-full py-24 bg-[var(--color-selene-dark)] flex items-center justify-center px-6 overflow-hidden">
      
      {/* Aesthetic Micro-animation: Subtle floating background stars */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -20, 0],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: 4 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
            className="absolute bg-white rounded-full"
            style={{
              width: Math.random() * 4 + 2 + 'px',
              height: Math.random() * 4 + 2 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              boxShadow: '0 0 10px rgba(255,255,255,0.8)'
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col items-center gap-8 sm:gap-12">
        <div className="flex flex-col md:flex-row w-full gap-8 sm:gap-12 justify-center items-stretch">
          <FeatureBox feature={features[0]} isActive={activeIndex === 0} />
          <FeatureBox feature={features[1]} isActive={activeIndex === 1} />
        </div>
        <div className="flex w-full justify-center">
          <div className="w-full md:w-1/2">
            <FeatureBox feature={features[2]} isActive={activeIndex === 2} />
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureBox({ feature, isActive }) {
  return (
    <motion.div
      layout
      animate={{
        scale: isActive ? 1.05 : 0.95,
        opacity: isActive ? 1 : 0.4,
        y: isActive ? -10 : 0,
        boxShadow: isActive 
          ? "0 20px 40px -10px rgba(140, 89, 59, 0.5)" 
          : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
      }}
      transition={{
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="w-full flex-1 rounded-[2.5rem] bg-[var(--color-selene-brown)] p-8 sm:p-10 flex items-center justify-center text-center border border-white/10"
    >
      <p className="font-handwriting text-[#fdfcfb] text-2xl sm:text-[1.75rem] leading-relaxed tracking-wide">
        {feature.text}
      </p>
    </motion.div>
  );
}
