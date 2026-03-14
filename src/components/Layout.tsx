import React, { ReactNode, useEffect, useState } from 'react';
import { ViewName } from '../App';
import { getCurrentUser, setCurrentUser, getTheme, setTheme } from '../store';
import { BarChart2, UploadCloud, Layers, FileText, MessageSquare, Gem, LogOut, Menu, X, User, Presentation, CheckCircle2, Target, Brain, Clock, Calendar, Users, Sun, Moon, Flame, Mic } from 'lucide-react';

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

  useEffect(() => {
    const handleThemeUpdate = () => setLocalTheme(getTheme());
    window.addEventListener('theme-updated', handleThemeUpdate);
    return () => window.removeEventListener('theme-updated', handleThemeUpdate);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  if (!user) {
    navigate('auth');
    return null;
  }

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('landing');
  };

  const navItems = [
    { name: 'Overview', icon: BarChart2, view: 'dashboard' as ViewName, section: 'main' },
    { name: 'Upload Material', icon: UploadCloud, view: 'upload' as ViewName, section: 'main' },
    { name: 'My Flashcards', icon: Layers, view: 'flashcards' as ViewName, section: 'main' },
    { name: 'My Notes', icon: FileText, view: 'notes' as ViewName, section: 'main' },
    { name: 'Presentations', icon: Presentation, view: 'presentation' as ViewName, section: 'main' },
    { name: 'AI Chat', icon: MessageSquare, view: 'chat' as ViewName, section: 'main' },
    { name: 'Voice Tutor', icon: Mic, view: 'voice_tutor' as ViewName, section: 'main' },
    { name: 'Mind Maps', icon: Brain, view: 'mindmap' as ViewName, section: 'main' },
    { name: 'Mock Exams', icon: Target, view: 'quiz' as ViewName, section: 'main' },
    { name: 'Focus Timer', icon: Clock, view: 'focus' as ViewName, section: 'main' },
    { name: 'Study Planner', icon: Calendar, view: 'planner' as ViewName, section: 'main' },
    { name: 'Study Hub', icon: Users, view: 'groups' as ViewName, section: 'main' },
    { name: 'Analytics', icon: BarChart2, view: 'analytics' as ViewName, section: 'main' },
    { name: 'Study Tasks', icon: CheckCircle2, view: 'todos' as ViewName, section: 'main' },
    { name: 'Profile', icon: User, view: 'profile' as ViewName, section: 'account', activeClass: 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30', inactiveClass: 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text)]' },
    { name: 'Upgrade Plan', icon: Gem, view: 'pricing' as ViewName, section: 'account', activeClass: 'bg-amber-500/20 text-amber-400 border border-amber-500/30', inactiveClass: 'text-amber-500 hover:bg-amber-500/10' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--color-bg)]">
      {/* Mobile Header */}
      {!isFocusMode && (
        <div className="md:hidden flex items-center justify-between p-4 border-b border-[rgba(124,58,237,0.2)] bg-[var(--color-bg-card)] sticky top-0 z-30">
          <div className="text-xl font-bold text-gradient cursor-pointer" onClick={() => navigate('dashboard')}>
            🧪 CramLab
          </div>
          <button 
            className="p-2 bg-[var(--color-bg-surface)] rounded-lg text-[var(--color-text)]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      )}

      {/* Focus Mode Toggle (Floating) */}
      <button 
        onClick={() => setIsFocusMode(!isFocusMode)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-2xl transition-all duration-300 ${
          isFocusMode 
            ? 'bg-indigo-600 text-white scale-110' 
            : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] hover:text-indigo-400 border border-white/5'
        }`}
        title={isFocusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
      >
        <Target className={`w-6 h-6 ${isFocusMode ? 'animate-pulse' : ''}`} />
      </button>

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
          fixed md:sticky top-0 left-0 h-screen w-64 bg-[var(--color-bg-card)] border-r border-[rgba(124,58,237,0.2)] 
          flex flex-col transition-transform duration-300 z-40
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="p-6 border-b border-[rgba(124,58,237,0.2)] flex items-center justify-between">
            <div className="text-xl font-bold text-gradient cursor-pointer" onClick={() => navigate('dashboard')}>
              🧪 CramLab
            </div>
            <button 
              onClick={toggleTheme}
              className="p-2 hover:bg-[var(--color-bg-surface)] rounded-lg text-[var(--color-text-muted)] transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeView === item.view;
              
              return (
                <React.Fragment key={item.name}>
                  {item.name === 'Profile' && (
                    <div className="pt-8 pb-2">
                      <div className="px-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Account</div>
                    </div>
                  )}
                  <button
                    onClick={() => { navigate(item.view); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center px-4 py-3 rounded-xl transition-colors ${
                      isActive 
                        ? (item.section === 'account' ? (item as any).activeClass : 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30')
                        : (item.section === 'account' ? (item as any).inactiveClass : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text)]')
                    }`}
                  >
                    <div className={`p-2 rounded-lg mr-3 ${isActive ? 'bg-indigo-500/20' : 'bg-[var(--color-bg-surface)]'}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                    {item.name}
                  </button>
                </React.Fragment>
              );
            })}
          </nav>

          <div className="p-4 border-t border-[rgba(124,58,237,0.2)]">
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--color-text)] truncate">{user.name}</div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-amber-400 capitalize">{user.plan} Plan</div>
                    <div className="flex items-center text-xs font-bold text-orange-500">
                      <Flame className="w-3 h-3 mr-1 fill-orange-500" />
                      {user.streak || 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
            >
              <LogOut className="mr-3 h-4 w-4" />
              Logout
            </button>
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
