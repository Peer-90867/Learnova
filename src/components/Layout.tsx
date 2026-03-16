import React, { ReactNode, useEffect, useState } from 'react';
import { ViewName } from '../App';
import { getCurrentUser, setCurrentUser, getTheme, setTheme } from '../store';
import { BarChart2, UploadCloud, Layers, FileText, MessageSquare, Gem, LogOut, Menu, X, User, Presentation, CheckCircle2, Target, Brain, Clock, Calendar, Users, Sun, Moon, Mic, Maximize, Minimize } from 'lucide-react';
import Logo from './Logo';
import Button from './Button';

import { motion, AnimatePresence } from 'motion/react';

interface Props {
  navigate: (view: ViewName) => void;
  children: ReactNode;
  activeView: ViewName;
  hideSidebar?: boolean;
}

export default function Layout({ navigate, children, activeView, hideSidebar = false }: Props) {
  const user = getCurrentUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setLocalTheme] = useState(getTheme());
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const handleThemeUpdate = () => setLocalTheme(getTheme());
    window.addEventListener('theme-updated', handleThemeUpdate);
    return () => window.removeEventListener('theme-updated', handleThemeUpdate);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  useEffect(() => {
    if (!user) {
      navigate('auth');
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('landing');
    setShowLogoutModal(false);
  };

  const navItems = [
    { name: 'Overview', icon: BarChart2, view: 'dashboard' as ViewName, section: 'main' },
    { name: 'Upload Material', icon: UploadCloud, view: 'upload' as ViewName, section: 'main' },
    { name: 'My Flashcards', icon: Layers, view: 'flashcards' as ViewName, section: 'main' },
    { name: 'My Notes', icon: FileText, view: 'notes' as ViewName, section: 'main' },
    { name: 'Presentations', icon: Presentation, view: 'presentation' as ViewName, section: 'main' },
    { name: 'Mind Map', icon: Brain, view: 'mindmap' as ViewName, section: 'main' },
    { name: 'AI Chat', icon: MessageSquare, view: 'chat' as ViewName, section: 'main' },
    { name: 'Voice Tutor', icon: Mic, view: 'voice_tutor' as ViewName, section: 'main' },
    { name: 'Mock Exams', icon: Target, view: 'quiz' as ViewName, section: 'main' },
    { name: 'Focus Timer', icon: Clock, view: 'focus' as ViewName, section: 'main' },
    { name: 'Study Tasks', icon: CheckCircle2, view: 'todos' as ViewName, section: 'main' },
    { name: 'Profile', icon: User, view: 'profile' as ViewName, section: 'account', activeClass: 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30', inactiveClass: 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text)]' },
    { name: 'Upgrade Plan', icon: Gem, view: 'pricing' as ViewName, section: 'account', activeClass: 'bg-amber-500/20 text-amber-400 border border-amber-500/30', inactiveClass: 'text-amber-500 hover:bg-amber-500/10' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--color-bg)]">
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--color-bg-card)] p-6 rounded-2xl border border-white/10 shadow-2xl max-w-sm w-full text-center">
            <div className="flex justify-center mb-4">
              <Logo className="h-10" />
            </div>
            <h2 className="text-xl font-bold text-white mb-4">Ready to leave?</h2>
            <p className="text-gray-400 mb-6">Are you sure you want to log out of your account?</p>
            <div className="flex gap-4">
              <Button onClick={() => setShowLogoutModal(false)} variant="ghost" className="flex-1">Cancel</Button>
              <Button onClick={handleLogout} variant="danger" className="flex-1"><LogOut className="w-4 h-4 mr-2" /> Logout</Button>
            </div>
          </div>
        </div>
      )}
      {/* Mobile Header */}
      {!isFocusMode && (
        <div className="md:hidden flex items-center justify-between p-4 border-b border-[rgba(124,58,237,0.2)] bg-[var(--color-bg-card)] sticky top-0 z-30">
          <Logo className="h-8 cursor-pointer" onClick={() => navigate('dashboard')} />
          <Button 
            variant="ghost"
            className="p-2 bg-[var(--color-bg-surface)] rounded-lg text-[var(--color-text)]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      )}

      {/* Focus Mode Toggle (Floating) */}
      <Button 
        onClick={() => setIsFocusMode(!isFocusMode)}
        variant="ghost"
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-2xl transition-all duration-300 ${
          isFocusMode 
            ? 'bg-indigo-600 text-white scale-110' 
            : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] hover:text-indigo-400 border border-white/5'
        }`}
        title={isFocusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
      >
        {isFocusMode ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
      </Button>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 z-30 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      {!hideSidebar && !isFocusMode && (
        <aside className={`
          fixed md:sticky top-0 left-0 h-screen w-64 bg-[var(--color-bg-card)]/80 backdrop-blur-xl border-r border-[rgba(124,58,237,0.1)] 
          flex flex-col transition-all duration-300 z-40
          ${mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="p-6 border-b border-[rgba(124,58,237,0.1)] flex items-center justify-between">
            <Logo className="h-10 cursor-pointer" onClick={() => navigate('dashboard')} />
            <Button 
              onClick={toggleTheme}
              variant="ghost"
              className="p-2 hover:bg-white/5 rounded-xl text-[var(--color-text-muted)] transition-all hover:text-indigo-400"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
            {navItems.map((item, idx) => {
              const Icon = item.icon;
              const isActive = activeView === item.view;
              
              return (
                <React.Fragment key={item.name}>
                  {item.name === 'Profile' && (
                    <div className="pt-6 pb-2">
                      <div className="px-4 text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-[0.2em] opacity-50">Account</div>
                    </div>
                  )}
                  <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => { navigate(item.view); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center px-4 py-2.5 rounded-xl transition-all relative group ${
                      isActive 
                        ? (item.section === 'account' ? (item as any).activeClass : 'bg-indigo-600/10 text-indigo-400')
                        : (item.section === 'account' ? (item as any).inactiveClass : 'text-[var(--color-text-muted)] hover:bg-white/5 hover:text-[var(--color-text)]')
                    }`}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="activeNav"
                        className="absolute left-0 w-1 h-6 bg-indigo-500 rounded-r-full"
                      />
                    )}
                    <div className={`p-2 rounded-lg mr-3 transition-all ${isActive ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 group-hover:bg-indigo-500/10 group-hover:text-indigo-400'}`}>
                        <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">{item.name}</span>
                  </motion.button>
                </React.Fragment>
              );
            })}
          </nav>

          <div className="p-4 border-t border-[rgba(124,58,237,0.1)] bg-white/5">
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/20 shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <div className="text-sm font-bold text-[var(--color-text)] truncate">{user.name}</div>
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">{user.plan}</div>
                  </div>
                </div>
              </div>
            </div>
            <Button
              onClick={() => setShowLogoutModal(true)}
              variant="ghost"
              className="w-full flex items-center px-4 py-2 text-xs font-bold text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all uppercase tracking-widest"
            >
              <LogOut className="mr-3 h-4 w-4" />
              Logout
            </Button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full">
        {children}
      </main>
    </div>
  );
}
