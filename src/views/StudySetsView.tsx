import React, { useState, useEffect } from 'react';
import { ViewName } from '../App';
import Layout from '../components/Layout';
import { getCurrentUser, getUploads, getStudySets, setStudySets, StudySet, User } from '../store';
import { motion } from 'motion/react';
import { Plus, Folder, Trash2 } from 'lucide-react';

interface Props {
  navigate: (view: ViewName) => void;
  user: User | null;
}

export default function StudySetsView({ navigate, user }: Props) {
  const [studySets, setStudySetsState] = useState<StudySet[]>([]);
  const [newSetName, setNewSetName] = useState('');

  useEffect(() => {
    if (user) {
      setStudySetsState(getStudySets().filter(s => s.userId === user.id));
    }
  }, [user]);

  const handleCreateSet = () => {
    if (!user || !newSetName) return;
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

  if (!user) return null;

  return (
    <Layout navigate={navigate} activeView="profile">
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">My Study Sets</h1>
        
        <div className="glass-card p-6 rounded-2xl mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={newSetName}
              onChange={(e) => setNewSetName(e.target.value)}
              placeholder="New study set name"
              className="flex-1 bg-[#0F0E17] border border-[rgba(124,58,237,0.2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleCreateSet}
              className="bg-gradient-primary text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" /> Create Set
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {studySets.map(set => (
            <motion.div
              key={set.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-6 rounded-2xl flex justify-between items-center"
            >
              <div className="flex items-center">
                <Folder className="w-8 h-8 text-indigo-400 mr-4" />
                <div>
                  <h3 className="text-lg font-bold">{set.name}</h3>
                  <p className="text-gray-400 text-sm">{set.uploadIds.length} documents</p>
                </div>
              </div>
              <button onClick={() => handleDeleteSet(set.id)} className="text-red-400 hover:text-red-300">
                <Trash2 className="w-5 h-5" />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
