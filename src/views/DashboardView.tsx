import React, { useEffect, useState } from 'react';
import { ViewName } from '../App';
import Layout from '../components/Layout';
import { getCurrentUser, getUploads, Upload, setCurrentDocumentId, getUsage, User } from '../store';
import { motion } from 'motion/react';
import { FileText, Layers, Clock, Target, UploadCloud, MessageSquare, Lock, TrendingUp, TrendingDown, Presentation, CheckCircle2, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

interface Props {
  navigate: (view: ViewName) => void;
  user: User | null;
}

export default function DashboardView({ navigate, user }: Props) {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [greeting, setGreeting] = useState('');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) return;
    setUploads(getUploads().filter(u => u && u.userId === user.id));

    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, [user?.id]);

  if (!user) return null;

  const usage = getUsage().filter(u => u.userId === user.id);
  
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

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="glass-card p-6 rounded-2xl">
            <div className="text-gray-400 text-sm mb-2 flex items-center justify-between">
              <span className="flex items-center"><Layers className="w-4 h-4 mr-2" /> Flashcards</span>
              <TrendIndicator value={stats.flashcards.trend} />
            </div>
            <div className="text-3xl font-bold text-white">{stats.flashcards.total}</div>
          </div>
          <div className="glass-card p-6 rounded-2xl">
            <div className="text-gray-400 text-sm mb-2 flex items-center justify-between">
              <span className="flex items-center"><FileText className="w-4 h-4 mr-2" /> Notes</span>
              <TrendIndicator value={stats.notes.trend} />
            </div>
            <div className="text-3xl font-bold text-white">{stats.notes.total}</div>
          </div>
          <div className="glass-card p-6 rounded-2xl">
            <div className="text-gray-400 text-sm mb-2 flex items-center justify-between">
              <span className="flex items-center"><MessageSquare className="w-4 h-4 mr-2" /> Chats</span>
              <TrendIndicator value={stats.chats.trend} />
            </div>
            <div className="text-3xl font-bold text-white">{stats.chats.total}</div>
          </div>
          <div className="glass-card p-6 rounded-2xl">
            <div className="text-gray-400 text-sm mb-2 flex items-center justify-between">
              <span className="flex items-center"><UploadCloud className="w-4 h-4 mr-2" /> Docs</span>
              <TrendIndicator value={stats.docs.trend} />
            </div>
            <div className="text-3xl font-bold text-white">{stats.docs.total}</div>
          </div>
        </div>

        {/* Usage Statistics Chart */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Weekly Usage Statistics</h2>
          {selectedDay && (
            <button 
              onClick={() => setSelectedDay(null)}
              className="text-sm text-indigo-400 hover:text-indigo-300"
            >
              Clear filter ({selectedDay})
            </button>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4 md:gap-6 mb-12">
          <button 
            onClick={() => navigate('upload')}
            className="glass-card p-4 md:p-6 rounded-2xl hover-glow text-left flex flex-col items-start group transition-transform duration-300 hover:-translate-y-1"
          >
            <div className="bg-indigo-500/20 p-3 md:p-4 rounded-xl mb-3 md:mb-4 group-hover:bg-indigo-500/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
              <UploadCloud className="w-6 h-6 md:w-8 md:h-8 text-indigo-400" />
            </div>
            <h3 className="text-sm md:text-base font-bold mb-1 md:mb-2 line-clamp-1">Upload Media</h3>
            <p className="text-gray-400 text-xs md:text-sm line-clamp-2">PDF, video, or paste text</p>
          </button>
          
          <button 
            onClick={() => navigate('notes')}
            className="glass-card p-4 md:p-6 rounded-2xl hover-glow text-left flex flex-col items-start group transition-transform duration-300 hover:-translate-y-1"
          >
            <div className="bg-blue-500/20 p-3 md:p-4 rounded-xl mb-3 md:mb-4 group-hover:bg-blue-500/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
              <FileText className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />
            </div>
            <h3 className="text-sm md:text-base font-bold mb-1 md:mb-2 line-clamp-1">My Notes</h3>
            <p className="text-gray-400 text-xs md:text-sm line-clamp-2">Review generated notes</p>
          </button>

          <button 
            onClick={() => navigate('flashcards')}
            className="glass-card p-4 md:p-6 rounded-2xl hover-glow text-left flex flex-col items-start group transition-transform duration-300 hover:-translate-y-1"
          >
            <div className="bg-purple-500/20 p-3 md:p-4 rounded-xl mb-3 md:mb-4 group-hover:bg-purple-500/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
              <Layers className="w-6 h-6 md:w-8 md:h-8 text-purple-400" />
            </div>
            <h3 className="text-sm md:text-base font-bold mb-1 md:mb-2 line-clamp-1">My Flashcards</h3>
            <p className="text-gray-400 text-xs md:text-sm line-clamp-2">Continue your last deck</p>
          </button>

          <button 
            onClick={() => navigate('presentation')}
            className="glass-card p-4 md:p-6 rounded-2xl hover-glow text-left flex flex-col items-start group transition-transform duration-300 hover:-translate-y-1"
          >
            <div className="bg-emerald-500/20 p-3 md:p-4 rounded-xl mb-3 md:mb-4 group-hover:bg-emerald-500/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
              <Presentation className="w-6 h-6 md:w-8 md:h-8 text-emerald-400" />
            </div>
            <h3 className="text-sm md:text-base font-bold mb-1 md:mb-2 line-clamp-1">Presentation</h3>
            <p className="text-gray-400 text-xs md:text-sm line-clamp-2">Create slides from docs</p>
          </button>

          <button 
            onClick={() => {
              const lastUpload = uploads[0];
              if (lastUpload) {
                setCurrentDocumentId(lastUpload.id);
                navigate('chat');
              } else {
                navigate('upload');
              }
            }}
            className="glass-card p-4 md:p-6 rounded-2xl hover-glow text-left flex flex-col items-start group transition-transform duration-300 hover:-translate-y-1"
          >
            <div className="bg-cyan-500/20 p-3 md:p-4 rounded-xl mb-3 md:mb-4 group-hover:bg-cyan-500/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
              <MessageSquare className="w-6 h-6 md:w-8 md:h-8 text-cyan-400" />
            </div>
            <h3 className="text-sm md:text-base font-bold mb-1 md:mb-2 line-clamp-1">AI Chat</h3>
            <p className="text-gray-400 text-xs md:text-sm line-clamp-2">Ask questions about docs</p>
          </button>

          <button 
            onClick={() => navigate('quiz')}
            className="glass-card p-4 md:p-6 rounded-2xl hover-glow text-left flex flex-col items-start group transition-transform duration-300 hover:-translate-y-1"
          >
            <div className="bg-rose-500/20 p-3 md:p-4 rounded-xl mb-3 md:mb-4 group-hover:bg-rose-500/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
              <Target className="w-6 h-6 md:w-8 md:h-8 text-rose-400" />
            </div>
            <h3 className="text-sm md:text-base font-bold mb-1 md:mb-2 line-clamp-1">Mock Exams</h3>
            <p className="text-gray-400 text-xs md:text-sm line-clamp-2">Test your knowledge</p>
          </button>

          <button 
            onClick={() => navigate('todos')}
            className="glass-card p-4 md:p-6 rounded-2xl hover-glow text-left flex flex-col items-start group transition-transform duration-300 hover:-translate-y-1"
          >
            <div className="bg-amber-500/20 p-3 md:p-4 rounded-xl mb-3 md:mb-4 group-hover:bg-amber-500/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
              <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 text-amber-400" />
            </div>
            <h3 className="text-sm md:text-base font-bold mb-1 md:mb-2 line-clamp-1">Study Tasks</h3>
            <p className="text-gray-400 text-xs md:text-sm line-clamp-2">Set goals & deadlines</p>
          </button>
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
                      <button 
                        onClick={() => {
                          setCurrentDocumentId(upload.id);
                          navigate('notes');
                        }} 
                        className="flex-1 sm:flex-none text-sm bg-[#211F35] hover:bg-indigo-600 border border-[rgba(124,58,237,0.2)] px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                      >
                        Smart Notes
                      </button>
                      <button 
                        onClick={() => {
                          setCurrentDocumentId(upload.id);
                          navigate('flashcards');
                        }} 
                        className="flex-1 sm:flex-none text-sm bg-[#211F35] hover:bg-purple-600 border border-[rgba(124,58,237,0.2)] px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                      >
                        Flashcards
                      </button>
                      <button 
                        onClick={() => {
                          setCurrentDocumentId(upload.id);
                          navigate('presentation');
                        }} 
                        className="flex-1 sm:flex-none text-sm bg-[#211F35] hover:bg-emerald-600 border border-[rgba(124,58,237,0.2)] px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                      >
                        Presentation
                      </button>
                      <button 
                        onClick={() => {
                          setCurrentDocumentId(upload.id);
                          navigate('chat');
                        }} 
                        className="flex-1 sm:flex-none text-sm bg-[#211F35] hover:bg-blue-600 border border-[rgba(124,58,237,0.2)] px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                      >
                        Chat
                      </button>
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
