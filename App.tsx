import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Login from './components/Login';
import SignUp from './components/SignUp';
import Home from './components/Home';
import { View } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<View>(View.HOME);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigateToApp = async () => {
    // Check if API key is selected as gemini-3-pro-image-preview requires a paid key
    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        try {
          await window.aistudio.openSelectKey();
        } catch (e) {
          console.error("Failed to open key selector", e);
          return;
        }
      }
    }

    setView(View.APP);
    window.scrollTo(0, 0);
  };

  const navigateToHome = () => {
    setView(View.HOME);
    window.scrollTo(0, 0);
  };

  const navigateToLogin = () => {
    setView(View.LOGIN);
    window.scrollTo(0, 0);
  };

  const navigateToSignUp = () => {
    setView(View.SIGNUP);
    window.scrollTo(0, 0);
  };

  const handleSectionClick = (id: string) => {
    if (view !== View.HOME) {
      setView(View.HOME);
      // Wait for view change to render Home components before scrolling
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="min-h-screen bg-musaix-dark font-body text-white selection:bg-musaix-accent selection:text-white">
      
      {/* Navigation - Only show on Home and App views */}
      {view !== View.LOGIN && view !== View.SIGNUP && (
        <Navbar 
          currentView={view} 
          onNavigate={setView}
          onSectionClick={handleSectionClick}
          scrolled={scrolled}
        />
      )}

      {/* Main Content */}
      <main>
        {view === View.LOGIN ? (
          <Login 
            onLogin={navigateToApp} 
            onSwitchToSignUp={navigateToSignUp}
            onClose={navigateToHome} 
          />
        ) : view === View.SIGNUP ? (
          <SignUp 
            onSignUp={navigateToApp} 
            onSwitchToLogin={navigateToLogin}
            onClose={navigateToHome} 
          />
        ) : view === View.APP ? (
          <Dashboard />
        ) : (
          <Home onNavigateToApp={navigateToApp} />
        )}
      </main>

      {/* Footer */}
      {view !== View.LOGIN && view !== View.SIGNUP && (
        <Footer />
      )}
    </div>
  );
};

export default App;