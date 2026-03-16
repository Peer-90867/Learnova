import React, { useMemo } from 'react';
import { ViewName } from '../App';
import Layout from '../components/Layout';
import { User, getUsage, getQuizzes, getFocusSessions, getDecks } from '../store';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Award, Clock, BookOpen, Target, Brain, Calendar } from 'lucide-react';

interface Props {
  navigate: (view: ViewName) => void;
  user: User | null;
}

export default function AnalyticsView({ navigate, user }: Props) {
  const usage = (getUsage() || []).filter(u => u.userId === user?.id);
  const quizzes = (getQuizzes() || []).filter(q => q.userId === user?.id);
  const focusSessions = (getFocusSessions() || []).filter(s => s.userId === user?.id);
  const decks = (getDecks() || []).filter(d => d.userId === user?.id);

  // Process data for charts
  const activityData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const dayUsage = usage.filter(u => u.date.startsWith(date));
      return {
        name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        count: dayUsage.length,
        focus: focusSessions.filter(s => s.date.startsWith(date)).length * 25
      };
    });
  }, [usage, focusSessions]);

  const quizPerformance = useMemo(() => {
    return quizzes.slice(-5).map((q, i) => ({
      name: `Quiz ${i + 1}`,
      score: q.score ? (q.score / q.questions.length) * 100 : 0
    }));
  }, [quizzes]);

  const categoryDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    usage.forEach(u => {
      counts[u.type] = (counts[u.type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [usage]);

  const COLORS = ['#8b5cf6', '#4f46e5', '#10b981', '#3b82f6', '#f59e0b'];

  if (!user) return null;

  return (
    <Layout navigate={navigate} activeView="dashboard">
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <TrendingUp className="w-8 h-8 mr-3 text-indigo-400" />
              Learning Analytics
            </h1>
            <p className="text-gray-400 mt-1">Track your progress and mastery across all subjects</p>
          </div>
          <div className="bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-xl flex items-center">
            <Award className="w-5 h-5 text-indigo-400 mr-2" />
            <span className="text-sm font-bold text-indigo-300">Level 12 Scholar</span>
          </div>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {[
            { label: 'Total Study Time', value: `${focusSessions.length * 25}m`, icon: Clock, color: 'indigo' },
            { label: 'Quizzes Taken', value: quizzes.length, icon: Target, color: 'emerald' },
            { label: 'Flashcards Mastered', value: decks.reduce((acc, d) => acc + d.cards.length, 0), icon: Brain, color: 'blue' }
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-6 rounded-3xl border border-white/5"
            >
              <div className={`w-12 h-12 bg-${stat.color}-500/10 rounded-2xl flex items-center justify-center mb-4`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-400`} />
              </div>
              <div className="text-3xl font-black text-white mb-1">{stat.value}</div>
              <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          {/* Study Streak Heatmap */}
          <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 lg:col-span-3">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <Calendar className="w-5 h-5 mr-3 text-amber-400" />
              Study Activity Heatmap
            </h3>
            <div className="flex flex-wrap gap-2">
              {[...Array(30)].map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (29 - i));
                const dateStr = d.toISOString().split('T')[0];
                const dayUsage = usage.filter(u => u.date.startsWith(dateStr)).length;
                
                let intensityClass = 'bg-white/5';
                if (dayUsage > 0 && dayUsage <= 2) intensityClass = 'bg-emerald-500/20';
                else if (dayUsage > 2 && dayUsage <= 5) intensityClass = 'bg-emerald-500/50';
                else if (dayUsage > 5) intensityClass = 'bg-emerald-500';

                return (
                  <div 
                    key={i} 
                    className={`w-8 h-8 rounded-lg ${intensityClass} border border-white/5 flex items-center justify-center group relative cursor-pointer transition-colors`}
                  >
                    <div className="absolute bottom-full mb-2 hidden group-hover:block bg-[#1A1830] border border-[rgba(124,58,237,0.2)] text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                      {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {dayUsage} activities
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2 text-xs text-gray-400">
              <span>Less</span>
              <div className="w-4 h-4 rounded bg-white/5"></div>
              <div className="w-4 h-4 rounded bg-emerald-500/20"></div>
              <div className="w-4 h-4 rounded bg-emerald-500/50"></div>
              <div className="w-4 h-4 rounded bg-emerald-500"></div>
              <span>More</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          {/* Activity Chart */}
          <div className="glass-card p-8 rounded-[2.5rem] border border-white/5">
            <h3 className="text-xl font-bold text-white mb-8 flex items-center">
              <BookOpen className="w-5 h-5 mr-3 text-indigo-400" />
              Weekly Activity
            </h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1A1830', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorCount)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quiz Performance */}
          <div className="glass-card p-8 rounded-[2.5rem] border border-white/5">
            <h3 className="text-xl font-bold text-white mb-8 flex items-center">
              <Target className="w-5 h-5 mr-3 text-emerald-400" />
              Quiz Performance (%)
            </h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={quizPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1A1830', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="score" fill="#10b981" radius={[8, 8, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Distribution */}
          <div className="glass-card p-8 rounded-[2.5rem] border border-white/5">
            <h3 className="text-xl font-bold text-white mb-8">Study Distribution</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1A1830', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {categoryDistribution.map((entry, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-gray-400 capitalize">{entry.name}</span>
                  </div>
                  <span className="text-white font-bold">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
