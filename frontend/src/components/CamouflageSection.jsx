import React from 'react';
import { motion } from 'framer-motion';

export default function CamouflageSection() {
  return (
    <section className="relative w-full py-24 px-6 overflow-hidden">
      
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        
        {/* Left Side: Illustration and Pills */}
        <div className="flex flex-col items-center md:items-start gap-6 w-full">
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full flex justify-center md:justify-start"
          >
            {/* Using image 3 as Phone Girl */}
            <img src="/assets/image 3.png" alt="Girl on phone" className="w-[60%] max-w-[250px] object-contain drop-shadow-xl" />
          </motion.div>

          <div className="flex flex-col gap-4 w-full max-w-sm mt-4">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-[#9d6b49] rounded-2xl p-4 text-center shadow-md transform -rotate-2"
            >
              <p className="font-handwriting text-white text-lg">
                This is not a calculator. This is SELENE-- disguised as calc!
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-[#865538] rounded-2xl p-4 text-center shadow-md transform rotate-1"
            >
              <p className="font-handwriting text-white text-lg">
                Wipe out all the local data in one click.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Right Side: Camouflage Explanation and UI Placeholders */}
        <div className="flex flex-col gap-8 w-full h-full justify-center">
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-[#9d6b49] rounded-[2rem] p-8 shadow-lg w-full max-w-lg self-end"
          >
            <p className="font-handwriting text-white text-xl md:text-2xl text-center leading-relaxed">
              Enable Camouflage Mode to disguise Selene as a functional calculator or weather app. Because in spaces where privacy is a privilege, your safety should be a guarantee.
            </p>
          </motion.div>

          <motion.div 
            className="flex gap-6 w-full max-w-lg self-end h-[300px]"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {/* App UI Placeholders */}
            <div className="flex-1 bg-[var(--color-selene-gray)] rounded-xl flex items-center justify-center opacity-80 backdrop-blur-sm shadow-inner">
               <span className="font-handwriting text-black/50 text-xl rotate-[-90deg] md:rotate-0 text-center px-4">app ui placeholders</span>
            </div>
            <div className="flex-1 bg-[var(--color-selene-gray)] rounded-xl opacity-80 backdrop-blur-sm shadow-inner"></div>
          </motion.div>
          
        </div>

      </div>
    </section>
  );
}
