import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, X, Check, Send, Shield, Mic, Cpu } from 'lucide-react';

const VoiceAssistantWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const widgetRef = useRef(null);

  // Role-based visibility: POLICE_OFFICER and SHO only
  const canAccess = user && ['POLICE_OFFICER', 'SHO'].includes(user.role);

  // Close AI assistant window when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!canAccess) return null;

  return (
    <div ref={widgetRef} className="fixed bottom-6 right-6 z-50">
      {/* Expanded AI Assistant Workspace Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 24 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-20 right-0 w-[48vw] min-w-[360px] max-w-[600px] h-[80vh] min-h-[500px] max-h-[720px] bg-[#ffffff]/95 backdrop-blur-md border border-[#e2e8f0] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-[#1e3a8a] text-white px-6 py-4 flex justify-between items-center border-b border-[#1e3a8a]/20 shadow-sm flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                    <span>CrimeGPT AI Assistant</span>
                    <Sparkles className="w-4 h-4 text-[#b45309]" />
                  </h3>
                  <span className="text-[10px] text-white/80 font-bold uppercase tracking-widest block">
                    Official AI Workspace & Co-Pilot
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-all text-xs font-bold"
                aria-label="Close AI Assistant workspace"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Virtual Robot Stage & Main Workspace Body */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6 text-xs bg-[#f8fafc]/50">
              {/* Robot Character Virtual Room / Stage */}
              <div className="bg-gradient-to-b from-[#eff6ff] via-[#ffffff] to-[#f8fafc] rounded-2xl border border-[#bfdbfe]/60 p-6 relative overflow-hidden shadow-inner flex flex-col items-center justify-center min-h-[260px]">
                {/* Holographic light glow */}
                <div className="absolute w-48 h-48 bg-[#2563eb]/10 rounded-full blur-2xl animate-pulse" />
                
                {/* Robot Speech Bubble */}
                <div className="relative mb-4 bg-[#ffffff] border border-[#bfdbfe] px-5 py-3 rounded-2xl shadow-md text-center max-w-[90%] z-10 space-y-0.5">
                  <p className="font-black text-[#1e293b] text-sm">Hello Officer 👋</p>
                  <p className="text-xs font-bold text-[#1e3a8a]">CrimeGPT AI Assistant</p>
                  <div className="mt-1 flex justify-center">
                    <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                      Coming Soon
                    </span>
                  </div>
                  {/* Speech bubble pointer */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[9px] border-t-[#bfdbfe]" />
                </div>

                {/* Animated Standing Robot Character Avatar */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
                  className="relative flex flex-col items-center z-10"
                >
                  {/* Head & Antenna */}
                  <div className="relative flex flex-col items-center">
                    {/* Antenna with blinking LED signal */}
                    <div className="w-1 h-3.5 bg-[#1e3a8a] relative">
                      <div className="w-3 h-3 rounded-full bg-amber-500 absolute -top-1.5 -left-1 animate-ping" />
                      <div className="w-3 h-3 rounded-full bg-amber-500 absolute -top-1.5 -left-1" />
                    </div>
                    {/* Head */}
                    <div className="w-16 h-14 bg-[#1e3a8a] rounded-2xl border-2 border-[#bfdbfe] flex items-center justify-center relative shadow-md overflow-hidden">
                      {/* Visor with animated cyan lights */}
                      <div className="w-12 h-7 bg-[#0f172a] rounded-xl flex items-center justify-center gap-2.5 border border-[#2563eb]/40">
                        <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]" />
                        <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]" />
                      </div>
                    </div>
                  </div>

                  {/* Body & Arms */}
                  <div className="w-20 h-16 bg-[#1e3a8a] rounded-2xl border-2 border-[#bfdbfe] mt-1 flex flex-col items-center justify-center relative shadow-lg">
                    {/* Chest Emblem */}
                    <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-amber-400 animate-pulse" />
                    </div>
                    {/* Arms */}
                    <div className="w-3.5 h-10 bg-[#1e3a8a] border border-[#bfdbfe] rounded-full absolute -left-2.5 top-2" />
                    <div className="w-3.5 h-10 bg-[#1e3a8a] border border-[#bfdbfe] rounded-full absolute -right-2.5 top-2" />
                  </div>

                  {/* Holographic light pod base */}
                  <div className="w-24 h-2.5 bg-gradient-to-r from-transparent via-[#2563eb]/40 to-transparent rounded-full mt-2 filter blur-[1px] animate-pulse" />
                </motion.div>
              </div>

              {/* Future Capabilities Section */}
              <div className="bg-[#ffffff] border border-[#e2e8f0] p-5 rounded-2xl space-y-3 shadow-sm">
                <span className="text-xs font-black text-[#1e3a8a] uppercase tracking-wider block border-b border-[#e2e8f0] pb-2 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#1e3a8a]" />
                  <span>Upcoming AI Capabilities</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-bold text-[#1e293b] text-[11px]">
                  <div className="flex items-center gap-2 bg-[#f8fafc] p-2.5 rounded-lg border border-[#e2e8f0]">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-black flex-shrink-0">✓</span>
                    <span>Voice FIR Assistant</span>
                  </div>
                  <div className="flex items-center gap-2 bg-[#f8fafc] p-2.5 rounded-lg border border-[#e2e8f0]">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-black flex-shrink-0">✓</span>
                    <span>Automatic Speech Recognition</span>
                  </div>
                  <div className="flex items-center gap-2 bg-[#f8fafc] p-2.5 rounded-lg border border-[#e2e8f0]">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-black flex-shrink-0">✓</span>
                    <span>AI FIR Drafting</span>
                  </div>
                  <div className="flex items-center gap-2 bg-[#f8fafc] p-2.5 rounded-lg border border-[#e2e8f0]">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-black flex-shrink-0">✓</span>
                    <span>Legal Section Recommendation</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Disabled Chat Input Area */}
            <div className="p-4 bg-[#ffffff] border-t border-[#e2e8f0] space-y-2 flex-shrink-0">
              <div className="relative flex items-center">
                <input
                  type="text"
                  disabled
                  placeholder="Ask anything about cases, documents, or legal sections..."
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] text-[#1e293b] placeholder-[#64748b]/60 pl-4 pr-12 py-3 rounded-xl text-xs outline-none cursor-not-allowed opacity-75"
                />
                <button
                  disabled
                  className="absolute right-2 p-2 rounded-lg bg-[#1e3a8a] text-white opacity-50 cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-[#64748b] font-bold text-center uppercase tracking-wider">
                AI Assistant will be available soon
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed State: Circular AI Robot Button with Glowing Pulse Waves */}
      <div className="relative group">
        {/* Hover Tooltip Bubble */}
        <div className="absolute right-16 bottom-2 hidden group-hover:flex items-center gap-1.5 whitespace-nowrap bg-[#1e293b] text-white text-[10px] font-bold uppercase tracking-wider py-1.5 px-3 rounded-lg shadow-xl border border-[#475569] pointer-events-none transition-all">
          <Sparkles className="w-3 h-3 text-[#b45309]" />
          <span>Need help? Talk to CrimeGPT AI Assistant</span>
        </div>

        {/* Soft Glowing Circular Waves Pulse Effect (Active strictly when collapsed/closed) */}
        {!isOpen && (
          <>
            {/* Outer Wave 1 */}
            <div className="w-14 h-14 rounded-full bg-[#1e3a8a]/30 animate-ping absolute inset-0 pointer-events-none" />
            {/* Outer Wave 2 */}
            <div className="w-20 h-20 rounded-full border-2 border-[#2563eb]/30 bg-[#eff6ff]/30 animate-pulse absolute -inset-3 pointer-events-none" />
            {/* Outer Wave 3 */}
            <div className="w-24 h-24 rounded-full border border-[#bfdbfe]/40 animate-ping opacity-15 absolute -inset-5 pointer-events-none" />
          </>
        )}

        {/* Circular Floating Robot Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative flex items-center justify-center w-14 h-14 bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white rounded-full shadow-2xl border-2 border-[#bfdbfe] transition-all transform hover:scale-105 focus:outline-none z-10 ${
            isOpen ? 'ring-2 ring-[#2563eb]' : ''
          }`}
          aria-label="Toggle CrimeGPT AI Assistant workspace"
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <div className="relative">
              <Bot className="w-6 h-6 text-white" />
              <Sparkles className="w-3.5 h-3.5 text-[#b45309] absolute -top-1.5 -right-1.5 animate-pulse" />
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default VoiceAssistantWidget;
