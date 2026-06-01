import React from 'react';
import { motion } from 'framer-motion';

export default function Footer() {
  return (
    <footer className="w-full flex flex-col items-center">
      
      {/* Final Call to Action */}
      <div className="w-full py-20 flex flex-col items-center justify-center gap-8 relative overflow-hidden">
        
        {/* Decorative stars */}
        <div className="absolute top-10 left-[20%] text-[#865538]">
          <StarIcon size="24" />
        </div>
        <div className="absolute bottom-10 right-[20%] text-[#865538]">
          <StarIcon size="32" />
        </div>

        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-handwriting text-3xl md:text-5xl text-black font-bold text-center px-4"
        >
          Reclaim your data. Understand your rhythm
        </motion.h2>
        
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="bg-[#4d5b4a] hover:bg-[#3d493a] text-white font-handwriting text-2xl px-10 py-4 rounded-full shadow-xl flex items-center gap-2 transition-colors duration-300 mt-4"
        >
          Explore SELENE
        </motion.button>
      </div>

      {/* Footer Links Block */}
      <div className="w-full bg-[var(--color-selene-brown)] py-12 px-8 flex justify-center">
        <ul className="flex flex-col gap-4 font-handwriting text-white text-2xl list-disc list-inside">
          <motion.li whileHover={{ x: 5 }} className="cursor-pointer transition-transform">
            privacy manifesto
          </motion.li>
          <motion.li whileHover={{ x: 5 }} className="cursor-pointer transition-transform">
            github
          </motion.li>
          <motion.li whileHover={{ x: 5 }} className="cursor-pointer transition-transform">
            contact
          </motion.li>
        </ul>
      </div>

    </footer>
  );
}

function StarIcon({ size = "24" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
  );
}
