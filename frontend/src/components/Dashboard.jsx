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

export default function Dashboard({ username = 'user', setView }) {
  const [activePhase, setActivePhase] = useState('menstrual');

  // 1. Menstrual States
  const [menstrualSliders, setMenstrualSliders] = useState({ flow: 50, cramps: 30, energy: 40, pain: 25 });
  const [menstrualMoods, setMenstrualMoods] = useState({ brainFog: false, anxious: false, irritable: false, sensitive: false, calm: true });
  const [menstrualSymptoms, setMenstrualSymptoms] = useState({ sugarCravings: false, energyCrash: false, cysticAcne: false, hairShedding: false });
  const [menstrualMeds, setMenstrualMeds] = useState([false, false, false]);
  const [menstrualBbt, setMenstrualBbt] = useState('');
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
            28/05/2026
          </p>
        </div>

        {/* Right: Log Out / Switcher info */}
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold uppercase tracking-wider bg-black/10 px-2.5 py-1 rounded-md hidden lg:inline-block">
            {currentPhaseConfig.name} Phase
          </span>
          <button
            onClick={() => setView('landing')}
            className="border border-black text-black hover:bg-black hover:text-white font-handwriting text-xl px-6 py-1.5 rounded-full transition-all duration-300 cursor-pointer focus:outline-none"
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

              {/* Calendar Widget */}
              <div className="md:col-span-7 bg-[#1e2722] text-white rounded-[3rem] p-6 sm:p-8 shadow-2xl flex flex-col justify-between border border-white/5">
                <div className="flex justify-between items-center mb-4">
                  <span 
                    className="font-handwriting text-2xl sm:text-3xl font-bold transition-colors duration-500"
                    style={{ color: currentPhaseConfig.color }}
                  >
                    MAY 2026
                  </span>
                  <span className="font-sans text-xs tracking-widest uppercase text-white/50">{currentPhaseConfig.name} Window</span>
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
                    const isToday = day === 28;

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
                        {isToday && (
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
              </div>

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
                    predictions
                  </h3>
                  <p className="font-handwriting text-xl sm:text-2xl text-black/80 max-w-lg mx-auto">
                    {currentPhaseConfig.prediction}
                  </p>
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
                      onChange={(val) => setValues(setOvulatorySliders, 'confidence', val)}
                    />
                    <CustomSlider
                      label="3. Social Battery"
                      leftLabel="low/drained"
                      rightLabel="social butterfly"
                      value={ovulatorySliders.social}
                      onChange={(val) => setValues(setOvulatorySliders, 'social', val)}
                    />
                    <CustomSlider
                      label="4. Fluid Retention"
                      leftLabel="none"
                      rightLabel="moderate bloating"
                      value={ovulatorySliders.bloating}
                      onChange={(val) => setValues(setOvulatorySliders, 'bloating', val)}
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
                      onChange={(val) => setValues(setLutealSliders, 'bloating', val)}
                    />
                    <CustomSlider
                      label="2. Breast Sensitivity"
                      leftLabel="none"
                      rightLabel="severe soreness"
                      value={lutealSliders.breastSensitivity}
                      onChange={(val) => setValues(setLutealSliders, 'breastSensitivity', val)}
                    />
                    <CustomSlider
                      label="3. Irritability & Mood Swings"
                      leftLabel="calm"
                      rightLabel="highly irritable"
                      value={lutealSliders.anxiety}
                      onChange={(val) => setValues(setLutealSliders, 'anxiety', val)}
                    />
                    <CustomSlider
                      label="4. Cravings (Salty vs Sweet)"
                      leftLabel="salty/savory"
                      rightLabel="sweet/chocolate"
                      value={lutealSliders.cravings}
                      onChange={(val) => setValues(setLutealSliders, 'cravings', val)}
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
                        value={menstrualBbt}
                        onChange={(e) => setMenstrualBbt(e.target.value)}
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
                          {menstrualBbt ? (
                            <span 
                              className="font-handwriting text-[#1e2722] text-2xl font-bold px-3 py-0.5 rounded-xl transition-colors duration-500"
                              style={{ backgroundColor: currentPhaseConfig.color }}
                            >
                              {menstrualBbt}
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

          </motion.div>
        </AnimatePresence>

      </div>

    </motion.div>
  );
}

// State setter helper utility
function setValues(setter, key, val) {
  setter(prev => ({ ...prev, [key]: val }));
}

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
