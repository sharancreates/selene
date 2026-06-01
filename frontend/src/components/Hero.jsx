import React from 'react';
import { motion } from 'framer-motion';

export default function Hero({ setView }) {
  return (
    <section className="relative w-full min-h-[90vh] flex flex-col items-center pt-20 px-6 overflow-hidden">
      
      {/* Background Stars Decoration */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.2, 1] }}
            transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() }}
            style={{
              top: `${Math.random() * 80}%`,
              left: `${Math.random() * 100}%`,
            }}
          >
            {/* SVG Star */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#865538" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
            </svg>
          </motion.div>
        ))}
      </div>

      <div className="z-10 flex flex-col lg:flex-row items-center max-w-6xl w-full justify-between gap-12 mt-12">
        {/* Left Column: Text */}
        <motion.div 
          className="flex flex-col items-start max-w-xl"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="text-6xl md:text-8xl font-black text-black tracking-tighter uppercase mb-6 drop-shadow-md">
            SELENE
          </h1>
          <p className="text-lg md:text-xl text-black/80 font-medium leading-relaxed mb-8 max-w-md">
            A privacy-first, locally-intelligent tracker built specifically for irregular cycles, PMDD, and PCOS. Your data never leaves your hands.
          </p>
          
          <motion.button 
            onClick={() => setView('login')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-[#4d5b4a] hover:bg-[#3d493a] text-white font-handwriting text-2xl px-10 py-4 rounded-full shadow-xl flex items-center gap-2 transition-colors duration-300 cursor-pointer"
          >
            Explore SELENE
          </motion.button>
        </motion.div>

        {/* Right Column: Illustration */}
        <motion.div 
          className="relative w-full max-w-lg lg:w-1/2 flex justify-center"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        >
          {/* Using image 7 as the Moon Girl illustration */}
          <motion.img 
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            src="/assets/image 2.png" 
            alt="Girl sitting on Moon" 
            className="w-[90%] md:w-full h-auto object-contain drop-shadow-2xl"
          />
        </motion.div>
      </div>

    </section>
  );
}
