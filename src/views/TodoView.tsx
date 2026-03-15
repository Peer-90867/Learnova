import React, { useState, useEffect, useMemo } from 'react';
import { ViewName } from '../App';
import Layout from '../components/Layout';
import { getTodos, setTodos, User, Todo } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Circle, Trash2, Calendar, Plus, Clock, AlertCircle, ChevronLeft, Tag, Flag, Filter, Wand2, Loader2, Edit2, X, Save } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';

interface Props {
  navigate: (view: ViewName) => void;
  user: User | null;
}

type FilterType = 'all' | 'active' | 'completed';
type SortType = 'dueDate' | 'priority' | 'createdAt';

const CATEGORIES = ['Reading', 'Assignment', 'Exam Prep', 'Review', 'Project', 'Other'];

export default function TodoView({ navigate, user }: Props) {
  const [todos, setTodoState] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [category, setCategory] = useState<string>('Other');
  
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('dueDate');

  const [isGenerating, setIsGenerating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Todo>>({});

  useEffect(() => {
    if (!user) return;
    setTodoState(getTodos().filter(t => t.userId === user.id));
  }, [user]);

  const saveTodos = (newTodos: Todo[]) => {
    const allTodos = getTodos().filter(t => t.userId !== user?.id);
    const updated = [...allTodos, ...newTodos];
    setTodos(updated);
    setTodoState(newTodos);
  };

  const addTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim() || !user) return;

    const todo: Todo = {
      id: Date.now(),
      userId: user.id,
      text: newTodo,
      completed: false,
      dueDate: dueDate || undefined,
      createdAt: new Date().toISOString(),
      priority,
      category
    };

    saveTodos([todo, ...todos]);
    setNewTodo('');
    setDueDate('');
    setPriority('medium');
    setCategory('Other');
  };

  const toggleTodo = (id: number) => {
    const updated = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    saveTodos(updated);
  };

  const deleteTodo = (id: number) => {
    const updated = todos.filter(t => t.id !== id);
    saveTodos(updated);
  };

  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditForm({ ...todo });
  };

  const saveEdit = () => {
    if (!editingId) return;
    const updated = todos.map(t => t.id === editingId ? { ...t, ...editForm as Todo } : t);
    saveTodos(updated);
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const generateTasksWithAI = async () => {
    if (!newTodo.trim() || !user) {
      alert("Please enter a study topic in the task description to generate tasks.");
      return;
    }
    
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `Break down the study topic "${newTodo}" into 3 to 5 actionable study tasks.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING, description: "The task description" },
                priority: { type: Type.STRING, description: "low, medium, or high" },
                category: { type: Type.STRING, description: "One of: Reading, Assignment, Exam Prep, Review, Project, Other" }
              },
              required: ["text", "priority", "category"]
            }
          }
        }
      });
      
      const generatedTasks = JSON.parse(response.text || '[]');
      const newTodos: Todo[] = generatedTasks.map((t: any, index: number) => ({
        id: Date.now() + index,
        userId: user.id,
        text: t.text,
        completed: false,
        dueDate: dueDate || undefined,
        createdAt: new Date().toISOString(),
        priority: t.priority === 'high' || t.priority === 'medium' || t.priority === 'low' ? t.priority : 'medium',
        category: CATEGORIES.includes(t.category) ? t.category : 'Other'
      }));
      
      saveTodos([...newTodos, ...todos]);
      setNewTodo('');
      setDueDate('');
    } catch (err) {
      console.error("Failed to generate tasks", err);
      alert("Failed to generate tasks. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const clearCompleted = () => {
    const updated = todos.filter(t => !t.completed);
    saveTodos(updated);
  };

  const isOverdue = (dateStr?: string) => {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateStr);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  const getDueDateLabel = (dateStr?: string) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateStr);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 1 && diffDays < 7) return `In ${diffDays} days`;
    if (diffDays < -1 && diffDays > -7) return `${Math.abs(diffDays)} days ago`;
    
    return dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredAndSortedTodos = useMemo(() => {
    let result = [...todos];

    // Filter
    if (filter === 'active') result = result.filter(t => !t.completed);
    if (filter === 'completed') result = result.filter(t => t.completed);

    // Sort
    result.sort((a, b) => {
      // Completed items always go to the bottom
      if (a.completed !== b.completed) return a.completed ? 1 : -1;

      if (sortBy === 'dueDate') {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      
      if (sortBy === 'priority') {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        const weightA = priorityWeight[a.priority || 'medium'];
        const weightB = priorityWeight[b.priority || 'medium'];
        if (weightA !== weightB) return weightB - weightA;
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [todos, filter, sortBy]);

  if (!user) return null;

  const completedCount = todos.filter(t => t.completed).length;
  const progress = todos.length === 0 ? 0 : Math.round((completedCount / todos.length) * 100);

  const getPriorityColor = (p?: string) => {
    switch (p) {
      case 'high': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'medium': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'low': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  return (
    <Layout navigate={navigate} activeView="dashboard">
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center">
            <button 
              onClick={() => navigate('dashboard')}
              className="p-2 mr-4 bg-[#1A1830] rounded-xl border border-[rgba(124,58,237,0.2)] text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center">
                <CheckCircle2 className="w-8 h-8 mr-3 text-emerald-400" />
                Study Tasks
              </h1>
              <p className="text-gray-400 mt-1">Manage your learning goals and deadlines</p>
            </div>
          </div>
          
          {todos.length > 0 && (
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
              <div className="bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-xl p-3 flex-1">
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-gray-400">Overall Progress</span>
                  <span className="text-emerald-400">{progress}%</span>
                </div>
                <div className="w-full bg-[#0F0E17] rounded-full h-2">
                  <div 
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
              {todos.filter(t => t.dueDate === new Date().toISOString().split('T')[0]).length > 0 && (
                <div className="bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-xl p-3 flex-1">
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span className="text-gray-400">Today's Progress</span>
                    <span className="text-indigo-400">
                      {Math.round((todos.filter(t => t.dueDate === new Date().toISOString().split('T')[0] && t.completed).length / todos.filter(t => t.dueDate === new Date().toISOString().split('T')[0]).length) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-[#0F0E17] rounded-full h-2">
                    <div 
                      className="bg-indigo-500 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.round((todos.filter(t => t.dueDate === new Date().toISOString().split('T')[0] && t.completed).length / todos.filter(t => t.dueDate === new Date().toISOString().split('T')[0]).length) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add Todo Form */}
        <form onSubmit={addTodo} className="glass-card p-6 rounded-3xl mb-8 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Task Description</label>
              <input 
                type="text" 
                value={newTodo}
                onChange={e => setNewTodo(e.target.value)}
                placeholder="What do you need to study?"
                className="w-full bg-[#0F0E17] border border-[rgba(124,58,237,0.2)] rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div className="w-full md:w-48">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Due Date</label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <input 
                  type="date" 
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full bg-[#0F0E17] border border-[rgba(124,58,237,0.2)] rounded-2xl pl-11 pr-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                />
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-48">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Category</label>
              <div className="relative">
                <Tag className="w-4 h-4 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <select 
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-[#0F0E17] border border-[rgba(124,58,237,0.2)] rounded-2xl pl-11 pr-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors text-sm appearance-none"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="w-full md:w-48">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Priority</label>
              <div className="relative">
                <Flag className="w-4 h-4 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <select 
                  value={priority}
                  onChange={e => setPriority(e.target.value as any)}
                  className="w-full bg-[#0F0E17] border border-[rgba(124,58,237,0.2)] rounded-2xl pl-11 pr-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors text-sm appearance-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="flex-1"></div>
            <button 
              type="button"
              onClick={generateTasksWithAI}
              disabled={!newTodo.trim() || isGenerating}
              className="w-full md:w-auto px-6 py-3 bg-indigo-600/10 border border-indigo-500/30 rounded-2xl text-indigo-400 font-bold hover:bg-indigo-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isGenerating ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Wand2 className="w-5 h-5 mr-2" />}
              AI Breakdown
            </button>
            <button 
              type="submit"
              disabled={!newTodo.trim() || isGenerating}
              className="w-full md:w-auto px-8 py-3 bg-indigo-600 rounded-2xl text-white font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 flex items-center justify-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Task
            </button>
          </div>
        </form>

        {/* Filters and Sorting */}
        {todos.length > 0 && (
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div className="flex bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-xl p-1">
              <button 
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                All
              </button>
              <button 
                onClick={() => setFilter('active')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'active' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Active
              </button>
              <button 
                onClick={() => setFilter('completed')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'completed' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Completed
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-xl px-3 py-1">
                <Filter className="w-4 h-4 text-gray-400 mr-2" />
                <select 
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortType)}
                  className="bg-transparent text-sm text-gray-300 focus:outline-none py-2 cursor-pointer"
                >
                  <option value="dueDate">Sort by Due Date</option>
                  <option value="priority">Sort by Priority</option>
                  <option value="createdAt">Sort by Newest</option>
                </select>
              </div>
              {todos.some(t => t.completed) && (
                <button
                  onClick={clearCompleted}
                  className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-sm font-medium hover:bg-red-500/20 transition-colors"
                >
                  Clear Completed
                </button>
              )}
            </div>
          </div>
        )}

        {/* Todo List */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredAndSortedTodos.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 bg-[#1A1830] rounded-3xl border border-dashed border-[rgba(124,58,237,0.2)]"
              >
                <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-400">
                  {todos.length === 0 ? 'No tasks yet' : 'No tasks match your filter'}
                </h3>
                <p className="text-gray-500 text-sm">
                  {todos.length === 0 ? 'Add your first study goal above!' : 'Try changing your filter settings.'}
                </p>
              </motion.div>
            ) : (
              filteredAndSortedTodos.map(todo => (
                <motion.div
                  key={todo.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`group glass-card p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between border transition-all ${
                    todo.completed ? 'bg-emerald-500/5 border-emerald-500/20' : 
                    isOverdue(todo.dueDate) ? 'bg-red-500/5 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]' :
                    'hover:border-indigo-500/30'
                  }`}
                >
                  {editingId === todo.id ? (
                    <div className="w-full flex flex-col gap-4">
                      <div className="flex flex-col md:flex-row gap-4">
                        <input 
                          type="text" 
                          value={editForm.text || ''}
                          onChange={e => setEditForm({...editForm, text: e.target.value})}
                          className="flex-1 bg-[#0F0E17] border border-[rgba(124,58,237,0.4)] rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                        />
                        <input 
                          type="date" 
                          value={editForm.dueDate || ''}
                          onChange={e => setEditForm({...editForm, dueDate: e.target.value})}
                          className="w-full md:w-40 bg-[#0F0E17] border border-[rgba(124,58,237,0.4)] rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
                        />
                      </div>
                      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex gap-4 w-full md:w-auto">
                          <select 
                            value={editForm.category || 'Other'}
                            onChange={e => setEditForm({...editForm, category: e.target.value})}
                            className="w-full md:w-32 bg-[#0F0E17] border border-[rgba(124,58,237,0.4)] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
                          >
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <select 
                            value={editForm.priority || 'medium'}
                            onChange={e => setEditForm({...editForm, priority: e.target.value as any})}
                            className="w-full md:w-32 bg-[#0F0E17] border border-[rgba(124,58,237,0.4)] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                          <button onClick={cancelEdit} className="p-2 text-gray-400 hover:text-white bg-[#1A1830] rounded-xl transition-colors">
                            <X className="w-5 h-5" />
                          </button>
                          <button onClick={saveEdit} className="p-2 text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 rounded-xl transition-colors">
                            <Save className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start md:items-center flex-1 min-w-0 w-full">
                        <button 
                          onClick={() => toggleTodo(todo.id)}
                          className={`mr-4 mt-1 md:mt-0 transition-colors flex-shrink-0 ${
                            todo.completed ? 'text-emerald-400' : 
                            isOverdue(todo.dueDate) ? 'text-red-500' : 'text-gray-600 hover:text-indigo-400'
                          }`}
                        >
                          {todo.completed ? <CheckCircle2 className="w-6 h-6" /> : 
                           isOverdue(todo.dueDate) ? <AlertCircle className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className={`text-base md:text-lg font-medium transition-all mb-1 ${
                            todo.completed ? 'text-gray-500 line-through' : 
                            isOverdue(todo.dueDate) ? 'text-red-200' : 'text-white'
                          }`}>
                            {todo.text}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {todo.category && (
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${todo.completed ? 'text-gray-500 border-gray-700 bg-gray-800/50' : 'text-indigo-300 border-indigo-500/30 bg-indigo-500/10'}`}>
                                {todo.category}
                              </span>
                            )}
                            {todo.priority && (
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${todo.completed ? 'text-gray-500 border-gray-700 bg-gray-800/50' : getPriorityColor(todo.priority)}`}>
                                {todo.priority} Priority
                              </span>
                            )}
                            {todo.dueDate && (
                              <div className={`flex items-center text-xs font-medium px-2 py-1 rounded-md border transition-colors ${
                                todo.completed ? 'text-gray-500 border-gray-700 bg-gray-800/50' : 
                                isOverdue(todo.dueDate) ? 'text-red-400 border-red-500/40 bg-red-500/10 animate-pulse' : 
                                getDueDateLabel(todo.dueDate) === 'Today' ? 'text-amber-400 border-amber-500/40 bg-amber-500/10' :
                                'text-gray-400 border-gray-700 bg-gray-800/50'
                              }`}>
                                {isOverdue(todo.dueDate) && !todo.completed ? (
                                  <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                                ) : (
                                  <Calendar className="w-3.5 h-3.5 mr-1.5" />
                                )}
                                <span className="mr-1">{getDueDateLabel(todo.dueDate)}</span>
                                <span className="opacity-50 text-[10px]">({new Date(todo.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})</span>
                                {isOverdue(todo.dueDate) && !todo.completed && (
                                  <span className="ml-2 font-black uppercase text-[9px] tracking-tighter">
                                    Overdue
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center mt-4 md:mt-0 md:ml-4 self-end md:self-auto opacity-100 md:opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => startEditing(todo)}
                          className="p-2 text-gray-400 hover:text-indigo-400 transition-colors"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => deleteTodo(todo.id)}
                          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
}
