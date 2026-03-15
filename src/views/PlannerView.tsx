import React, { useState, useEffect } from 'react';
import { ViewName } from '../App';
import Layout from '../components/Layout';
import { User, PlannedTask, getPlannedTasks, setPlannedTasks, addUsage } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Plus, CheckCircle2, Circle, Trash2, Clock, BookOpen, Target, Brain, ChevronLeft, ChevronRight, Sparkles, Loader2 } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';

interface Props {
  navigate: (view: ViewName) => void;
  user: User | null;
}

export default function PlannerView({ navigate, user }: Props) {
  const [tasks, setTasks] = useState<PlannedTask[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<PlannedTask['type']>('study');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (user) {
      setTasks(getPlannedTasks().filter(t => t.userId === user.id));
    }
  }, [user]);

  const addTask = (title: string, type: PlannedTask['type'], date: string) => {
    if (!user) return;
    const newTask: PlannedTask = {
      id: Date.now(),
      userId: user.id,
      title,
      type,
      date,
      completed: false
    };
    const updatedTasks = [newTask, ...tasks];
    setTasks(updatedTasks);
    setPlannedTasks(updatedTasks);
    addUsage('planner');
  };

  const toggleTask = (id: number) => {
    const updatedTasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTasks(updatedTasks);
    setPlannedTasks(updatedTasks);
  };

  const deleteTask = (id: number) => {
    const updatedTasks = tasks.filter(t => t.id !== id);
    setTasks(updatedTasks);
    setPlannedTasks(updatedTasks);
  };

  const clearCompleted = () => {
    const updatedTasks = tasks.filter(t => !(t.completed && t.date === selectedDate));
    setTasks(updatedTasks);
    setPlannedTasks(updatedTasks);
  };

  const generateAIPriorities = async () => {
    if (!user) return;
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Based on a typical student workload, suggest 3 high-priority study tasks for today (${selectedDate}). 
        Return them as a JSON array of objects with 'title' and 'type' (study, review, exam, quiz).`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['study', 'review', 'exam', 'quiz'] }
              },
              required: ['title', 'type']
            }
          }
        }
      });

      const suggestedTasks = JSON.parse(response.text || '[]');
      suggestedTasks.forEach((t: any) => addTask(t.title, t.type, selectedDate));
    } catch (err) {
      console.error('Failed to generate AI tasks', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredTasks = tasks.filter(t => t.date === selectedDate);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  
  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const isSelected = selectedDate === dateStr;
      const hasTasks = tasks.some(t => t.date === dateStr);
      const isToday = new Date().toISOString().split('T')[0] === dateStr;

      days.push(
        <button
          key={day}
          onClick={() => setSelectedDate(dateStr)}
          className={`h-10 rounded-xl flex flex-col items-center justify-center transition-all relative ${
            isSelected 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
              : isToday 
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          <span className="text-xs font-bold">{day}</span>
          {hasTasks && !isSelected && (
            <div className="absolute bottom-1 w-1 h-1 bg-indigo-400 rounded-full" />
          )}
        </button>
      );
    }

    return (
      <div className="grid grid-cols-7 gap-2 mb-8">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={`${d}-${i}`} className="text-center text-[10px] font-bold text-gray-500 uppercase py-2">{d}</div>
        ))}
        {days}
      </div>
    );
  };

  if (!user) return null;

  return (
    <Layout navigate={navigate} activeView="dashboard">
      <div className="p-4 md:p-8 max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
        {/* Sidebar / Calendar */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <div className="glass-card p-6 rounded-3xl border border-white/5 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-indigo-400" />
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex gap-1">
                <button 
                  onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
                  className="p-1 hover:bg-white/5 rounded-lg text-gray-500"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
                  className="p-1 hover:bg-white/5 rounded-lg text-gray-500"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            {renderCalendar()}
            <button 
              onClick={generateAIPriorities}
              disabled={isGenerating}
              className="w-full py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-xs font-bold text-indigo-300 hover:bg-indigo-500/20 transition-all flex items-center justify-center"
            >
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-2" />}
              AI Smart Schedule
            </button>
          </div>

          <div className="glass-card p-6 rounded-3xl border border-white/5">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Study Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Tasks Completed</span>
                <span className="text-sm font-bold text-white">{tasks.filter(t => t.completed).length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Pending Reviews</span>
                <span className="text-sm font-bold text-indigo-400">{tasks.filter(t => !t.completed && t.type === 'review').length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content / Tasks */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">
                {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </h1>
              <p className="text-gray-400">Plan your study goals for the day</p>
            </div>
            <div className="flex items-center gap-3">
              {filteredTasks.length > 0 && (
                <button 
                  onClick={() => {
                    if (confirm('Are you sure you want to delete all tasks for this date?')) {
                      const updatedTasks = tasks.filter(t => t.date !== selectedDate);
                      setTasks(updatedTasks);
                      setPlannedTasks(updatedTasks);
                    }
                  }}
                  className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-2xl transition-all text-sm font-bold"
                >
                  Clear All
                </button>
              )}
              {tasks.some(t => t.completed && t.date === selectedDate) && (
                <button 
                  onClick={clearCompleted}
                  className="px-4 py-3 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-2xl transition-all text-sm font-bold"
                >
                  Clear Completed
                </button>
              )}
              <button 
                onClick={() => setShowAddModal(true)}
                className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg shadow-indigo-500/20 transition-all"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredTasks.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-20 text-center"
                >
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <Clock className="w-8 h-8 text-gray-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-400">No tasks planned for today</h3>
                  <p className="text-sm text-gray-600 mt-1">Click the + button or use AI to get started</p>
                </motion.div>
              ) : (
                filteredTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={`glass-card p-5 rounded-3xl border transition-all flex items-center gap-4 ${
                      task.completed ? 'border-emerald-500/20 bg-emerald-500/5 opacity-60' : 'border-white/5 hover:border-white/10'
                    }`}
                  >
                    <button 
                      onClick={() => toggleTask(task.id)}
                      className={`flex-shrink-0 transition-colors ${task.completed ? 'text-emerald-400' : 'text-gray-600 hover:text-indigo-400'}`}
                    >
                      {task.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                    </button>
                    
                    <div className="flex-1">
                      <div className={`font-bold transition-all ${task.completed ? 'text-gray-500 line-through' : 'text-white'}`}>
                        {task.title}
                      </div>
                      <div className="flex items-center mt-1">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                          task.type === 'exam' ? 'bg-red-500/10 text-red-400' :
                          task.type === 'quiz' ? 'bg-amber-500/10 text-amber-400' :
                          task.type === 'review' ? 'bg-blue-500/10 text-blue-400' :
                          'bg-indigo-500/10 text-indigo-400'
                        }`}>
                          {task.type}
                        </span>
                      </div>
                    </div>

                    <button 
                      onClick={() => deleteTask(task.id)}
                      className="p-2 text-gray-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Add Task Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-white mb-6">Add Planned Task</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Task Title</label>
                  <input 
                    type="text" 
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    placeholder="e.g., Review Biology Chapter 5"
                    className="w-full bg-[#0F0E17] border border-[rgba(124,58,237,0.2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Task Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['study', 'review', 'exam', 'quiz'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setNewTaskType(type)}
                        className={`py-2.5 rounded-xl border text-xs font-bold capitalize transition-all ${
                          newTaskType === type 
                            ? 'bg-indigo-600 border-indigo-500 text-white' 
                            : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl text-gray-400 hover:bg-white/5 transition-colors font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (newTaskTitle.trim()) {
                      addTask(newTaskTitle, newTaskType, selectedDate);
                      setNewTaskTitle('');
                      setShowAddModal(false);
                    }
                  }}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all"
                >
                  Save Task
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
