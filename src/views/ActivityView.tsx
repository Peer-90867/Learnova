import React, { useState, useEffect } from 'react';
import { ViewName } from '../App';
import Layout from '../components/Layout';
import { getCurrentUser, getUsage, Usage, getUploads, Upload, User } from '../store';
import { motion } from 'motion/react';
import { Activity, Clock, FileText, Layers, MessageSquare, TrendingUp, Calendar, Filter } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface Props {
  navigate: (view: ViewName) => void;
  user: User | null;
}

export default function ActivityView({ navigate, user }: Props) {
  const [usage, setUsage] = useState<Usage[]>([]);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [filter, setFilter] = useState<'all' | 'flashcard' | 'note' | 'chat' | 'doc'>('all');

  useEffect(() => {
    if (!user) return;
    setUsage(getUsage().filter(u => u.userId === user.id).reverse());
    setUploads(getUploads().filter(u => u.userId === user.id));
  }, [user?.id]);

  if (!user) return null;

  const filteredUsage = filter === 'all' ? usage : usage.filter(u => u.type === filter);

  // Prepare data for the activity chart (last 14 days)
  const chartData = Array.from({ length: 14 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - i));
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dayUsage = usage.filter(u => new Date(u.date).toDateString() === date.toDateString());
    
    return {
      name: dateStr,
      count: dayUsage.length,
      flashcards: dayUsage.filter(u => u.type === 'flashcard').length,
      notes: dayUsage.filter(u => u.type === 'note').length,
      chats: dayUsage.filter(u => u.type === 'chat').length,
    };
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'flashcard': return <Layers className="w-4 h-4 text-purple-400" />;
      case 'note': return <FileText className="w-4 h-4 text-blue-400" />;
      case 'chat': return <MessageSquare className="w-4 h-4 text-emerald-400" />;
      case 'doc': return <Activity className="w-4 h-4 text-indigo-400" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <Layout navigate={navigate} activeView="dashboard">
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center">
              <Activity className="w-8 h-8 mr-3 text-indigo-400" />
              Activity & Usage
            </h1>
            <p className="text-gray-400 mt-1">Track your learning progress and platform interactions</p>
          </div>
          
          <div className="flex bg-[#1A1830] p-1 rounded-xl border border-[rgba(124,58,237,0.2)]">
            {(['all', 'flashcard', 'note', 'chat', 'doc'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors capitalize ${filter === f ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Usage Overview Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2 glass-card p-6 rounded-2xl">
            <h3 className="text-lg font-bold mb-6 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-emerald-400" />
              Learning Velocity (Last 14 Days)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1A1830', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#6366f1" fillOpacity={1} fill="url(#colorCount)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl flex flex-col">
            <h3 className="text-lg font-bold mb-6 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-amber-400" />
              Summary Stats
            </h3>
            <div className="space-y-6 flex-1">
              <div className="flex justify-between items-center p-4 bg-[#1A1830] rounded-xl border border-[rgba(124,58,237,0.1)]">
                <span className="text-gray-400 text-sm">Total Actions</span>
                <span className="text-2xl font-bold text-white">{usage.length}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-[#1A1830] rounded-xl border border-[rgba(124,58,237,0.1)]">
                <span className="text-gray-400 text-sm">Active Days</span>
                <span className="text-2xl font-bold text-white">
                  {new Set(usage.map(u => new Date(u.date).toDateString())).size}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-[#1A1830] rounded-xl border border-[rgba(124,58,237,0.1)]">
                <span className="text-gray-400 text-sm">Docs Uploaded</span>
                <span className="text-2xl font-bold text-white">{uploads.length}</span>
              </div>
            </div>
            <button 
              onClick={() => navigate('dashboard')}
              className="mt-6 w-full py-3 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600/20 transition-colors text-sm font-bold"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Activity Feed */}
        <h3 className="text-xl font-bold mb-6 flex items-center">
          <Clock className="w-6 h-6 mr-3 text-gray-400" />
          Recent Activity
        </h3>
        
        <div className="glass-card rounded-2xl overflow-hidden">
          {filteredUsage.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No activity found matching your filter.
            </div>
          ) : (
            <div className="divide-y divide-[rgba(124,58,237,0.1)]">
              {filteredUsage.map((item, index) => (
                <div key={index} className="p-4 flex items-center hover:bg-[#1A1830] transition-colors group">
                  <div className="bg-[#1A1830] p-3 rounded-xl mr-4 group-hover:bg-indigo-500/20 transition-colors">
                    {getIcon(item.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className="font-medium text-white capitalize">
                        {item.type === 'doc' ? 'Uploaded Document' : 
                         item.type === 'flashcard' ? 'Practiced Flashcards' :
                         item.type === 'note' ? 'Generated Smart Notes' :
                         'Used AI Chat'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(item.date).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-xs font-mono text-gray-600 bg-[#0F0E17] px-2 py-1 rounded">
                    ID: {item.date.slice(-6)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
