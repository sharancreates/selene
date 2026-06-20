import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { deriveKeyFromPin } from '../utils/crypto';

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return '';
};

export default function Login({ setView, onLoginSuccess, showToast }) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  // PIN reset flow state
  const [isResetting, setIsResetting] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState('');
  const [newPin, setNewPin] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Legacy migration recovery display state
  const [showRecoveryKeyScreen, setShowRecoveryKeyScreen] = useState(false);
  const [regUserData, setRegUserData] = useState(null);
  const [regToken, setRegToken] = useState('');

  const validateForm = () => {
    if (!username.trim()) {
      setError('Username is required');
      return false;
    }
    if (pin.length < 6) {
      setError('PIN must be at least 6 characters');
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
      const kek_pin = await deriveKeyFromPin(pin, username);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCookie('csrf_token')
        },
        credentials: 'include',
        body: JSON.stringify({ username, pin, kek_pin })
      });
      
      const data = await response.json();
      if (response.ok) {
        sessionStorage.setItem('selene_session_key', kek_pin);
        if (data.recovery_key) {
          setRecoveryKey(data.recovery_key);
          setRegUserData(data.user);
          setRegToken(data.token || '');
          setShowRecoveryKeyScreen(true);
        } else {
          if (onLoginSuccess) {
            onLoginSuccess(data.user.username, data.token, data.user);
          }
        }
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!username.trim() || !recoveryKey.trim() || newPin.length < 6) {
      setError('All fields are required. PIN must be at least 6 characters.');
      return;
    }

    try {
      const new_kek_pin = await deriveKeyFromPin(newPin, username);
      const response = await fetch('/api/auth/reset-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCookie('csrf_token')
        },
        credentials: 'include',
        body: JSON.stringify({ 
          username, 
          recovery_key: recoveryKey, 
          new_pin: newPin,
          new_kek_pin 
        })
      });

      const data = await response.json();
      if (response.ok) {
        setSuccessMessage('PIN reset successfully! You can now log in.');
        if (showToast) showToast('PIN reset successfully! ✨', 'success');
        setIsResetting(false);
        setRecoveryKey('');
        setNewPin('');
      } else {
        setError(data.error || 'PIN reset failed. Check your recovery key.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  if (showRecoveryKeyScreen) {
    return (
      <section className="relative w-full min-h-screen bg-[var(--color-selene-beige)] flex flex-col items-center justify-center px-6 py-24 overflow-hidden">
        <div className="relative z-10 w-full max-w-lg bg-[#df9b6d] rounded-[2.5rem] p-8 sm:p-10 shadow-2xl border border-white/10 flex flex-col items-center text-center">
          <h3 className="text-3xl font-black text-black mb-4 font-serif">Save Your Recovery Key</h3>
          <p className="text-sm text-black mb-6 leading-relaxed">
            This recovery key is the <strong>only way</strong> to reset your PIN if you forget it. We store it using secure server-side one-way hashes, so we cannot recover it for you.
          </p>
          <div className="w-full bg-white/20 border border-white/30 rounded-2xl p-4 mb-6 font-mono text-black text-center break-all select-all font-semibold">
            {recoveryKey}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(recoveryKey);
              showToast("Recovery key copied to clipboard! 📋", "success");
            }}
            className="w-full bg-[#8ba68b] hover:bg-[#7a957a] text-black font-extrabold py-3 rounded-full transition-all duration-300 transform hover:scale-105 shadow-md mb-4 flex items-center justify-center gap-2"
          >
            Copy Recovery Key
          </button>
          <button
            onClick={() => {
              if (onLoginSuccess) {
                onLoginSuccess(regUserData.username, regToken, regUserData);
              }
            }}
            className="w-full bg-black hover:bg-neutral-800 text-white font-extrabold py-3 rounded-full transition-all duration-300 transform hover:scale-105 shadow-md"
          >
            I have saved my recovery key
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full min-h-screen bg-[var(--color-selene-beige)] flex flex-col items-center justify-center px-6 py-20 overflow-hidden">
      
      {/* Background Stars - positioned according to the mockup */}
      <div className="absolute inset-0 pointer-events-none select-none">
        {/* Top Left Star */}
        <motion.div 
          className="absolute top-[15%] left-[10%] text-[var(--color-selene-brown)]"
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          <StarIcon size="48" />
        </motion.div>
        
        {/* Far Left Star */}
        <motion.div 
          className="absolute top-[55%] left-[4%] text-[var(--color-selene-brown)]"
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 5, repeat: Infinity, delay: 1 }}
        >
          <StarIcon size="40" />
        </motion.div>

        {/* Bottom Left Star */}
        <motion.div 
          className="absolute bottom-[15%] left-[12%] text-[var(--color-selene-brown)]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 4.5, repeat: Infinity, delay: 0.5 }}
        >
          <StarIcon size="36" />
        </motion.div>

        {/* Top Right Star */}
        <motion.div 
          className="absolute top-[22%] right-[15%] text-[var(--color-selene-brown)]"
          animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 4.8, repeat: Infinity, delay: 1.5 }}
        >
          <StarIcon size="38" />
        </motion.div>

        {/* Mid Right Star */}
        <motion.div 
          className="absolute top-[62%] right-[20%] text-[var(--color-selene-brown)]"
          animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 4.2, repeat: Infinity }}
        >
          <StarIcon size="34" />
        </motion.div>

        {/* Bottom Right Star (next to placeholder) */}
        <motion.div 
          className="absolute bottom-[8%] right-[26%] text-[var(--color-selene-brown)]"
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
          className="text-4xl sm:text-5xl font-black text-black text-center tracking-tight mb-12"
        >
          Welcome back to <span className="font-sans uppercase tracking-widest text-2xl sm:text-3xl block sm:inline mt-2 sm:mt-0 ml-0 sm:ml-2">SELENE</span>
        </motion.h2>

        {/* Form and Moon container */}
        <div className="relative w-full max-w-lg min-h-[420px] flex items-center justify-center">
          
          {/* Custom SVG Crescent Moon Background */}
          <motion.div 
            initial={{ opacity: 0, rotate: -20, scale: 0.9 }}
            animate={{ opacity: 0.95, rotate: 0, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute left-[-110px] sm:left-[-160px] top-[10px] w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] pointer-events-none select-none"
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

          {isResetting ? (
            /* Reset PIN Card */
            <motion.div
              key="reset"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, type: "spring", stiffness: 60 }}
              className="relative z-20 w-[310px] sm:w-[350px] bg-[#df9b6d] rounded-[2.5rem] p-8 sm:p-10 shadow-2xl border border-white/10 flex flex-col justify-between"
            >
              {error && (
                <div className="absolute -top-12 left-0 right-0 bg-red-500 text-white font-handwriting text-lg px-4 py-2 rounded-xl text-center">
                  {error}
                </div>
              )}
              <form onSubmit={handleResetSubmit} className="flex flex-col gap-4">
                <h3 className="font-handwriting text-black text-center text-3xl tracking-wide mb-1 uppercase font-bold">
                  RESET PIN
                </h3>

                {/* Username field */}
                <div className="flex flex-col gap-1">
                  <label className="font-handwriting text-black text-xl pl-1">Username:</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#d2d2d2] hover:bg-[#c8c8c8] focus:bg-white text-black font-handwriting text-lg px-4 py-1.5 rounded-2xl focus:outline-none transition-colors duration-200 shadow-inner"
                  />
                </div>

                {/* Recovery Key field */}
                <div className="flex flex-col gap-1">
                  <label className="font-handwriting text-black text-xl pl-1">Recovery Key:</label>
                  <input
                    type="text"
                    value={recoveryKey}
                    onChange={(e) => setRecoveryKey(e.target.value)}
                    className="w-full bg-[#d2d2d2] hover:bg-[#c8c8c8] focus:bg-white text-black font-handwriting text-lg px-4 py-1.5 rounded-2xl focus:outline-none transition-colors duration-200 shadow-inner"
                  />
                </div>

                {/* New PIN field */}
                <div className="flex flex-col gap-1 pb-4">
                  <label className="font-handwriting text-black text-xl pl-1">New PIN:</label>
                  <input
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="w-full bg-[#d2d2d2] hover:bg-[#c8c8c8] focus:bg-white text-black font-handwriting text-lg px-4 py-1.5 rounded-2xl focus:outline-none transition-colors duration-200 shadow-inner"
                  />
                </div>

                {/* RESET Button */}
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-20 h-16 rounded-full bg-[#d2d2d2] hover:bg-white text-black font-handwriting text-xl font-bold flex items-center justify-center shadow-xl border border-[#df9b6d] focus:outline-none transition-colors duration-200 cursor-pointer"
                >
                  RESET
                </motion.button>
              </form>
            </motion.div>
          ) : (
            /* Login Card */
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, type: "spring", stiffness: 60 }}
              className="relative z-20 w-[310px] sm:w-[350px] bg-[#df9b6d] rounded-[2.5rem] p-8 sm:p-10 shadow-2xl border border-white/10 flex flex-col justify-between"
            >
              {error && (
                <div className="absolute -top-12 left-0 right-0 bg-red-500 text-white font-handwriting text-lg px-4 py-2 rounded-xl text-center">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <h3 className="font-handwriting text-black text-center text-4xl sm:text-5xl tracking-wide mb-2 uppercase font-bold">
                  LOG IN
                </h3>

                {/* Username field */}
                <div className="flex flex-col gap-2">
                  <label className="font-handwriting text-black text-2xl sm:text-3xl pl-1">
                    Username:
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#d2d2d2] hover:bg-[#c8c8c8] focus:bg-white text-black font-handwriting text-xl sm:text-2xl px-4 py-2.5 rounded-2xl focus:outline-none transition-colors duration-200 shadow-inner"
                  />
                </div>

                {/* PIN field */}
                <div className="flex flex-col gap-2 pb-6">
                  <label className="font-handwriting text-black text-2xl sm:text-3xl pl-1">
                    PIN:
                  </label>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full bg-[#d2d2d2] hover:bg-[#c8c8c8] focus:bg-white text-black font-handwriting text-xl sm:text-2xl px-4 py-2.5 rounded-2xl focus:outline-none transition-colors duration-200 shadow-inner"
                  />
                </div>

                {/* GO Button (Overlapping circular button) */}
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
          )}
        </div>

        {/* Links under Form */}
        <div className="flex flex-col items-center gap-3 mt-12">
          {successMessage && (
            <div className="text-emerald-800 font-handwriting text-xl text-center mb-2 font-bold">
              {successMessage}
            </div>
          )}

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="text-black hover:text-[#865538] font-handwriting text-2xl underline focus:outline-none transition-colors duration-200 cursor-pointer"
            onClick={() => {
              setError('');
              setSuccessMessage('');
              setIsResetting(!isResetting);
            }}
          >
            {isResetting ? "back to login" : "forget pin"}
          </motion.button>
          
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="text-black hover:text-[#865538] font-handwriting text-2xl underline focus:outline-none transition-colors duration-200 cursor-pointer"
            onClick={() => setView('register')}
          >
            new to selene? register
          </motion.button>
        </div>
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
