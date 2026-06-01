import React from 'react';
import { motion } from 'framer-motion';

export default function ValueProposition() {
  return (
    <section className="relative w-full py-24 px-6 overflow-hidden">
      
      {/* Decorative scattered stars */}
      <div className="absolute top-20 right-20 text-[#865538]">
        <StarIcon size="32" />
      </div>
      <div className="absolute bottom-20 left-20 text-[#865538]">
        <StarIcon size="24" />
      </div>

      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-center gap-16">
        
        {/* Left: Illustration */}
        <motion.div 
          className="w-full md:w-1/2 flex justify-center relative"
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          {/* Using image 2 as Calendar Girl illustration */}
          <img src="/assets/image 2.png" alt="Girl analyzing calendar" className="w-[80%] max-w-sm object-contain drop-shadow-xl" />
        </motion.div>

        {/* Right: Teardrop Text Boxes */}
        <div className="w-full md:w-1/2 flex flex-col gap-12 relative">
          
          {/* Teardrop 1 */}
          <motion.div 
            className="relative w-[280px] h-[320px] self-start md:-ml-12"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Custom teardrop shape via SVG background */}
            <div className="absolute inset-0 bg-[#9d6b49] rounded-tr-[10rem] rounded-bl-[10rem] rounded-tl-3xl rounded-br-[10rem] shadow-lg flex items-center justify-center p-8 transform rotate-3">
               <p className="font-handwriting text-white text-2xl text-center leading-snug transform -rotate-3">
                 Menstrual cycles differ. They are not of rigid 28 days. But most tracking apps assume they are. <br/><br/>Except SELENE.
               </p>
            </div>
          </motion.div>

          {/* Teardrop 2 */}
          <motion.div 
            className="relative w-[320px] h-[320px] self-end md:-mr-12"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {/* Alternative organic shape */}
            <div className="absolute inset-0 bg-[#865538] rounded-[50%] rounded-tr-none shadow-lg flex items-center justify-center p-10 transform -rotate-6">
               <p className="font-handwriting text-white text-[1.65rem] text-center leading-snug transform rotate-6">
                 SELENE doesn't break when you have an irregular cycle, or a 21 day cycle, or any-day cycle. It learns how your body is.
               </p>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}

function StarIcon({ size = "24" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
  );
}
