import React, { useState, useEffect } from 'react';
import { ViewName } from '../App';
import Layout from '../components/Layout';
import { User, StudyGroup, getStudyGroups, setStudyGroups, getUploads, Upload, ChatMessage } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, Search, Share2, FileText, UserPlus, MoreVertical, MessageCircle, Shield, Globe, Lock, Send, X as CloseIcon } from 'lucide-react';

interface Props {
  navigate: (view: ViewName) => void;
  user: User | null;
}

export default function GroupsView({ navigate, user }: Props) {
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupSubject, setNewGroupSubject] = useState('General');
  const [newGroupPassword, setNewGroupPassword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'notes'>('chat');
  const [collaborativeNotes, setCollaborativeNotes] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    setGroups(getStudyGroups());
  }, []);

  const openGroup = (groupId: number) => {
    const group = groups.find(g => g.id === groupId);
    if (group && group.password) {
      setSelectedGroupId(groupId);
      setShowPasswordModal(true);
    } else {
      setSelectedGroupId(groupId);
      setChatMessages(group?.chatHistory || []);
      setCollaborativeNotes(group?.collaborativeDocument || '');
    }
  };

  const verifyPassword = () => {
    const group = groups.find(g => g.id === selectedGroupId);
    if (group && group.password === passwordInput) {
      setShowPasswordModal(false);
      setChatMessages(group.chatHistory || []);
      setCollaborativeNotes(group.collaborativeDocument || '');
      setPasswordInput('');
    } else {
      alert('Incorrect password');
    }
  };

  useEffect(() => {
    if (selectedGroupId && user && !showPasswordModal) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}?roomId=group-${selectedGroupId}`;
      const ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'chat') {
          handleNewMessage(data.message);
        } else if (data.type === 'notes') {
          setCollaborativeNotes(data.notes);
        }
      };

      setSocket(ws);
      return () => ws.close();
    }
  }, [selectedGroupId, user, showPasswordModal]);

  const handleNewMessage = (message: ChatMessage) => {
    setChatMessages(prev => [...prev, message]);
    
    // Persist to store
    const updatedGroups = groups.map(g => {
      if (g.id === selectedGroupId) {
        return { ...g, chatHistory: [...g.chatHistory, message] };
      }
      return g;
    });
    setGroups(updatedGroups);
    setStudyGroups(updatedGroups);
  };

  const sendMessage = () => {
    if (!socket || !newMessage.trim() || !user) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      userId: user.id,
      userName: user.name,
      text: newMessage,
      timestamp: new Date().toISOString()
    };

    socket.send(JSON.stringify({ type: 'chat', message }));
    handleNewMessage(message);
    setNewMessage('');
  };

  const updateCollaborativeNotes = (notes: string) => {
    if (!socket) return;
    setCollaborativeNotes(notes);
    socket.send(JSON.stringify({ type: 'notes', notes }));

    // Persist to store
    const updatedGroups = groups.map(g => {
      if (g.id === selectedGroupId) {
        return { ...g, collaborativeDocument: notes };
      }
      return g;
    });
    setGroups(updatedGroups);
    setStudyGroups(updatedGroups);
  };

  const createGroup = () => {
    if (!user || !newGroupName.trim()) return;
    const newGroup: StudyGroup = {
      id: Date.now(),
      name: newGroupName,
      description: newGroupDesc,
      ownerId: user.id,
      members: [user.id],
      sharedUploadIds: [],
      createdAt: new Date().toISOString(),
      subject: newGroupSubject,
      password: newGroupPassword,
      chatHistory: [],
      collaborativeDocument: ''
    };
    const updatedGroups = [newGroup, ...groups];
    setGroups(updatedGroups);
    setStudyGroups(updatedGroups);
    setShowCreateModal(false);
    setNewGroupName('');
    setNewGroupDesc('');
    setNewGroupPassword('');
  };

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) return null;

  return (
    <Layout navigate={navigate} activeView="dashboard">
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Users className="w-8 h-8 mr-3 text-indigo-400" />
              Study Hub
            </h1>
            <p className="text-gray-400 mt-1">Collaborate with classmates and share study materials</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-5 h-5 mr-2" /> Create Group
          </button>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search for study groups or topics..."
            className="w-full bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredGroups.length === 0 ? (
              <div className="col-span-full py-20 text-center">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-10 h-10 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-400">No groups found</h3>
                <p className="text-gray-600 mt-2">Try searching for something else or create your own group!</p>
              </div>
            ) : (
              filteredGroups.map((group) => (
                <motion.div
                  key={group.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-card rounded-[2.5rem] border border-white/5 overflow-hidden group hover:border-indigo-500/30 transition-all flex flex-col"
                >
                  <div className="p-8 flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-indigo-400" />
                      </div>
                      <div className="flex gap-1">
                        {group.subject && (
                          <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-md">
                            {group.subject}
                          </span>
                        )}
                        <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md flex items-center">
                          <Globe className="w-3 h-3 mr-1" /> Public
                        </span>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">{group.name}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-6">{group.description}</p>
                    
                    <div className="flex items-center gap-4 mb-6">
                      <div className="flex -space-x-2">
                        {[...Array(Math.min(group.members.length, 3))].map((_, i) => (
                          <div key={i} className="w-8 h-8 rounded-full bg-[#211F35] border-2 border-[#0F0E17] flex items-center justify-center text-[10px] font-bold text-indigo-400">
                            U{i+1}
                          </div>
                        ))}
                        {group.members.length > 3 && (
                          <div className="w-8 h-8 rounded-full bg-indigo-600 border-2 border-[#0F0E17] flex items-center justify-center text-[10px] font-bold text-white">
                            +{group.members.length - 3}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-600 font-bold uppercase tracking-wider">{group.members.length} Members</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <div className="text-lg font-bold text-white">{group.sharedUploadIds.length}</div>
                        <div className="text-[10px] text-gray-600 uppercase font-bold tracking-widest">Resources</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <div className="text-lg font-bold text-white">12</div>
                        <div className="text-[10px] text-gray-600 uppercase font-bold tracking-widest">Discussions</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-white/5 border-t border-white/5 flex gap-2">
                    <button 
                      onClick={() => openGroup(group.id)}
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Open Chat
                    </button>
                    <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 transition-all">
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-4">Enter Password</h3>
              <input 
                type="password" 
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                placeholder="Enter group password"
                className="w-full bg-[#0F0E17] border border-[rgba(124,58,237,0.2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all mb-6"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowPasswordModal(false); setSelectedGroupId(null); }}
                  className="flex-1 py-3 rounded-xl text-gray-400 hover:bg-white/5 transition-colors font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={verifyPassword}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all"
                >
                  Join
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Group Chat Modal */}
      <AnimatePresence>
        {selectedGroupId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-[2.5rem] w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Chat Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center mr-4">
                    <Users className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {groups.find(g => g.id === selectedGroupId)?.name}
                    </h3>
                    <div className="flex items-center text-xs text-emerald-400">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse" />
                      Live Collaboration Active
                    </div>
                  </div>
                </div>
                <div className="flex bg-[#0F0E17] rounded-xl p-1">
                  <button 
                    onClick={() => setActiveTab('chat')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'chat' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    Chat
                  </button>
                  <button 
                    onClick={() => setActiveTab('notes')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'notes' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    Notes
                  </button>
                </div>
                <button 
                  onClick={() => {
                    setSelectedGroupId(null);
                    setShowPasswordModal(false);
                  }}
                  className="p-2 hover:bg-white/10 rounded-full text-gray-400 transition-colors"
                >
                  <CloseIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Chat/Notes Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'chat' ? (
                  <div className="space-y-4">
                    {chatMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                        <MessageCircle className="w-12 h-12 mb-4" />
                        <p>No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      chatMessages.map((msg) => (
                        <div key={msg.id} className={`flex flex-col ${msg.userId === user.id ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center mb-1 gap-2">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{msg.userName}</span>
                            <span className="text-[10px] text-gray-600">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${
                            msg.userId === user.id 
                              ? 'bg-indigo-600 text-white rounded-tr-none' 
                              : 'bg-white/5 text-gray-300 rounded-tl-none border border-white/5'
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <textarea
                    value={collaborativeNotes}
                    onChange={e => updateCollaborativeNotes(e.target.value)}
                    placeholder="Start collaborative note-taking..."
                    className="w-full h-full bg-transparent text-gray-200 font-mono text-sm focus:outline-none resize-none"
                  />
                )}
              </div>

              {/* Chat Input */}
              {activeTab === 'chat' && (
                <div className="p-6 border-t border-white/5 bg-white/5">
                  <div className="flex gap-3">
                    <input 
                      type="text" 
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && sendMessage()}
                      placeholder="Type your message..."
                      className="flex-1 bg-[#0F0E17] border border-[rgba(124,58,237,0.2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all"
                    />
                    <button 
                      onClick={sendMessage}
                      className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Group Modal */}
      <AnimatePresence>
        {showCreateModal && (
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
              <h3 className="text-2xl font-bold text-white mb-6">Create Study Group</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Group Name</label>
                  <input 
                    type="text" 
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    placeholder="e.g., Biology 101 Study Squad"
                    className="w-full bg-[#0F0E17] border border-[rgba(124,58,237,0.2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Subject</label>
                  <select 
                    value={newGroupSubject}
                    onChange={e => setNewGroupSubject(e.target.value)}
                    className="w-full bg-[#0F0E17] border border-[rgba(124,58,237,0.2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                  >
                    <option value="General">General</option>
                    <option value="Science">Science</option>
                    <option value="Math">Math</option>
                    <option value="History">History</option>
                    <option value="Languages">Languages</option>
                    <option value="Arts">Arts</option>
                    <option value="Computer Science">Computer Science</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Password (Optional)</label>
                  <input 
                    type="password" 
                    value={newGroupPassword}
                    onChange={e => setNewGroupPassword(e.target.value)}
                    placeholder="Set a group password"
                    className="w-full bg-[#0F0E17] border border-[rgba(124,58,237,0.2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Description</label>
                  <textarea 
                    value={newGroupDesc}
                    onChange={e => setNewGroupDesc(e.target.value)}
                    placeholder="What is this group about?"
                    rows={3}
                    className="w-full bg-[#0F0E17] border border-[rgba(124,58,237,0.2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all resize-none"
                  />
                </div>

                <div className="flex items-center gap-4 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Privacy Settings</div>
                    <div className="text-xs text-gray-500">Groups are public by default.</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 rounded-xl text-gray-400 hover:bg-white/5 transition-colors font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={createGroup}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all"
                >
                  Create Group
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
