import React, { useState, useEffect } from 'react';
import { ViewName } from '../App';
import { isAdmin, setAdmin, getUsers, setUsers, getSubscriptions, setSubscriptions, User, Subscription, getUsage, getUploads } from '../store';
import { motion } from 'motion/react';
import { Users, CreditCard, LogOut, CheckCircle2, XCircle, Search, Trash2, ShieldAlert, BarChart3, TrendingUp, FileText, Layers, MessageSquare } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell as PieCell } from 'recharts';

interface Props {
  navigate: (view: ViewName) => void;
}

export default function AdminPanelView({ navigate }: Props) {
  const [users, setUsersState] = useState<User[]>([]);
  const [subscriptions, setSubscriptionsState] = useState<Subscription[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'payments' | 'stats'>('payments');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isAdmin()) {
      navigate('admin_login');
      return;
    }
    setUsersState(getUsers());
    setSubscriptionsState(getSubscriptions());
  }, [navigate]);

  const handleLogout = () => {
    setAdmin(false);
    navigate('landing');
  };

  const approvePayment = (subId: number) => {
    const subs = [...subscriptions];
    const subIndex = subs.findIndex(s => s.id === subId);
    if (subIndex === -1) return;

    subs[subIndex].status = 'approved';
    setSubscriptions(subs);
    setSubscriptionsState(subs);

    // Update user
    const currentUsers = [...users];
    const userIndex = currentUsers.findIndex(u => u.id === subs[subIndex].userId);
    if (userIndex > -1) {
      currentUsers[userIndex].plan = subs[subIndex].plan as 'pro' | 'team';
      currentUsers[userIndex].subscriptionStatus = 'active';
      setUsers(currentUsers);
      setUsersState(currentUsers);
      
      // Update current user if it's the same
      const currentUserStr = localStorage.getItem('sf_current_user');
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        if (currentUser && currentUser.id === currentUsers[userIndex].id) {
          localStorage.setItem('sf_current_user', JSON.stringify(currentUsers[userIndex]));
        }
      }
    }
  };

  const rejectPayment = (subId: number) => {
    const subs = [...subscriptions];
    const subIndex = subs.findIndex(s => s.id === subId);
    if (subIndex === -1) return;

    subs[subIndex].status = 'rejected';
    subs[subIndex].rejectionReason = 'Invalid UTR or payment not received';
    setSubscriptions(subs);
    setSubscriptionsState(subs);

    // Update user
    const currentUsers = [...users];
    const userIndex = currentUsers.findIndex(u => u.id === subs[subIndex].userId);
    if (userIndex > -1) {
      currentUsers[userIndex].subscriptionStatus = 'rejected';
      setUsers(currentUsers);
      setUsersState(currentUsers);
      
      // Update current user if it's the same
      const currentUserStr = localStorage.getItem('sf_current_user');
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        if (currentUser && currentUser.id === currentUsers[userIndex].id) {
          localStorage.setItem('sf_current_user', JSON.stringify(currentUsers[userIndex]));
        }
      }
    }
  };

  const deleteUser = (userId: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      const currentUsers = users.filter(u => u && u.id !== userId);
      setUsers(currentUsers);
      setUsersState(currentUsers);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingSubs = subscriptions.filter(s => s.status === 'pending');
  const pastSubs = subscriptions.filter(s => s.status !== 'pending');

  if (!isAdmin()) return null;

  return (
    <div className="min-h-screen bg-[#0F0E17] flex flex-col">
      {/* Navbar */}
      <nav className="bg-[#1A1830] border-b border-[rgba(124,58,237,0.2)] px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="text-xl font-bold text-red-500 flex items-center">
          <ShieldAlert className="w-6 h-6 mr-2" /> Admin Dashboard
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center text-gray-400 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5 mr-2" /> Exit Admin
        </button>
      </nav>

      <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full p-8 gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 space-y-2">
          <button 
            onClick={() => setActiveTab('payments')}
            className={`w-full flex items-center px-4 py-3 rounded-xl transition-colors ${activeTab === 'payments' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-[#211F35] hover:text-white'}`}
          >
            <CreditCard className="w-5 h-5 mr-3" />
            Payments
            {pendingSubs.length > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {pendingSubs.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center px-4 py-3 rounded-xl transition-colors ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-[#211F35] hover:text-white'}`}
          >
            <Users className="w-5 h-5 mr-3" />
            Users
          </button>
          <button 
            onClick={() => setActiveTab('stats')}
            className={`w-full flex items-center px-4 py-3 rounded-xl transition-colors ${activeTab === 'stats' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-[#211F35] hover:text-white'}`}
          >
            <BarChart3 className="w-5 h-5 mr-3" />
            Platform Stats
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 glass-card rounded-3xl p-8 overflow-hidden flex flex-col">
          {activeTab === 'payments' && (
            <div className="flex-1 overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <CreditCard className="w-6 h-6 mr-3 text-indigo-400" /> Pending Approvals
              </h2>
              
              {pendingSubs.length === 0 ? (
                <div className="bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-2xl p-8 text-center text-gray-400 mb-12">
                  No pending payments to review.
                </div>
              ) : (
                <div className="space-y-4 mb-12">
                  {pendingSubs.map(sub => (
                    <div key={sub.id} className="bg-[#1A1830] border border-amber-500/30 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <div className="flex items-center mb-2">
                          <span className="font-bold text-lg mr-3">{sub.userName}</span>
                          <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
                            {sub.plan} Plan
                          </span>
                        </div>
                        <div className="text-gray-400 text-sm mb-1">{sub.userEmail}</div>
                        <div className="text-gray-300 font-mono text-sm bg-[#0F0E17] px-3 py-1 rounded inline-block border border-[rgba(124,58,237,0.2)]">
                          UTR: {sub.transactionId}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">Submitted: {new Date(sub.submittedAt).toLocaleString()}</div>
                      </div>
                      <div className="flex space-x-3 w-full md:w-auto">
                        <button 
                          onClick={() => rejectPayment(sub.id)}
                          className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors"
                        >
                          <XCircle className="w-4 h-4 mr-2" /> Reject
                        </button>
                        <button 
                          onClick={() => approvePayment(sub.id)}
                          className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20 transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <h2 className="text-xl font-bold mb-6 text-gray-400">Past Transactions</h2>
              <div className="bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-2xl overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#211F35] text-gray-400">
                    <tr>
                      <th className="px-6 py-4 font-medium">User</th>
                      <th className="px-6 py-4 font-medium">Plan</th>
                      <th className="px-6 py-4 font-medium">UTR</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(124,58,237,0.2)]">
                    {pastSubs.map(sub => (
                      <tr key={sub.id} className="hover:bg-[#211F35] transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-white">{sub.userName}</div>
                          <div className="text-xs text-gray-500">{sub.userEmail}</div>
                        </td>
                        <td className="px-6 py-4 capitalize">{sub.plan}</td>
                        <td className="px-6 py-4 font-mono text-xs">{sub.transactionId}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                            sub.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-400">{new Date(sub.submittedAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {pastSubs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No past transactions found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="flex-1 flex flex-col h-full">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-xl md:text-2xl font-bold flex items-center">
                  <Users className="w-5 h-5 md:w-6 md:h-6 mr-3 text-indigo-400" /> User Management
                </h2>
                <div className="relative w-full md:w-auto">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors w-full md:w-64"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-x-auto overflow-y-auto bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-2xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#211F35] text-gray-400 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 font-medium">Name</th>
                      <th className="px-6 py-4 font-medium">Email</th>
                      <th className="px-6 py-4 font-medium">Plan</th>
                      <th className="px-6 py-4 font-medium">Uploads</th>
                      <th className="px-6 py-4 font-medium">Joined</th>
                      <th className="px-6 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(124,58,237,0.2)]">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-[#211F35] transition-colors">
                        <td className="px-6 py-4 font-medium text-white">{u.name}</td>
                        <td className="px-6 py-4 text-gray-400">{u.email}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                            u.plan === 'pro' ? 'bg-amber-500/20 text-amber-400' :
                            u.plan === 'team' ? 'bg-indigo-500/20 text-indigo-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {u.plan}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-400">{u.uploadsUsed || 0}</td>
                        <td className="px-6 py-4 text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => deleteUser(u.id)}
                            className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No users found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="flex-1 overflow-y-auto">
              <h2 className="text-2xl font-bold mb-8 flex items-center">
                <BarChart3 className="w-6 h-6 mr-3 text-indigo-400" /> Platform Usage Analytics
              </h2>

              {/* Global Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <div className="bg-[#1A1830] p-6 rounded-2xl border border-[rgba(124,58,237,0.1)]">
                  <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Total Users</div>
                  <div className="text-3xl font-bold text-white">{users.length}</div>
                </div>
                <div className="bg-[#1A1830] p-6 rounded-2xl border border-[rgba(124,58,237,0.1)]">
                  <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Total Uploads</div>
                  <div className="text-3xl font-bold text-white">{getUploads().length}</div>
                </div>
                <div className="bg-[#1A1830] p-6 rounded-2xl border border-[rgba(124,58,237,0.1)]">
                  <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Total Interactions</div>
                  <div className="text-3xl font-bold text-white">{getUsage().length}</div>
                </div>
                <div className="bg-[#1A1830] p-6 rounded-2xl border border-[rgba(124,58,237,0.1)]">
                  <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Revenue (Est.)</div>
                  <div className="text-3xl font-bold text-emerald-400">
                    ${subscriptions.filter(s => s.status === 'approved').reduce((acc, s) => acc + s.amount, 0)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                {/* Feature Usage Chart */}
                <div className="bg-[#1A1830] p-6 rounded-2xl border border-[rgba(124,58,237,0.1)]">
                  <h3 className="text-lg font-bold mb-6">Feature Popularity</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Flashcards', count: getUsage().filter(u => u.type === 'flashcard').length },
                        { name: 'Notes', count: getUsage().filter(u => u.type === 'note').length },
                        { name: 'Chats', count: getUsage().filter(u => u.type === 'chat').length },
                        { name: 'Docs', count: getUsage().filter(u => u.type === 'doc').length },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <XAxis dataKey="name" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1A1830', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '8px' }}
                        />
                        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Plan Distribution */}
                <div className="bg-[#1A1830] p-6 rounded-2xl border border-[rgba(124,58,237,0.1)]">
                  <h3 className="text-lg font-bold mb-6">Plan Distribution</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Free', value: users.filter(u => u.plan === 'free').length },
                            { name: 'Pro', value: users.filter(u => u.plan === 'pro').length },
                            { name: 'Team', value: users.filter(u => u.plan === 'team').length },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <PieCell fill="#94a3b8" />
                          <PieCell fill="#f59e0b" />
                          <PieCell fill="#6366f1" />
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1A1830', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '8px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-6 mt-4 text-xs font-medium">
                    <div className="flex items-center"><div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div> Free</div>
                    <div className="flex items-center"><div className="w-3 h-3 bg-amber-500 rounded-full mr-2"></div> Pro</div>
                    <div className="flex items-center"><div className="w-3 h-3 bg-indigo-500 rounded-full mr-2"></div> Team</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
