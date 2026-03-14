import React, { useState, useEffect } from 'react';
import { ViewName } from '../App';
import Layout from '../components/Layout';
import { User, StudyGroup, getStudyGroups, setStudyGroups, getUploads, Upload } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, Search, Share2, FileText, UserPlus, MoreVertical, MessageCircle, Shield, Globe, Lock } from 'lucide-react';

interface Props {
  navigate: (view: ViewName) => void;
  user: User | null;
}

export default function GroupsView({ navigate, user }: Props) {
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setGroups(getStudyGroups());
  }, []);

  const createGroup = () => {
    if (!user || !newGroupName.trim()) return;
    const newGroup: StudyGroup = {
      id: Date.now(),
      name: newGroupName,
      description: newGroupDesc,
      ownerId: user.id,
      members: [user.id],
      sharedUploadIds: [],
      createdAt: new Date().toISOString()
    };
    const updatedGroups = [newGroup, ...groups];
    setGroups(updatedGroups);
    setStudyGroups(updatedGroups);
    setShowCreateModal(false);
    setNewGroupName('');
    setNewGroupDesc('');
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
                    <button className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center">
                      Join Group
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
