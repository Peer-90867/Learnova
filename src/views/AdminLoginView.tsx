import React, { useState } from 'react';
import { ViewName } from '../App';
import { motion } from 'motion/react';
import { setAdmin } from '../store';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface Props {
  navigate: (view: ViewName) => void;
}

export default function AdminLoginView({ navigate }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordError || !password) {
      setError('Please fix the errors before submitting');
      return;
    }
    if (password === 'admin123') {
      setAdmin(true);
      navigate('admin_panel');
    } else {
      setError('Invalid admin password');
    }
  };

  const validatePassword = (value: string) => {
    if (value.length > 0 && value.length < 8) {
      setPasswordError('Password must be at least 8 characters');
    } else {
      setPasswordError('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0F0E17]">
      <div className="orb orb-1 opacity-30"></div>
      <div className="orb orb-2 opacity-30"></div>

      <button 
        onClick={() => navigate('landing')}
        className="absolute top-8 left-8 text-gray-400 hover:text-white flex items-center transition-colors z-50"
      >
        <ArrowLeft className="w-5 h-5 mr-2" /> Back to Site
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-10 rounded-3xl max-w-md w-full border-2 border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.1)] relative z-10"
      >
        <div className="flex justify-center mb-6">
          <div className="bg-red-500/20 p-4 rounded-full">
            <ShieldAlert className="w-12 h-12 text-red-400" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-center mb-2">Admin Portal</h1>
        <p className="text-gray-400 text-center mb-8">Restricted Access</p>

        {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm text-center">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Master Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={e => { setPassword(e.target.value); validatePassword(e.target.value); }}
              className={`w-full bg-[#0F0E17] border ${passwordError ? 'border-red-500' : 'border-[rgba(124,58,237,0.2)]'} rounded-xl px-4 py-4 text-white focus:outline-none focus:border-red-500 transition-colors`}
              placeholder="••••••••"
            />
            {passwordError && <p className="text-red-400 text-xs mt-1">{passwordError}</p>}
          </div>

          <button 
            type="submit" 
            className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 py-4 font-bold transition-colors shadow-[0_0_20px_rgba(239,68,68,0.4)]"
          >
            Authenticate
          </button>
        </form>
      </motion.div>
    </div>
  );
}
