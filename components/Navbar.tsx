import React, { useState } from 'react';
import { Music, Menu, X } from 'lucide-react';
import { View } from '../types';

interface NavbarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  onSectionClick: (id: string) => void;
  scrolled: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onSectionClick, scrolled }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLinkClick = (id: string) => {
    onSectionClick(id);
    setMobileMenuOpen(false);
  };

  const handleViewSwitch = (view: View) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-musaix-dark/95 backdrop-blur-lg border-b border-white/10 py-3' : 'bg-transparent py-5'}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex justify-between items-center">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleViewSwitch(View.HOME)}>
          <Music className="w-6 h-6 text-musaix-accent" />
          <h2 className="text-2xl font-bold font-sans tracking-tight">Musaix <span className="text-musaix-accent">Pro</span></h2>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
          <button onClick={() => handleLinkClick('features')} className="hover:text-white transition-colors">Features</button>
          <button onClick={() => handleLinkClick('demo')} className="hover:text-white transition-colors">AI Tools</button>
          <button onClick={() => handleLinkClick('pricing')} className="hover:text-white transition-colors">Pricing</button>
          
          <button onClick={() => handleViewSwitch(View.LOGIN)} className="text-white hover:text-musaix-accent transition-colors">Sign In</button>
          <button 
            onClick={() => currentView === View.HOME ? handleViewSwitch(View.SIGNUP) : handleViewSwitch(View.APP)}
            className="px-6 py-2.5 bg-white text-black rounded-full font-bold hover:bg-gray-100 transition-colors"
          >
            {currentView === View.HOME ? 'Sign Up' : 'New Project'}
          </button>
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-musaix-card border-b border-white/10 p-6 flex flex-col gap-4 shadow-xl">
           <button onClick={() => handleLinkClick('features')} className="text-left hover:text-white">Features</button>
           <button onClick={() => handleLinkClick('demo')} className="text-left hover:text-white">AI Tools</button>
           <button onClick={() => handleLinkClick('pricing')} className="text-left hover:text-white">Pricing</button>
           <button onClick={() => handleViewSwitch(View.LOGIN)} className="text-left hover:text-white">Sign In</button>
           <button onClick={() => handleViewSwitch(View.SIGNUP)} className="text-left text-musaix-accent font-bold">Sign Up</button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;