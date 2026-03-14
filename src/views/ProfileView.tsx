import React, { useState } from 'react';
import { ViewName } from '../App';
import Layout from '../components/Layout';
import { getCurrentUser, setCurrentUser, getUsers, setUsers, User } from '../store';
import { motion } from 'motion/react';
import { User as UserIcon, Save, AlertCircle, CheckCircle2, Moon, Sun, Folder } from 'lucide-react';

interface Props {
  navigate: (view: ViewName) => void;
  user: User | null;
}

export default function ProfileView({ navigate, user }: Props) {
  const [name, setName] = useState(user?.name || '');
  const [studyGoal, setStudyGoal] = useState(user?.studyGoal?.toString() || '');
  const [dailyGoal, setDailyGoal] = useState(user?.dailyGoal?.toString() || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [theme, setTheme] = useState(user?.settings?.theme || 'light');

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    // Update user settings
    if (user) {
      const updatedUser = {
        ...user,
        settings: {
          ...user.settings,
          flashcardDifficulty: user.settings?.flashcardDifficulty || 'medium',
          noteStyle: user.settings?.noteStyle || 'detailed',
          theme: newTheme as 'light' | 'dark'
        }
      };
      setCurrentUser(updatedUser);
      
      // Also update in users array
      const users = getUsers();
      const userIndex = users.findIndex(u => u && u.id === user.id);
      if (userIndex > -1) {
        users[userIndex] = updatedUser;
        setUsers(users);
      }
    }
  };

  const validateField = (name: string, value: string) => {
    let error = '';
    switch (name) {
      case 'password':
        if (value && value.length < 6) error = 'Password must be at least 6 characters';
        break;
      case 'confirmPassword':
        if (value !== password) error = 'Passwords do not match';
        break;
      case 'name':
        if (value.length < 2) error = 'Name must be at least 2 characters';
        break;
    }
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.values(errors).some(e => e !== '')) {
      setError('Please fix the errors before submitting');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);

    if (password && password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const users = getUsers();
      const userIndex = users.findIndex(u => u && u.id === user.id);
      
      if (userIndex === -1) {
        throw new Error('User not found');
      }

      const updatedUser = {
        ...users[userIndex],
        name: name,
        studyGoal: parseInt(studyGoal) || 0,
        dailyGoal: parseInt(dailyGoal) || 0,
        password: password ? btoa(password) : users[userIndex].password
      };

      users[userIndex] = updatedUser;
      setUsers(users);
      setCurrentUser(updatedUser);
      setSuccess('Profile updated successfully');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout navigate={navigate} activeView="profile">
      <div className="p-8 max-w-2xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 rounded-3xl border border-[rgba(124,58,237,0.2)]"
        >
          <div className="flex items-center mb-8">
            <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold text-2xl mr-6">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{user.name}</h1>
              <p className="text-gray-400">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-[var(--color-bg-surface)] p-4 rounded-xl">
              <div className="text-gray-400 text-sm mb-1">Plan</div>
              <div className="font-bold capitalize">{user.plan}</div>
            </div>
            <div className="bg-[var(--color-bg-surface)] p-4 rounded-xl">
              <div className="text-gray-400 text-sm mb-1">Status</div>
              <div className="font-bold capitalize">{user.subscriptionStatus}</div>
            </div>
          </div>

          <div className="mb-8 p-6 bg-[var(--color-bg-surface)] rounded-2xl border border-[rgba(124,58,237,0.1)] flex items-center justify-between">
            <div className="flex items-center">
              <div className={`p-2 rounded-lg mr-4 ${theme === 'light' ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                {theme === 'light' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </div>
              <div>
                <div className="font-bold">Display Theme</div>
                <div className="text-xs text-gray-400">{theme === 'light' ? 'Light mode is active' : 'Dark mode is active'}</div>
              </div>
            </div>
            <button 
              onClick={toggleTheme} 
              className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none ${theme === 'light' ? 'bg-amber-400' : 'bg-indigo-600'}`}
            >
              <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 flex items-center justify-center shadow-sm ${theme === 'light' ? 'translate-x-0' : 'translate-x-7'}`}>
                {theme === 'light' ? <Sun className="w-3 h-3 text-amber-500" /> : <Moon className="w-3 h-3 text-indigo-600" />}
              </div>
            </button>
          </div>

          <button 
            onClick={() => navigate('study_sets')}
            className="w-full mb-8 p-4 bg-indigo-600 rounded-xl flex items-center justify-between hover:bg-indigo-700 transition-colors"
          >
            <span className="font-medium">Manage Study Sets</span>
            <Folder className="w-5 h-5" />
          </button>

          <form onSubmit={handleUpdate} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); validateField('name', e.target.value); }}
                className={`w-full bg-[var(--color-bg)] border ${errors.name ? 'border-red-500' : 'border-[rgba(124,58,237,0.2)]'} rounded-xl px-4 py-3 text-[var(--color-text)] focus:outline-none focus:border-indigo-500`}
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Study Goal (hrs/wk)</label>
                <input
                  type="number"
                  value={studyGoal}
                  onChange={(e) => setStudyGoal(e.target.value)}
                  className="w-full bg-[var(--color-bg)] border border-[rgba(124,58,237,0.2)] rounded-xl px-4 py-3 text-[var(--color-text)] focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Daily Goal (tasks)</label>
                <input
                  type="number"
                  value={dailyGoal}
                  onChange={(e) => setDailyGoal(e.target.value)}
                  className="w-full bg-[var(--color-bg)] border border-[rgba(124,58,237,0.2)] rounded-xl px-4 py-3 text-[var(--color-text)] focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">New Password (leave blank to keep current)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); validateField('password', e.target.value); }}
                className={`w-full bg-[var(--color-bg)] border ${errors.password ? 'border-red-500' : 'border-[rgba(124,58,237,0.2)]'} rounded-xl px-4 py-3 text-[var(--color-text)] focus:outline-none focus:border-indigo-500`}
              />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); validateField('confirmPassword', e.target.value); }}
                className={`w-full bg-[var(--color-bg)] border ${errors.confirmPassword ? 'border-red-500' : 'border-[rgba(124,58,237,0.2)]'} rounded-xl px-4 py-3 text-[var(--color-text)] focus:outline-none focus:border-indigo-500`}
              />
              {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
            </div>

            {error && <div className="flex items-center text-red-400 text-sm"><AlertCircle className="w-4 h-4 mr-2" /> {error}</div>}
            {success && <div className="flex items-center text-emerald-400 text-sm"><CheckCircle2 className="w-4 h-4 mr-2" /> {success}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-primary text-white py-3 rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center"
            >
              {loading ? 'Updating...' : <><Save className="w-5 h-5 mr-2" /> Save Changes</>}
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentUser(null);
                navigate('landing');
              }}
              className="w-full bg-red-500/10 text-red-400 py-3 rounded-xl font-bold hover:bg-red-500/20 transition-colors flex items-center justify-center"
            >
              Logout
            </button>
          </form>
        </motion.div>
      </div>
    </Layout>
  );
}
