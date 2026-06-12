import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Phase configuration details
const phases = [
  { 
    id: 'menstrual', 
    name: 'Menstrual', 
    color: '#df9b6d', 
    bg: '#eed9c4', 
    textColor: '#5a3d28',
    calendarHighlight: [24, 25, 26, 27],
    prediction: "Based on your logs: Your body is restoring. Focus on warm nourishing foods, gentle movement, and extra rest.",
    illustrationText: "[Illustration Placeholder: Girl drinking tea in armchair]"
  },
  { 
    id: 'follicular', 
    name: 'Follicular', 
    color: '#8ca090', 
    bg: '#e2eae5', 
    textColor: '#2e3a32',
    calendarHighlight: [5, 6, 7, 8, 9, 10, 11, 12],
    prediction: "Based on your logs: Estrogen is rising! Ideal phase for strength workouts, planning new projects, and creative brainstorming.",
    illustrationText: "[Illustration Placeholder: Girl sketching and stretching in bright room]"
  },
  { 
    id: 'ovulatory', 
    name: 'Ovulatory', 
    color: '#dfbe7e', 
    bg: '#f5eedc', 
    textColor: '#544629',
    calendarHighlight: [13, 14, 15],
    prediction: "Based on your logs: Estrogen and LH are peaking. Fertility is at its highest. Peak communication skills and social energy today.",
    illustrationText: "[Illustration Placeholder: Girl meeting friends at a cozy cafe]"
  },
  { 
    id: 'luteal', 
    name: 'Luteal', 
    color: '#9d8ea6', 
    bg: '#e8e2eb', 
    textColor: '#3a2f42',
    calendarHighlight: [16, 17, 18, 19, 20, 21, 22, 23],
    prediction: "Based on your logs: Progesterone is dominant. Energy may naturally decrease. Great phase for nested organizing, reflection, and setting boundaries.",
    illustrationText: "[Illustration Placeholder: Girl meditating wrapped in a soft blanket]"
  }
];

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return '';
};

export default function Dashboard({ username = 'user', setView, token, user, onLogout, selectedDate, setSelectedDate }) {
  const [activePhase, setActivePhase] = useState('menstrual');
  const [allLogs, setAllLogs] = useState([]);
  const [apiPrediction, setApiPrediction] = useState(null);
  const [insights, setInsights] = useState([]);
  const [bbtInput, setBbtInput] = useState('');

  // Load daily log on selectedDate change
  React.useEffect(() => {
    const fetchDayLog = async () => {
      if (!token || !selectedDate) return;
      try {
        const response = await fetch('/api/logs', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (response.ok && data.logs) {
          setAllLogs(data.logs);
          const logForDay = data.logs.find(l => l.log_date === selectedDate);
          if (logForDay) {
            setActivePhase(logForDay.phase || 'menstrual');
            setBbtInput(logForDay.basal_body_temp !== null ? String(logForDay.basal_body_temp) : '');
            const phaseStr = logForDay.phase || 'menstrual';
            if (phaseStr === 'menstrual') {
              setMenstrualSliders({
                flow: logForDay.flow_intensity !== null ? logForDay.flow_intensity : 50,
                cramps: logForDay.pelvic_pain !== null ? logForDay.pelvic_pain : 30,
                energy: logForDay.energy_level !== null ? logForDay.energy_level : 40,
                pain: logForDay.back_pain !== null ? logForDay.back_pain : 25
              });
              setMenstrualMoods(logForDay.mood_toggles || {});
              setMenstrualSymptoms(logForDay.symptom_tags || {});
              setMenstrualSleep(logForDay.sleep_quality !== null ? logForDay.sleep_quality : 60);
              if (logForDay.lifestyle_actions && Array.isArray(logForDay.lifestyle_actions.meds)) {
                setMenstrualMeds(logForDay.lifestyle_actions.meds);
              }
            } else if (phaseStr === 'follicular') {
              setFollicularSliders({
                focus: logForDay.flow_intensity !== null ? logForDay.flow_intensity : 80,
                strength: logForDay.pelvic_pain !== null ? logForDay.pelvic_pain : 75,
                energy: logForDay.energy_level !== null ? logForDay.energy_level : 80,
                glow: logForDay.back_pain !== null ? logForDay.back_pain : 70
              });
              setFollicularMoods(logForDay.mood_toggles || {});
              setFollicularSymptoms(logForDay.symptom_tags || {});
              setFollicularSleep(logForDay.sleep_quality !== null ? logForDay.sleep_quality : 75);
              if (logForDay.lifestyle_actions && Array.isArray(logForDay.lifestyle_actions.meds)) {
                setFollicularMeds(logForDay.lifestyle_actions.meds);
              }
            } else if (phaseStr === 'ovulatory') {
              setOvulatorySliders({
                libido: logForDay.flow_intensity !== null ? logForDay.flow_intensity : 80,
                confidence: logForDay.pelvic_pain !== null ? logForDay.pelvic_pain : 90,
                social: logForDay.energy_level !== null ? logForDay.energy_level : 85,
                bloating: logForDay.back_pain !== null ? logForDay.back_pain : 10
              });
              setOvulatoryMoods(logForDay.mood_toggles || {});
              setOvulatorySymptoms(logForDay.symptom_tags || {});
              setOvulatorySleep(logForDay.sleep_quality !== null ? logForDay.sleep_quality : 70);
              if (logForDay.lifestyle_actions && Array.isArray(logForDay.lifestyle_actions.meds)) {
                setOvulatoryMeds(logForDay.lifestyle_actions.meds);
              }
            } else if (phaseStr === 'luteal') {
              setLutealSliders({
                bloating: logForDay.flow_intensity !== null ? logForDay.flow_intensity : 45,
                breastSensitivity: logForDay.pelvic_pain !== null ? logForDay.pelvic_pain : 35,
                anxiety: logForDay.energy_level !== null ? logForDay.energy_level : 50,
                cravings: logForDay.back_pain !== null ? logForDay.back_pain : 60
              });
              setLutealMoods(logForDay.mood_toggles || {});
              setLutealSymptoms(logForDay.symptom_tags || {});
              setLutealSleep(logForDay.sleep_quality !== null ? logForDay.sleep_quality : 55);
              if (logForDay.lifestyle_actions && Array.isArray(logForDay.lifestyle_actions.meds)) {
                setLutealMeds(logForDay.lifestyle_actions.meds);
              }
            }
          } else {
            setBbtInput('');
          }
        }

        const predResponse = await fetch(`/api/predict/next-cycle?date=${selectedDate}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (predResponse.ok) {
          const predData = await predResponse.json();
          if (predData && predData.prediction) {
            setApiPrediction(predData.prediction);
          }
        }

        const insResponse = await fetch('/api/predict/insights', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (insResponse.ok) {
          const insData = await insResponse.json();
          if (insData && insData.insights) {
            setInsights(insData.insights);
          }
        }
      } catch (e) {
        console.error("Failed to load daily log", e);
      }
    };
    fetchDayLog();
  }, [selectedDate, token]);



  const handleSaveLog = async () => {
    if (!token) {
      alert("Please login first to save your data.");
      return;
    }
    
    let payload = {
      log_date: selectedDate,
      phase: activePhase,
      basal_body_temp: bbtInput !== '' ? parseFloat(bbtInput) : null
    };
    
    if (activePhase === 'menstrual') {
      payload.flow_intensity = menstrualSliders.flow;
      payload.pelvic_pain = menstrualSliders.cramps;
      payload.energy_level = menstrualSliders.energy;
      payload.back_pain = menstrualSliders.pain;
      payload.sleep_quality = menstrualSleep;
      payload.mood_toggles = menstrualMoods;
      payload.symptom_tags = menstrualSymptoms;
      payload.lifestyle_actions = { meds: menstrualMeds };
    } else if (activePhase === 'follicular') {
      payload.flow_intensity = follicularSliders.focus;
      payload.pelvic_pain = follicularSliders.strength;
      payload.energy_level = follicularSliders.energy;
      payload.back_pain = follicularSliders.glow;
      payload.sleep_quality = follicularSleep;
      payload.mood_toggles = follicularMoods;
      payload.symptom_tags = follicularSymptoms;
      payload.lifestyle_actions = { meds: follicularMeds };
    } else if (activePhase === 'ovulatory') {
      payload.flow_intensity = ovulatorySliders.libido;
      payload.pelvic_pain = ovulatorySliders.confidence;
      payload.energy_level = ovulatorySliders.social;
      payload.back_pain = ovulatorySliders.bloating;
      payload.sleep_quality = ovulatorySleep;
      payload.mood_toggles = ovulatoryMoods;
      payload.symptom_tags = ovulatorySymptoms;
      payload.lifestyle_actions = { meds: ovulatoryMeds };
    } else if (activePhase === 'luteal') {
      payload.flow_intensity = lutealSliders.bloating;
      payload.pelvic_pain = lutealSliders.breastSensitivity;
      payload.energy_level = lutealSliders.anxiety;
      payload.back_pain = lutealSliders.cravings;
      payload.sleep_quality = lutealSleep;
      payload.mood_toggles = lutealMoods;
      payload.symptom_tags = lutealSymptoms;
      payload.lifestyle_actions = { meds: lutealMeds };
    }
    
    try {
      const response = await fetch('/api/logs/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-CSRF-Token': getCookie('csrf_token')
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (response.ok) {
        alert("Daily symptoms saved successfully!");
        // Re-fetch all logs to update BBT chart and predictions
        const responseLogs = await fetch('/api/logs', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (responseLogs.ok) {
          const logsData = await responseLogs.json();
          if (logsData.logs) {
            setAllLogs(logsData.logs);
          }
        }
        const predResponse = await fetch(`/api/predict/next-cycle?date=${selectedDate}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (predResponse.ok) {
          const predData = await predResponse.json();
          if (predData.prediction) {
            setApiPrediction(predData.prediction);
          }
        }
        const insResponse = await fetch('/api/predict/insights', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (insResponse.ok) {
          const insData = await insResponse.json();
          if (insData && insData.insights) {
            setInsights(insData.insights);
          }
        }
      } else {
        alert(data.error || "Failed to save symptoms.");
      }
    } catch (e) {
      console.error(e);
      alert("Network error. Could not connect to the database.");
    }
  };


  // 1. Menstrual States
  const [menstrualSliders, setMenstrualSliders] = useState({ flow: 50, cramps: 30, energy: 40, pain: 25 });
  const [menstrualMoods, setMenstrualMoods] = useState({ brainFog: false, anxious: false, irritable: false, sensitive: false, calm: true });
  const [menstrualSymptoms, setMenstrualSymptoms] = useState({ sugarCravings: false, energyCrash: false, cysticAcne: false, hairShedding: false });
  const [menstrualMeds, setMenstrualMeds] = useState([false, false, false]);
  const [menstrualSleep, setMenstrualSleep] = useState(60);

  // 2. Follicular States
  const [follicularSliders, setFollicularSliders] = useState({ focus: 80, strength: 75, energy: 80, glow: 70 });
  const [follicularMoods, setFollicularMoods] = useState({ motivated: true, social: false, creative: true, optimistic: false, calm: true });
  const [follicularSymptoms, setFollicularSymptoms] = useState({ startProject: false, mentalClarity: false, skinImprovement: false, strengthWorkout: false });
  const [follicularMeds, setFollicularMeds] = useState([false, false, false]);
  const [follicularSleep, setFollicularSleep] = useState(75);

  // 3. Ovulatory States
  const [ovulatorySliders, setOvulatorySliders] = useState({ libido: 80, confidence: 90, social: 85, bloating: 10 });
  const [ovulatoryMoods, setOvulatoryMoods] = useState({ magnetic: true, outgoing: true, highEnergy: true, restless: false, affectionate: false });
  const [ovulatorySymptoms, setOvulatorySymptoms] = useState({ positiveLh: false, stretchyMucus: false, mittelschmerz: false, highStamina: false });
  const [ovulatoryMeds, setOvulatoryMeds] = useState([false, false, false]);
  const [ovulatorySleep, setOvulatorySleep] = useState(70);

  // 4. Luteal States
  const [lutealSliders, setLutealSliders] = useState({ bloating: 45, breastSensitivity: 35, anxiety: 50, cravings: 60 });
  const [lutealMoods, setLutealMoods] = useState({ tearful: false, anxious: true, nesting: true, quiet: false, tired: true });
  const [lutealSymptoms, setLutealSymptoms] = useState({ moodSwings: false, waterRetention: false, sleepDifficulty: false, boundariesSet: false });
  const [lutealMeds, setLutealMeds] = useState([false, false, false]);
  const [lutealSleep, setLutealSleep] = useState(55);

  // Helper selectors based on active phase
  const currentPhaseConfig = phases.find(p => p.id === activePhase);

  // Toggle handlers for moods
  const handleToggleMood = (key) => {
    if (activePhase === 'menstrual') setMenstrualMoods(prev => ({ ...prev, [key]: !prev[key] }));
    if (activePhase === 'follicular') setFollicularMoods(prev => ({ ...prev, [key]: !prev[key] }));
    if (activePhase === 'ovulatory') setOvulatoryMoods(prev => ({ ...prev, [key]: !prev[key] }));
    if (activePhase === 'luteal') setLutealMoods(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Toggle handlers for symptoms
  const handleToggleSymptom = (key) => {
    if (activePhase === 'menstrual') setMenstrualSymptoms(prev => ({ ...prev, [key]: !prev[key] }));
    if (activePhase === 'follicular') setFollicularSymptoms(prev => ({ ...prev, [key]: !prev[key] }));
    if (activePhase === 'ovulatory') setOvulatorySymptoms(prev => ({ ...prev, [key]: !prev[key] }));
    if (activePhase === 'luteal') setLutealSymptoms(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Toggle handlers for meds / activities
  const handleToggleMed = (idx) => {
    const update = (prev) => {
      const copy = [...prev];
      copy[idx] = !copy[idx];
      return copy;
    };
    if (activePhase === 'menstrual') setMenstrualMeds(update);
    if (activePhase === 'follicular') setFollicularMeds(update);
    if (activePhase === 'ovulatory') setOvulatoryMeds(update);
    if (activePhase === 'luteal') setLutealMeds(update);
  };

  // Slices logs to isolate entries for the current active menstrual cycle
  const getCurrentCycleLogs = () => {
    if (!allLogs || allLogs.length === 0) return [];
    
    // Sort logs chronologically
    const sortedLogs = [...allLogs].sort((a, b) => new Date(a.log_date) - new Date(b.log_date));
    
    // Find active date index
    const selectedIdx = sortedLogs.findIndex(l => l.log_date === selectedDate);
    if (selectedIdx === -1) {
      // Date is not logged yet, find logs up to selectedDate
      const logsBefore = sortedLogs.filter(l => new Date(l.log_date) <= new Date(selectedDate));
      if (logsBefore.length === 0) return [];
      
      let startIdx = -1;
      for (let i = logsBefore.length - 1; i >= 0; i--) {
        if (logsBefore[i].phase === 'menstrual') {
          let j = i;
          while (j >= 0 && logsBefore[j].phase === 'menstrual') {
            j--;
          }
          startIdx = j + 1;
          break;
        }
      }
      if (startIdx === -1) return logsBefore.slice(-15);
      return logsBefore.slice(startIdx);
    }
    
    // Find last menstrual start relative to selection
    let startIdx = -1;
    for (let i = selectedIdx; i >= 0; i--) {
      if (sortedLogs[i].phase === 'menstrual') {
        let j = i;
        while (j >= 0 && sortedLogs[j].phase === 'menstrual') {
          j--;
        }
        startIdx = j + 1;
        break;
      }
    }
    
    if (startIdx === -1) {
      return sortedLogs.slice(0, selectedIdx + 1).slice(-30);
    }
    
    let endIdx = sortedLogs.length;
    for (let i = startIdx + 1; i < sortedLogs.length; i++) {
      if (sortedLogs[i].phase === 'menstrual' && sortedLogs[i - 1].phase !== 'menstrual') {
        if (new Date(sortedLogs[i].log_date) > new Date(sortedLogs[startIdx].log_date).getTime() + 10 * 24 * 60 * 60 * 1000) {
          endIdx = i;
          break;
        }
      }
    }
    
    return sortedLogs.slice(startIdx, endIdx);
  };

  const cycleLogs = getCurrentCycleLogs();
  
  // Format BBT logs for chart plot coords
  const bbtData = cycleLogs
    .map(log => {
      const temp = log.basal_body_temp;
      if (temp === null || temp === undefined) return null;
      
      const startMs = new Date(cycleLogs[0].log_date).getTime();
      const currentMs = new Date(log.log_date).getTime();
      const dayOfCycle = Math.floor((currentMs - startMs) / (24 * 60 * 60 * 1000)) + 1;
      
      return {
        dateStr: log.log_date,
        dayOfCycle,
        temp: parseFloat(temp)
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.dayOfCycle - b.dayOfCycle);

  const getX = (day) => {
    const minX = 1;
    const maxX = bbtData.length > 0 ? Math.max(28, ...bbtData.map(d => d.dayOfCycle)) : 28;
    return 45 + ((day - minX) / (maxX - minX)) * (500 - 45 - 20);
  };

  const getY = (temp) => {
    const temps = bbtData.map(d => d.temp);
    const minT = bbtData.length > 0 ? Math.min(97.0, ...temps) - 0.2 : 96.8;
    const maxT = bbtData.length > 0 ? Math.max(99.0, ...temps) + 0.2 : 99.2;
    return 165 - ((temp - minT) / (maxT - minT)) * (165 - 20); // y range from 20 to 165
  };

  // PMDD Luteal Phase transition warnings (48h crash warning)
  const isLutealCrashIncoming = user?.has_pmdd && apiPrediction && 
    apiPrediction.estimated_phase === 'ovulatory' && 
    apiPrediction.days_until_period >= 14 && 
    apiPrediction.days_until_period <= 16;

  // PCOS / Endo Menorrhagia alerts (consecutive bleeding days)
  const getConsecutiveBleedingDays = () => {
    if (!allLogs || allLogs.length === 0) return 0;
    const sortedLogs = [...allLogs].sort((a, b) => new Date(a.log_date) - new Date(b.log_date));
    const selectedIdx = sortedLogs.findIndex(l => l.log_date === selectedDate);
    if (selectedIdx === -1) {
      if (activePhase !== 'menstrual') return 0;
      const logsBefore = sortedLogs.filter(l => new Date(l.log_date) < new Date(selectedDate));
      let count = 1;
      for (let i = logsBefore.length - 1; i >= 0; i--) {
        if (logsBefore[i].phase === 'menstrual') {
          count++;
        } else {
          break;
        }
      }
      return count;
    }
    
    let count = 0;
    for (let i = selectedIdx; i >= 0; i--) {
      if (sortedLogs[i].phase === 'menstrual') {
        count++;
      } else {
        break;
      }
    }
    return count;
  };

  const bleedingDays = getConsecutiveBleedingDays();
  const isMenorrhagiaDetected = (user?.has_pcos || user?.has_endo) && bleedingDays >= 10;

  return (
    <motion.div 
      className="w-full min-h-screen flex flex-col font-sans transition-colors duration-500"
      style={{ backgroundColor: currentPhaseConfig.bg }}
    >
      
      {/* Dynamic Top Banner */}
      <motion.div 
        className="w-full py-5 px-6 sm:px-12 flex flex-col md:flex-row justify-between items-center text-black border-b border-black/10 transition-colors duration-500 shadow-sm"
        style={{ backgroundColor: currentPhaseConfig.color }}
      >
        {/* Left: Brand / Logo */}
        <button
          onClick={() => setView('landing')}
          className="text-2xl font-black text-black tracking-widest hover:opacity-80 transition-opacity cursor-pointer mb-4 md:mb-0 focus:outline-none"
        >
          SELENE
        </button>

        {/* Center: Welcome message & Date */}
        <div className="flex flex-col items-center text-center mb-4 md:mb-0">
          <h1 className="font-handwriting text-3xl sm:text-4.5xl font-bold tracking-wide leading-none">
            Hellove, {username}
          </h1>
          <p className="font-handwriting text-xl sm:text-2.5xl opacity-90 mt-1">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
        </div>

        {/* Right: Log Out / Switcher info */}
        <div className="flex items-center gap-4 flex-wrap justify-end">
          <span className="text-xs font-bold uppercase tracking-wider bg-black/10 px-2.5 py-1 rounded-md hidden lg:inline-block">
            {currentPhaseConfig.name} Phase
          </span>
          <button
            onClick={handleSaveLog}
            className="border-2 border-black text-black hover:bg-black hover:text-white font-handwriting text-xl px-4 py-1 rounded-full transition-all duration-300 cursor-pointer focus:outline-none bg-white/20 hover:shadow-sm"
          >
            Save Log
          </button>
          <button
            onClick={() => setView('calendar')}
            className="border border-black text-black hover:bg-black hover:text-white font-handwriting text-xl px-4 py-1 rounded-full transition-all duration-300 cursor-pointer focus:outline-none"
          >
            Calendar
          </button>
          <button
            onClick={() => setView('settings')}
            className="w-10 h-10 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors cursor-pointer focus:outline-none"
            title="Settings"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-black" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            onClick={onLogout}
            className="border border-black text-black hover:bg-black hover:text-white font-handwriting text-xl px-4 py-1 rounded-full transition-all duration-300 cursor-pointer focus:outline-none"
          >
            Log Out
          </button>
        </div>
      </motion.div>

      {/* Main Container */}
      <div className="w-full max-w-5xl mx-auto px-6 py-8 flex flex-col gap-10">
        
        {/* Phase Selector Segmented Control */}
        <div className="bg-white/40 backdrop-blur-md rounded-3xl p-2.5 flex flex-wrap justify-between items-center gap-2 border border-black/5 shadow-md">
          {phases.map((p) => {
            const isActive = activePhase === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setActivePhase(p.id)}
                className="flex-1 min-w-[100px] py-2 px-4 rounded-2xl font-handwriting text-2xl border transition-all duration-300 relative cursor-pointer outline-none focus:outline-none"
                style={{ 
                  borderColor: isActive ? p.color : 'transparent',
                  backgroundColor: isActive ? '#fff' : 'transparent',
                  color: isActive ? p.textColor : 'rgba(0,0,0,0.5)',
                  fontWeight: isActive ? 'bold' : 'normal',
                  boxShadow: isActive ? '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)' : 'none'
                }}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeTabOutline" 
                    className="absolute -inset-[2px] border-2 rounded-2xl pointer-events-none"
                    style={{ borderColor: p.color }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                {p.name}
              </button>
            );
          })}
        </div>

        {/* Phase Content Wrapper with AnimatePresence */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activePhase}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-16"
          >
            
            {/* Row 1: Menstrual Phase Circle & Calendar */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
              
              {/* Menstrual Phase Circle */}
              <div className="md:col-span-5 flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm rounded-[3rem] p-8 border border-black/5 shadow-md">
                <div 
                  className="w-48 h-48 sm:w-56 sm:h-56 rounded-full border-[14px] flex items-center justify-center shadow-inner transition-colors duration-500"
                  style={{ 
                    borderColor: currentPhaseConfig.color,
                    backgroundColor: currentPhaseConfig.bg
                  }}
                >
                  <span className="font-handwriting text-black text-3xl sm:text-4xl text-center leading-tight font-bold">
                    {currentPhaseConfig.name}<br />Phase
                  </span>
                </div>
              </div>

              {/* Calendar Widget — Clickable */}
              <button
                onClick={() => setView('calendar')}
                className="md:col-span-7 bg-[#1e2722] text-white rounded-[3rem] p-6 sm:p-8 shadow-2xl flex flex-col justify-between border border-white/5 cursor-pointer focus:outline-none hover:ring-2 hover:ring-white/20 transition-all duration-300 group text-left"
              >
                <div className="flex justify-between items-center mb-4">
                  <span 
                    className="font-handwriting text-2xl sm:text-3xl font-bold transition-colors duration-500"
                    style={{ color: currentPhaseConfig.color }}
                  >
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase()}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-sans text-xs tracking-widest uppercase text-white/50">{currentPhaseConfig.name} Window</span>
                    <span className="font-sans text-xs text-white/30 group-hover:text-white/70 transition-colors duration-300">→ full view</span>
                  </div>
                </div>
                
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-y-3 gap-x-2 text-center text-sm font-sans">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div key={i} className="text-white/40 font-bold text-xs uppercase">{d}</div>
                  ))}
                  
                  {/* Spacer empty days */}
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}

                  {/* Day numbers */}
                  {Array.from({ length: 31 }).map((_, i) => {
                    const day = i + 1;
                    const isHighlight = currentPhaseConfig.calendarHighlight.includes(day);
                    const targetDate = new Date(selectedDate + 'T00:00:00');
                    const isSelectedDay = day === targetDate.getDate();

                    return (
                      <div key={day} className="relative flex items-center justify-center h-8 w-8 mx-auto">
                        {isHighlight && (
                          <motion.div 
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            className="absolute inset-0 rounded-xl flex items-center justify-center opacity-85"
                            style={{ backgroundColor: currentPhaseConfig.color }}
                          >
                            {/* Star / Sparkle icon instead of heavy cross */}
                            <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#1e2722]" fill="currentColor">
                              <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.21l8.2-1.192z" />
                            </svg>
                          </motion.div>
                        )}
                        {isSelectedDay && (
                          <div 
                            className="absolute inset-0 border-2 border-dashed rounded-xl"
                            style={{ borderColor: currentPhaseConfig.color }}
                          />
                        )}
                        <span className={`relative z-10 font-bold ${isHighlight ? 'text-[#1e2722]' : 'text-white'}`}>
                          {day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </button>

            </div>

            {/* Row 2: Predictions & Vibe Graphic */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              
              {/* Prediction Card */}
              <div 
                className="md:col-span-7 rounded-[2.5rem] p-8 sm:p-10 shadow-lg text-black border border-white/10 min-h-[160px] flex items-center justify-center transition-colors duration-500"
                style={{ backgroundColor: currentPhaseConfig.color }}
              >
                <div className="text-center">
                  <h3 className="font-handwriting text-4xl sm:text-5xl font-black italic tracking-wide mb-2">
                    predictions & insights
                  </h3>
                  <p className="font-handwriting text-xl sm:text-2xl text-black/80 max-w-lg mx-auto">
                    {apiPrediction ? apiPrediction.insight : currentPhaseConfig.prediction}
                  </p>
                  {apiPrediction && apiPrediction.next_period_date && (
                    <p className="font-handwriting text-lg text-black/60 mt-3 font-semibold">
                      next expected period: {new Date(apiPrediction.next_period_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} ({apiPrediction.days_until_period} days remaining)
                    </p>
                  )}
                </div>
              </div>

              {/* Illustration Placeholder */}
              <div className="md:col-span-5 flex justify-center">
                <div className="border-2 border-dashed border-[var(--color-selene-brown)]/40 bg-white/30 backdrop-blur-sm rounded-[3rem] p-6 w-full max-w-[280px] aspect-square flex flex-col items-center justify-center text-center shadow-md">
                  <svg viewBox="0 0 24 24" className="w-16 h-16 text-[var(--color-selene-brown)] mb-2" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                  <p className="font-handwriting text-[var(--color-selene-brown)] text-lg leading-tight">
                    {currentPhaseConfig.illustrationText}
                  </p>
                </div>
              </div>

            </div>

            <hr className="border-black/5" />

            {/* Rule-Based Insights Section */}
            {insights && insights.length > 0 && (
              <div className="bg-white/40 backdrop-blur-sm rounded-[3rem] p-8 border border-black/5 shadow-md flex flex-col gap-6">
                <h2 className="font-handwriting text-3xl text-black font-black text-center sm:text-left">
                  hormonal pattern insights
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {insights.map((insight, idx) => {
                    const bgColors = {
                      cycle: 'bg-[#fff3e0]/70 border-[#ffe0b2]',
                      mood: 'bg-[#f3e5f5]/70 border-[#e1bee7]',
                      pain: 'bg-[#ffebee]/70 border-[#ffcdd2]',
                      condition: 'bg-[#fff8e1]/70 border-[#ffecb3]',
                      trend: 'bg-[#e3f2fd]/70 border-[#bbdefb]'
                    };
                    const textColors = {
                      cycle: 'text-[#e65100]',
                      mood: 'text-[#4a148c]',
                      pain: 'text-[#b71c1c]',
                      condition: 'text-[#ff6f00]',
                      trend: 'text-[#0d47a1]'
                    };
                    const categoryBg = bgColors[insight.category] || 'bg-white/60 border-black/10';
                    const categoryText = textColors[insight.category] || 'text-black';

                    return (
                      <motion.div
                        key={idx}
                        whileHover={{ y: -4 }}
                        className={`rounded-3xl p-6 border flex flex-col justify-between shadow-sm transition-all duration-300 ${categoryBg}`}
                      >
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <span className={`text-[10px] font-sans font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/80 border border-black/5 shadow-sm ${categoryText}`}>
                              {insight.category} • {insight.confidence} confidence
                            </span>
                          </div>
                          <h4 className="font-handwriting text-2xl font-bold text-black mb-2">
                            {insight.title}
                          </h4>
                          <p className="font-sans text-sm text-black/70 leading-relaxed mb-4">
                            {insight.message}
                          </p>
                        </div>
                        
                        {/* Expandable Explanation */}
                        <div className="mt-2 border-t border-black/5 pt-4">
                          <details className="group cursor-pointer">
                            <summary className="font-sans text-xs font-bold text-black/60 flex items-center justify-between focus:outline-none select-none">
                              <span>clinical explanation</span>
                              <svg viewBox="0 0 24 24" className="w-4 h-4 transform group-open:rotate-180 transition-transform duration-200" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                              </svg>
                            </summary>
                            <div className="mt-3 font-sans text-xs text-black/60 leading-normal flex flex-col gap-2">
                              <p className="italic">"{insight.explanation}"</p>
                              {insight.supporting_data && Object.keys(insight.supporting_data).length > 0 && (
                                <div className="bg-white/50 rounded-xl p-3 mt-1 border border-black/5">
                                  <div className="font-semibold text-black/70 mb-1">extracted markers:</div>
                                  <pre className="font-mono text-[10px] text-black/50 overflow-x-auto">
                                    {JSON.stringify(insight.supporting_data, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </details>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            <hr className="border-black/5" />

            {/* Row 3: How Are You Feeling? Sliders */}
            <div className="flex flex-col gap-8">
              <h2 className="font-handwriting text-black text-center text-4xl sm:text-5xl font-black tracking-wide">
                how are you feeling??
              </h2>

              <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
                {activePhase === 'menstrual' && (
                  <>
                    <CustomSlider
                      label="1. Flow Intensity"
                      leftLabel="light/spotting"
                      rightLabel="heavy/clotting"
                      value={menstrualSliders.flow}
                      onChange={(val) => setMenstrualSliders(prev => ({ ...prev, flow: val }))}
                    />
                    <CustomSlider
                      label="2. Cramps"
                      leftLabel="mild"
                      rightLabel="severe"
                      value={menstrualSliders.cramps}
                      onChange={(val) => setMenstrualSliders(prev => ({ ...prev, cramps: val }))}
                    />
                    <CustomSlider
                      label="3. Energy level"
                      leftLabel="exhausted"
                      rightLabel="energetic"
                      value={menstrualSliders.energy}
                      onChange={(val) => setMenstrualSliders(prev => ({ ...prev, energy: val }))}
                    />
                    <CustomSlider
                      label="4. Lower back and joint pain"
                      leftLabel="none"
                      rightLabel="severe"
                      value={menstrualSliders.pain}
                      onChange={(val) => setMenstrualSliders(prev => ({ ...prev, pain: val }))}
                    />
                  </>
                )}

                {activePhase === 'follicular' && (
                  <>
                    <CustomSlider
                      label="1. Energy & Focus"
                      leftLabel="dull/scattered"
                      rightLabel="sharp/focused"
                      value={follicularSliders.focus}
                      onChange={(val) => setFollicularSliders(prev => ({ ...prev, focus: val }))}
                    />
                    <CustomSlider
                      label="2. Physical Strength"
                      leftLabel="sluggish"
                      rightLabel="peak strength"
                      value={follicularSliders.strength}
                      onChange={(val) => setFollicularSliders(prev => ({ ...prev, strength: val }))}
                    />
                    <CustomSlider
                      label="3. Motivation & Drive"
                      leftLabel="unmotivated"
                      rightLabel="highly motivated"
                      value={follicularSliders.energy}
                      onChange={(val) => setFollicularSliders(prev => ({ ...prev, energy: val }))}
                    />
                    <CustomSlider
                      label="4. Skin Health & Glow"
                      leftLabel="dry/active breakout"
                      rightLabel="radiant/glowing"
                      value={follicularSliders.glow}
                      onChange={(val) => setFollicularSliders(prev => ({ ...prev, glow: val }))}
                    />
                  </>
                )}

                {activePhase === 'ovulatory' && (
                  <>
                    <CustomSlider
                      label="1. Libido & Drive"
                      leftLabel="none"
                      rightLabel="peak drive"
                      value={ovulatorySliders.libido}
                      onChange={(val) => setOvulatorySliders(prev => ({ ...prev, libido: val }))}
                    />
                    <CustomSlider
                      label="2. Confidence & Self-esteem"
                      leftLabel="self-conscious"
                      rightLabel="unstoppable"
                      value={ovulatorySliders.confidence}
                      onChange={(val) => setOvulatorySliders(prev => ({ ...prev, confidence: val }))}
                    />
                    <CustomSlider
                      label="3. Social Battery"
                      leftLabel="low/drained"
                      rightLabel="social butterfly"
                      value={ovulatorySliders.social}
                      onChange={(val) => setOvulatorySliders(prev => ({ ...prev, social: val }))}
                    />
                    <CustomSlider
                      label="4. Fluid Retention"
                      leftLabel="none"
                      rightLabel="moderate bloating"
                      value={ovulatorySliders.bloating}
                      onChange={(val) => setOvulatorySliders(prev => ({ ...prev, bloating: val }))}
                    />
                  </>
                )}

                {activePhase === 'luteal' && (
                  <>
                    <CustomSlider
                      label="1. Bloating & Fluid retention"
                      leftLabel="none"
                      rightLabel="severe bloating"
                      value={lutealSliders.bloating}
                      onChange={(val) => setLutealSliders(prev => ({ ...prev, bloating: val }))}
                    />
                    <CustomSlider
                      label="2. Breast Sensitivity"
                      leftLabel="none"
                      rightLabel="severe soreness"
                      value={lutealSliders.breastSensitivity}
                      onChange={(val) => setLutealSliders(prev => ({ ...prev, breastSensitivity: val }))}
                    />
                    <CustomSlider
                      label="3. Irritability & Mood Swings"
                      leftLabel="calm"
                      rightLabel="highly irritable"
                      value={lutealSliders.anxiety}
                      onChange={(val) => setLutealSliders(prev => ({ ...prev, anxiety: val }))}
                    />
                    <CustomSlider
                      label="4. Cravings (Salty vs Sweet)"
                      leftLabel="salty/savory"
                      rightLabel="sweet/chocolate"
                      value={lutealSliders.cravings}
                      onChange={(val) => setLutealSliders(prev => ({ ...prev, cravings: val }))}
                    />
                  </>
                )}
              </div>
            </div>

            <hr className="border-black/5" />

            {/* Row 4: Mood Toggles */}
            <div className="flex flex-col gap-8">
              <h2 className="font-handwriting text-black text-center text-4xl sm:text-5xl font-black tracking-wide">
                mood toggles
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                
                {/* Reading Girl Placeholder */}
                <div className="md:col-span-5 flex justify-center order-2 md:order-1">
                  <div className="border-2 border-dashed border-[var(--color-selene-brown)]/40 bg-white/30 backdrop-blur-sm rounded-[3rem] p-6 w-full max-w-[280px] aspect-square flex flex-col items-center justify-center text-center shadow-md">
                    <svg viewBox="0 0 24 24" className="w-16 h-16 text-[var(--color-selene-brown)] mb-2" fill="none" stroke="currentColor" strokeWidth="1.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                    <p className="font-handwriting text-[var(--color-selene-brown)] text-lg leading-tight">
                      [Illustration Placeholder:<br/>Girl reading in armchair]
                    </p>
                  </div>
                </div>

                {/* Mood Toggle Switches */}
                <div className="md:col-span-7 flex flex-col gap-5 order-1 md:order-2">
                  {activePhase === 'menstrual' && (
                    <>
                      <CustomToggle label="1. brain fog/lack of focus" checked={menstrualMoods.brainFog} onChange={() => handleToggleMood('brainFog')} activeColor={currentPhaseConfig.color} />
                      <CustomToggle label="2. anxious/overwhelmed" checked={menstrualMoods.anxious} onChange={() => handleToggleMood('anxious')} activeColor={currentPhaseConfig.color} />
                      <CustomToggle label="3. irritable" checked={menstrualMoods.irritable} onChange={() => handleToggleMood('irritable')} activeColor={currentPhaseConfig.color} />
                      <CustomToggle label="4. sensitive" checked={menstrualMoods.sensitive} onChange={() => handleToggleMood('sensitive')} activeColor={currentPhaseConfig.color} />
                      <CustomToggle label="5. calm" checked={menstrualMoods.calm} onChange={() => handleToggleMood('calm')} activeColor={currentPhaseConfig.color} />
                    </>
                  )}

                  {activePhase === 'follicular' && (
                    <>
                      <CustomToggle label="1. motivated & active" checked={follicularMoods.motivated} onChange={() => handleToggleMood('motivated')} activeColor={currentPhaseConfig.color} />
                      <CustomToggle label="2. social & talkative" checked={follicularMoods.social} onChange={() => handleToggleMood('social')} activeColor={currentPhaseConfig.color} />
                      <CustomToggle label="3. creative & inspired" checked={follicularMoods.creative} onChange={() => handleToggleMood('creative')} activeColor={currentPhaseConfig.color} />
                      <CustomToggle label="4. optimistic & hopeful" checked={follicularMoods.optimistic} onChange={() => handleToggleMood('optimistic')} activeColor={currentPhaseConfig.color} />
                      <CustomToggle label="5. calm & stable" checked={follicularMoods.calm} onChange={() => handleToggleMood('calm')} activeColor={currentPhaseConfig.color} />
                    </>
                  )}

                  {activePhase === 'ovulatory' && (
                    <>
                      <CustomToggle label="1. magnetic & charming" checked={ovulatoryMoods.magnetic} onChange={() => handleToggleMood('magnetic')} activeColor={currentPhaseConfig.color} />
                      <CustomToggle label="2. outgoing & expressive" checked={ovulatoryMoods.outgoing} onChange={() => handleToggleMood('outgoing')} activeColor={currentPhaseConfig.color} />
                      <CustomToggle label="3. high energy & dynamic" checked={ovulatoryMoods.highEnergy} onChange={() => handleToggleMood('highEnergy')} activeColor={currentPhaseConfig.color} />
                      <CustomToggle label="4. restless & easily excited" checked={ovulatoryMoods.restless} onChange={() => handleToggleMood('restless')} activeColor={currentPhaseConfig.color} />
                      <CustomToggle label="5. affectionate & loving" checked={ovulatoryMoods.affectionate} onChange={() => handleToggleMood('affectionate')} activeColor={currentPhaseConfig.color} />
                    </>
                  )}

                  {activePhase === 'luteal' && (
                    <>
                      <CustomToggle label="1. tearful & highly sensitive" checked={lutealMoods.tearful} onChange={() => handleToggleMood('tearful')} activeColor={currentPhaseConfig.color} />
                      <CustomToggle label="2. anxious & overthinking" checked={lutealMoods.anxious} onChange={() => handleToggleMood('anxious')} activeColor={currentPhaseConfig.color} />
                      <CustomToggle label="3. nesting / homebody vibe" checked={lutealMoods.nesting} onChange={() => handleToggleMood('nesting')} activeColor={currentPhaseConfig.color} />
                      <CustomToggle label="4. quiet & reflective" checked={lutealMoods.quiet} onChange={() => handleToggleMood('quiet')} activeColor={currentPhaseConfig.color} />
                      <CustomToggle label="5. tired & slower-paced" checked={lutealMoods.tired} onChange={() => handleToggleMood('tired')} activeColor={currentPhaseConfig.color} />
                    </>
                  )}
                </div>

              </div>
            </div>

            <hr className="border-black/5" />

            {/* Row 5: Phase Specific Core Questions */}
            <div className="flex flex-col gap-8">
              <h2 className="font-handwriting text-black text-center text-4xl sm:text-5xl font-black tracking-wide">
                {activePhase === 'menstrual' ? 'PMOS Symptoms' : 
                 activePhase === 'follicular' ? 'Follicular Focus' : 
                 activePhase === 'ovulatory' ? 'Ovulation Symptoms' : 
                 'Luteal PMS Tracker'}
              </h2>

              <div className="flex flex-col gap-5 w-full max-w-2xl mx-auto">
                {activePhase === 'menstrual' && (
                  <>
                    <CustomToggle label="1. Did you experience intense sugar cravings today?" checked={menstrualSymptoms.sugarCravings} onChange={() => handleToggleSymptom('sugarCravings')} activeColor={currentPhaseConfig.color} />
                    <CustomToggle label="2. Did you experience a sudden energy crash after a meal?" checked={menstrualSymptoms.energyCrash} onChange={() => handleToggleSymptom('energyCrash')} activeColor={currentPhaseConfig.color} />
                    <CustomToggle label="3. Notice any cystic acne flare-ups? (Jawline/chin?)" checked={menstrualSymptoms.cysticAcne} onChange={() => handleToggleSymptom('cysticAcne')} activeColor={currentPhaseConfig.color} />
                    <CustomToggle label="4. Notice any unusual hair shedding or new growth?" checked={menstrualSymptoms.hairShedding} onChange={() => handleToggleSymptom('hairShedding')} activeColor={currentPhaseConfig.color} />
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
                      <span className="font-handwriting text-black text-2xl select-none leading-tight">
                        5. What is your waking Basal Body Temperature (BBT)?
                      </span>
                      <input
                        type="text"
                        placeholder="e.g. 97.8°F"
                        value={bbtInput}
                        onChange={(e) => setBbtInput(e.target.value)}
                        className="placeholder-black/50 text-black font-handwriting text-2xl px-4 py-1.5 rounded-2xl w-full sm:w-44 focus:outline-none border border-black/10 focus:bg-white transition-colors duration-200 text-center shadow-sm"
                        style={{ backgroundColor: currentPhaseConfig.color }}
                      />
                    </div>
                  </>
                )}

                {activePhase === 'follicular' && (
                  <>
                    <CustomToggle label="1. Did you start a new task, project, or habit today?" checked={follicularSymptoms.startProject} onChange={() => handleToggleSymptom('startProject')} activeColor={currentPhaseConfig.color} />
                    <CustomToggle label="2. Did you feel a strong sense of morning mental clarity?" checked={follicularSymptoms.mentalClarity} onChange={() => handleToggleSymptom('mentalClarity')} activeColor={currentPhaseConfig.color} />
                    <CustomToggle label="3. Notice skin improvements or active reduction in breakouts?" checked={follicularSymptoms.skinImprovement} onChange={() => handleToggleSymptom('skinImprovement')} activeColor={currentPhaseConfig.color} />
                    <CustomToggle label="4. Did you complete a strength-based or cardiovascular workout?" checked={follicularSymptoms.strengthWorkout} onChange={() => handleToggleSymptom('strengthWorkout')} activeColor={currentPhaseConfig.color} />
                  </>
                )}

                {activePhase === 'ovulatory' && (
                  <>
                    <CustomToggle label="1. Did you log a positive LH surge (Ovulation test kit)?" checked={ovulatorySymptoms.positiveLh} onChange={() => handleToggleSymptom('positiveLh')} activeColor={currentPhaseConfig.color} />
                    <CustomToggle label="2. Is cervical fluid clear and stretchy (egg-white consistency)?" checked={ovulatorySymptoms.stretchyMucus} onChange={() => handleToggleSymptom('stretchyMucus')} activeColor={currentPhaseConfig.color} />
                    <CustomToggle label="3. Did you experience mild ovulatory twinges (mittelschmerz)?" checked={ovulatorySymptoms.mittelschmerz} onChange={() => handleToggleSymptom('mittelschmerz')} activeColor={currentPhaseConfig.color} />
                    <CustomToggle label="4. Did you experience high physical stamina or high libido?" checked={ovulatorySymptoms.highStamina} onChange={() => handleToggleSymptom('highStamina')} activeColor={currentPhaseConfig.color} />
                  </>
                )}

                {activePhase === 'luteal' && (
                  <>
                    <CustomToggle label="1. Did you experience sudden mood shifts or crying spells?" checked={lutealSymptoms.moodSwings} onChange={() => handleToggleSymptom('moodSwings')} activeColor={currentPhaseConfig.color} />
                    <CustomToggle label="2. Notice any swelling, tender breasts, or water retention?" checked={lutealSymptoms.waterRetention} onChange={() => handleToggleSymptom('waterRetention')} activeColor={currentPhaseConfig.color} />
                    <CustomToggle label="3. Did you experience difficulty falling asleep or early waking?" checked={lutealSymptoms.sleepDifficulty} onChange={() => handleToggleSymptom('sleepDifficulty')} activeColor={currentPhaseConfig.color} />
                    <CustomToggle label="4. Did you intentionally set boundaries and seek quiet rest?" checked={lutealSymptoms.boundariesSet} onChange={() => handleToggleSymptom('boundariesSet')} activeColor={currentPhaseConfig.color} />
                  </>
                )}
              </div>
            </div>

            <hr className="border-black/5" />

            {/* Row 6: Lifestyle Actions */}
            <div className="flex flex-col gap-8 pb-12">
              <h2 className="font-handwriting text-black text-center text-4xl sm:text-5xl font-black tracking-wide">
                Lifestyle actions
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                
                {/* Lifestyle Content */}
                <div className="md:col-span-7 flex flex-col gap-6">
                  
                  <div className="flex flex-col gap-4">
                    {activePhase === 'menstrual' && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="font-handwriting text-black text-2xl">
                            1. Basal Body Temperature?
                          </span>
                          {bbtInput ? (
                            <span 
                              className="font-handwriting text-[#1e2722] text-2xl font-bold px-3 py-0.5 rounded-xl transition-colors duration-500"
                              style={{ backgroundColor: currentPhaseConfig.color }}
                            >
                              {bbtInput}
                            </span>
                          ) : (
                            <span className="font-handwriting text-black/40 text-xl italic">(not logged)</span>
                          )}
                        </div>

                        <div className="flex flex-col gap-3 pl-4">
                          <span className="font-handwriting text-black text-2xl">2. Medication/relief used:</span>
                          <div className="flex flex-col gap-2.5 pl-4">
                            <CustomToggle label="• Painkiller/NSAID" checked={menstrualMeds[0]} onChange={() => handleToggleMed(0)} activeColor={currentPhaseConfig.color} />
                            <CustomToggle label="• Heating pad" checked={menstrualMeds[1]} onChange={() => handleToggleMed(1)} activeColor={currentPhaseConfig.color} />
                            <CustomToggle label="• Herbal tea/Supplements" checked={menstrualMeds[2]} onChange={() => handleToggleMed(2)} activeColor={currentPhaseConfig.color} />
                          </div>
                        </div>
                      </>
                    )}

                    {activePhase === 'follicular' && (
                      <div className="flex flex-col gap-3 pl-4">
                        <span className="font-handwriting text-black text-2xl">1. Core Follicular Activities:</span>
                        <div className="flex flex-col gap-2.5 pl-4">
                          <CustomToggle label="• Heavy Strength Training" checked={follicularMeds[0]} onChange={() => handleToggleMed(0)} activeColor={currentPhaseConfig.color} />
                          <CustomToggle label="• Detailed Planning & Goal setting" checked={follicularMeds[1]} onChange={() => handleToggleMed(1)} activeColor={currentPhaseConfig.color} />
                          <CustomToggle label="• Social engagement / Networking" checked={follicularMeds[2]} onChange={() => handleToggleMed(2)} activeColor={currentPhaseConfig.color} />
                        </div>
                      </div>
                    )}

                    {activePhase === 'ovulatory' && (
                      <div className="flex flex-col gap-3 pl-4">
                        <span className="font-handwriting text-black text-2xl">1. Core Ovulatory Activities:</span>
                        <div className="flex flex-col gap-2.5 pl-4">
                          <CustomToggle label="• High Intensity Cardio/HIIT" checked={ovulatoryMeds[0]} onChange={() => handleToggleMed(0)} activeColor={currentPhaseConfig.color} />
                          <CustomToggle label="• Date night / Social gathering" checked={ovulatoryMeds[1]} onChange={() => handleToggleMed(1)} activeColor={currentPhaseConfig.color} />
                          <CustomToggle label="• High stamina task execution" checked={ovulatoryMeds[2]} onChange={() => handleToggleMed(2)} activeColor={currentPhaseConfig.color} />
                        </div>
                      </div>
                    )}

                    {activePhase === 'luteal' && (
                      <div className="flex flex-col gap-3 pl-4">
                        <span className="font-handwriting text-black text-2xl">1. Core Luteal Activities:</span>
                        <div className="flex flex-col gap-2.5 pl-4">
                          <CustomToggle label="• Gentle Yoga / Yin Stretching" checked={lutealMeds[0]} onChange={() => handleToggleMed(0)} activeColor={currentPhaseConfig.color} />
                          <CustomToggle label="• Warm Epsom salt bath / Sauna" checked={lutealMeds[1]} onChange={() => handleToggleMed(1)} activeColor={currentPhaseConfig.color} />
                          <CustomToggle label="• Magnesium / Sleep tea support" checked={lutealMeds[2]} onChange={() => handleToggleMed(2)} activeColor={currentPhaseConfig.color} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sleep Quality Slider */}
                  <div className="mt-4">
                    <CustomSlider
                      label="3. sleep quality"
                      leftLabel="restless"
                      rightLabel="deep"
                      value={
                        activePhase === 'menstrual' ? menstrualSleep :
                        activePhase === 'follicular' ? follicularSleep :
                        activePhase === 'ovulatory' ? ovulatorySleep :
                        lutealSleep
                      }
                      onChange={(val) => {
                        if (activePhase === 'menstrual') setMenstrualSleep(val);
                        if (activePhase === 'follicular') setFollicularSleep(val);
                        if (activePhase === 'ovulatory') setOvulatorySleep(val);
                        if (activePhase === 'luteal') setLutealSleep(val);
                      }}
                    />
                  </div>

                </div>

                {/* Sleeping Girl Placeholder */}
                <div className="md:col-span-5 flex justify-center">
                  <div className="border-2 border-dashed border-[var(--color-selene-brown)]/40 bg-white/30 backdrop-blur-sm rounded-[3rem] p-6 w-full max-w-[280px] aspect-square flex flex-col items-center justify-center text-center shadow-md">
                    <svg viewBox="0 0 24 24" className="w-16 h-16 text-[var(--color-selene-brown)] mb-2" fill="none" stroke="currentColor" strokeWidth="1.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                    <p className="font-handwriting text-[var(--color-selene-brown)] text-lg leading-tight">
                      [Illustration Placeholder:<br/>Girl sleeping in armchair]
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Save Log Button at the bottom */}
            <div className="flex justify-center pt-8 pb-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSaveLog}
                className="bg-[#1e2722] text-white hover:bg-[#2a3830] font-handwriting text-3xl px-12 py-3.5 rounded-full shadow-2xl transition-all duration-300 cursor-pointer focus:outline-none font-bold"
              >
                Save Symptom Log
              </motion.button>
            </div>

          </motion.div>
        </AnimatePresence>

        {/* Universal Cycle Vitals & BBT Trends Section */}
        <div className="flex flex-col gap-10">
          
          {/* Alerts & Warnings Panel */}
          {(isLutealCrashIncoming || isMenorrhagiaDetected) && (
            <div className="flex flex-col gap-4">
              
              {/* PMDD Luteal Transition Warning */}
              {isLutealCrashIncoming && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#df9b6d]/20 border border-[#df9b6d] rounded-[2rem] p-6 sm:p-8 flex gap-5 items-start shadow-md text-black animate-fade-in"
                >
                  <div className="p-3 bg-[#df9b6d] rounded-full text-white mt-1 shrink-0">
                    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h4 className="font-handwriting text-3xl font-black uppercase tracking-wide">
                      PMDD Luteal Phase Transition Alert (Expected in ~48 hours)
                    </h4>
                    <p className="font-handwriting text-2xl text-black/85 leading-snug">
                      Progesterone shifts will begin in approximately 48 hours. For users tracking PMDD, this transition (the luteal drop) can cause sudden changes in neuro-steroid activity, bringing on feelings of anxiety, fatigue, or mood shifts. Establish gentle boundaries, stock up on comfort foods, and prioritize emotional buffer time.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* PCOS/Endo Prolonged Bleeding (Menorrhagia) Warning */}
              {isMenorrhagiaDetected && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 border border-red-500 rounded-[2rem] p-6 sm:p-8 flex gap-5 items-start shadow-md text-black animate-fade-in"
                >
                  <div className="p-3 bg-red-500 rounded-full text-white mt-1 shrink-0">
                    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h4 className="font-handwriting text-3xl font-black uppercase tracking-wide text-red-600">
                      Prolonged Bleeding Warning (Menorrhagia detected)
                    </h4>
                    <p className="font-handwriting text-2xl text-black/85 leading-snug">
                      You have logged menstrual flow for {bleedingDays} consecutive days. For individuals managing PCOS or Endometriosis, prolonged bleeding can cause iron deficiency anemia and physical exhaustion. Consider tracking flow volume closely and consulting your primary care provider if bleeding continues.
                    </p>
                  </div>
                </motion.div>
              )}

            </div>
          )}

          {/* Vitals Input & BBT Trend Chart */}
          <div className="bg-white/40 backdrop-blur-md rounded-[3.5rem] p-8 sm:p-10 border border-black/5 shadow-md grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
            
            {/* Left Column: Waking Vitals Log Form */}
            <div className="md:col-span-4 flex flex-col gap-6">
              <div>
                <h3 className="font-handwriting text-black text-4xl font-black uppercase tracking-wide leading-none mb-2">
                  waking vitals
                </h3>
                <p className="font-handwriting text-black/60 text-xl leading-snug">
                  Log your basal body temperature (BBT) daily to track cycle transitions.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <label className="font-handwriting text-black text-2.5xl font-bold select-none">
                  Waking Temp:
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="e.g. 97.8"
                    value={bbtInput}
                    onChange={(e) => setBbtInput(e.target.value)}
                    className="placeholder-black/40 text-black font-handwriting text-2.5xl px-4 py-2.5 rounded-2xl w-full focus:outline-none border border-black/10 focus:bg-white transition-colors duration-200 text-center shadow-inner bg-white/50"
                  />
                  <span className="font-handwriting text-black text-4.5xl font-black select-none">
                    °F
                  </span>
                </div>
              </div>

              <div className="bg-black/5 rounded-2xl p-4 flex flex-col gap-1.5 border border-black/5">
                <span className="font-handwriting text-black/70 text-lg font-bold">
                  Clinical Tips:
                </span>
                <p className="font-handwriting text-black/60 text-lg leading-tight">
                  • Measure immediately upon waking, before getting out of bed.
                </p>
                <p className="font-handwriting text-black/60 text-lg leading-tight">
                  • A sustained temperature rise of 0.5°F - 1.0°F confirms successful ovulation.
                </p>
              </div>
            </div>

            {/* Right Column: Basal Temperature Trend Chart */}
            <div className="md:col-span-8 flex flex-col gap-4 w-full">
              <div>
                <h3 className="font-handwriting text-black text-4xl font-black uppercase tracking-wide leading-none mb-1">
                  basal body temp trend
                </h3>
                <p className="font-handwriting text-black/60 text-xl">
                  Cycle Days (D) vs Waking Temperature (°F)
                </p>
              </div>

              <div className="w-full bg-white/70 border border-black/10 rounded-[2.5rem] p-6 shadow-inner relative min-h-[240px] flex items-center justify-center">
                <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible">
                  
                  {/* Grid Lines & Y ticks */}
                  {yTicks.map((tick, idx) => (
                    <g key={idx}>
                      <line x1={45} y1={getY(tick)} x2={480} y2={getY(tick)} stroke="rgba(0,0,0,0.07)" strokeDasharray="3,3" />
                      <text x={12} y={getY(tick) + 4} className="font-sans text-[10px] font-bold fill-black/40">{tick.toFixed(1)}°</text>
                    </g>
                  ))}

                  {/* X Axis ticks */}
                  {xTicks.map((tick, idx) => (
                    <g key={idx}>
                      <line x1={getX(tick)} y1={20} x2={getX(tick)} y2={165} stroke="rgba(0,0,0,0.03)" />
                      <text x={getX(tick)} y={185} textAnchor="middle" className="font-sans text-[10px] font-bold fill-black/40">D{tick}</text>
                    </g>
                  ))}

                  {/* Biphasic Shift Baseline (dashed red line) */}
                  <line x1={45} y1={getY(97.8)} x2={480} y2={getY(97.8)} stroke="rgba(220,38,38,0.25)" strokeWidth={1.5} strokeDasharray="4,4" />
                  <text x={330} y={getY(97.8) - 4} className="font-handwriting text-lg fill-red-500/70 font-semibold">luteal shift baseline (97.8°F)</text>

                  {/* Connected Temperature Trend Line */}
                  {bbtData.length > 1 && (
                    <path
                      d={bbtData.map((d, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(d.dayOfCycle)} ${getY(d.temp)}`).join(' ')}
                      fill="none"
                      stroke="var(--color-selene-brown)"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Temperature Data Dots */}
                  {bbtData.map((d, idx) => (
                    <g key={idx} className="group/dot cursor-pointer">
                      <circle
                        cx={getX(d.dayOfCycle)}
                        cy={getY(d.temp)}
                        r={4.5}
                        fill="#1e2722"
                        stroke="white"
                        strokeWidth={2}
                      />
                      <title>{`Day ${d.dayOfCycle}: ${d.temp}°F (${new Date(d.dateStr).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'})})`}</title>
                    </g>
                  ))}

                  {/* Empty state overlay inside SVG if no logs exist */}
                  {bbtData.length === 0 && (
                    <foreignObject x={45} y={20} width={435} height={145}>
                      <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                        <p className="font-handwriting text-black/60 text-2xl font-bold leading-tight">
                          No Basal Body Temperature logs found for this cycle.
                        </p>
                        <p className="font-handwriting text-black/40 text-lg italic mt-1 leading-snug">
                          Record waking temp daily to visualize the biphasic shift indicating ovulation.
                        </p>
                      </div>
                    </foreignObject>
                  )}
                  
                </svg>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Footer */}
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

    </motion.div>
  );
}

// Helper functions

// Custom Slider Component matching the mockup styling
function CustomSlider({ label, leftLabel, rightLabel, value, onChange }) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <span className="font-handwriting text-black text-2xl pl-1">{label}</span>
      <div className="relative w-full flex items-center h-6">
        
        {/* Track background */}
        <div className="absolute inset-x-0 h-2 bg-[#694b3a]/30 rounded-full overflow-hidden">
          {/* Active red bar */}
          <div 
            className="h-full bg-red-500 rounded-full" 
            style={{ width: `${value}%` }}
          />
        </div>
        
        {/* Invisible range input for dragging */}
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={value} 
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-x-0 w-full h-full opacity-0 cursor-pointer z-20"
        />
        
        {/* Thumb */}
        <div 
          className="absolute w-5 h-5 bg-black rounded-full border-2 border-white pointer-events-none -translate-x-1/2 z-10 shadow"
          style={{ left: `${value}%` }}
        />
      </div>
      
      {/* Labels */}
      <div className="flex justify-between px-1">
        <span className="font-handwriting text-black/70 text-lg italic">{leftLabel}</span>
        <span className="font-handwriting text-black/70 text-lg italic">{rightLabel}</span>
      </div>
    </div>
  );
}

// Custom Toggle Component matching the mockup styling
function CustomToggle({ label, checked, onChange, activeColor }) {
  return (
    <div className="flex items-center justify-between w-full gap-4">
      <span className="font-handwriting text-black text-2xl select-none leading-tight">{label}</span>
      <button
        type="button"
        onClick={onChange}
        className="w-14 h-7 rounded-full bg-[#d2d2d2] relative transition-colors duration-200 focus:outline-none cursor-pointer flex-shrink-0"
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
