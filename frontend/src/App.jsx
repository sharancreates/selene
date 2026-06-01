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

function App() {
  const getInitialView = () => {
    const path = window.location.pathname;
    if (path === '/login') return 'login';
    if (path === '/register') return 'register';
    if (path === '/dashboard') return 'dashboard';
    return 'landing';
  };

  const [view, setViewInternal] = useState(getInitialView);
  const [username, setUsername] = useState('user');

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/login') {
        setViewInternal('login');
      } else if (path === '/register') {
        setViewInternal('register');
      } else if (path === '/dashboard') {
        setViewInternal('dashboard');
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
    
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setViewInternal(newView);
  };

  const handleLoginSuccess = (name) => {
    setUsername(name || 'user');
    setView('dashboard');
  };

  return (
    <main className="w-full min-h-screen relative">
      {view !== 'dashboard' && <Header currentView={view} setView={setView} />}
      
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
      ) : (
        <Dashboard username={username} setView={setView} />
      )}
    </main>
  );
}

export default App;
