import React from 'react';
import { motion } from 'framer-motion';

export default function CustomToggle({ label, checked, onChange, activeColor }) {
  return (
    <div className="flex items-center justify-between w-full gap-4">
      <span className="font-handwriting text-black text-2xl select-none leading-tight">{label}</span>
      <button
        type="button"
        onClick={onChange}
        className="w-14 h-7 rounded-full bg-[#d2d2d2] relative transition-colors duration-200 focus:outline-none cursor-pointer flex-shrink-0"
        aria-checked={checked}
        role="switch"
      >
        <motion.div
          className="w-6 h-6 rounded-full absolute top-0.5"
          style={{ backgroundColor: checked ? activeColor : 'var(--color-selene-brown)' }}
          animate={{ left: checked ? '30px' : '2px' }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}
