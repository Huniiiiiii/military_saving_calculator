import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, X, Calendar } from 'lucide-react';

interface DischargeCelebrationPageProps {
  dischargeDate: string;
  onBack: () => void;
  onClose: () => void;
}

const DischargeCelebrationPage: React.FC<DischargeCelebrationPageProps> = ({
  dischargeDate,
  onBack,
  onClose
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen bg-[#F8FAFF] flex flex-col items-center"
    >
      <div className="w-full max-w-[480px] min-h-screen flex flex-col relative bg-[#F8FAFF] sm:shadow-[0_0_80px_rgba(0,0,0,0.03)]">
        {/* Top Navigation */}
        <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] h-16 px-4 flex items-center bg-[#F8FAFF] z-40">
          <button onClick={onBack} className="p-2 text-slate-900 active:scale-90 transition-transform">
            <ChevronLeft size={28} strokeWidth={2.5} />
          </button>
        </header>

        {/* Center Emoji - Positioned lower as requested */}
        <div className="flex-1 flex flex-col items-center justify-center mt-16 ml-12">
          <div className="relative">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                y: [0, -25, 0]
              }}
              transition={{ 
                scale: { type: "spring", damping: 12, stiffness: 200 },
                y: { repeat: Infinity, duration: 3, ease: "easeInOut" }
              }}
              className="text-[180px] leading-none select-none drop-shadow-[0_30px_50px_rgba(0,0,0,0.15)] relative z-10"
            >
              🎉
            </motion.div>
            <motion.div 
              animate={{ 
                scale: [1, 1.5, 1], 
                opacity: [0.2, 0.5, 0.2] 
              }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="absolute inset-0 bg-yellow-400/25 rounded-full blur-[80px] -z-0"
            />
          </div>
        </div>

        {/* Text Content & Close Button - Positioned at the bottom */}
        <div className="w-full px-8 pb-12 flex flex-col items-center">
          <div className="flex flex-col items-center mb-10">
            <h2 className="text-[26px] font-black text-[#191F28] mb-4 leading-tight tracking-tight break-keep text-center whitespace-pre-line">
              전역이<br/>얼마 안 남았어요!
            </h2>

            <p className="text-[#4E5968] text-[16px] font-medium leading-relaxed break-keep tracking-tight text-center whitespace-pre-line mb-8 max-w-[320px]">
              이 적금은 전역이 30일보다 많이 남아야 <br/>새로 가입할 수 있어요.
            </p>

            <div className="flex items-center gap-2.5 px-5 py-2.5 bg-white rounded-full border border-slate-100 shadow-sm">
              <Calendar className="text-[#8B95A1]" size={16} />
              <span className="text-[13px] text-[#8B95A1] font-bold text-center">예상 전역일: </span>
              <span className="text-[13px] text-[#333D4B] font-black">{dischargeDate.replace(/-/g, '. ')}</span>
            </div>
          </div>

          {/* Close Button - Simple Horizontal Layout */}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-[#8B95A1] hover:text-[#4E5968] active:scale-95 transition-all group py-2 px-4"
          >
            <X size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-[17px] font-bold tracking-tight">닫기</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default DischargeCelebrationPage;
