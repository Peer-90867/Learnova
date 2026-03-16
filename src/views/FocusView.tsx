import React, { useState, useEffect, useCallback } from 'react';
import { ViewName } from '../App';
import Layout from '../components/Layout';
import { getCurrentUser, addUsage, User, FocusSession, setFocusSessions, getFocusSessions } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, RotateCcw, Coffee, Brain, Timer, CheckCircle2, Volume2, VolumeX } from 'lucide-react';
import Button from '../components/Button';


interface Props {
  navigate: (view: ViewName) => void;
  user: User | null;
}

type TimerMode = 'pomodoro' | 'short-break' | 'long-break';

export default function FocusView({ navigate, user }: Props) {
  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const modeConfig = {
    pomodoro: { duration: 25 * 60, label: 'Focus Time', color: 'indigo' },
    'short-break': { duration: 5 * 60, label: 'Short Break', color: 'emerald' },
    'long-break': { duration: 15 * 60, label: 'Long Break', color: 'blue' }
  };

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleTimerComplete = () => {
    setIsActive(false);
    if (!isMuted) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(e => console.log('Audio play failed', e));
    }

    if (mode === 'pomodoro') {
      const newSessions = sessionsCompleted + 1;
      setSessionsCompleted(newSessions);
      
      // Save session
      if (user) {
        const sessions = getFocusSessions();
        const newSession: FocusSession = {
          id: Date.now(),
          userId: user.id,
          duration: 25,
          type: 'pomodoro',
          date: new Date().toISOString()
        };
        setFocusSessions([newSession, ...sessions]);
        addUsage('focus');
      }

      if (newSessions % 4 === 0) {
        setMode('long-break');
        setTimeLeft(15 * 60);
      } else {
        setMode('short-break');
        setTimeLeft(5 * 60);
      }
    } else {
      setMode('pomodoro');
      setTimeLeft(25 * 60);
    }
  };

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(modeConfig[mode].duration);
  };

  const switchMode = (newMode: TimerMode) => {
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(modeConfig[newMode].duration);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!user) return null;

  return (
    <Layout navigate={navigate} activeView="dashboard">
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center justify-center">
            <Timer className="w-10 h-10 mr-3 text-indigo-400" />
            Focus Timer
          </h1>
          <p className="text-gray-400">Boost your productivity with the Pomodoro technique</p>
        </div>

        <div className="glass-card rounded-[3rem] p-8 md:p-16 border border-[rgba(124,58,237,0.2)] text-center relative overflow-hidden">
          {/* Background Glow */}
          <div className={`absolute inset-0 bg-${modeConfig[mode].color}-500/5 transition-colors duration-500`} />
          
          <div className="relative z-10">
            <div className="flex justify-center gap-4 mb-12">
              {(['pomodoro', 'short-break', 'long-break'] as const).map(m => (
                <Button
                  key={m}
                  onClick={() => switchMode(m)}
                  variant={mode === m ? "primary" : "secondary"}
                  className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
                    mode === m 
                      ? `bg-${modeConfig[m].color}-600 text-white shadow-lg shadow-${modeConfig[m].color}-500/20` 
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {modeConfig[m].label}
                </Button>
              ))}
            </div>

            <div className="mb-12">
              <div className="text-8xl md:text-9xl font-black text-white tabular-nums tracking-tighter mb-4">
                {formatTime(timeLeft)}
              </div>
              <div className="text-gray-500 font-bold uppercase tracking-[0.2em] text-sm">
                {mode === 'pomodoro' ? 'Deep Work Session' : 'Time to Recharge'}
              </div>
            </div>

            <div className="flex justify-center items-center gap-8">
              <Button 
                onClick={resetTimer}
                variant="ghost"
                className="p-4 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-all"
              >
                <RotateCcw className="w-8 h-8" />
              </Button>
              
              <Button 
                onClick={toggleTimer}
                variant={isActive ? "secondary" : "primary"}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all transform hover:scale-105 ${
                  isActive 
                    ? 'bg-white/10 text-white border border-white/20' 
                    : `bg-${modeConfig[mode].color}-600 text-white shadow-2xl shadow-${modeConfig[mode].color}-500/40`
                }`}
              >
                {isActive ? <Pause className="w-10 h-10" /> : <Play className="w-10 h-10 ml-1" />}
              </Button>

              <Button 
                onClick={() => setIsMuted(!isMuted)}
                variant="ghost"
                className="p-4 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-all"
              >
                {isMuted ? <VolumeX className="w-8 h-8" /> : <Volume2 className="w-8 h-8" />}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="glass-card p-6 rounded-3xl border border-white/5 flex items-center">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center mr-4">
              <Brain className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{sessionsCompleted}</div>
              <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Sessions Today</div>
            </div>
          </div>
          
          <div className="glass-card p-6 rounded-3xl border border-white/5 flex items-center">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mr-4">
              <Coffee className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{Math.floor(sessionsCompleted / 4)}</div>
              <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Long Breaks Earned</div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-3xl border border-white/5 flex items-center">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mr-4">
              <CheckCircle2 className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{sessionsCompleted * 25}m</div>
              <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Focus Time</div>
            </div>
          </div>
        </div>

        <div className="mt-12 glass-card p-8 rounded-3xl border border-white/5">
          <h3 className="text-xl font-bold text-white mb-4">Focus Tips</h3>
          <ul className="space-y-3 text-gray-400">
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 mr-3 flex-shrink-0" />
              Eliminate distractions by putting your phone in another room.
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 mr-3 flex-shrink-0" />
              Use short breaks to stretch or drink water, not to check social media.
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 mr-3 flex-shrink-0" />
              After 4 sessions, take a longer break (15-30 mins) to fully recharge.
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
