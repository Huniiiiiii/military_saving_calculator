import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import data from '../data/data.json';

interface InputPageProps {
  selectedBranchId: string;
  onBranchChange: (id: string) => void;
  months: number;
  onMonthsChange: (val: number) => void;
  onNext: () => void;
  onBack: () => void;
}

const InputPage: React.FC<InputPageProps> = ({
  selectedBranchId,
  onBranchChange,
  months,
  onMonthsChange,
  onNext,
  onBack
}) => {
  const { militaryBranches } = data;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-white flex flex-col items-center overflow-hidden"
    >
      <div className="w-full max-w-[480px] min-h-screen flex flex-col relative bg-white sm:shadow-[0_0_80px_rgba(0,0,0,0.03)]">
        
        {/* Navigation Bar */}
        <header className="w-full h-16 px-4 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-10 border-b border-slate-100/50">
          <button 
            onClick={onBack} 
            className="p-2 text-slate-900"
          >
            <ChevronLeft size={28} strokeWidth={2.5} />
          </button>
          <h1 className="text-[17px] font-bold text-slate-900">복무 정보 입력</h1>
          <div className="w-11" />
        </header>

        <div className="flex-1 w-full px-5 py-6 flex flex-col">
          {/* 1. 군종 선택 */}
          <section className="mb-8">
            <h2 className="text-[13px] font-bold text-slate-500 mb-3 ml-1">군종 선택</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {militaryBranches.map((branch) => {
                const isSelected = selectedBranchId === branch.id;
                const displayName = branch.name.includes('상근예비역') 
                  ? '육군·해병대\n상근예비역' 
                  : branch.name.replace('·', '·\n');

                return (
                  <button
                    key={branch.id}
                    onClick={() => onBranchChange(branch.id)}
                    className={`h-16 rounded-2xl border transition-all flex items-center justify-center font-bold text-center px-2 leading-tight whitespace-pre-line
                      ${isSelected 
                        ? 'border-blue-600 bg-white text-blue-600 shadow-sm' 
                        : 'border-slate-100 bg-slate-50/50 text-slate-400'}`}
                  >
                    <span className={displayName.length > 8 ? 'text-[11px]' : 'text-[13px]'}>
                      {displayName}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2. Blue Card for Months Input */}
          <section className="relative px-1 mt-1">
            <div className="w-full bg-[#1A5CFF] rounded-[2rem] py-6 px-6 flex flex-col items-center shadow-[0_15px_35px_rgba(26,92,255,0.15)]">
              <p className="text-blue-100 text-[10px] font-medium mb-1">자신의 복무기간에 맞는</p>
              <h3 className="text-white text-[15px] font-bold mb-5 text-center">장병내일준비적금<br/>희망 납입 개월을 입력해주세요</h3>
              
              <div className="w-full max-w-[160px] bg-white rounded-2xl py-3 flex flex-col items-center justify-center relative shadow-inner">
                <input
                  type="number"
                  value={months || ''}
                  onChange={(e) => onMonthsChange(Number(e.target.value))}
                  placeholder="00"
                  className="w-full text-center bg-transparent border-none p-0 font-black text-3xl text-[#1A5CFF] focus:ring-0 placeholder:text-blue-100"
                />
                <span className="absolute right-4 bottom-3 text-[10px] font-black text-[#1A5CFF]">개월</span>
              </div>
            </div>
          </section>
        </div>

        {/* Bottom CTA Button */}
        <div className="w-full p-5 pb-8">
          <button
            onClick={onNext}
            disabled={months <= 0}
            className="w-full h-14 bg-[#1A5CFF] text-white rounded-xl font-black text-base shadow-lg hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-30 disabled:grayscale"
          >
            계산하러가기
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default InputPage;
