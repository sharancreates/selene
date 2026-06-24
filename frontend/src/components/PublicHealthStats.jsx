import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function PublicHealthStats({ setView, token }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/public-health/stats');
        if (!response.ok) {
          throw new Error('Failed to retrieve cohort statistics.');
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#eed9c4] flex items-center justify-center font-sans">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-[#4d5b4a] mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="font-handwriting text-3xl text-black">Loading Public Health Metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen bg-[#eed9c4] flex items-center justify-center font-sans px-6">
        <div className="bg-white/50 backdrop-blur-md rounded-[2.5rem] p-10 border border-black/10 text-center max-w-lg shadow-xl">
          <h2 className="font-handwriting text-3xl text-red-700 font-bold mb-4">Metric Load Failed</h2>
          <p className="font-sans text-stone-700 mb-6">{error}</p>
          <button
            onClick={() => setView(token ? 'dashboard' : 'landing')}
            className="bg-[#1e2722] text-white font-handwriting text-2xl px-8 py-3 rounded-full hover:bg-black transition-colors focus:outline-none cursor-pointer shadow-md"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const isCalibration = stats?.status === 'calibrating_cohort';

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
            Platform Health Stats
          </h1>
          <p className="font-handwriting text-lg opacity-70 mt-1">anonymized aggregate insights</p>
        </div>

        <div>
          <button
            onClick={() => setView(token ? 'dashboard' : 'landing')}
            className="border border-black text-black hover:bg-black hover:text-white font-handwriting text-xl px-5 py-1.5 rounded-full transition-all duration-300 cursor-pointer focus:outline-none"
          >
            ← {token ? 'Dashboard' : 'Landing'}
          </button>
        </div>
      </motion.div>

      {/* Main Container */}
      <div className="w-full max-w-4xl mx-auto px-6 py-10 flex flex-col gap-8 flex-grow">
        
        {/* Privacy Guard Notice */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-3xl p-6 border shadow-md flex flex-col sm:flex-row items-center gap-4 ${
            isCalibration
              ? 'bg-amber-50/90 border-amber-200 text-amber-900'
              : 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
          }`}
        >
          <div className="text-3xl">
            {isCalibration ? '🛡️' : '✅'}
          </div>
          <div>
            <h3 className="font-handwriting text-2xl font-bold">
              {isCalibration ? 'Privacy Guard Calibration Mode Active' : 'K-Anonymity Privacy Compliance Active'}
            </h3>
            <p className="text-sm mt-1 opacity-90 font-sans">
              {isCalibration
                ? `To preserve participant confidentiality, direct database aggregation requires at least 5 onboarded users. The current active count is ${stats.total_users_represented || 0}. Standard general-population baselines are shown below.`
                : `Platform contains ${stats.total_users_represented} active cohort members. Standard deviations and averages are generated dynamically from local database values without exposing individual preferences.`}
            </p>
          </div>
        </motion.div>

        {/* Core Baseline Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Cycle Length Card */}
          <motion.div
            whileHover={{ y: -3 }}
            className="bg-white/40 backdrop-blur-sm rounded-[2rem] p-8 border border-black/5 shadow-md flex flex-col justify-between"
          >
            <div>
              <span className="font-handwriting text-black/50 text-xl block mb-1">Average Cycle Length</span>
              <h2 className="text-5xl font-extrabold text-[#4d5b4a]">
                {stats.cycle_length_stats.average} <span className="text-2xl font-normal font-handwriting">days</span>
              </h2>
            </div>
            <div className="mt-6 pt-4 border-t border-black/5 flex justify-between text-sm text-stone-600 font-sans">
              <span>Min: {stats.cycle_length_stats.min} days</span>
              <span>Max: {stats.cycle_length_stats.max} days</span>
              <span>Std Dev: ±{stats.cycle_length_stats.std_dev}d</span>
            </div>
          </motion.div>

          {/* Period Length Card */}
          <motion.div
            whileHover={{ y: -3 }}
            className="bg-white/40 backdrop-blur-sm rounded-[2rem] p-8 border border-black/5 shadow-md flex flex-col justify-between"
          >
            <div>
              <span className="font-handwriting text-black/50 text-xl block mb-1">Average Period Length</span>
              <h2 className="text-5xl font-extrabold text-[#df9b6d]">
                {stats.period_length_stats.average} <span className="text-2xl font-normal font-handwriting">days</span>
              </h2>
            </div>
            <div className="mt-6 pt-4 border-t border-black/5 flex justify-between text-sm text-stone-600 font-sans">
              <span>Min: {stats.period_length_stats.min} days</span>
              <span>Max: {stats.period_length_stats.max} days</span>
              <span>Std Dev: ±{stats.period_length_stats.std_dev}d</span>
            </div>
          </motion.div>
        </div>

        {/* Chronic Conditions Prevalence */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/40 backdrop-blur-sm rounded-[2.5rem] p-8 border border-black/5 shadow-md"
        >
          <h3 className="font-handwriting text-3xl font-bold text-black mb-6">Condition Prevalence</h3>
          <div className="flex flex-col gap-6 font-sans">
            {/* PCOS Progress */}
            <div>
              <div className="flex justify-between text-sm mb-1.5 text-stone-700 font-medium">
                <span>Polycystic Ovary Syndrome (PCOS)</span>
                <span>{stats.chronic_conditions.pcos_percentage}%</span>
              </div>
              <div className="w-full bg-stone-200 h-3.5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.chronic_conditions.pcos_percentage}%` }}
                  transition={{ duration: 0.8 }}
                  className="bg-[#4d5b4a] h-full rounded-full"
                />
              </div>
            </div>

            {/* PMDD Progress */}
            <div>
              <div className="flex justify-between text-sm mb-1.5 text-stone-700 font-medium">
                <span>Premenstrual Dysphoric Disorder (PMDD)</span>
                <span>{stats.chronic_conditions.pmdd_percentage}%</span>
              </div>
              <div className="w-full bg-stone-200 h-3.5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.chronic_conditions.pmdd_percentage}%` }}
                  transition={{ duration: 0.8 }}
                  className="bg-[#df9b6d] h-full rounded-full"
                />
              </div>
            </div>

            {/* Endometriosis Progress */}
            <div>
              <div className="flex justify-between text-sm mb-1.5 text-stone-700 font-medium">
                <span>Endometriosis</span>
                <span>{stats.chronic_conditions.endo_percentage}%</span>
              </div>
              <div className="w-full bg-stone-200 h-3.5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.chronic_conditions.endo_percentage}%` }}
                  transition={{ duration: 0.8 }}
                  className="bg-[#a08cb0] h-full rounded-full"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Breakdown by Health Condition */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/40 backdrop-blur-sm rounded-[2.5rem] p-8 border border-black/5 shadow-md"
        >
          <h3 className="font-handwriting text-3xl font-bold text-black mb-6">Aggregate Breakdown</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* PCOS breakdown */}
            <div className="bg-white/30 rounded-2xl p-4 border border-black/5 text-center">
              <h4 className="font-sans font-bold text-stone-800 text-base">PCOS Cohort</h4>
              <p className="text-xs text-stone-500 font-sans mb-3">baselines</p>
              <div className="text-xl font-bold text-[#4d5b4a]">{stats.condition_breakdown.pcos.avg_cycle_length}d cycle</div>
              <div className="text-sm text-stone-600 font-sans mt-1">{stats.condition_breakdown.pcos.avg_period_length}d period</div>
            </div>

            {/* PMDD breakdown */}
            <div className="bg-white/30 rounded-2xl p-4 border border-black/5 text-center">
              <h4 className="font-sans font-bold text-stone-800 text-base">PMDD Cohort</h4>
              <p className="text-xs text-stone-500 font-sans mb-3">baselines</p>
              <div className="text-xl font-bold text-[#df9b6d]">{stats.condition_breakdown.pmdd.avg_cycle_length}d cycle</div>
              <div className="text-sm text-stone-600 font-sans mt-1">{stats.condition_breakdown.pmdd.avg_period_length}d period</div>
            </div>

            {/* Endometriosis breakdown */}
            <div className="bg-white/30 rounded-2xl p-4 border border-black/5 text-center">
              <h4 className="font-sans font-bold text-stone-800 text-base">Endometriosis Cohort</h4>
              <p className="text-xs text-stone-500 font-sans mb-3">baselines</p>
              <div className="text-xl font-bold text-[#a08cb0]">{stats.condition_breakdown.endo.avg_cycle_length}d cycle</div>
              <div className="text-sm text-stone-600 font-sans mt-1">{stats.condition_breakdown.endo.avg_period_length}d period</div>
            </div>

            {/* No Conditions breakdown */}
            <div className="bg-white/30 rounded-2xl p-4 border border-black/5 text-center">
              <h4 className="font-sans font-bold text-stone-800 text-base">No Chronic Conditions</h4>
              <p className="text-xs text-stone-500 font-sans mb-3">baselines</p>
              <div className="text-xl font-bold text-[#1e2722]">{stats.condition_breakdown.no_conditions.avg_cycle_length}d cycle</div>
              <div className="text-sm text-stone-600 font-sans mt-1">{stats.condition_breakdown.no_conditions.avg_period_length}d period</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="w-full mt-auto bg-[#4e3829] py-8 px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <span className="font-handwriting text-white text-xl tracking-wider">SELENE</span>
        <span className="font-handwriting text-white/50 text-sm">© 2026 selene</span>
      </footer>
    </motion.div>
  );
}
