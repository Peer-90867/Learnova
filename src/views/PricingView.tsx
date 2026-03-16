import React, { useState } from 'react';
import { ViewName } from '../App';
import Layout from '../components/Layout';
import { getCurrentUser, getSubscriptions, setSubscriptions, setCurrentUser, Subscription, User, PLANS } from '../store';
import { CheckCircle2, XCircle, Gem, Loader2, QrCode } from 'lucide-react';
import Button from '../components/Button';

interface Props {
  navigate: (view: ViewName) => void;
  user: User | null;
}

export default function PricingView({ navigate, user }: Props) {
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'team'>('pro');
  const [showPayment, setShowPayment] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const handleSubscribe = async () => {
    if (!transactionId.trim()) return;
    setLoading(true);

    try {
      const newSub: Subscription = {
        id: Date.now(),
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        plan: selectedPlan,
        amount: selectedPlan === 'pro' ? 299 : 999,
        transactionId,
        status: 'pending',
        submittedAt: new Date().toISOString()
      };

      const subs = getSubscriptions();
      setSubscriptions([...subs, newSub]);

      const updatedUser = { ...user, subscriptionStatus: 'pending' as const };
      setCurrentUser(updatedUser);
      
      const users = JSON.parse(localStorage.getItem('sf_users') || '[]');
      const userIndex = users.findIndex((u: any) => u && u.id === user.id);
      if (userIndex > -1) {
        users[userIndex] = updatedUser;
        localStorage.setItem('sf_users', JSON.stringify(users));
      }

      setTimeout(() => {
        setLoading(false);
        navigate('payment_pending');
      }, 1500);
    } catch (error) {
      console.error('Subscription error', error);
      setLoading(false);
    }
  };

  return (
    <Layout navigate={navigate} activeView="pricing">
      <div className="p-8 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Simple, transparent pricing</h1>
          <p className="text-xl text-gray-400">Unlock the full power of AI for your studies.</p>
        </div>

        {!showPayment ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="glass-card p-8 rounded-3xl border border-[rgba(124,58,237,0.2)]">
              <h3 className="text-2xl font-bold mb-2">{PLANS.free.name}</h3>
              <div className="text-4xl font-bold mb-6">₹{PLANS.free.price}<span className="text-lg text-gray-500 font-normal">/mo</span></div>
              <p className="text-gray-400 mb-8">Perfect for trying out Learnova.</p>
              
              <ul className="space-y-4 mb-8">
                {PLANS.free.features.map(f => <li key={f} className="flex items-center text-gray-300"><CheckCircle2 className="w-5 h-5 text-emerald-400 mr-3" /> {f}</li>)}
              </ul>
              
              <Button disabled className="w-full py-3 rounded-xl font-bold bg-[#211F35] text-gray-400 cursor-not-allowed">
                Current Plan
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="glass-card p-8 rounded-3xl border-2 border-amber-500 relative transform md:-translate-y-4 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-gold text-white px-4 py-1 rounded-full text-sm font-bold flex items-center">
                <Gem className="w-4 h-4 mr-1" /> Most Popular
              </div>
              <h3 className="text-2xl font-bold mb-2 text-amber-400">{PLANS.pro.name}</h3>
              <div className="text-4xl font-bold mb-6">₹{PLANS.pro.price}<span className="text-lg text-gray-500 font-normal">/mo</span></div>
              <p className="text-gray-400 mb-8">Everything you need to ace exams.</p>
              
              <ul className="space-y-4 mb-8">
                {PLANS.pro.features.map(f => <li key={f} className="flex items-center text-gray-300"><CheckCircle2 className="w-5 h-5 text-amber-400 mr-3" /> {f}</li>)}
              </ul>
              
              <Button 
                onClick={() => { setSelectedPlan('pro'); setShowPayment(true); }}
                className="w-full py-3 rounded-xl font-bold bg-gradient-gold text-white hover-glow"
              >
                Upgrade to {PLANS.pro.name}
              </Button>
            </div>

            {/* Team Plan */}
            <div className="glass-card p-8 rounded-3xl border border-[rgba(124,58,237,0.2)]">
              <h3 className="text-2xl font-bold mb-2">{PLANS.team.name}</h3>
              <div className="text-4xl font-bold mb-6">₹{PLANS.team.price}<span className="text-lg text-gray-500 font-normal">/mo</span></div>
              <p className="text-gray-400 mb-8">For study groups up to 5 members.</p>
              
              <ul className="space-y-4 mb-8">
                {PLANS.team.features.map(f => <li key={f} className="flex items-center text-gray-300"><CheckCircle2 className="w-5 h-5 text-indigo-400 mr-3" /> {f}</li>)}
              </ul>
              
              <Button 
                onClick={() => { setSelectedPlan('team'); setShowPayment(true); }}
                className="w-full py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                Get {PLANS.team.name} Plan
              </Button>
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto glass-card p-8 rounded-3xl border border-amber-500/50">
            <Button 
              onClick={() => setShowPayment(false)}
              variant="ghost"
              className="text-sm text-gray-400 hover:text-white mb-6 flex items-center"
            >
              &larr; Back to plans
            </Button>
            
            <h2 className="text-2xl font-bold mb-2">Complete Payment</h2>
            <p className="text-gray-400 mb-6">
              You are upgrading to the <strong className="text-amber-400 capitalize">{selectedPlan} Plan</strong> for ₹{selectedPlan === 'pro' ? '299' : '999'}/month.
            </p>

            <div className="bg-white p-4 rounded-xl flex justify-center mb-6">
              {/* Placeholder for QR Code */}
              <div className="w-48 h-48 bg-gray-200 flex items-center justify-center flex-col text-gray-500 rounded-lg border-2 border-dashed border-gray-400">
                <QrCode className="w-12 h-12 mb-2" />
                <span className="text-sm font-bold">UPI QR Code</span>
                <span className="text-xs">Scan to pay ₹{selectedPlan === 'pro' ? '299' : '999'}</span>
              </div>
            </div>

            <div className="text-center text-sm text-gray-400 mb-6">
              UPI ID: <strong className="text-white">cramlab@upi</strong>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">Transaction ID (UTR)</label>
              <input 
                type="text" 
                value={transactionId}
                onChange={e => setTransactionId(e.target.value)}
                placeholder="Enter 12-digit UTR number"
                className="w-full bg-[#0F0E17] border border-[rgba(124,58,237,0.2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
              />
              <p className="text-xs text-gray-500 mt-2">After payment, enter the transaction ID here for manual verification.</p>
            </div>

            <Button 
              onClick={handleSubscribe}
              disabled={loading || !transactionId.trim()}
              isLoading={loading}
              className="w-full bg-gradient-gold text-white rounded-xl px-4 py-4 font-bold text-lg flex justify-center items-center hover-glow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit for Verification
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
