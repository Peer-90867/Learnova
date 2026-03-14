import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import LandingView from './views/LandingView';
import AuthView from './views/AuthView';
import DashboardView from './views/DashboardView';
import UploadView from './views/UploadView';
import FlashcardsView from './views/FlashcardsView';
import NotesView from './views/NotesView';
import PricingView from './views/PricingView';
import PaymentPendingView from './views/PaymentPendingView';
import AdminLoginView from './views/AdminLoginView';
import AdminPanelView from './views/AdminPanelView';
import ProfileView from './views/ProfileView';
import StudySetsView from './views/StudySetsView';
import ActivityView from './views/ActivityView';
import PresentationView from './views/PresentationView';
import ChatView from './views/ChatView';
import TodoView from './views/TodoView';
import QuizView from './views/QuizView';
import MindMapView from './views/MindMapView';
import FocusView from './views/FocusView';
import AnalyticsView from './views/AnalyticsView';
import PlannerView from './views/PlannerView';
import GroupsView from './views/GroupsView';
import VoiceTutorView from './views/VoiceTutorView';
import { getCurrentUser, isAdmin } from './store';

export type ViewName = 'landing' | 'auth' | 'dashboard' | 'upload' | 'flashcards' | 'notes' | 'pricing' | 'payment_pending' | 'admin_login' | 'admin_panel' | 'profile' | 'study_sets' | 'activity' | 'presentation' | 'chat' | 'todos' | 'quiz' | 'mindmap' | 'focus' | 'analytics' | 'planner' | 'groups' | 'voice_tutor';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewName>('landing');
  const [user, setUser] = useState(getCurrentUser());

  useEffect(() => {
    // Check auth on load
    if (user && currentView === 'landing') {
      setCurrentView('dashboard');
    }
  }, []);

  // Listen for storage changes (for theme/user updates)
  useEffect(() => {
    const handleStorage = () => {
      setUser(getCurrentUser());
    };
    window.addEventListener('storage', handleStorage);
    // Custom event for same-window updates
    window.addEventListener('user-updated', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('user-updated', handleStorage);
    };
  }, []);

  const navigate = useCallback((view: ViewName) => {
    setCurrentView(view);
    window.scrollTo(0, 0);
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'landing': return <LandingView navigate={navigate} />;
      case 'auth': return <AuthView navigate={navigate} />;
      case 'dashboard': return <DashboardView navigate={navigate} user={user} />;
      case 'upload': return <UploadView navigate={navigate} user={user} />;
      case 'flashcards': return <FlashcardsView navigate={navigate} user={user} />;
      case 'notes': return <NotesView navigate={navigate} user={user} />;
      case 'pricing': return <PricingView navigate={navigate} user={user} />;
      case 'payment_pending': return <PaymentPendingView navigate={navigate} />;
      case 'admin_login': return <AdminLoginView navigate={navigate} />;
      case 'admin_panel': return <AdminPanelView navigate={navigate} />;
      case 'profile': return <ProfileView navigate={navigate} user={user} />;
      case 'study_sets': return <StudySetsView navigate={navigate} user={user} />;
      case 'activity': return <ActivityView navigate={navigate} user={user} />;
      case 'presentation': return <PresentationView navigate={navigate} user={user} />;
      case 'chat': return <ChatView navigate={navigate} user={user} />;
      case 'todos': return <TodoView navigate={navigate} user={user} />;
      case 'quiz': return <QuizView navigate={navigate} user={user} />;
      case 'mindmap': return <MindMapView navigate={navigate} user={user} />;
      case 'focus': return <FocusView navigate={navigate} user={user} />;
      case 'analytics': return <AnalyticsView navigate={navigate} user={user} />;
      case 'planner': return <PlannerView navigate={navigate} user={user} />;
      case 'groups': return <GroupsView navigate={navigate} user={user} />;
      case 'voice_tutor': return <VoiceTutorView navigate={navigate} user={user} />;
      default: return <LandingView navigate={navigate} />;
    }
  };

  return (
    <div className={`min-h-screen relative overflow-hidden ${user?.settings?.theme === 'light' ? 'light' : ''}`}>
      {/* Background Orbs */}
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="min-h-screen"
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>

      {/* Admin Link */}
      {!getCurrentUser() && currentView !== 'admin_panel' && currentView !== 'admin_login' && (
        <button
          onClick={() => navigate(isAdmin() ? 'admin_panel' : 'admin_login')}
          className="fixed bottom-4 right-4 text-xs text-gray-500 hover:text-white transition-colors z-50"
        >
          Admin &rarr;
        </button>
      )}
    </div>
  );
}
