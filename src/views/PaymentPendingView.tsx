import React from 'react';
import { ViewName } from '../App';
import Layout from '../components/Layout';
import { getCurrentUser } from '../store';
import { motion } from 'motion/react';
import { Clock, ArrowRight } from 'lucide-react';

interface Props {
  navigate: (view: ViewName) => void;
}

export default function PaymentPendingView({ navigate }: Props) {
  const user = getCurrentUser();

  if (!user) return null;

  return (
    <Layout navigate={navigate} activeView="pricing">
      <div className="min-h-[80vh] flex items-center justify-center p-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card max-w-lg w-full p-12 rounded-3xl text-center border-2 border-amber-500/50 shadow-[0_0_50px_rgba(245,158,11,0.1)]"
        >
          <div className="w-24 h-24 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
            <Clock className="w-12 h-12 text-amber-400 animate-pulse" />
          </div>
          
          <h1 className="text-3xl font-bold mb-4">Payment Under Review</h1>
          
          <p className="text-gray-400 mb-8 text-lg">
            Thank you for upgrading! Your transaction ID has been submitted and is currently being verified by our team.
          </p>
          
          <div className="bg-[#0F0E17] border border-[rgba(124,58,237,0.2)] rounded-xl p-6 mb-8 text-left">
            <h3 className="font-bold text-white mb-2">What happens next?</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start">
                <span className="text-amber-400 mr-2">1.</span>
                We manually verify the UPI transaction against our bank records.
              </li>
              <li className="flex items-start">
                <span className="text-amber-400 mr-2">2.</span>
                This process usually takes <strong className="text-white mx-1">2–4 hours</strong> during business hours.
              </li>
              <li className="flex items-start">
                <span className="text-amber-400 mr-2">3.</span>
                Once approved, your account will automatically upgrade to Pro.
              </li>
            </ul>
          </div>

          <button 
            onClick={() => navigate('dashboard')}
            className="w-full bg-[#211F35] text-white border border-[rgba(124,58,237,0.2)] hover:bg-[#2A2845] transition-colors rounded-xl px-6 py-4 font-bold flex justify-center items-center"
          >
            Return to Dashboard <ArrowRight className="ml-2 w-5 h-5" />
          </button>
        </motion.div>
      </div>
    </Layout>
  );
}
