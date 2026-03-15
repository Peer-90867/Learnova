import React, { useState, useEffect } from 'react';
import { ViewName } from '../App';
import Layout from '../components/Layout';
import { getCurrentUser, getUploads, getStudySets, setStudySets, StudySet, User, Upload } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Folder, Trash2, ChevronDown, ChevronUp, FileText, X } from 'lucide-react';

interface Props {
  navigate: (view: ViewName) => void;
  user: User | null;
}

export default function StudySetsView({ navigate, user }: Props) {
  const [studySets, setStudySetsState] = useState<StudySet[]>([]);
  const [newSetName, setNewSetName] = useState('');
  const [expandedSetId, setExpandedSetId] = useState<number | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);

  useEffect(() => {
    if (user) {
      setStudySetsState(getStudySets().filter(s => s.userId === user.id));
      setUploads(getUploads().filter(u => u.userId === user.id));
    }
  }, [user]);

  const handleCreateSet = () => {
    if (!user || !newSetName.trim()) return;
    const newSet: StudySet = {
      id: Date.now(),
      userId: user.id,
      name: newSetName,
      uploadIds: []
    };
    const updatedSets = [...getStudySets(), newSet];
    setStudySets(updatedSets);
    setStudySetsState(updatedSets.filter(s => s.userId === user.id));
    setNewSetName('');
  };

  const handleDeleteSet = (id: number) => {
    const updatedSets = getStudySets().filter(s => s.id !== id);
    setStudySets(updatedSets);
    setStudySetsState(updatedSets.filter(s => s.userId === user.id));
  };

  const toggleDocumentInSet = (setId: number, uploadId: number) => {
    const updatedSets = getStudySets().map(s => {
      if (s.id === setId) {
        const newUploadIds = s.uploadIds.includes(uploadId) 
          ? s.uploadIds.filter(id => id !== uploadId)
          : [...s.uploadIds, uploadId];
        return { ...s, uploadIds: newUploadIds };
      }
      return s;
    });
    setStudySets(updatedSets);
    setStudySetsState(updatedSets.filter(s => s.userId === user?.id));
  };

  if (!user) return null;

  return (
    <Layout navigate={navigate} activeView="profile">
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-8 flex items-center">
          <Folder className="w-8 h-8 mr-3 text-indigo-400" />
          My Study Sets
        </h1>
        
        <div className="glass-card p-6 rounded-2xl mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              value={newSetName}
              onChange={(e) => setNewSetName(e.target.value)}
              placeholder="New study set name"
              className="flex-1 bg-[#0F0E17] border border-[rgba(124,58,237,0.2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateSet()}
            />
            <button
              onClick={handleCreateSet}
              disabled={!newSetName.trim()}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-500 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5 mr-2" /> Create Set
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <AnimatePresence>
            {studySets.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 bg-[#1A1830] rounded-3xl border border-dashed border-[rgba(124,58,237,0.2)]"
              >
                <Folder className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-400">No study sets yet</h3>
                <p className="text-gray-500 text-sm">Create a study set to organize your documents.</p>
              </motion.div>
            ) : (
              studySets.map(set => (
                <motion.div
                  key={set.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-card rounded-2xl overflow-hidden border border-[rgba(124,58,237,0.2)]"
                >
                  <div 
                    className="p-6 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => setExpandedSetId(expandedSetId === set.id ? null : set.id)}
                  >
                    <div className="flex items-center">
                      <Folder className="w-8 h-8 text-indigo-400 mr-4" />
                      <div>
                        <h3 className="text-lg font-bold">{set.name}</h3>
                        <p className="text-gray-400 text-sm">{set.uploadIds.length} documents</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteSet(set.id); }} 
                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      {expandedSetId === set.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedSetId === set.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-[rgba(124,58,237,0.2)] bg-[#0F0E17]/50"
                      >
                        <div className="p-6">
                          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Manage Documents</h4>
                          {uploads.length === 0 ? (
                            <p className="text-sm text-gray-500">No documents uploaded yet. Go to the Dashboard to upload some.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {uploads.map(upload => {
                                const isSelected = set.uploadIds.includes(upload.id);
                                return (
                                  <div 
                                    key={upload.id}
                                    onClick={() => toggleDocumentInSet(set.id, upload.id)}
                                    className={`p-3 rounded-xl border flex items-center cursor-pointer transition-all ${
                                      isSelected 
                                        ? 'bg-indigo-500/20 border-indigo-500/50 text-white' 
                                        : 'bg-[#1A1830] border-[rgba(124,58,237,0.2)] text-gray-400 hover:border-indigo-500/30'
                                    }`}
                                  >
                                    <FileText className={`w-4 h-4 mr-3 ${isSelected ? 'text-indigo-400' : 'text-gray-500'}`} />
                                    <span className="text-sm truncate flex-1">{upload.filename}</span>
                                    {isSelected && <div className="w-2 h-2 rounded-full bg-indigo-400 ml-2" />}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
}
