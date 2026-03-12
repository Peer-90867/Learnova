import React, { useEffect, useState } from 'react';
import { ViewName } from '../App';
import { motion } from 'motion/react';
import { CheckCircle2, MessageSquare, FileText, PlayCircle } from 'lucide-react';

interface Props {
  navigate: (view: ViewName) => void;
}

export default function LandingView({ navigate }: Props) {
  const [students, setStudents] = useState(0);
  const [flashcards, setFlashcards] = useState(0);
  const [passRate, setPassRate] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStudents(prev => (prev < 50000 ? prev + 1000 : 50000));
      setFlashcards(prev => (prev < 2000000 ? prev + 50000 : 2000000));
      setPassRate(prev => (prev < 98 ? prev + 2 : 98));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-opacity-80 bg-[#0F0E17] border-b border-[rgba(124,58,237,0.2)] px-6 py-4 flex justify-between items-center">
        <div className="text-xl font-bold text-gradient">🧪 StudyForge AI</div>
        <div className="hidden md:flex space-x-6 text-sm text-gray-300">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="#blog" className="hover:text-white transition-colors">Blog</a>
        </div>
        <div className="flex space-x-4">
          <button onClick={() => navigate('auth')} className="text-sm font-medium hover:text-white transition-colors">Login</button>
          <button onClick={() => navigate('auth')} className="bg-gradient-gold text-white px-4 py-2 rounded-lg text-sm font-medium hover-glow">Start Free</button>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-7xl font-bold mb-6 max-w-4xl leading-tight"
        >
          Turn Any Document Into Your <span className="text-gradient">Personal Tutor</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xl text-gray-400 mb-10 max-w-2xl"
        >
          Upload PDFs, videos, articles. Get AI flashcards, smart notes, and interactive chat — in seconds.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-16"
        >
          <button onClick={() => navigate('auth')} className="bg-gradient-gold text-white px-8 py-4 rounded-xl font-bold text-lg hover-glow flex items-center justify-center">
            Start For Free &rarr;
          </button>
          <button className="glass-panel text-white px-8 py-4 rounded-xl font-bold text-lg hover-glow flex items-center justify-center">
            <PlayCircle className="mr-2 h-5 w-5" /> Watch Demo
          </button>
        </motion.div>

        {/* Trust Badges */}
        <div className="mb-16">
          <p className="text-sm text-gray-500 mb-4 uppercase tracking-wider">Used by students at</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm font-medium text-gray-400">
            <span className="glass-card px-4 py-2 rounded-full flex items-center"><div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div>MIT</span>
            <span className="glass-card px-4 py-2 rounded-full flex items-center"><div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>Stanford</span>
            <span className="glass-card px-4 py-2 rounded-full flex items-center"><div className="w-2 h-2 rounded-full bg-indigo-500 mr-2"></div>Cambridge</span>
            <span className="glass-card px-4 py-2 rounded-full flex items-center"><div className="w-2 h-2 rounded-full bg-purple-500 mr-2"></div>IIT Delhi</span>
            <span className="glass-card px-4 py-2 rounded-full flex items-center"><div className="w-2 h-2 rounded-full bg-rose-500 mr-2"></div>Yale</span>
          </div>
        </div>

        {/* Counters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl mb-24">
          <div className="text-center">
            <div className="text-4xl font-bold text-gradient mb-2">{students.toLocaleString()}+</div>
            <div className="text-gray-400">Students</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-gradient mb-2">{flashcards >= 2000000 ? '2M+' : flashcards.toLocaleString()}</div>
            <div className="text-gray-400">Flashcards Created</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-gradient mb-2">{passRate}%</div>
            <div className="text-gray-400">Pass Rate</div>
          </div>
        </div>

        {/* Features */}
        <div id="features" className="w-full max-w-6xl text-left mb-24">
          <h2 className="text-3xl font-bold mb-12 text-center">Everything you need to ace your exams</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-8 rounded-2xl hover-glow">
              <div className="bg-indigo-500/20 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                <span className="text-2xl">🃏</span>
              </div>
              <h3 className="text-xl font-bold mb-3">AI Flashcards</h3>
              <p className="text-gray-400">Generate 100+ flashcards from any document in seconds. Spaced repetition built-in.</p>
            </div>
            <div className="glass-card p-8 rounded-2xl hover-glow">
              <div className="bg-purple-500/20 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                <MessageSquare className="text-purple-400 h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Chat With Docs</h3>
              <p className="text-gray-400">Ask questions about your study material. Get instant, cited answers from AI.</p>
            </div>
            <div className="glass-card p-8 rounded-2xl hover-glow">
              <div className="bg-emerald-500/20 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                <FileText className="text-emerald-400 h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Smart Notes</h3>
              <p className="text-gray-400">Auto-summarized, beautifully formatted notes with key highlights and takeaways.</p>
            </div>
          </div>
        </div>

        {/* Pricing Teaser */}
        <div id="pricing" className="glass-panel p-12 rounded-3xl text-center max-w-3xl w-full mb-24">
          <h2 className="text-3xl font-bold mb-4">Ready to upgrade your study game?</h2>
          <p className="text-gray-400 mb-8">Plans from ₹299/month. Join 50,000+ students studying smarter.</p>
          <button onClick={() => navigate('pricing')} className="bg-gradient-gold text-white px-8 py-4 rounded-xl font-bold text-lg hover-glow">
            See Plans &rarr;
          </button>
          <p className="text-xs text-gray-500 mt-4">🔒 Manually verified by our team within 2–4 hours</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[rgba(124,58,237,0.2)] py-8 text-center text-gray-500 text-sm">
        <div className="mb-4 font-bold text-gradient text-lg">🧪 StudyForge AI</div>
        <div className="space-x-4 mb-4">
          <a href="#" className="hover:text-white">Terms</a>
          <a href="#" className="hover:text-white">Privacy</a>
          <a href="#" className="hover:text-white">Contact</a>
        </div>
        <p>&copy; 2025 StudyForge AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
