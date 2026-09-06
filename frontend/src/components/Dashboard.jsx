import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CustomSlider from './CustomSlider';
import CustomToggle from './CustomToggle';
import PhaseCircle from './PhaseCircle';
import BBTTrendChart from './BBTTrendChart';
import PatternInsights from './PatternInsights';
import AlertsPanel from './AlertsPanel';
import HealthConditionsPanel from './HealthConditionsPanel';
import TeaIllustration from './TeaIllustration';
import ReadingIllustration from './ReadingIllustration';
import SleepingIllustration from './SleepingIllustration';
import { encryptData, decryptData } from '../utils/crypto';
import DashboardHeader from './DashboardHeader';
import DashboardSkeleton from './DashboardSkeleton';
import PredictionSummaryCard from './PredictionSummaryCard';
import WakingVitalsCard from './WakingVitalsCard';

// Phase configuration details
const phases = [
  { 
    id: 'menstrual', 
    name: 'Menstrual', 
    color: '#df9b6d', 
    bg: '#eed9c4', 
    textColor: '#362113',
    prediction: "Based on your logs: Your body is restoring. Focus on warm nourishing foods, gentle movement, and extra rest."
  },
  { 
    id: 'follicular', 
    name: 'Follicular', 
    color: '#8ca090', 
    bg: '#e2eae5', 
    textColor: '#1d2b20',
    prediction: "Based on your logs: Estrogen is rising! Ideal phase for strength workouts, planning new projects, and creative brainstorming."
  },
  { 
    id: 'ovulatory', 
    name: 'Ovulatory', 
    color: '#dfbe7e', 
    bg: '#f5eedc', 
    textColor: '#382c16',
    prediction: "Based on your logs: Estrogen and LH are peaking. Fertility is at its highest. Peak communication skills and social energy today."
  },
  { 
    id: 'luteal', 
    name: 'Luteal', 
    color: '#9d8ea6', 
    bg: '#e8e2eb', 
    textColor: '#2a1f33',
    prediction: "Based on your logs: Progesterone is dominant. Energy may naturally decrease. Great phase for nested organizing, reflection, and setting boundaries."
  }
];

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return '';
};

export function getPredictedPhaseForDate(dateStr, prediction) {
  if (!prediction || !prediction.next_period_date) return null;
  
  const targetDate = new Date(dateStr + 'T00:00:00');
  const nextPeriodDate = new Date(prediction.next_period_date + 'T00:00:00');
  
  const cycleLength = prediction.cycle_length_calculated || prediction.cycle_length || 28;
  const periodLength = prediction.period_length_calculated || prediction.period_length || 5;
  const ovulationDay = cycleLength - 14;
  
  const diffTime = targetDate - nextPeriodDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  let dayOfCycle = (diffDays % Math.round(cycleLength));
  if (dayOfCycle < 0) {
    dayOfCycle += Math.round(cycleLength);
  }
  
  if (dayOfCycle < periodLength) {
    return 'menstrual';
  } else if (dayOfCycle < ovulationDay - 1) { 
    return 'follicular';
  } else if (dayOfCycle <= ovulationDay + 1) { 
    return 'ovulatory';
  } else { 
    return 'luteal';
  }
}

export function estimatePhaseFromBaselines(dateStr, logs, user) {
  const cycleLength = user?.cycle_length_baseline || 28;
  const periodLength = user?.period_length_baseline || 5;
  const ovulationDay = cycleLength - 14;
  const targetDate = new Date(dateStr + 'T00:00:00');

  // Find all menstrual dates (phase is menstrual or flow_intensity > 0)
  const menstrualLogs = (logs || [])
    .filter(l => l.phase === 'menstrual' || (l.flow_intensity !== null && l.flow_intensity !== undefined && Number(l.flow_intensity) > 0))
    .map(l => new Date(l.log_date + 'T00:00:00'))
    .sort((a, b) => a - b);
    
  let anchorDate;
  if (menstrualLogs.length > 0) {
    // Find period start dates (days where the previous day was not menstrual)
    const periodStarts = [];
    for (let i = 0; i < menstrualLogs.length; i++) {
      if (i === 0) {
        periodStarts.push(menstrualLogs[i]);
      } else {
        const diffDays = (menstrualLogs[i] - menstrualLogs[i-1]) / (1000 * 60 * 60 * 24);
        if (diffDays > 1.5) {
          periodStarts.push(menstrualLogs[i]);
        }
      }
    }
    const pastStarts = periodStarts.filter(d => d <= targetDate);
    anchorDate = pastStarts.length > 0 ? pastStarts[pastStarts.length - 1] : periodStarts[0];
  } else if (logs && logs.length > 0) {
    // If user logged symptoms but hasn't recorded period start yet,
    // anchor cycle to periodLength days before their earliest logged day
    const sortedLogs = [...logs].sort((a, b) => new Date(a.log_date) - new Date(b.log_date));
    anchorDate = new Date(sortedLogs[0].log_date + 'T00:00:00');
    anchorDate.setDate(anchorDate.getDate() - periodLength);
  } else {
    // Fallback anchor: 14 days before today
    const now = new Date();
    anchorDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    anchorDate.setDate(anchorDate.getDate() - 14);
  }

  const diffDays = Math.floor((targetDate - anchorDate) / (1000 * 60 * 60 * 24));
  let daysInCycle = diffDays % cycleLength;
  if (daysInCycle < 0) daysInCycle += cycleLength;
  
  if (daysInCycle < periodLength) {
    return 'menstrual';
  } else if (daysInCycle < ovulationDay - 1) {
    return 'follicular';
  } else if (daysInCycle <= ovulationDay + 1) {
    return 'ovulatory';
  } else {
    return 'luteal';
  }
}

export function getFallbackDaysUntilNextCycle(dateStr, logs, user) {
  const cycleLength = user?.cycle_length_baseline || 28;
  if (!logs || logs.length === 0) return cycleLength;
  
  const menstrualLogs = logs
    .filter(l => l.phase === 'menstrual' || (l.flow_intensity !== null && l.flow_intensity !== undefined && Number(l.flow_intensity) > 0))
    .map(l => new Date(l.log_date + 'T00:00:00'))
    .sort((a, b) => a - b);
    
  if (menstrualLogs.length === 0) return cycleLength;
  
  const periodStarts = [];
  for (let i = 0; i < menstrualLogs.length; i++) {
    if (i === 0) {
      periodStarts.push(menstrualLogs[i]);
    } else {
      const diffDays = (menstrualLogs[i] - menstrualLogs[i-1]) / (1000 * 60 * 60 * 24);
      if (diffDays > 1.5) {
        periodStarts.push(menstrualLogs[i]);
      }
    }
  }
  
  const targetDate = new Date(dateStr + 'T00:00:00');
  const pastStarts = periodStarts.filter(d => d <= targetDate);
  if (pastStarts.length === 0) {
    return cycleLength;
  }
  
  const lastStart = pastStarts[pastStarts.length - 1];
  const diffDays = Math.floor((targetDate - lastStart) / (1000 * 60 * 60 * 24));
  const daysInCycle = diffDays % cycleLength;
  
  const remaining = cycleLength - daysInCycle;
  return remaining > 0 ? remaining : cycleLength;
}

export function getPhaseForCalendarDay(dateStr, logs, prediction, user) {
  if (Array.isArray(logs)) {
    const directLog = logs.find(l => l.log_date === dateStr);
    if (directLog && directLog.phase) {
      return directLog.phase;
    }
  }
  if (prediction && prediction.next_period_date) {
    const predPhase = getPredictedPhaseForDate(dateStr, prediction);
    if (predPhase) return predPhase;
  }
  return estimatePhaseFromBaselines(dateStr, logs, user);
}


export default function Dashboard({ username = 'user', setView, token, user, onLogout, selectedDate, setSelectedDate, showToast }) {
  const [activePhase, setActivePhase] = useState('menstrual');
  const [allLogs, setAllLogs] = useState([]);
  const [apiPrediction, setApiPrediction] = useState(null);
  const [insights, setInsights] = useState([]);
  const [bbtInput, setBbtInput] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [fetchError, setFetchError] = useState(null);

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

  const currentPhaseConfig = phases.find(p => p.id === activePhase) || phases[0];

  const resetSymptomStates = () => {
    setBbtInput('');
    setMenstrualSliders({ flow: 50, cramps: 30, energy: 40, pain: 25 });
    setMenstrualMoods({ brainFog: false, anxious: false, irritable: false, sensitive: false, calm: true });
    setMenstrualSymptoms({ sugarCravings: false, energyCrash: false, cysticAcne: false, hairShedding: false });
    setMenstrualMeds([false, false, false]);
    setMenstrualSleep(60);

    setFollicularSliders({ focus: 80, strength: 75, energy: 80, glow: 70 });
    setFollicularMoods({ motivated: true, social: false, creative: true, optimistic: false, calm: true });
    setFollicularSymptoms({ startProject: false, mentalClarity: false, skinImprovement: false, strengthWorkout: false });
    setFollicularMeds([false, false, false]);
    setFollicularSleep(75);

    setOvulatorySliders({ libido: 80, confidence: 90, social: 85, bloating: 10 });
    setOvulatoryMoods({ magnetic: true, outgoing: true, highEnergy: true, restless: false, affectionate: false });
    setOvulatorySymptoms({ positiveLh: false, stretchyMucus: false, mittelschmerz: false, highStamina: false });
    setOvulatoryMeds([false, false, false]);
    setOvulatorySleep(70);

    setLutealSliders({ bloating: 45, breastSensitivity: 35, anxiety: 50, cravings: 60 });
    setLutealMoods({ tearful: false, anxious: true, nesting: true, quiet: false, tired: true });
    setLutealSymptoms({ moodSwings: false, waterRetention: false, sleepDifficulty: false, boundariesSet: false });
    setLutealMeds([false, false, false]);
    setLutealSleep(55);
  };

  const fetchLogsData = async (predictionOverride) => {
    if (!token || !selectedDate) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await fetch('/api/logs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.logs) {
        const dek = sessionStorage.getItem('selene_dek');
        const processedLogs = [];
        for (const log of data.logs) {
          if (log.encrypted_data && dek) {
            try {
              const decryptedStr = await decryptData(log.encrypted_data, dek);
              const decryptedJson = JSON.parse(decryptedStr);
              processedLogs.push({
                ...log,
                ...decryptedJson
              });
            } catch (err) {
              console.error("Failed to decrypt log client-side:", err);
              processedLogs.push(log);
            }
          } else {
            processedLogs.push(log);
          }
        }
        setAllLogs(processedLogs);
        const logForDay = processedLogs.find(l => l.log_date === selectedDate);
        if (logForDay) {
          setActivePhase(logForDay.phase || 'follicular');
          setBbtInput(logForDay.basal_body_temp !== null ? String(logForDay.basal_body_temp) : '');
          const phaseStr = logForDay.phase || 'follicular';
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
          resetSymptomStates();
          // Automatically set active phase based on predicted next period date or baseline calculation
          const effectivePrediction = predictionOverride !== undefined ? predictionOverride : apiPrediction;
          if (effectivePrediction && effectivePrediction.next_period_date) {
            const predPhase = getPredictedPhaseForDate(selectedDate, effectivePrediction);
            if (predPhase) {
              setActivePhase(predPhase);
            } else {
              setActivePhase(estimatePhaseFromBaselines(selectedDate, processedLogs, user));
            }
          } else if (effectivePrediction && effectivePrediction.estimated_phase && effectivePrediction.estimated_phase !== 'calibrating' && effectivePrediction.estimated_phase !== 'Calibrating') {
            setActivePhase(effectivePrediction.estimated_phase);
          } else {
            const fallbackPhase = estimatePhaseFromBaselines(selectedDate, processedLogs, user);
            setActivePhase(fallbackPhase);
          }
        }
      } else {
        setFetchError(data.error || "Failed to load logs.");
      }

    } catch (e) {
      console.error(e);
      setFetchError("Network connection failure.");
    } finally {
      setIsLoading(false);
    }
  };

  const getOfflineLogs = async () => {
    const raw = localStorage.getItem('selene_offline_logs');
    if (!raw) return [];
    
    const key = sessionStorage.getItem('selene_session_key');
    if (!key) {
      if (raw.trim().startsWith('[')) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          return [];
        }
      }
      return [];
    }

    try {
      if (raw.trim().startsWith('[')) {
        return JSON.parse(raw);
      }
      const decrypted = await decryptData(raw, key);
      return JSON.parse(decrypted || '[]');
    } catch (err) {
      console.error("Failed to decrypt offline logs:", err);
      return [];
    }
  };

  const saveOfflineLogs = async (logs) => {
    const key = sessionStorage.getItem('selene_session_key');
    const jsonStr = JSON.stringify(logs);
    if (!key) {
      localStorage.setItem('selene_offline_logs', jsonStr);
      return;
    }
    try {
      const encrypted = await encryptData(jsonStr, key);
      localStorage.setItem('selene_offline_logs', encrypted);
    } catch (err) {
      console.error("Failed to encrypt offline logs:", err);
      localStorage.setItem('selene_offline_logs', jsonStr);
    }
  };

  const syncOfflineQueue = async () => {
    const queuedLogs = await getOfflineLogs();
    if (queuedLogs.length === 0) return;

    setIsSyncing(true);
    let successCount = 0;
    const remainingLogs = [];

    for (const log of queuedLogs) {
      try {
        const response = await fetch('/api/logs/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-CSRF-Token': getCookie('csrf_token')
          },
          body: JSON.stringify(log)
        });
        if (response.ok) {
          successCount++;
        } else {
          remainingLogs.push(log);
        }
      } catch (err) {
        console.error("Failed to sync offline log", err);
        remainingLogs.push(log);
      }
    }

    if (successCount > 0) {
      showToast(`Synced ${successCount} offline logs successfully! 🚀`, 'success');
      fetchLogsData();
    }

    await saveOfflineLogs(remainingLogs);
    setIsSyncing(false);
  };

  // Listen to network status change
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [token]);

  // Load daily log on selectedDate change
  useEffect(() => {
    const loadCycleAndPredict = async () => {
      if (!token) return;
      let currentPrediction = null;
      try {
        const predResponse = await fetch(`/api/predict/next-cycle?date=${selectedDate}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (predResponse.ok) {
          const predData = await predResponse.json();
          if (predData && predData.prediction) {
            currentPrediction = predData.prediction;
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
        console.error("Failed to load predictions/insights", e);
      }
      
      // Load logs with fresh prediction override
      fetchLogsData(currentPrediction);
    };
    
    loadCycleAndPredict();
  }, [selectedDate, token]);

  const handleStartPeriodToday = async () => {
    setActivePhase('menstrual');
    setMenstrualSliders(prev => ({ ...prev, flow: prev.flow || 50 }));
    showToast("Period started! Switched to Menstrual phase. 🩸", "info");
    
    const payload = {
      log_date: selectedDate,
      phase: 'menstrual',
      flow_intensity: menstrualSliders.flow || 50,
      pelvic_pain: menstrualSliders.cramps || 30,
      energy_level: menstrualSliders.energy || 40,
      back_pain: menstrualSliders.pain || 25,
      sleep_quality: menstrualSleep || 60,
      mood_toggles: menstrualMoods,
      symptom_tags: menstrualSymptoms,
      lifestyle_actions: { meds: menstrualMeds }
    };

    const dek = sessionStorage.getItem('selene_dek');
    let syncPayload = { ...payload };
    if (dek) {
      try {
        const encrypted = await encryptData(JSON.stringify(payload), dek);
        syncPayload = {
          log_date: payload.log_date,
          phase: payload.phase,
          encrypted_data: encrypted
        };
      } catch (err) {
        console.error("Encryption error:", err);
      }
    }

    if (token && isOnline) {
      setIsSyncing(true);
      try {
        const response = await fetch('/api/logs/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-CSRF-Token': getCookie('csrf_token')
          },
          body: JSON.stringify(syncPayload)
        });
        if (response.ok) {
          showToast("Period start logged & cycle updated! 🩸", "success");
          fetchLogsData();
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleEndPeriodToday = async () => {
    setActivePhase('follicular');
    showToast("Period ended! Switched to Follicular phase. 🌿", "info");
    
    const payload = {
      log_date: selectedDate,
      phase: 'follicular',
      flow_intensity: follicularSliders.focus || 80,
      pelvic_pain: follicularSliders.strength || 75,
      energy_level: follicularSliders.energy || 80,
      back_pain: follicularSliders.glow || 70,
      sleep_quality: follicularSleep || 75,
      mood_toggles: follicularMoods,
      symptom_tags: follicularSymptoms,
      lifestyle_actions: { meds: follicularMeds }
    };

    const dek = sessionStorage.getItem('selene_dek');
    let syncPayload = { ...payload };
    if (dek) {
      try {
        const encrypted = await encryptData(JSON.stringify(payload), dek);
        syncPayload = {
          log_date: payload.log_date,
          phase: payload.phase,
          encrypted_data: encrypted
        };
      } catch (err) {
        console.error(err);
      }
    }

    if (token && isOnline) {
      setIsSyncing(true);
      try {
        const response = await fetch('/api/logs/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-CSRF-Token': getCookie('csrf_token')
          },
          body: JSON.stringify(syncPayload)
        });
        if (response.ok) {
          showToast("Transitioned to Follicular phase! 🌿", "success");
          fetchLogsData();
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleSaveLog = async () => {
    if (!token) {
      showToast("Please login first to save your data.", "error");
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

    const dek = sessionStorage.getItem('selene_dek');
    let syncPayload = { ...payload };
    if (dek) {
      try {
        const encrypted = await encryptData(JSON.stringify(payload), dek);
        syncPayload = {
          log_date: payload.log_date,
          phase: payload.phase,
          encrypted_data: encrypted
        };
      } catch (err) {
        console.error("Client-side encryption failed, using fallback:", err);
      }
    }

    if (!isOnline) {
      // Offline support
      const queuedLogs = await getOfflineLogs();
      const filtered = queuedLogs.filter(l => l.log_date !== syncPayload.log_date);
      filtered.push(syncPayload);
      await saveOfflineLogs(filtered);

      setAllLogs(prev => {
        const copy = prev.filter(l => l.log_date !== syncPayload.log_date);
        copy.push(payload);
        return copy;
      });

      showToast("Offline mode: Log queued locally and will sync when connection is restored. 💾", "success");
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch('/api/logs/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-CSRF-Token': getCookie('csrf_token')
        },
        body: JSON.stringify(syncPayload)
      });
      const data = await response.json();
      if (response.ok) {
        showToast("Daily symptoms saved successfully! ✨", "success");
        // Re-fetch all logs to update BBT chart and predictions
        fetchLogsData();
      } else {
        showToast(data.error || "Failed to save symptoms.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Network error. Sync failed.", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleMood = (key) => {
    if (activePhase === 'menstrual') setMenstrualMoods(prev => ({ ...prev, [key]: !prev[key] }));
    if (activePhase === 'follicular') setFollicularMoods(prev => ({ ...prev, [key]: !prev[key] }));
    if (activePhase === 'ovulatory') setOvulatoryMoods(prev => ({ ...prev, [key]: !prev[key] }));
    if (activePhase === 'luteal') setLutealMoods(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleSymptom = (key) => {
    if (activePhase === 'menstrual') setMenstrualSymptoms(prev => ({ ...prev, [key]: !prev[key] }));
    if (activePhase === 'follicular') setFollicularSymptoms(prev => ({ ...prev, [key]: !prev[key] }));
    if (activePhase === 'ovulatory') setOvulatorySymptoms(prev => ({ ...prev, [key]: !prev[key] }));
    if (activePhase === 'luteal') setLutealSymptoms(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleMed = (index) => {
    let currentMeds = [];
    if (activePhase === 'menstrual') currentMeds = [...menstrualMeds];
    if (activePhase === 'follicular') currentMeds = [...follicularMeds];
    if (activePhase === 'ovulatory') currentMeds = [...ovulatoryMeds];
    if (activePhase === 'luteal') currentMeds = [...lutealMeds];

    currentMeds[index] = !currentMeds[index];

    if (activePhase === 'menstrual') setMenstrualMeds(currentMeds);
    if (activePhase === 'follicular') setFollicularMeds(currentMeds);
    if (activePhase === 'ovulatory') setOvulatoryMeds(currentMeds);
    if (activePhase === 'luteal') setLutealMeds(currentMeds);
  };

  const getCurrentCycleLogs = () => {
    if (!allLogs || allLogs.length === 0) return [];
    const sortedLogs = [...allLogs].sort((a, b) => new Date(a.log_date) - new Date(b.log_date));
    const selectedIdx = sortedLogs.findIndex(l => l.log_date === selectedDate);
    if (selectedIdx === -1) {
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
  
  const bbtData = cycleLogs
    .map(log => {
      const temp = log.basal_body_temp;
      if (temp === null || isNaN(temp)) return null;
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

  const getConsecutiveBleedingDays = () => {
    if (!allLogs || allLogs.length === 0) return 0;
    const sortedLogs = [...allLogs].sort((a, b) => new Date(a.log_date) - new Date(b.log_date));
    const selectedIdx = sortedLogs.findIndex(l => l.log_date === selectedDate);
    if (selectedIdx === -1) {
      if (activePhase !== 'menstrual') return 0;
      const logsBefore = sortedLogs.filter(l => new Date(l.log_date) < new Date(selectedDate));
      let count = 1;
      for (let i = logsBefore.length - 1; i >= 0; i--) {
        if (logsBefore[i].phase === 'menstrual') count++;
        else break;
      }
      return count;
    }
    if (sortedLogs[selectedIdx].phase !== 'menstrual') return 0;
    let count = 1;
    for (let i = selectedIdx - 1; i >= 0; i--) {
      if (sortedLogs[i].phase === 'menstrual') count++;
      else break;
    }
    return count;
  };

  const bleedingDays = getConsecutiveBleedingDays();
  const isMenorrhagiaDetected = (user?.has_pcos || user?.has_endo) && bleedingDays >= 10;
  const isLutealCrashIncoming = user?.has_pmdd && apiPrediction && 
    apiPrediction.estimated_phase === 'ovulatory' && 
    apiPrediction.days_until_period >= 14 && 
    apiPrediction.days_until_period <= 16;

  return (
    <motion.div 
      className="w-full min-h-screen flex flex-col font-sans transition-colors duration-500"
      style={{ backgroundColor: currentPhaseConfig.bg }}
    >
      <DashboardHeader 
        currentPhaseConfig={currentPhaseConfig}
        username={username}
        selectedDate={selectedDate}
        isOnline={isOnline}
        isSyncing={isSyncing}
        setView={setView}
        onLogout={onLogout}
      />

      {/* Main Container */}
      <div className="w-full max-w-5xl mx-auto px-6 py-10 flex flex-col gap-16 flex-grow">
        {isLoading ? (
          <DashboardSkeleton />
        ) : fetchError ? (
          <div className="bg-red-50/80 border border-red-200 rounded-[2.5rem] p-10 text-center max-w-xl mx-auto flex flex-col items-center gap-4 my-20 shadow-md">
            <p className="font-handwriting text-3xl text-red-900 font-bold">Failed to load cycle data</p>
            <p className="font-sans text-sm text-red-700">{fetchError}</p>
            <button 
              onClick={fetchLogsData}
              className="px-6 py-2 bg-[#1e2722] text-white rounded-full font-handwriting text-xl hover:bg-black/80 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedDate}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-16"
            >
              {/* Prediction Hero Summary Card */}
              <PredictionSummaryCard 
                prediction={apiPrediction}
                activePhase={activePhase}
                user={user}
                phases={phases}
              />

              {/* Front Screen "Did You Start Menstruating Today?" Prompt */}
              <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-[var(--color-selene-brown)]/20 flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300">
                <div className="flex items-center gap-4 text-left">
                  <div className="w-14 h-14 rounded-2xl bg-[#df9b6d]/20 flex items-center justify-center text-3xl shrink-0">
                    🩸
                  </div>
                  <div>
                    <h3 className="font-handwriting text-3xl sm:text-4xl font-bold text-[#362113]">
                      Did you start menstruating today?
                    </h3>
                    <p className="font-sans text-xs sm:text-sm text-[#362113]/70 mt-1">
                      {activePhase === 'menstrual' 
                        ? `Period logging active for ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}. Update symptoms below or mark period ended.`
                        : `Tap below if your period started on ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} to update your cycle predictions.`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  {activePhase !== 'menstrual' ? (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleStartPeriodToday}
                      className="px-6 py-3 rounded-full bg-[#df9b6d] text-[#362113] font-handwriting text-2xl font-bold shadow-md hover:bg-[#d68f60] transition-colors flex items-center gap-2 cursor-pointer border border-[#df9b6d]/40"
                    >
                      <span>🩸 Yes, Period Started Today</span>
                    </motion.button>
                  ) : (
                    <>
                      <div className="px-5 py-2.5 rounded-full bg-[#df9b6d]/20 text-[#362113] font-sans text-xs font-bold uppercase tracking-wider flex items-center gap-2 border border-[#df9b6d]/30">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#df9b6d] animate-pulse" />
                        Menstrual Phase Active
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleEndPeriodToday}
                        className="px-5 py-2.5 rounded-full bg-[#8ca090] text-[#1d2b20] font-handwriting text-xl font-bold shadow-sm hover:bg-[#7b907f] transition-colors cursor-pointer"
                      >
                        Period Ended (Move to Follicular)
                      </motion.button>
                    </>
                  )}
                </div>
              </div>

              {/* Row 1: Phase Circle & Mini Calendar */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
                <PhaseCircle currentPhaseConfig={currentPhaseConfig} />

                {/* Calendar Widget */}
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
                    
                    {/* Dynamic empty leading cells for month */}
                    {Array.from({ length: new Date(new Date(selectedDate + 'T00:00:00').getFullYear(), new Date(selectedDate + 'T00:00:00').getMonth(), 1).getDay() }).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}

                    {/* Dynamic days in month */}
                    {Array.from({ length: new Date(new Date(selectedDate + 'T00:00:00').getFullYear(), new Date(selectedDate + 'T00:00:00').getMonth() + 1, 0).getDate() }).map((_, i) => {
                      const day = i + 1;
                      const monthObj = new Date(selectedDate + 'T00:00:00');
                      const dayStr = `${monthObj.getFullYear()}-${String(monthObj.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const dayPhase = getPhaseForCalendarDay(dayStr, allLogs, apiPrediction, user);
                      const phaseObj = phases.find(p => p.id === dayPhase);
                      const isCurrentActive = dayPhase === currentPhaseConfig.id;
                      const isSelectedDay = day === monthObj.getDate();

                      return (
                        <div key={day} className="relative flex items-center justify-center h-8 w-8 mx-auto">
                          {phaseObj && (
                            <div 
                              className={`absolute inset-0 rounded-xl transition-all ${isCurrentActive ? 'opacity-90 shadow-xs' : 'opacity-45'}`}
                              style={{ backgroundColor: phaseObj.color }}
                            />
                          )}
                          {isSelectedDay && (
                            <div 
                              className="absolute inset-0 border-2 border-white rounded-xl shadow-sm z-10"
                            />
                          )}
                          <span className={`relative z-10 text-xs font-bold ${phaseObj ? 'text-[#1e2722]' : 'text-white/70'}`}>
                            {day}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </button>
              </div>

              {/* Row 2: Predictions & Illustration */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
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
                    {activePhase !== 'menstrual' ? (
                      <p className="font-handwriting text-lg text-black/60 mt-3 font-semibold">
                        next cycle in {
                          apiPrediction && apiPrediction.days_until_period !== undefined && apiPrediction.days_until_period !== null
                            ? apiPrediction.days_until_period
                            : getFallbackDaysUntilNextCycle(selectedDate, allLogs, user)
                        } days
                      </p>
                    ) : (
                      apiPrediction && apiPrediction.next_period_date && (
                        <p className="font-handwriting text-lg text-black/60 mt-3 font-semibold">
                          next expected period: {new Date(apiPrediction.next_period_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} ({apiPrediction.days_until_period} days remaining)
                        </p>
                      )
                    )}
                  </div>
                </div>

                {/* Organic Illustration Placement */}
                <div className="md:col-span-5 flex justify-center">
                  <div className="border border-[var(--color-selene-brown)]/15 bg-white/30 backdrop-blur-sm rounded-[3rem] p-6 w-full max-w-[280px] aspect-square flex flex-col items-center justify-center text-center shadow-md">
                    {activePhase === 'menstrual' && <TeaIllustration />}
                    {(activePhase === 'follicular' || activePhase === 'ovulatory') && <ReadingIllustration />}
                    {activePhase === 'luteal' && <SleepingIllustration />}
                    <p className="font-handwriting text-[var(--color-selene-brown)] text-lg leading-tight mt-2 italic font-semibold">
                      {activePhase === 'menstrual' ? 'Nourishing Rest' : 
                       activePhase === 'follicular' ? 'Rising Energy' : 
                       activePhase === 'ovulatory' ? 'Social Sparkle' : 
                       'Mindful Retreat'}
                    </p>
                  </div>
                </div>
              </div>

              <hr className="border-black/5" />

              {/* Row 3: Frozen Phase Status */}
              <div className="flex flex-col gap-4 text-center bg-white/40 backdrop-blur-sm rounded-[2.5rem] p-8 border border-black/5 shadow-sm">
                <div className="flex items-center justify-center gap-2">
                  <span className="font-sans text-black text-xs font-bold tracking-widest uppercase">
                    Biological Phase Tracking
                  </span>
                  <span className="bg-black/10 text-black/70 text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span>🔒</span> Buttons Frozen
                  </span>
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                  {phases.map((p) => {
                    const isCurrent = activePhase === p.id;
                    return (
                      <div key={p.id} className="relative group">
                        <button
                          disabled={!isCurrent}
                          className={`font-handwriting text-2xl px-6 py-2.5 rounded-full border transition-all duration-300 flex items-center gap-2 ${
                            isCurrent 
                              ? 'border-transparent font-bold shadow-md cursor-default scale-105' 
                              : 'bg-black/5 border-black/5 text-black/40 opacity-40 cursor-not-allowed filter grayscale'
                          }`}
                          style={{ 
                            backgroundColor: isCurrent ? p.color : undefined,
                            color: isCurrent ? '#1e2722' : undefined
                          }}
                        >
                          {isCurrent && <span className="text-sm">🔒</span>}
                          <span>{p.name}</span>
                          {!isCurrent && <span className="text-xs opacity-60">(Frozen)</span>}
                        </button>
                      </div>
                    );
                  })}
                </div>
                <p className="font-sans text-xs text-black/50 max-w-md mx-auto italic">
                  Phase buttons are frozen to your active biological phase ({currentPhaseConfig.name}). To start a new period, tap <strong>"Yes, Period Started Today"</strong> on the front screen above.
                </p>
              </div>

              <hr className="border-black/5" />

              {/* Row 4: Dynamic Phase Symptom Sliders */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 max-w-4xl mx-auto w-full">
                {activePhase === 'menstrual' && (
                  <>
                    <CustomSlider label="1. flow intensity" leftLabel="spotting" rightLabel="heavy" value={menstrualSliders.flow} onChange={(v) => setMenstrualSliders(prev => ({ ...prev, flow: v }))} />
                    <CustomSlider label="2. pelvic cramps" leftLabel="none" rightLabel="severe" value={menstrualSliders.cramps} onChange={(v) => setMenstrualSliders(prev => ({ ...prev, cramps: v }))} />
                    <CustomSlider label="3. physical energy" leftLabel="exhausted" rightLabel="rested" value={menstrualSliders.energy} onChange={(v) => setMenstrualSliders(prev => ({ ...prev, energy: v }))} />
                    <CustomSlider label="4. lower back pain" leftLabel="none" rightLabel="severe" value={menstrualSliders.pain} onChange={(v) => setMenstrualSliders(prev => ({ ...prev, pain: v }))} />
                  </>
                )}

                {activePhase === 'follicular' && (
                  <>
                    <CustomSlider label="1. focus / mental clarity" leftLabel="foggy" rightLabel="sharp" value={follicularSliders.focus} onChange={(v) => setFollicularSliders(prev => ({ ...prev, focus: v }))} />
                    <CustomSlider label="2. physical strength" leftLabel="weak" rightLabel="strong" value={follicularSliders.strength} onChange={(v) => setFollicularSliders(prev => ({ ...prev, strength: v }))} />
                    <CustomSlider label="3. baseline energy" leftLabel="low" rightLabel="driven" value={follicularSliders.energy} onChange={(v) => setFollicularSliders(prev => ({ ...prev, energy: v }))} />
                    <CustomSlider label="4. skin glow index" leftLabel="dull" rightLabel="radiant" value={follicularSliders.glow} onChange={(v) => setFollicularSliders(prev => ({ ...prev, glow: v }))} />
                  </>
                )}

                {activePhase === 'ovulatory' && (
                  <>
                    <CustomSlider label="1. libido / sex drive" leftLabel="low" rightLabel="high" value={ovulatorySliders.libido} onChange={(v) => setOvulatorySliders(prev => ({ ...prev, libido: v }))} />
                    <CustomSlider label="2. social confidence" leftLabel="reserved" rightLabel="bold" value={ovulatorySliders.confidence} onChange={(v) => setOvulatorySliders(prev => ({ ...prev, confidence: v }))} />
                    <CustomSlider label="3. communication ease" leftLabel="quiet" rightLabel="eloquent" value={ovulatorySliders.social} onChange={(v) => setOvulatorySliders(prev => ({ ...prev, social: v }))} />
                    <CustomSlider label="4. fluid bloating" leftLabel="none" rightLabel="intense" value={ovulatorySliders.bloating} onChange={(v) => setOvulatorySliders(prev => ({ ...prev, bloating: v }))} />
                  </>
                )}

                {activePhase === 'luteal' && (
                  <>
                    <CustomSlider label="1. water bloating" leftLabel="none" rightLabel="severe" value={lutealSliders.bloating} onChange={(v) => setLutealSliders(prev => ({ ...prev, bloating: v }))} />
                    <CustomSlider label="2. breast sensitivity" leftLabel="none" rightLabel="intense" value={lutealSliders.breastSensitivity} onChange={(v) => setLutealSliders(prev => ({ ...prev, breastSensitivity: v }))} />
                    <CustomSlider label="3. tension / anxiety" leftLabel="calm" rightLabel="high" value={lutealSliders.anxiety} onChange={(v) => setLutealSliders(prev => ({ ...prev, anxiety: v }))} />
                    <CustomSlider label="4. food cravings" leftLabel="none" rightLabel="strong" value={lutealSliders.cravings} onChange={(v) => setLutealSliders(prev => ({ ...prev, cravings: v }))} />
                  </>
                )}
              </div>

              <hr className="border-black/5" />

              {/* Row 5: Dynamic Mood Swings */}
              <div className="flex flex-col gap-6 text-center max-w-3xl mx-auto w-full">
                <span className="font-sans text-black text-xl font-bold tracking-widest uppercase">
                  mood overlay today:
                </span>
                <div className="flex flex-wrap justify-center gap-3">
                  {activePhase === 'menstrual' && Object.keys(menstrualMoods).map((moodKey) => (
                    <motion.button
                      key={moodKey}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleToggleMood(moodKey)}
                      className={`font-handwriting text-2xl px-5 py-1.5 rounded-2xl border transition-colors cursor-pointer focus:outline-none ${
                        menstrualMoods[moodKey]
                          ? 'border-transparent text-white font-bold'
                          : 'bg-white/40 border-black/5 text-black/60'
                      }`}
                      style={{ backgroundColor: menstrualMoods[moodKey] ? 'var(--color-selene-brown)' : undefined }}
                    >
                      {moodKey.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </motion.button>
                  ))}

                  {activePhase === 'follicular' && Object.keys(follicularMoods).map((moodKey) => (
                    <motion.button
                      key={moodKey}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleToggleMood(moodKey)}
                      className={`font-handwriting text-2xl px-5 py-1.5 rounded-2xl border transition-colors cursor-pointer focus:outline-none ${
                        follicularMoods[moodKey]
                          ? 'border-transparent text-white font-bold'
                          : 'bg-white/40 border-black/5 text-black/60'
                      }`}
                      style={{ backgroundColor: follicularMoods[moodKey] ? 'var(--color-selene-brown)' : undefined }}
                    >
                      {moodKey.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </motion.button>
                  ))}

                  {activePhase === 'ovulatory' && Object.keys(ovulatoryMoods).map((moodKey) => (
                    <motion.button
                      key={moodKey}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleToggleMood(moodKey)}
                      className={`font-handwriting text-2xl px-5 py-1.5 rounded-2xl border transition-colors cursor-pointer focus:outline-none ${
                        ovulatoryMoods[moodKey]
                          ? 'border-transparent text-white font-bold'
                          : 'bg-white/40 border-black/5 text-black/60'
                      }`}
                      style={{ backgroundColor: ovulatoryMoods[moodKey] ? 'var(--color-selene-brown)' : undefined }}
                    >
                      {moodKey.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </motion.button>
                  ))}

                  {activePhase === 'luteal' && Object.keys(lutealMoods).map((moodKey) => (
                    <motion.button
                      key={moodKey}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleToggleMood(moodKey)}
                      className={`font-handwriting text-2xl px-5 py-1.5 rounded-2xl border transition-colors cursor-pointer focus:outline-none ${
                        lutealMoods[moodKey]
                          ? 'border-transparent text-white font-bold'
                          : 'bg-white/40 border-black/5 text-black/60'
                      }`}
                      style={{ backgroundColor: lutealMoods[moodKey] ? 'var(--color-selene-brown)' : undefined }}
                    >
                      {moodKey.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </motion.button>
                  ))}
                </div>
              </div>

              <hr className="border-black/5" />

              {/* Row 6: Phase Specific Core Questions */}
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

              {/* Row 7: Lifestyle Actions */}
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

                  {/* Sleeping Illustration */}
                  <div className="md:col-span-5 flex justify-center">
                    <div className="border border-[var(--color-selene-brown)]/15 bg-white/30 backdrop-blur-sm rounded-[3rem] p-6 w-full max-w-[280px] aspect-square flex flex-col items-center justify-center text-center shadow-md">
                      <SleepingIllustration />
                      <p className="font-handwriting text-[var(--color-selene-brown)] text-lg leading-tight mt-2 italic font-semibold">
                        Snooze Quality
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
                  disabled={isSyncing}
                  onClick={handleSaveLog}
                  className="bg-[#1e2722] text-white hover:bg-[#2a3830] font-handwriting text-3xl px-12 py-3.5 rounded-full shadow-2xl transition-all duration-300 cursor-pointer focus:outline-none font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSyncing ? "Saving Entry..." : "Save Symptom Log"}
                </motion.button>
              </div>

            </motion.div>
          </AnimatePresence>
        )}

        {/* Universal Cycle Vitals & BBT Trends Section */}
        {!isLoading && !fetchError && (
          <div className="flex flex-col gap-10">
            <AlertsPanel 
              isLutealCrashIncoming={isLutealCrashIncoming} 
              isMenorrhagiaDetected={isMenorrhagiaDetected} 
              bleedingDays={bleedingDays} 
            />

            <HealthConditionsPanel user={user} />

            {/* Vitals Input & BBT Trend Chart */}
            <WakingVitalsCard 
              bbtInput={bbtInput}
              setBbtInput={setBbtInput}
              handleSaveLog={handleSaveLog}
              isSyncing={isSyncing}
              bbtData={bbtData}
            />

            {/* Insights Section */}
            <PatternInsights insights={insights} />
          </div>
        )}
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
