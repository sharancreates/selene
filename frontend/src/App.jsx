import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import ValueProposition from './components/ValueProposition';
import CamouflageSection from './components/CamouflageSection';
import Component4 from './components/Component4';
import Footer from './components/Footer';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import Settings from './components/Settings';
import { motion } from 'framer-motion';


function App() {
  const getInitialView = () => {
    const path = window.location.pathname;
    if (path === '/login') return 'login';
    if (path === '/register') return 'register';
    if (path === '/dashboard') return 'dashboard';
    if (path === '/calendar') return 'calendar';
    if (path === '/settings') return 'settings';
    return 'landing';
  };

  const [view, setViewInternal] = useState(getInitialView);
  const [token, setToken] = useState(localStorage.getItem('selene_token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('selene_user') || 'null'));
  const [username, setUsername] = useState(localStorage.getItem('selene_username') || 'user');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isUnlocked, setIsUnlocked] = useState(() => {
    const camo = localStorage.getItem('selene_camouflage_mode') === 'true';
    const storedToken = localStorage.getItem('selene_token');
    return !storedToken || !camo;
  });

  // Apply readability class to document body based on local storage setting on boot
  useEffect(() => {
    const isReadable = localStorage.getItem('selene_readable_font') === 'true';
    if (isReadable) {
      document.body.classList.add('readable-typography');
    } else {
      document.body.classList.remove('readable-typography');
    }
  }, []);

  const handleLogout = async () => {
    try {
      const storedToken = localStorage.getItem('selene_token');
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {})
        },
        credentials: 'include'
      });
    } catch (e) {
      console.error("Logout request failed:", e);
    }
    setUsername('user');
    setToken('');
    setUser(null);
    setIsUnlocked(true);
    localStorage.removeItem('selene_username');
    localStorage.removeItem('selene_token');
    localStorage.removeItem('selene_user');
    setView('landing');
  };

  useEffect(() => {
    const checkSession = async () => {
      const storedToken = localStorage.getItem('selene_token');
      if (storedToken) {
        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include'
          });
          const data = await response.json();
          if (response.ok) {
            setToken(data.token);
            setUser(data.user);
            setUsername(data.user.username);
            localStorage.setItem('selene_token', data.token);
            localStorage.setItem('selene_user', JSON.stringify(data.user));
            localStorage.setItem('selene_username', data.user.username);
            
            const camo = localStorage.getItem('selene_camouflage_mode') === 'true';
            setIsUnlocked(!camo);
          } else {
            handleLogout();
          }
        } catch (e) {
          console.error("Session check failed", e);
        }
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/login') {
        setViewInternal('login');
      } else if (path === '/register') {
        setViewInternal('register');
      } else if (path === '/dashboard') {
        setViewInternal('dashboard');
      } else if (path === '/calendar') {
        setViewInternal('calendar');
      } else if (path === '/settings') {
        setViewInternal('settings');
      } else {
        setViewInternal('landing');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const setView = (newView) => {
    let path = '/';
    if (newView === 'login') path = '/login';
    else if (newView === 'register') path = '/register';
    else if (newView === 'dashboard') path = '/dashboard';
    else if (newView === 'calendar') path = '/calendar';
    else if (newView === 'settings') path = '/settings';
    
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setViewInternal(newView);
  };

  const handleLoginSuccess = (name, tokenVal, userVal) => {
    setUsername(name || 'user');
    setToken(tokenVal || '');
    setUser(userVal || null);
    localStorage.setItem('selene_username', name || 'user');
    localStorage.setItem('selene_token', tokenVal || '');
    localStorage.setItem('selene_user', JSON.stringify(userVal || null));
    
    const camo = localStorage.getItem('selene_camouflage_mode') === 'true';
    setIsUnlocked(!camo);
    setView('dashboard');
  };

  const isFullScreenView = view === 'dashboard' || view === 'calendar' || view === 'settings';

  if (!isUnlocked && token) {
    return <CalculatorGuard token={token} onUnlock={() => setIsUnlocked(true)} />;
  }

  return (
    <main className="w-full min-h-screen relative">
      {!isFullScreenView && <Header currentView={view} setView={setView} />}
      
      {view === 'landing' ? (
        <>
          <Hero setView={setView} />
          <ValueProposition />
          <Component4 />
          <CamouflageSection />
          <Footer />
        </>
      ) : view === 'login' ? (
        <Login setView={setView} onLoginSuccess={handleLoginSuccess} />
      ) : view === 'register' ? (
        <Register setView={setView} onLoginSuccess={handleLoginSuccess} />
      ) : view === 'calendar' ? (
        <CalendarView username={username} setView={setView} token={token} user={user} onLogout={handleLogout} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
      ) : view === 'settings' ? (
        <Settings username={username} setView={setView} token={token} user={user} setUser={setUser} onLogout={handleLogout} />
      ) : (
        <Dashboard username={username} setView={setView} token={token} user={user} onLogout={handleLogout} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
      )}
    </main>
  );
}

function evaluateSafeMath(expr) {
  // Safe math evaluator that parses standard binary expressions with precedence: * / then + -
  const sanitized = expr.replace(/[^0-9+\-*/.]/g, '');
  if (!sanitized) return 0;
  
  // Convert unary starting sign to a binary expression (e.g. -3 -> 0-3)
  const formatted = sanitized.replace(/^([+\-])/, '0$1');
  
  const tokens = [];
  let currentNum = "";
  
  for (let i = 0; i < formatted.length; i++) {
    const char = formatted[i];
    if (/[0-9.]/.test(char)) {
      currentNum += char;
    } else {
      if (currentNum !== "") {
        tokens.push(parseFloat(currentNum));
        currentNum = "";
      }
      tokens.push(char);
    }
  }
  if (currentNum !== "") {
    tokens.push(parseFloat(currentNum));
  }
  
  if (tokens.length === 0) return 0;
  
  // Multiplication & division pass
  const pass1 = [];
  let idx = 0;
  while (idx < tokens.length) {
    const token = tokens[idx];
    if (token === '*' || token === '/') {
      const prevVal = pass1.pop();
      const nextVal = tokens[idx + 1];
      if (prevVal === undefined || nextVal === undefined || typeof prevVal !== 'number' || typeof nextVal !== 'number') {
        throw new Error("Invalid expression");
      }
      const res = token === '*' ? prevVal * nextVal : prevVal / nextVal;
      pass1.push(res);
      idx += 2;
    } else {
      pass1.push(token);
      idx++;
    }
  }
  
  // Addition & subtraction pass
  if (pass1.length === 0) return 0;
  let result = pass1[0];
  if (typeof result !== 'number') {
    throw new Error("Invalid expression");
  }
  
  idx = 1;
  while (idx < pass1.length) {
    const op = pass1[idx];
    const nextVal = pass1[idx + 1];
    if (nextVal === undefined || typeof nextVal !== 'number') {
      throw new Error("Invalid expression");
    }
    if (op === '+') {
      result += nextVal;
    } else if (op === '-') {
      result -= nextVal;
    } else {
      throw new Error("Invalid operator");
    }
    idx += 2;
  }
  
  if (isNaN(result) || !isFinite(result)) {
    throw new Error("Invalid math result");
  }
  return result;
}

function CalculatorGuard({ token, onUnlock }) {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');

  const handleKeyPress = async (key) => {
    if (key === 'C') {
      setDisplay('0');
      setEquation('');
    } else if (key === '=') {
      const trimmed = display.trim();
      if (/^\d{6,}$/.test(trimmed)) {
        try {
          const response = await fetch('/api/auth/verify-pin', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ pin: trimmed })
          });
          const data = await response.json();
          if (response.ok && data.unlocked) {
            onUnlock();
            return;
          } else {
            setDisplay('Error');
            setEquation('');
            return;
          }
        } catch (err) {
          console.error("PIN verification error", err);
          setDisplay('Error');
          setEquation('');
          return;
        }
      }

      try {
        if (equation) {
          const result = evaluateSafeMath(equation);
          setDisplay(String(result));
          setEquation(String(result));
        }
      } catch (e) {
        setDisplay('Error');
        setEquation('');
      }
    } else {
      const isOperator = ['+', '-', '*', '/'].includes(key);
      if (display === '0' || display === 'Error') {
        if (isOperator) {
          setEquation('0' + key);
          setDisplay('0' + key);
        } else {
          setEquation(key);
          setDisplay(key);
        }
      } else {
        setEquation(prev => prev + key);
        setDisplay(prev => prev + key);
      }
    }
  };

  const buttons = [
    ['7', '8', '9', '/'],
    ['4', '5', '6', '*'],
    ['1', '2', '3', '-'],
    ['C', '0', '.', '+'],
    ['=']
  ];

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-[#eed9c4] px-6">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm bg-[#1e2722] rounded-[3rem] p-8 shadow-2xl border border-white/5 flex flex-col gap-6"
      >
        <div className="text-center">
          <span className="font-handwriting text-white/40 text-xl tracking-widest uppercase">CALCULATOR</span>
        </div>
        
        {/* Screen */}
        <div className="w-full bg-[#e4ccb5]/90 rounded-2xl p-6 text-right shadow-inner border border-black/10">
          <div className="text-black/50 text-sm font-sans truncate min-h-[20px]">
            {equation || ' '}
          </div>
          <div className="text-black text-4xl font-sans font-bold truncate mt-1">
            {display}
          </div>
        </div>

        {/* Buttons Grid */}
        <div className="flex flex-col gap-3">
          {buttons.map((row, rIdx) => (
            <div key={rIdx} className="flex gap-3 justify-between">
              {row.map((btn) => (
                <motion.button
                  key={btn}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleKeyPress(btn)}
                  className={`font-sans font-bold text-xl py-4 rounded-2xl shadow-md cursor-pointer focus:outline-none transition-colors duration-200 ${
                    btn === '='
                      ? 'w-full bg-[#df9b6d] hover:bg-[#d08b5d] text-black'
                      : btn === 'C'
                      ? 'w-[22%] bg-red-500 hover:bg-red-600 text-white'
                      : ['/', '*', '-', '+'].includes(btn)
                      ? 'w-[22%] bg-[#df9b6d]/20 hover:bg-[#df9b6d]/40 text-[#df9b6d]'
                      : 'w-[22%] bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {btn}
                </motion.button>
              ))}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}


export default App;
