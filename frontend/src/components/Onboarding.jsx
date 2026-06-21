import React, { useState } from 'react';
import { motion } from 'framer-motion';
import CustomSlider from './CustomSlider';

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return '';
};

export default function Onboarding({ token, user, setUser, setView, showToast }) {
  const [step, setStep] = useState(1);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [disclaimerSignedName, setDisclaimerSignedName] = useState('');

  const [lastPeriodDate, setLastPeriodDate] = useState('');
  const [avgPeriodLength, setAvgPeriodLength] = useState(5);
  const [avgCycleLength, setAvgCycleLength] = useState(28);
  
  // Health conditions
  const [hasPCOS, setHasPCOS] = useState(false);
  const [hasPMDD, setHasPMDD] = useState(false);
  const [hasEndo, setHasEndo] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNextStep = (e) => {
    e.preventDefault();
    if (!disclaimerAccepted) {
      setError('You must accept the Medical Disclaimer to proceed.');
      if (showToast) showToast('Disclaimer acceptance is required.', 'error');
      return;
    }
    if (!disclaimerSignedName.trim() || disclaimerSignedName.trim().length < 2) {
      setError('Please sign the disclaimer with your full name.');
      if (showToast) showToast('A valid signature is required.', 'error');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleOnboardingSubmit = async (e) => {
    e.preventDefault();
    if (!lastPeriodDate) {
      setError('Please select the start date of your last period.');
      if (showToast) showToast('Last period date is required.', 'error');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Update Profile (baselines + conditions + has_onboarded + disclaimer)
      const profileRes = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-CSRF-Token': getCookie('csrf_token')
        },
        body: JSON.stringify({
          cycle_length_baseline: avgCycleLength,
          period_length_baseline: avgPeriodLength,
          has_pcos: hasPCOS,
          has_pmdd: hasPMDD,
          has_endo: hasEndo,
          has_onboarded: true,
          disclaimer_accepted: disclaimerAccepted,
          disclaimer_signed_name: disclaimerSignedName
        })
      });

      if (!profileRes.ok) {
        const errData = await profileRes.json();
        throw new Error(errData.error || 'Failed to update cycle profile.');
      }

      const profileData = await profileRes.json();

      // 2. Seed initial menstrual cycle logs (for avgPeriodLength days)
      const startDate = new Date(lastPeriodDate + 'T00:00:00');
      for (let i = 0; i < avgPeriodLength; i++) {
        const logDate = new Date(startDate);
        logDate.setDate(startDate.getDate() + i);
        const dateStr = logDate.toISOString().split('T')[0];

        await fetch('/api/logs/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-CSRF-Token': getCookie('csrf_token')
          },
          body: JSON.stringify({
            log_date: dateStr,
            phase: 'menstrual',
            flow_intensity: 50 // moderate flow
          })
        });
      }

      if (showToast) showToast('Onboarding completed successfully!', 'success');
      
      // Update local user state, which triggers redirection
      setUser(profileData.user);
      setView('dashboard');

    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred during onboarding setup.');
      if (showToast) showToast(err.message || 'Onboarding setup failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="w-full min-h-screen bg-[var(--color-selene-beige)] flex flex-col justify-between py-12 px-4 relative overflow-hidden select-none">
      
      {/* Decorative Stars */}
      <div className="absolute inset-0 pointer-events-none select-none z-0">
        <motion.div 
          className="absolute top-[12%] left-[10%] text-[var(--color-selene-brown)]"
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 4.0, repeat: Infinity }}
        >
          <StarIcon size="30" />
        </motion.div>
        <motion.div 
          className="absolute top-[25%] right-[12%] text-[var(--color-selene-brown)]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 4.8, repeat: Infinity, delay: 0.5 }}
        >
          <StarIcon size="36" />
        </motion.div>
        <motion.div 
          className="absolute bottom-[20%] left-[15%] text-[var(--color-selene-brown)]"
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 5.2, repeat: Infinity, delay: 1.0 }}
        >
          <StarIcon size="42" />
        </motion.div>
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center">
        
        {/* Title */}
        <motion.h2 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl sm:text-5xl font-black text-black text-center tracking-tight mb-8"
        >
          Customize Your <span className="font-sans uppercase tracking-widest text-2xl sm:text-3xl block sm:inline mt-2 sm:mt-0 ml-0 sm:ml-2">SELENE</span>
        </motion.h2>

        <div className="relative w-full max-w-xl min-h-[500px] flex items-center justify-center">
          
          {/* Custom SVG Crescent Moon Background */}
          <motion.div 
            initial={{ opacity: 0, rotate: -20, scale: 0.9 }}
            animate={{ opacity: 0.95, rotate: 0, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute left-[-110px] sm:left-[-160px] top-[25px] w-[340px] h-[340px] sm:w-[440px] sm:h-[440px] pointer-events-none select-none"
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

          {/* Onboarding Card */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, type: "spring", stiffness: 60 }}
            className="relative z-20 w-[310px] sm:w-[380px] bg-[#df9b6d] rounded-[2.5rem] p-8 sm:p-10 shadow-2xl border border-white/10 flex flex-col justify-between"
          >
            {error && (
              <div className="absolute -top-12 left-0 right-0 bg-red-500 text-white font-handwriting text-lg px-4 py-2 rounded-xl text-center z-30">
                {error}
              </div>
            )}

            {step === 1 ? (
              <form onSubmit={handleNextStep} className="flex flex-col gap-4">
                
                <h3 className="font-handwriting text-black text-center text-4xl sm:text-5xl tracking-wide mb-1 uppercase font-bold">
                  DISCLAIMER
                </h3>

                <div className="bg-[#f2b994] text-black/90 p-4 rounded-2xl max-h-[180px] overflow-y-auto text-sm leading-relaxed border border-black/10 font-sans shadow-inner scrollbar-thin">
                  <p className="font-bold mb-2">Important Medical Disclaimer</p>
                  <p className="mb-2">
                    Selene is a tracking and prediction tool intended for educational, wellness, and self-monitoring purposes.
                  </p>
                  <p className="mb-2">
                    <strong>Selene is NOT a medical device</strong> and should never be used as a substitute for professional medical advice, diagnosis, treatment, or contraception.
                  </p>
                  <p>
                    Always consult with a qualified physician or healthcare provider for any questions regarding menstrual health, pregnancy, or chronic conditions.
                  </p>
                </div>

                <div className="flex flex-col gap-2 mt-1">
                  <label className="flex items-start gap-2 cursor-pointer text-black font-semibold select-none text-sm leading-tight">
                    <input 
                      type="checkbox"
                      checked={disclaimerAccepted}
                      onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                      className="w-4 h-4 rounded mt-0.5 border-black/20 text-[#8ba68b] focus:ring-transparent"
                    />
                    <span>I accept that Selene is not a medical advisor.</span>
                  </label>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-handwriting text-black text-2xl pl-1">
                    Signature (Full Name):
                  </label>
                  <input
                    type="text"
                    required
                    value={disclaimerSignedName}
                    onChange={(e) => setDisclaimerSignedName(e.target.value)}
                    placeholder="Type name to sign..."
                    className="w-full bg-[#d2d2d2] hover:bg-[#c8c8c8] focus:bg-white text-black font-sans text-base px-4 py-2 rounded-2xl focus:outline-none transition-colors duration-200 shadow-inner"
                  />
                </div>

                {/* Next Button */}
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-16 h-16 rounded-full bg-[#d2d2d2] hover:bg-white text-black font-handwriting text-2xl font-bold flex items-center justify-center shadow-xl border border-[#df9b6d] focus:outline-none transition-colors duration-200 cursor-pointer"
                >
                  NEXT
                </motion.button>

              </form>
            ) : (
              <form onSubmit={handleOnboardingSubmit} className="flex flex-col gap-5">
                
                <h3 className="font-handwriting text-black text-center text-4xl sm:text-5xl tracking-wide mb-1 uppercase font-bold">
                  ONBOARDING
                </h3>

                {/* Last Period Start Date */}
                <div className="flex flex-col gap-1">
                  <label className="font-handwriting text-black text-2xl sm:text-3xl pl-1">
                    Last Period Start Date:
                  </label>
                  <input
                    type="date"
                    required
                    value={lastPeriodDate}
                    onChange={(e) => setLastPeriodDate(e.target.value)}
                    className="w-full bg-[#d2d2d2] hover:bg-[#c8c8c8] focus:bg-white text-black font-sans text-lg px-4 py-2 rounded-2xl focus:outline-none transition-colors duration-200 shadow-inner"
                  />
                </div>

                {/* Average Period Length */}
                <div className="flex flex-col gap-1">
                  <CustomSlider
                    label="Avg Period Length"
                    leftLabel="2 days"
                    rightLabel="10 days"
                    value={avgPeriodLength}
                    onChange={setAvgPeriodLength}
                    min={2}
                    max={10}
                    showValueBadge={true}
                    valueSuffix=" days"
                  />
                </div>

                {/* Average Cycle Length */}
                <div className="flex flex-col gap-1">
                  <CustomSlider
                    label="Avg Cycle Length"
                    leftLabel="18 days"
                    rightLabel="45 days"
                    value={avgCycleLength}
                    onChange={setAvgCycleLength}
                    min={18}
                    max={45}
                    showValueBadge={true}
                    valueSuffix=" days"
                  />
                </div>

                {/* Chronic Conditions */}
                <div className="flex flex-col gap-2 mt-1 px-1">
                  <label className="font-handwriting text-black text-2xl sm:text-3xl">
                    Chronic Conditions (Optional):
                  </label>
                  <div className="flex flex-col gap-2 font-sans text-sm">
                    <label className="flex items-center gap-2 cursor-pointer text-black font-semibold select-none">
                      <input 
                        type="checkbox"
                        checked={hasPCOS}
                        onChange={(e) => setHasPCOS(e.target.checked)}
                        className="w-4 h-4 rounded border-black/20 text-[#8ba68b] focus:ring-transparent"
                      />
                      <span>PCOS Support</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-black font-semibold select-none">
                      <input 
                        type="checkbox"
                        checked={hasPMDD}
                        onChange={(e) => setHasPMDD(e.target.checked)}
                        className="w-4 h-4 rounded border-black/20 text-[#8ba68b] focus:ring-transparent"
                      />
                      <span>PMDD Companion</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-black font-semibold select-none">
                      <input 
                        type="checkbox"
                        checked={hasEndo}
                        onChange={(e) => setHasEndo(e.target.checked)}
                        className="w-4 h-4 rounded border-black/20 text-[#8ba68b] focus:ring-transparent"
                      />
                      <span>Endometriosis Monitor</span>
                    </label>
                  </div>
                </div>

                {/* Back button */}
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-black/60 hover:text-black font-sans text-xs underline mt-2 text-center focus:outline-none cursor-pointer"
                >
                  &larr; Back to Medical Disclaimer
                </button>

                {/* GO / Submit Button */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-16 h-16 rounded-full bg-[#d2d2d2] hover:bg-white text-black font-handwriting text-2xl font-bold flex items-center justify-center shadow-xl border border-[#df9b6d] focus:outline-none transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '...' : 'GO'}
                </motion.button>

              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// Reusable Star Component
function StarIcon({ size = "24" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
  );
}
