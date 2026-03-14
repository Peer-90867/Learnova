import React, { useState } from 'react';
import { ViewName } from '../App';
import { motion } from 'motion/react';
import { getUsers, setUsers, setCurrentUser, User } from '../store';
import { CheckCircle2 } from 'lucide-react';

interface Props {
  navigate: (view: ViewName) => void;
}

export default function AuthView({ navigate }: Props) {
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [university, setUniversity] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = (name: string, value: string) => {
    let error = '';
    switch (name) {
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Invalid email address';
        break;
      case 'password':
        if (value.length < 6) error = 'Password must be at least 6 characters';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.values(errors).some(e => e !== '') || (!isLogin && (!name || !email || !password || !confirmPassword)) || (isLogin && (!email || !password))) {
      setError('Please fix the errors before submitting');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const users = getUsers();

      if (isLogin) {
        const user = users.find(u => u.email === email && u.password === btoa(password));
        if (user) {
          setCurrentUser(user);
          navigate('dashboard');
        } else {
          setError('Invalid email or password');
        }
      } else {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        if (users.some(u => u.email === email)) {
          setError('Email already exists');
          setLoading(false);
          return;
        }

        const newUser: User = {
          id: Date.now(),
          name,
          email,
          password: btoa(password),
          plan: 'free',
          subscriptionStatus: 'none',
          uploadsUsed: 0,
          createdAt: new Date().toISOString(),
          streak: 1,
          achievements: []
        };

        setUsers([...users, newUser]);
        setCurrentUser(newUser);
        navigate('dashboard');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Branding */}
      <div className="hidden lg:flex w-1/2 bg-gradient-primary flex-col justify-center items-start p-20 relative overflow-hidden">
        <div className="orb orb-1 opacity-50"></div>
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="z-10"
        >
          <div className="text-2xl font-bold text-white mb-8">🧪 CramLab</div>
          <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
            Study Smarter,<br />Not Harder 🚀
          </h1>
          <div className="space-y-6 text-indigo-100 text-lg">
            <div className="flex items-center"><CheckCircle2 className="mr-3 h-6 w-6 text-emerald-400" /> Generate flashcards from any PDF or video</div>
            <div className="flex items-center"><CheckCircle2 className="mr-3 h-6 w-6 text-emerald-400" /> Generate smart notes from your documents</div>
            <div className="flex items-center"><CheckCircle2 className="mr-3 h-6 w-6 text-emerald-400" /> Track your study progress & quiz scores</div>
          </div>
        </motion.div>
      </div>

      {/* Right Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-2">{isLogin ? 'Welcome back' : 'Create your account'}</h2>
            <p className="text-gray-400">Join 50,000+ students studying smarter</p>
          </div>

          <div className="glass-card p-8 rounded-2xl">
            <div className="flex mb-8 bg-[#211F35] p-1 rounded-xl">
              <button 
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${!isLogin ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Sign Up
              </button>
              <button 
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${isLogin ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Login
              </button>
            </div>

            {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    required 
                    value={name}
                    onChange={e => { setName(e.target.value); validateField('name', e.target.value); }}
                    className={`w-full bg-[#0F0E17] border ${errors.name ? 'border-red-500' : 'border-[rgba(124,58,237,0.2)]'} rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors`}
                    placeholder="Rahul Sharma"
                  />
                  {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={e => { setEmail(e.target.value); validateField('email', e.target.value); }}
                  className={`w-full bg-[#0F0E17] border ${errors.email ? 'border-red-500' : 'border-[rgba(124,58,237,0.2)]'} rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors`}
                  placeholder="rahul@example.com"
                />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required 
                    value={password}
                    onChange={e => { setPassword(e.target.value); validateField('password', e.target.value); }}
                    className={`w-full bg-[#0F0E17] border ${errors.password ? 'border-red-500' : 'border-[rgba(124,58,237,0.2)]'} rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors`}
                    placeholder="••••••••"
                  />
                  {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3.5 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Confirm Password</label>
                    <input 
                      type="password" 
                      required 
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); validateField('confirmPassword', e.target.value); }}
                      className={`w-full bg-[#0F0E17] border ${errors.confirmPassword ? 'border-red-500' : 'border-[rgba(124,58,237,0.2)]'} rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors`}
                      placeholder="••••••••"
                    />
                    {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">University (optional)</label>
                    <input 
                      type="text" 
                      value={university}
                      onChange={e => setUniversity(e.target.value)}
                      className="w-full bg-[#0F0E17] border border-[rgba(124,58,237,0.2)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                      placeholder="IIT Delhi"
                    />
                  </div>
                </>
              )}

              {isLogin && (
                <div className="flex justify-end">
                  <a href="#" className="text-sm text-indigo-400 hover:text-indigo-300">Forgot password?</a>
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-gold text-white rounded-lg px-4 py-3 font-bold hover-glow mt-6 flex justify-center items-center"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  isLogin ? 'Login →' : 'Create Account →'
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
