import React, { useState } from 'react';
import { motion } from 'framer-motion';

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return '';
};

export default function Register({ setView, onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  
  // Selected conditions
  const [conditions, setConditions] = useState({
    pcos: false,
    pmdd: false,
    endo: false,
  });

  const [camouflageMode, setCamouflageMode] = useState(false);

  const handleToggleCondition = (key) => {
    setConditions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const validateForm = () => {
    if (!username.trim()) {
      setError('Username is required');
      return false;
    }
    if (pin.length < 6) {
      setError('PIN must be at least 6 characters');
      return false;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match!');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) {
      return;
    }
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCookie('csrf_token')
        },
        credentials: 'include',
        body: JSON.stringify({
          username,
          pin,
          cycle_length_baseline: 28,
          period_length_baseline: 5,
          has_pcos: conditions.pcos,
          has_pmdd: conditions.pmdd,
          has_endo: conditions.endo
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        if (onLoginSuccess) {
          onLoginSuccess(data.user.username, data.token, data.user);
        }
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  return (
    <section className="relative w-full min-h-screen bg-[var(--color-selene-beige)] flex flex-col items-center justify-center px-6 py-24 overflow-hidden">
      
      {/* Background Stars - positioned according to the mockup */}
      <div className="absolute inset-0 pointer-events-none select-none">
        {/* Top Left Star */}
        <motion.div 
          className="absolute top-[12%] left-[10%] text-[var(--color-selene-brown)]"
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          <StarIcon size="48" />
        </motion.div>
        
        {/* Far Left Star */}
        <motion.div 
          className="absolute top-[42%] left-[5%] text-[var(--color-selene-brown)]"
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 5, repeat: Infinity, delay: 1 }}
        >
          <StarIcon size="40" />
        </motion.div>

        {/* Bottom Left Star */}
        <motion.div 
          className="absolute bottom-[28%] left-[12%] text-[var(--color-selene-brown)]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 4.5, repeat: Infinity, delay: 0.5 }}
        >
          <StarIcon size="36" />
        </motion.div>

        {/* Star Below the Moon (approx center-left-bottom) */}
        <motion.div 
          className="absolute bottom-[8%] left-[42%] text-[var(--color-selene-brown)]"
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 4.3, repeat: Infinity, delay: 0.2 }}
        >
          <StarIcon size="30" />
        </motion.div>

        {/* Top Right Star */}
        <motion.div 
          className="absolute top-[20%] right-[16%] text-[var(--color-selene-brown)]"
          animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 4.8, repeat: Infinity, delay: 1.5 }}
        >
          <StarIcon size="38" />
        </motion.div>

        {/* Mid Right Star */}
        <motion.div 
          className="absolute top-[50%] right-[16%] text-[var(--color-selene-brown)]"
          animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 4.2, repeat: Infinity }}
        >
          <StarIcon size="34" />
        </motion.div>

        {/* Bottom Right Star (above placeholder) */}
        <motion.div 
          className="absolute bottom-[22%] right-[26%] text-[var(--color-selene-brown)]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 5.2, repeat: Infinity, delay: 0.8 }}
        >
          <StarIcon size="44" />
        </motion.div>
      </div>

      {/* Main Content Wrapper */}
      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center">
        
        {/* Title */}
        <motion.h2 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl sm:text-5xl font-black text-black text-center tracking-tight mb-8"
        >
          Welcome to <span className="font-sans uppercase tracking-widest text-2xl sm:text-3xl block sm:inline mt-2 sm:mt-0 ml-0 sm:ml-2">SELENE</span>
        </motion.h2>

        {/* Form and Moon container */}
        <div className="relative w-full max-w-lg min-h-[480px] flex items-center justify-center">
          
          {/* Custom SVG Crescent Moon Background */}
          <motion.div 
            initial={{ opacity: 0, rotate: -20, scale: 0.9 }}
            animate={{ opacity: 0.95, rotate: 0, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute left-[-110px] sm:left-[-160px] top-[15px] w-[340px] h-[340px] sm:w-[440px] sm:h-[440px] pointer-events-none select-none"
          >
            <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
              <path
                d="M 130,15 A 85,85 0 0,0 130,185 A 110,110 0 0,1 130,15 Z"
                fill="#8ba68b"
                stroke="#df9b6d"
                strokeWidth="4"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>

{/* Registration Card */}
           <motion.div 
             initial={{ opacity: 0, y: 30 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.8, delay: 0.2, type: "spring", stiffness: 60 }}
             className="relative z-20 w-[310px] sm:w-[360px] bg-[#df9b6d] rounded-[2.5rem] p-8 sm:p-10 shadow-2xl border border-white/10 flex flex-col justify-between"
           >
             {error && (
               <div className="absolute -top-12 left-0 right-0 bg-red-500 text-white font-handwriting text-lg px-4 py-2 rounded-xl text-center">
                 {error}
               </div>
             )}
             <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              
              <h3 className="font-handwriting text-black text-center text-4xl sm:text-5xl tracking-wide mb-1 uppercase font-bold">
                REGISTER
              </h3>

              {/* Username field */}
              <div className="flex flex-col gap-1">
                <label className="font-handwriting text-black text-2xl sm:text-3xl pl-1">
                  Username:
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#d2d2d2] hover:bg-[#c8c8c8] focus:bg-white text-black font-handwriting text-xl sm:text-2xl px-4 py-2 rounded-2xl focus:outline-none transition-colors duration-200 shadow-inner"
                />
              </div>

              {/* PIN field */}
              <div className="flex flex-col gap-1">
                <label className="font-handwriting text-black text-2xl sm:text-3xl pl-1">
                  PIN:
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full bg-[#d2d2d2] hover:bg-[#c8c8c8] focus:bg-white text-black font-handwriting text-xl sm:text-2xl px-4 py-2 rounded-2xl focus:outline-none transition-colors duration-200 shadow-inner"
                />
              </div>

              {/* Confirm PIN field */}
              <div className="flex flex-col gap-1">
                <label className="font-handwriting text-black text-2xl sm:text-3xl pl-1">
                  Confirm PIN:
                </label>
                <input
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="w-full bg-[#d2d2d2] hover:bg-[#c8c8c8] focus:bg-white text-black font-handwriting text-xl sm:text-2xl px-4 py-2 rounded-2xl focus:outline-none transition-colors duration-200 shadow-inner"
                />
              </div>

              {/* Conditions Selection */}
              <div className="flex justify-between items-center gap-2 mt-2 px-1">
                {/* PCOS Option */}
                <button
                  type="button"
                  onClick={() => handleToggleCondition('pcos')}
                  className="flex items-center gap-1.5 focus:outline-none cursor-pointer group"
                >
                  <div className={`w-4 h-4 rounded-full border-2 border-black flex items-center justify-center transition-all duration-200 ${conditions.pcos ? 'bg-[var(--color-selene-brown)]' : 'bg-transparent'}`}>
                    {conditions.pcos && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                  <span className="font-handwriting text-black text-xl sm:text-2xl select-none group-hover:text-[var(--color-selene-brown)] transition-colors">PCOS</span>
                </button>

                {/* PMDD Option */}
                <button
                  type="button"
                  onClick={() => handleToggleCondition('pmdd')}
                  className="flex items-center gap-1.5 focus:outline-none cursor-pointer group"
                >
                  <div className={`w-4 h-4 rounded-full border-2 border-black flex items-center justify-center transition-all duration-200 ${conditions.pmdd ? 'bg-[var(--color-selene-brown)]' : 'bg-transparent'}`}>
                    {conditions.pmdd && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                  <span className="font-handwriting text-black text-xl sm:text-2xl select-none group-hover:text-[var(--color-selene-brown)] transition-colors">PMDD</span>
                </button>

                {/* ENDO Option */}
                <button
                  type="button"
                  onClick={() => handleToggleCondition('endo')}
                  className="flex items-center gap-1.5 focus:outline-none cursor-pointer group"
                >
                  <div className={`w-4 h-4 rounded-full border-2 border-black flex items-center justify-center transition-all duration-200 ${conditions.endo ? 'bg-[var(--color-selene-brown)]' : 'bg-transparent'}`}>
                    {conditions.endo && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                  <span className="font-handwriting text-black text-xl sm:text-2xl select-none group-hover:text-[var(--color-selene-brown)] transition-colors">ENDO</span>
                </button>
              </div>

              {/* Camouflage Mode Switch */}
              <div className="flex items-center justify-start gap-3 mt-1 pb-6 px-1">
                <span className="font-handwriting text-black text-xl sm:text-2xl select-none">Camouflage mode:</span>
                <button
                  type="button"
                  onClick={() => setCamouflageMode(!camouflageMode)}
                  className="w-10 h-5 rounded-full bg-[#d2d2d2] relative transition-colors duration-200 focus:outline-none cursor-pointer"
                >
                  <motion.div
                    className="w-4 h-4 rounded-full bg-[var(--color-selene-brown)] absolute top-0.5"
                    animate={{ left: camouflageMode ? '22px' : '2px' }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>

              {/* GO Button */}
              <motion.button
                type="submit"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-16 h-16 rounded-full bg-[#d2d2d2] hover:bg-white text-black font-handwriting text-2xl font-bold flex items-center justify-center shadow-xl border border-[#df9b6d] focus:outline-none transition-colors duration-200 cursor-pointer"
              >
                GO
              </motion.button>

            </form>
          </motion.div>
        </div>

        {/* Go to Login Page */}
        <motion.button 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-12 text-black hover:text-[#865538] font-handwriting text-2xl underline focus:outline-none transition-colors duration-200 cursor-pointer"
          onClick={() => setView('login')}
        >
          already have an account? log in
        </motion.button>
      </div>

      {/* Girl Illustration Placeholder - Bottom Right */}
      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="absolute bottom-0 right-0 w-[240px] h-[240px] sm:w-[320px] sm:h-[320px] pointer-events-none select-none z-20"
      >
        <div className="w-full h-full flex items-end justify-end p-4">
          <div className="border-2 border-dashed border-[var(--color-selene-brown)]/40 bg-[var(--color-selene-beige)]/90 backdrop-blur-sm rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-lg w-[85%] h-[75%] sm:w-[80%] sm:h-[70%]">
            <svg viewBox="0 0 24 24" className="w-12 h-12 text-[var(--color-selene-brown)] mb-2" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            <p className="font-handwriting text-[var(--color-selene-brown)] text-lg leading-tight">
              [Illustration Placeholder:<br/>Girl reading a book]
            </p>
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 w-full z-30">
        <div className="w-full bg-[var(--color-selene-brown)] py-6 px-8 flex flex-col sm:flex-row justify-between items-center gap-3">
          <span className="font-handwriting text-white text-xl tracking-wider">SELENE</span>
          <div className="flex gap-6 font-handwriting text-white/80 text-lg">
            <span className="hover:text-white cursor-pointer transition-colors">privacy manifesto</span>
            <span className="hover:text-white cursor-pointer transition-colors">github</span>
            <span className="hover:text-white cursor-pointer transition-colors">contact</span>
          </div>
          <span className="font-handwriting text-white/50 text-sm">© 2026 selene</span>
        </div>
      </div>

    </section>
  );
}

// Reuseable Star Component
function StarIcon({ size = "24" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
  );
}
