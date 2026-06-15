import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return '';
};

export default function Settings({ username = 'user', setView, token, user, setUser, onLogout, showToast }) {
  // Profile
  const [displayName, setDisplayName] = useState(user?.username || username);
  const [cycleLength, setCycleLength] = useState(user?.cycle_length_baseline || 28);
  const [periodLength, setPeriodLength] = useState(user?.period_length_baseline || 5);
  
  // Conditions
  const [conditions, setConditions] = useState({
    pcos: user?.has_pcos || false,
    pmdd: user?.has_pmdd || false,
    endo: user?.has_endo || false,
  });

  // Sync state if user prop changes
  useEffect(() => {
    if (user) {
      setDisplayName(user.username);
      setCycleLength(user.cycle_length_baseline);
      setPeriodLength(user.period_length_baseline);
      setConditions({
        pcos: user.has_pcos,
        pmdd: user.has_pmdd,
        endo: user.has_endo,
      });
    }
  }, [user]);

  // Preferences
  const [camouflageMode, setCamouflageMode] = useState(() => {
    return localStorage.getItem('selene_camouflage_mode') === 'true';
  });
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('selene_notifications');
    return saved === null ? true : saved === 'true';
  });
  const [darkCalendar, setDarkCalendar] = useState(() => {
    const saved = localStorage.getItem('selene_dark_calendar');
    return saved === null ? true : saved === 'true';
  });
  const [readableFont, setReadableFont] = useState(() => {
    return localStorage.getItem('selene_readable_font') === 'true';
  });

  // Data
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleToggleCondition = (key) => {
    setConditions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleReadableFont = () => {
    const newVal = !readableFont;
    setReadableFont(newVal);
    localStorage.setItem('selene_readable_font', String(newVal));
    if (newVal) {
      document.body.classList.add('readable-typography');
    } else {
      document.body.classList.remove('readable-typography');
    }
  };

  const handleToggleCamouflage = () => {
    const newVal = !camouflageMode;
    setCamouflageMode(newVal);
    localStorage.setItem('selene_camouflage_mode', String(newVal));
  };

  const handleToggleNotifications = () => {
    const newVal = !notifications;
    setNotifications(newVal);
    localStorage.setItem('selene_notifications', String(newVal));
  };

  const handleToggleDarkCalendar = () => {
    const newVal = !darkCalendar;
    setDarkCalendar(newVal);
    localStorage.setItem('selene_dark_calendar', String(newVal));
  };


  const handleSave = async () => {
    if (!token) {
      showToast("Please log in to save settings.", "error");
      return;
    }
    
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-CSRF-Token': getCookie('csrf_token')
        },
        body: JSON.stringify({
          cycle_length_baseline: cycleLength,
          period_length_baseline: periodLength,
          has_pcos: conditions.pcos,
          has_pmdd: conditions.pmdd,
          has_endo: conditions.endo
        })
      });
      const data = await response.json();
      if (response.ok) {
        showToast('Settings saved successfully! ✨', 'success');
        if (setUser && data.user) {
          setUser(data.user);
        }
      } else {
        showToast(data.error || 'Failed to save settings.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Network error. Failed to save settings.', 'error');
    }
  };

  const handleExportData = async () => {
    if (!token) {
      showToast("Please log in to export settings.", "error");
      return;
    }
    try {
      const response = await fetch('/api/logs/export', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `selene_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast("Data exported successfully! 📥", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to export data", "error");
    }
  };

  const handleExportFHIRData = async () => {
    if (!token) {
      showToast("Please log in to export settings.", "error");
      return;
    }
    try {
      const response = await fetch('/api/logs/export/fhir', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error("FHIR export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `selene_fhir_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast("Clinical FHIR data exported successfully! 🏥", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to export FHIR data", "error");
    }
  };


  const handleDeleteData = async () => {
    if (showDeleteConfirm) {
      if (!token) {
        showToast("Please log in first.", "error");
        return;
      }
      try {
        const response = await fetch('/api/auth/account', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-CSRF-Token': getCookie('csrf_token')
          }
        });
        const data = await response.json();
        if (response.ok) {
          showToast('Your account and all associated data have been permanently erased.', 'success');
          setShowDeleteConfirm(false);
          onLogout();
        } else {
          showToast(data.error || 'Failed to delete account.', 'error');
        }
      } catch (e) {
        console.error(e);
        showToast('Network error. Failed to erase account.', 'error');
      }
    } else {
      setShowDeleteConfirm(true);
    }
  };

  return (
    <motion.div
      className="w-full min-h-screen flex flex-col font-sans"
      style={{ backgroundColor: '#eed9c4' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >

      {/* Top Banner */}
      <motion.div
        className="w-full py-5 px-6 sm:px-12 flex flex-col md:flex-row justify-between items-center text-black border-b border-black/10 shadow-sm"
        style={{ backgroundColor: '#df9b6d' }}
      >
        <button
          onClick={() => setView('landing')}
          className="text-2xl font-black text-black tracking-widest hover:opacity-80 transition-opacity cursor-pointer mb-4 md:mb-0 focus:outline-none"
        >
          SELENE
        </button>

        <div className="flex flex-col items-center text-center mb-4 md:mb-0">
          <h1 className="font-handwriting text-3xl sm:text-4xl font-bold tracking-wide leading-none">
            Settings
          </h1>
          <p className="font-handwriting text-lg opacity-70 mt-1">customize your selene experience</p>
        </div>

        <div className="flex items-center gap-4 flex-wrap justify-end">
          <button
            onClick={() => setView('dashboard')}
            className="border border-black text-black hover:bg-black hover:text-white font-handwriting text-xl px-4 py-1.5 rounded-full transition-all duration-300 cursor-pointer focus:outline-none"
          >
            ← Dashboard
          </button>
          <button
            onClick={onLogout}
            className="border border-black text-black hover:bg-black hover:text-white font-handwriting text-xl px-4 py-1.5 rounded-full transition-all duration-300 cursor-pointer focus:outline-none"
          >
            Log Out
          </button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="w-full max-w-3xl mx-auto px-6 py-10 flex flex-col gap-8">

        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/40 backdrop-blur-sm rounded-[2.5rem] p-8 border border-black/5 shadow-md"
        >
          <h2 className="font-handwriting text-3xl font-bold text-black mb-6 flex items-center gap-3">
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            Profile
          </h2>

          <div className="flex flex-col gap-5">
            {/* Display Name */}
            <div className="flex flex-col gap-1.5">
              <label className="font-handwriting text-black text-2xl pl-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-white/60 text-black font-handwriting text-xl px-5 py-3 rounded-2xl focus:outline-none border border-black/10 focus:border-[#df9b6d] focus:bg-white transition-all duration-200 shadow-sm"
              />
            </div>

            {/* Cycle & Period Length */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-handwriting text-black text-2xl pl-1">Avg. Cycle Length</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="18"
                    max="45"
                    value={cycleLength}
                    onChange={(e) => setCycleLength(Number(e.target.value))}
                    className="flex-1 h-2 appearance-none bg-[#df9b6d]/30 rounded-full cursor-pointer"
                    style={{ accentColor: '#df9b6d' }}
                  />
                  <span className="font-handwriting text-xl text-black font-bold w-16 text-center bg-white/60 rounded-xl px-2 py-1 border border-black/10">
                    {cycleLength}d
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-handwriting text-black text-2xl pl-1">Avg. Period Length</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="2"
                    max="10"
                    value={periodLength}
                    onChange={(e) => setPeriodLength(Number(e.target.value))}
                    className="flex-1 h-2 appearance-none bg-[#df9b6d]/30 rounded-full cursor-pointer"
                    style={{ accentColor: '#df9b6d' }}
                  />
                  <span className="font-handwriting text-xl text-black font-bold w-16 text-center bg-white/60 rounded-xl px-2 py-1 border border-black/10">
                    {periodLength}d
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Conditions Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/40 backdrop-blur-sm rounded-[2.5rem] p-8 border border-black/5 shadow-md"
        >
          <h2 className="font-handwriting text-3xl font-bold text-black mb-6 flex items-center gap-3">
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            Health Conditions
          </h2>

          <p className="font-handwriting text-lg text-black/60 mb-5">
            Selene adapts its predictions and recommendations based on your conditions.
          </p>

          <div className="flex flex-col gap-4">
            {[
              { key: 'pcos', label: 'PCOS', desc: 'Polycystic Ovary Syndrome' },
              { key: 'pmdd', label: 'PMDD', desc: 'Premenstrual Dysphoric Disorder' },
              { key: 'endo', label: 'Endometriosis', desc: 'Endometrial tissue growth' },
            ].map(({ key, label, desc }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleToggleCondition(key)}
                className="flex items-center justify-between w-full p-4 rounded-2xl border transition-all duration-300 cursor-pointer focus:outline-none group"
                style={{
                  backgroundColor: conditions[key] ? '#df9b6d' : 'rgba(255,255,255,0.4)',
                  borderColor: conditions[key] ? '#df9b6d' : 'rgba(0,0,0,0.05)',
                }}
              >
                <div className="flex flex-col items-start">
                  <span className="font-handwriting text-2xl font-bold text-black">{label}</span>
                  <span className="font-handwriting text-base text-black/50">{desc}</span>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 border-black flex items-center justify-center transition-all duration-200 ${conditions[key] ? 'bg-[var(--color-selene-brown)]' : 'bg-transparent'}`}>
                  {conditions[key] && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Preferences Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/40 backdrop-blur-sm rounded-[2.5rem] p-8 border border-black/5 shadow-md"
        >
          <h2 className="font-handwriting text-3xl font-bold text-black mb-6 flex items-center gap-3">
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Preferences
          </h2>

          <div className="flex flex-col gap-5">
            <SettingsToggle
              label="Camouflage Mode"
              desc="Disguise Selene as a calculator"
              checked={camouflageMode}
              onChange={handleToggleCamouflage}
            />
            <SettingsToggle
              label="Phase Reminders"
              desc="Get gentle nudges about phase transitions"
              checked={notifications}
              onChange={handleToggleNotifications}
            />
            <SettingsToggle
              label="Dark Calendar"
              desc="Use dark theme for calendar views"
              checked={darkCalendar}
              onChange={handleToggleDarkCalendar}
            />
            <SettingsToggle
              label="High Readability Typography"
              desc="Dyslexia Friendly Font (Outfit sans-serif)"
              checked={readableFont}
              onChange={handleToggleReadableFont}
            />
          </div>
        </motion.div>

        {/* Data & Privacy Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/40 backdrop-blur-sm rounded-[2.5rem] p-8 border border-black/5 shadow-md"
        >
          <h2 className="font-handwriting text-3xl font-bold text-black mb-6 flex items-center gap-3">
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            Data & Privacy
          </h2>

          <p className="font-handwriting text-lg text-black/60 mb-6">
            All your data lives locally on your device. No cloud, no trackers, ever.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExportData}
              className="flex-1 bg-[#1e2722] text-white font-handwriting text-xl px-6 py-3.5 rounded-2xl shadow-md hover:bg-[#2a3830] transition-colors duration-200 cursor-pointer focus:outline-none"
            >
              Export My Data
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExportFHIRData}
              className="flex-1 bg-[#8ba68b] text-black font-handwriting text-xl px-6 py-3.5 rounded-2xl shadow-md hover:bg-[#7a957a] transition-colors duration-200 cursor-pointer focus:outline-none"
            >
              Export Clinical FHIR Data
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDeleteData}
              className={`flex-1 font-handwriting text-xl px-6 py-3.5 rounded-2xl shadow-md transition-all duration-300 cursor-pointer focus:outline-none border-2 ${
                showDeleteConfirm
                  ? 'bg-red-500 text-white border-red-600 hover:bg-red-600'
                  : 'bg-transparent text-red-600 border-red-400 hover:bg-red-50'
              }`}
            >
              {showDeleteConfirm ? 'Confirm: Erase Everything' : 'Erase All Data'}
            </motion.button>
          </div>

          {showDeleteConfirm && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="font-handwriting text-red-600 text-base mt-3 text-center"
            >
              ⚠ This cannot be undone. Click again to permanently erase all local data.
            </motion.p>
          )}
        </motion.div>

        {/* Save Button */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          className="w-full max-w-md mx-auto bg-[#df9b6d] hover:bg-[#d08b5d] text-black font-handwriting text-2xl px-8 py-4 rounded-full shadow-xl transition-colors duration-300 cursor-pointer focus:outline-none font-bold tracking-wide"
        >
          Save Settings ✨
        </motion.button>
      </div>

      {/* Footer */}
      <AppFooter />
    </motion.div>
  );
}

function SettingsToggle({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-center justify-between w-full p-3 rounded-2xl hover:bg-white/20 transition-colors duration-200">
      <div className="flex flex-col">
        <span className="font-handwriting text-black text-2xl leading-tight">{label}</span>
        <span className="font-handwriting text-black/50 text-base">{desc}</span>
      </div>
      <button
        type="button"
        onClick={onChange}
        className="w-14 h-7 rounded-full bg-[#d2d2d2] relative transition-colors duration-200 focus:outline-none cursor-pointer flex-shrink-0"
      >
        <motion.div
          className="w-6 h-6 rounded-full absolute top-0.5"
          style={{ backgroundColor: checked ? '#df9b6d' : 'var(--color-selene-brown)' }}
          animate={{ left: checked ? '30px' : '2px' }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}

function AppFooter() {
  return (
    <footer className="w-full mt-auto">
      <div className="w-full bg-[var(--color-selene-brown)] py-8 px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <span className="font-handwriting text-white text-xl tracking-wider">SELENE</span>
        <div className="flex gap-6 font-handwriting text-white/80 text-lg">
          <span className="hover:text-white cursor-pointer transition-colors">privacy manifesto</span>
          <span className="hover:text-white cursor-pointer transition-colors">github</span>
          <span className="hover:text-white cursor-pointer transition-colors">contact</span>
        </div>
        <span className="font-handwriting text-white/50 text-sm">© 2026 selene</span>
      </div>
    </footer>
  );
}
