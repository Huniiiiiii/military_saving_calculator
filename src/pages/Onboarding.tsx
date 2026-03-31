import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import onboardingCh from '../assets/onboarding_ch.webp';

interface OnboardingProps {
  onStart: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onStart }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-[#A5D7D9] flex flex-col items-center justify-center overflow-hidden"
    >
      <div className="w-full max-w-[480px] min-h-screen flex flex-col items-center justify-between relative bg-[#A5D7D9] sm:shadow-[0_0_100px_rgba(0,0,0,0.1)]">
        <div className="flex-1 w-full flex flex-col items-center justify-center relative px-8 pt-6 sm:scale-90 transition-transform">
          {/* Character Image */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.8, type: "spring" }}
            className="relative z-10 w-full"
          >
            <div className="absolute inset-0 bg-white/20 rounded-full blur-[80px] scale-125" />
            <img 
              src={onboardingCh} 
              alt="Military Savings Pig" 
              className="relative z-10 w-full h-auto drop-shadow-[0_25px_25px_rgba(0,0,0,0.12)]"
            />
          </motion.div>
        </div>

        {/* Bottom UI Section */}
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.5, type: "spring", damping: 20 }}
          className="w-full bg-white rounded-t-[2rem] sm:rounded-[2.5rem] sm:mb-10 p-6 pt-8 shadow-[0_-15px_30px_rgba(0,0,0,0.05)] sm:shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-col items-center z-30"
        >
          <div className="w-full text-center">
            <h1 className="text-xl font-black text-slate-700 leading-tight mb-1 tracking-tighter">
              전역할 때 받는 <span className="text-[#2D6A6D]">진짜 목돈,</span><br />
              <span className="text-2xl font-black text-slate-900">장병내일준비적금</span>
            </h1>
            <p className="text-slate-400 font-bold mb-4 text-sm">
              가장 확실한 군 생활 재테크,<br />
              지금 바로 계산해 보세요.
            </p>

            <div className="grid grid-cols-3 gap-2 mb-4 bg-slate-50/50 p-2 rounded-2xl border border-slate-100">
              {[
                { label: "최고 기본 5.0%", sub: "은행 금리" },
                { label: "15.4% 면제", sub: "비과세" },
                { label: "원금 100%", sub: "정부 지원" },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center">
                  <span className="text-[11px] font-black text-slate-800">{item.label}</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter text-slate-400">{item.sub}</span>
                </div>
              ))}
            </div>
            
            <button 
              onClick={onStart}
              className="group w-full py-4 bg-[#2D6A6D] text-white rounded-xl font-black text-base flex items-center justify-center gap-2 shadow-lg hover:bg-[#1f4a4c] transition-all active:scale-[0.98]"
            >
              내 적금 계산하기
              <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <a 
              href="https://www.mnd.go.kr/mbshome/mbs/mnd/subview.jsp?id=mnd_011302060000"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex items-center justify-center gap-1 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <span className="text-[11px] font-bold border-b border-slate-300">장병내일준비적금이란?</span>
              <ChevronRight size={12} strokeWidth={3} />
            </a>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Onboarding;
