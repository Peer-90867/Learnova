import React, { useEffect, useState } from 'react';
import { ViewName } from '../App';
import Layout from '../components/Layout';
import { getCurrentUser, getUploads, Upload, setCurrentDocumentId, getUsage, User } from '../store';
import { motion } from 'motion/react';
import { FileText, Layers, Clock, Target, UploadCloud, MessageSquare, Lock, TrendingUp, TrendingDown, Presentation, CheckCircle2, Search, Trophy, Star, Sparkles, ArrowRight, Activity, Mic } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import Button from '../components/Button';

interface Props {
  navigate: (view: ViewName) => void;
  user: User | null;
}

const MOTIVATIONAL_QUOTES = [
  "The only way to do great work is to love what you do. – Steve Jobs",
  "Success is not final, failure is not fatal: it is the courage to continue that counts. – Winston Churchill",
  "Believe you can and you're halfway there. – Theodore Roosevelt",
  "It always seems impossible until it's done. – Nelson Mandela",
  "The future belongs to those who believe in the beauty of their dreams. – Eleanor Roosevelt",
  "Don't watch the clock; do what it does. Keep going. – Sam Levenson",
  "The secret of getting ahead is getting started. – Mark Twain",
  "Your talent determines what you can do. Your motivation determines how much you are willing to do. Your attitude determines how well you do it. – Lou Holtz",
  "The only limit to our realization of tomorrow will be our doubts of today. – Franklin D. Roosevelt",
  "Hardships often prepare ordinary people for an extraordinary destiny. – C.S. Lewis"
];

export default function DashboardView({ navigate, user }: Props) {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [greeting, setGreeting] = useState('');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [quote, setQuote] = useState('');

  useEffect(() => {
    if (!user) return;
    setUploads(getUploads().filter(u => u && u.userId === user.id));

    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    // Select a random quote
    const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    setQuote(randomQuote);
  }, [user?.id]);

  if (!user) return null;

  const usage = (getUsage() || []).filter(u => u.userId === user.id);
  
  const calculateTrend = (type: 'flashcard' | 'note' | 'chat' | 'doc') => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    const currentWeekUsage = usage.filter(u => u.type === type && new Date(u.date) >= oneWeekAgo).length;
    const previousWeekUsage = usage.filter(u => u.type === type && new Date(u.date) >= twoWeeksAgo && new Date(u.date) < oneWeekAgo).length;
    
    if (previousWeekUsage === 0) return currentWeekUsage > 0 ? 100 : 0;
    return Math.round(((currentWeekUsage - previousWeekUsage) / previousWeekUsage) * 100);
  };

  const weeklyData = Array.from({ length: 7 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayUsage = usage.filter(u => new Date(u.date).toLocaleDateString('en-US', { weekday: 'short' }) === dayName);
    return {
      name: dayName,
      flashcards: dayUsage.filter(u => u.type === 'flashcard').length,
      notes: dayUsage.filter(u => u.type === 'note').length,
      chats: dayUsage.filter(u => u.type === 'chat').length,
      docs: dayUsage.filter(u => u.type === 'doc').length
    };
  });

  const stats = {
    flashcards: { total: usage.filter(u => u.type === 'flashcard').length, trend: calculateTrend('flashcard') },
    notes: { total: usage.filter(u => u.type === 'note').length, trend: calculateTrend('note') },
    chats: { total: usage.filter(u => u.type === 'chat').length, trend: calculateTrend('chat') },
    docs: { total: usage.filter(u => u.type === 'doc').length, trend: calculateTrend('doc') }
  };

  const isFree = user.plan === 'free';
  const studyGoal = user.studyGoal || 20; // Default 20 hours
  const currentStudyHours = Math.round(usage.filter(u => u.type === 'focus').reduce((acc, curr) => acc + (curr.duration || 0), 0) / 60);
  const goalProgress = Math.min(Math.round((currentStudyHours / studyGoal) * 100), 100);

  const recommendations = React.useMemo(() => {
    const recs = [];
    const now = new Date();
    const hour = now.getHours();

    // 1. Suggest Focus Session during peak times
    const isPeakTime = (hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16) || (hour >= 19 && hour <= 21);
    if (isPeakTime) {
      recs.push({ title: 'Start a Focus Session', type: 'focus', reason: 'It\'s a great time for deep work!' });
    }

    // 2. Suggest reviewing recent uploads
    const recentUploads = uploads.slice(-2);
    recentUploads.forEach(u => {
      const lastUsed = usage.filter(us => us.type === 'doc' && us.date.includes(u.filename)).length;
      if (lastUsed === 0) {
        recs.push({ title: `Review ${u.filename}`, type: 'doc', reason: 'You uploaded this recently but haven\'t studied it yet.' });
      }
    });

    // 3. Suggest flashcards if notes are high but flashcards are low
    const noteCount = stats.notes.total;
    const flashcardCount = stats.flashcards.total;
    if (noteCount > flashcardCount) {
      recs.push({ title: 'Create Flashcards', type: 'flashcard', reason: 'Turn your notes into flashcards for better retention.' });
    }

    return recs.slice(0, 3);
  }, [usage, uploads, stats]);

  const TrendIndicator = ({ value }: { value: number }) => (
    <div className={`flex items-center text-xs font-bold ${value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
      {value >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
      {Math.abs(value)}%
    </div>
  );

  return (
    <Layout navigate={navigate} activeView="dashboard">
      <div className="p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">
            {greeting}, <span className="text-gradient">{user.name.split(' ')[0]}</span> 👋
          </h1>
          <div className="bg-[#211F35] border border-[rgba(124,58,237,0.2)] px-4 py-2 rounded-full text-sm font-medium text-amber-400 capitalize">
            {user.plan} Plan
          </div>
        </div>

        {/* Motivational Quote */}
        <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-6 rounded-2xl mb-8 flex items-start sm:items-center gap-4 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="bg-indigo-500/20 p-3 rounded-xl flex-shrink-0 relative z-10">
            <Sparkles className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="relative z-10">
            <h3 className="text-sm font-bold text-indigo-300 mb-1 uppercase tracking-wider">Motivational Quote</h3>
            <p className="text-lg text-white font-medium italic leading-relaxed">
              "{quote}"
            </p>
          </div>
        </div>

        {/* Banners */}
        {user.subscriptionStatus === 'pending' && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-4 rounded-xl mb-8 flex items-center">
            <span className="mr-3">⏳</span> Your payment is being verified. Usually 2–4 hours.
          </div>
        )}
        {user.subscriptionStatus === 'rejected' && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-8 flex items-center">
            <span className="mr-3">❌</span> Payment rejected. Please re-submit or contact support.
          </div>
        )}
        {user.subscriptionStatus === 'active' && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl mb-8 flex items-center">
            <span className="mr-3">🎉</span> Pro Plan Active!
          </div>
        )}
        {(user.subscriptionStatus === 'none' || isFree) && (
          <div 
            onClick={() => navigate('pricing')}
            className="bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 p-4 rounded-xl mb-8 flex items-center cursor-pointer hover:bg-indigo-500/20 transition-colors"
          >
            <span className="mr-3">✨</span> Upgrade to Pro for unlimited access &rarr;
          </div>
        )}

        {/* Stats & Goals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="glass-card p-6 rounded-2xl hover-glow">
              <div className="text-gray-400 text-sm mb-2 flex items-center justify-between">
                <span className="flex items-center"><Layers className="w-4 h-4 mr-2" /> Flashcards</span>
                <TrendIndicator value={stats.flashcards.trend} />
              </div>
              <div className="text-3xl font-bold text-white">{stats.flashcards.total}</div>
            </div>
            <div className="glass-card p-6 rounded-2xl hover-glow">
              <div className="text-gray-400 text-sm mb-2 flex items-center justify-between">
                <span className="flex items-center"><FileText className="w-4 h-4 mr-2" /> Notes</span>
                <TrendIndicator value={stats.notes.trend} />
              </div>
              <div className="text-3xl font-bold text-white">{stats.notes.total}</div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-indigo-500/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white">Weekly Study Goal</h3>
                <Target className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="text-4xl font-bold text-white mb-2">{currentStudyHours}h <span className="text-lg text-gray-500 font-normal">/ {studyGoal}h</span></div>
              <div className="w-full bg-white/5 rounded-full h-2 mb-4">
                <div 
                  className="bg-gradient-primary h-2 rounded-full transition-all duration-1000" 
                  style={{ width: `${goalProgress}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-gray-400">
              {goalProgress >= 100 
                ? "🎉 Goal reached! You're crushing it." 
                : `You need ${studyGoal - currentStudyHours} more hours to reach your weekly goal.`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 mb-12">
          {/* Recent Activity Section */}
          <div>
            <h2 className="text-xl font-bold mb-6 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-emerald-400" />
              Recent Activity
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {usage.slice(-5).reverse().map((u, i) => (
                <div key={i} className="glass-card p-3 rounded-xl border border-white/5 flex items-center gap-3">
                  <div className="bg-emerald-500/10 p-2 rounded-lg">
                    <Activity className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white capitalize">{u.type}</div>
                    <div className="text-[10px] text-gray-500">{new Date(u.date).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Usage Statistics Chart */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Weekly Usage Statistics</h2>
          {selectedDay && (
            <Button 
              onClick={() => setSelectedDay(null)}
              variant="ghost"
              size="sm"
              className="text-indigo-400 hover:text-indigo-300"
            >
              Clear filter ({selectedDay})
            </Button>
          )}
        </div>
        <div className="glass-card p-6 rounded-2xl mb-12 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ backgroundColor: '#1A1830', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '8px' }} 
              />
              <Legend />
              <Bar dataKey="flashcards" fill="#8B5CF6" onClick={(data) => setSelectedDay(data.name)} className="cursor-pointer">
                {weeklyData.map((entry, index) => (
                  <Cell key={`cell-f-${index}`} fill={selectedDay === entry.name ? '#A78BFA' : '#8B5CF6'} opacity={selectedDay && selectedDay !== entry.name ? 0.3 : 1} />
                ))}
              </Bar>
              <Bar dataKey="notes" fill="#3B82F6" onClick={(data) => setSelectedDay(data.name)} className="cursor-pointer">
                {weeklyData.map((entry, index) => (
                  <Cell key={`cell-n-${index}`} fill={selectedDay === entry.name ? '#60A5FA' : '#3B82F6'} opacity={selectedDay && selectedDay !== entry.name ? 0.3 : 1} />
                ))}
              </Bar>
              <Bar dataKey="chats" fill="#10B981" onClick={(data) => setSelectedDay(data.name)} className="cursor-pointer">
                {weeklyData.map((entry, index) => (
                  <Cell key={`cell-c-${index}`} fill={selectedDay === entry.name ? '#34D399' : '#10B981'} opacity={selectedDay && selectedDay !== entry.name ? 0.3 : 1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Actions */}
        <h2 className="text-xl font-bold mb-6">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-4 md:gap-6 mb-12">
          <Button 
            onClick={() => navigate('focus')}
            variant="ghost"
            className="glass-card p-4 md:p-6 rounded-2xl hover-glow text-left flex flex-col items-start group transition-transform duration-300 hover:-translate-y-1 h-auto"
          >
            <div className="bg-emerald-500/20 p-3 md:p-4 rounded-xl mb-3 md:mb-4 group-hover:bg-emerald-500/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
              <Clock className="w-6 h-6 md:w-8 md:h-8 text-emerald-400" />
            </div>
            <h3 className="text-sm md:text-base font-bold mb-1 md:mb-2 line-clamp-1">Quick Focus</h3>
            <p className="text-gray-400 text-xs md:text-sm line-clamp-2">Start a Pomodoro session</p>
          </Button>

          <Button 
            onClick={() => navigate('upload')}
            variant="ghost"
            className="glass-card p-4 md:p-6 rounded-2xl hover-glow text-left flex flex-col items-start group transition-transform duration-300 hover:-translate-y-1 h-auto"
          >
            <div className="bg-indigo-500/20 p-3 md:p-4 rounded-xl mb-3 md:mb-4 group-hover:bg-indigo-500/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
              <UploadCloud className="w-6 h-6 md:w-8 md:h-8 text-indigo-400" />
            </div>
            <h3 className="text-sm md:text-base font-bold mb-1 md:mb-2 line-clamp-1">Upload Media</h3>
            <p className="text-gray-400 text-xs md:text-sm line-clamp-2">PDF, video, or paste text</p>
          </Button>
          
          <Button 
            onClick={() => navigate('notes')}
            variant="ghost"
            className="glass-card p-4 md:p-6 rounded-2xl hover-glow text-left flex flex-col items-start group transition-transform duration-300 hover:-translate-y-1 h-auto"
          >
            <div className="bg-blue-500/20 p-3 md:p-4 rounded-xl mb-3 md:mb-4 group-hover:bg-blue-500/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
              <FileText className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />
            </div>
            <h3 className="text-sm md:text-base font-bold mb-1 md:mb-2 line-clamp-1">My Notes</h3>
            <p className="text-gray-400 text-xs md:text-sm line-clamp-2">Review generated notes</p>
          </Button>

          <Button 
            onClick={() => navigate('flashcards')}
            variant="ghost"
            className="glass-card p-4 md:p-6 rounded-2xl hover-glow text-left flex flex-col items-start group transition-transform duration-300 hover:-translate-y-1 h-auto"
          >
            <div className="bg-purple-500/20 p-3 md:p-4 rounded-xl mb-3 md:mb-4 group-hover:bg-purple-500/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
              <Layers className="w-6 h-6 md:w-8 md:h-8 text-purple-400" />
            </div>
            <h3 className="text-sm md:text-base font-bold mb-1 md:mb-2 line-clamp-1">My Flashcards</h3>
            <p className="text-gray-400 text-xs md:text-sm line-clamp-2">Continue your last deck</p>
          </Button>

          <Button 
            onClick={() => navigate('presentation')}
            variant="ghost"
            className="glass-card p-4 md:p-6 rounded-2xl hover-glow text-left flex flex-col items-start group transition-transform duration-300 hover:-translate-y-1 h-auto"
          >
            <div className="bg-emerald-500/20 p-3 md:p-4 rounded-xl mb-3 md:mb-4 group-hover:bg-emerald-500/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
              <Presentation className="w-6 h-6 md:w-8 md:h-8 text-emerald-400" />
            </div>
            <h3 className="text-sm md:text-base font-bold mb-1 md:mb-2 line-clamp-1">Presentation</h3>
            <p className="text-gray-400 text-xs md:text-sm line-clamp-2">Create slides from docs</p>
          </Button>

          <Button 
            onClick={() => {
              const lastUpload = uploads[0];
              if (lastUpload) {
                setCurrentDocumentId(lastUpload.id);
                navigate('chat');
              } else {
                navigate('upload');
              }
            }}
            variant="ghost"
            className="glass-card p-4 md:p-6 rounded-2xl hover-glow text-left flex flex-col items-start group transition-transform duration-300 hover:-translate-y-1 h-auto"
          >
            <div className="bg-cyan-500/20 p-3 md:p-4 rounded-xl mb-3 md:mb-4 group-hover:bg-cyan-500/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
              <MessageSquare className="w-6 h-6 md:w-8 md:h-8 text-cyan-400" />
            </div>
            <h3 className="text-sm md:text-base font-bold mb-1 md:mb-2 line-clamp-1">AI Chat</h3>
            <p className="text-gray-400 text-xs md:text-sm line-clamp-2">Ask questions about docs</p>
          </Button>

          <Button 
            onClick={() => navigate('quiz')}
            variant="ghost"
            className="glass-card p-4 md:p-6 rounded-2xl hover-glow text-left flex flex-col items-start group transition-transform duration-300 hover:-translate-y-1 h-auto"
          >
            <div className="bg-rose-500/20 p-3 md:p-4 rounded-xl mb-3 md:mb-4 group-hover:bg-rose-500/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
              <Target className="w-6 h-6 md:w-8 md:h-8 text-rose-400" />
            </div>
            <h3 className="text-sm md:text-base font-bold mb-1 md:mb-2 line-clamp-1">Mock Exams</h3>
            <p className="text-gray-400 text-xs md:text-sm line-clamp-2">Test your knowledge</p>
          </Button>

          <Button 
            onClick={() => navigate('voice_tutor')}
            variant="ghost"
            className="glass-card p-4 md:p-6 rounded-2xl hover-glow text-left flex flex-col items-start group transition-transform duration-300 hover:-translate-y-1 h-auto"
          >
            <div className="bg-fuchsia-500/20 p-3 md:p-4 rounded-xl mb-3 md:mb-4 group-hover:bg-fuchsia-500/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
              <Mic className="w-6 h-6 md:w-8 md:h-8 text-fuchsia-400" />
            </div>
            <h3 className="text-sm md:text-base font-bold mb-1 md:mb-2 line-clamp-1">Voice Tutor</h3>
            <p className="text-gray-400 text-xs md:text-sm line-clamp-2">Practice with AI</p>
          </Button>

          <Button 
            onClick={() => navigate('todos')}
            variant="ghost"
            className="glass-card p-4 md:p-6 rounded-2xl hover-glow text-left flex flex-col items-start group transition-transform duration-300 hover:-translate-y-1 h-auto"
          >
            <div className="bg-amber-500/20 p-3 md:p-4 rounded-xl mb-3 md:mb-4 group-hover:bg-amber-500/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
              <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 text-amber-400" />
            </div>
            <h3 className="text-sm md:text-base font-bold mb-1 md:mb-2 line-clamp-1">Study Tasks</h3>
            <p className="text-gray-400 text-xs md:text-sm line-clamp-2">Set goals & deadlines</p>
          </Button>
        </div>

        {/* Recent Uploads */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-xl font-bold">
            {searchQuery ? 'Search Results' : `Recent Uploads ${selectedDay ? `for ${selectedDay}` : ''}`}
          </h2>
          <div className="relative w-full sm:w-64">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search documents..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
        <div className="glass-card rounded-2xl overflow-hidden">
          {(() => {
            let filtered = uploads;
            
            if (selectedDay && !searchQuery) {
              filtered = filtered.filter(u => new Date(u.date).toLocaleDateString('en-US', { weekday: 'short' }) === selectedDay);
            }
            
            if (searchQuery) {
              const query = searchQuery.toLowerCase();
              filtered = filtered.filter(u => 
                u.filename.toLowerCase().includes(query) || 
                (u.content && u.content.toLowerCase().includes(query))
              );
            }

            if (filtered.length === 0) {
              return (
                <div className="p-8 text-center text-gray-400">
                  {searchQuery ? 'No documents found matching your search.' : `No documents uploaded ${selectedDay ? `on ${selectedDay}` : 'yet'}.`}
                </div>
              );
            }
            
            const displayUploads = searchQuery ? filtered : filtered.slice(0, 5);

            return (
              <div className="divide-y divide-[rgba(124,58,237,0.2)]">
                {displayUploads.map(upload => (
                  <div key={upload.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-[#211F35] transition-colors gap-4">
                    <div className="flex items-center w-full sm:w-auto min-w-0">
                      <div className="bg-indigo-500/20 p-3 rounded-lg mr-4 flex-shrink-0">
                        {upload.thumbnail ? (
                          <img src={upload.thumbnail} alt={upload.filename} className="w-10 h-10 object-cover rounded" referrerPolicy="no-referrer" />
                        ) : (
                          <FileText className="w-5 h-5 text-indigo-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-white truncate">{upload.filename}</div>
                        <div className="text-xs text-gray-400">{new Date(upload.date).toLocaleDateString()} • {upload.type}</div>
                      </div>
                    </div>
                    <div className="flex w-full sm:w-auto gap-2">
                      <Button 
                        onClick={() => {
                          setCurrentDocumentId(upload.id);
                          navigate('notes');
                        }} 
                        variant="secondary"
                        size="sm"
                        className="flex-1 sm:flex-none whitespace-nowrap"
                      >
                        Smart Notes
                      </Button>
                      <Button 
                        onClick={() => {
                          setCurrentDocumentId(upload.id);
                          navigate('flashcards');
                        }} 
                        variant="secondary"
                        size="sm"
                        className="flex-1 sm:flex-none whitespace-nowrap"
                      >
                        Flashcards
                      </Button>
                      <Button 
                        onClick={() => {
                          setCurrentDocumentId(upload.id);
                          navigate('presentation');
                        }} 
                        variant="secondary"
                        size="sm"
                        className="flex-1 sm:flex-none whitespace-nowrap"
                      >
                        Presentation
                      </Button>
                      <Button 
                        onClick={() => {
                          setCurrentDocumentId(upload.id);
                          navigate('chat');
                        }} 
                        variant="secondary"
                        size="sm"
                        className="flex-1 sm:flex-none whitespace-nowrap"
                      >
                        Chat
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    </Layout>
  );
}
