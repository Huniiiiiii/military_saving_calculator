import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Check, Info, ChevronDown, ChevronUp } from 'lucide-react';
import ReactGA from 'react-ga4';
import type { GlobalData } from '../App';
import { calculateResult, getFilteredPrimeRates, getRateVersionForDate, getEffectiveConfig } from '../utils/savingsUtils';
import type { BoxState, Bank, CalcResult } from '../utils/savingsUtils';

interface CalculatorPageProps {
  data: GlobalData;
  selectedBranchId: string;
  months: number;
  openingDate: Date;
  box1: BoxState;
  box2: BoxState;
  setBox1: React.Dispatch<React.SetStateAction<BoxState>>;
  setBox2: React.Dispatch<React.SetStateAction<BoxState>>;
  onBack: () => void;
  onRecommend: () => void;
  onReset: () => void;
  onShowDetails: () => void;
}

const CalculatorPage: React.FC<CalculatorPageProps> = ({
  data,
  selectedBranchId,
  months,
  openingDate,
  box1,
  box2,
  setBox1,
  setBox2,
  onBack,
  onRecommend,
  onReset,
  onShowDetails
}) => {
  const { globalConfigs, banks, militaryBranches } = data;
  const config = getEffectiveConfig(globalConfigs, openingDate.toISOString().split('T')[0]);

  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const currentBranch = militaryBranches.find((b) => b.id === selectedBranchId) || militaryBranches[0];

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const res1 = calculateResult(box1, months, openingDate, banks, config);
  const res2 = calculateResult(box2, months, openingDate, banks, config);

  const formatKRW = (val: number) => new Intl.NumberFormat('ko-KR').format(val);

  const getSelectedGroups = (boxState: BoxState) => {
    const bank = (banks as Bank[]).find(b => b.id === boxState.bankId);
    if (!bank) return [];
    
    const version = getRateVersionForDate(bank, openingDate);
    return version.primeRates
      .filter(p => boxState.selectedPrimeIds.includes(p.id))
      .map(p => p.group);
  };

  const box1Groups = getSelectedGroups(box1);
  const box2Groups = getSelectedGroups(box2);


  const handleAmountInputChange = (boxNum: 1 | 2, value: number) => {
    const otherBox = boxNum === 1 ? box2 : box1;

    if (value > config.max_deposit_per_bank) {
      alert(`한 은행당 최대 ${config.max_deposit_per_bank / 10000}만원까지 납입 가능합니다. (${formatKRW(config.max_deposit_per_bank)}원 초과)`);
      return;
    }

    if (value + otherBox.amount > config.max_total_monthly_deposit) {
      alert(`두 은행 합산 최대 ${config.max_total_monthly_deposit / 10000}만원까지 납입 가능합니다. (${formatKRW(config.max_total_monthly_deposit)}원 초과)`);
      return;
    }

    if (boxNum === 1) {
      setBox1(prev => ({ ...prev, amount: value }));
    } else {
      setBox2(prev => ({ ...prev, amount: value }));
    }
  };

  const renderBankCard = (
    boxState: BoxState, 
    setBox: React.Dispatch<React.SetStateAction<BoxState>>, 
    otherGroups: string[], 
    otherBankId: string,
    res: CalcResult, 
    label: string, 
    color: 'blue' | 'purple',
    boxNum: 1 | 2
  ) => {
    const bank = banks.find(b => b.id === boxState.bankId);
    const badgeBg = color === 'blue' ? 'bg-[#1A5CFF]' : 'bg-[#B035FF]';
    const borderColor = color === 'blue' ? 'border-[#1A5CFF]' : 'border-[#E0B0FF]';
    const textColor = color === 'blue' ? 'text-blue-600' : 'text-purple-600';

    const version = bank ? getRateVersionForDate(bank, openingDate) : null;
    const filteredPrimeRates = bank && version ? getFilteredPrimeRates(bank, months, version) : [];

    const minRequiredMonths = version && version.primeRates.length > 0
      ? Math.min(...version.primeRates.map(p => p.min_months || 0))
      : 0;

    return (
      <div className={`w-full rounded-[1.5rem] border-2 ${borderColor} p-5 mb-5 bg-white shadow-sm`}>
        <div className="flex justify-between items-start mb-3">
          <span className={`${badgeBg} text-white text-[9px] font-bold px-2 py-0.5 rounded-full`}>
            은행 {label}
          </span>
          <div className="text-right">
            <span className={`text-[12px] font-bold ${textColor}`}>
              {bank ? `기본 ${(res.baseRate * 100).toFixed(1)}% + 우대 ${(res.primeRate * 100).toFixed(1)}%` : '은행을 선택해주세요'}
            </span>
          </div>
        </div>

        <div className="mb-4 relative">
          <p className="text-slate-400 text-[10px] font-medium mb-1.5 ml-1">저축 은행</p>
          <div className="relative group">
            {bank && (
              <div className="absolute inset-0 flex items-center px-3 pointer-events-none text-base font-bold text-slate-800 z-10">
                {bank.name}
              </div>
            )}
            <select 
              value={boxState.bankId} 
              onChange={(e) => setBox(prev => ({ ...prev, bankId: e.target.value, selectedPrimeIds: [] }))}
              className={`w-full appearance-none rounded-xl p-3 pr-10 text-base font-bold outline-none transition-all cursor-pointer border
                ${boxState.bankId === '' ? 'text-slate-400' : 'text-transparent'}
                ${color === 'blue' 
                  ? 'bg-blue-50/30 border-blue-100 hover:border-blue-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50' 
                  : 'bg-purple-50/30 border-purple-100 hover:border-purple-300 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-100/50'
                }`}
            >
              <option value="" disabled>은행 선택</option>
              {banks.map(b => {
                const v = getRateVersionForDate(b, openingDate);
                const maxPrimePct = (v.maxPrimeRate * 100).toFixed(1);
                return (
                  <option key={b.id} value={b.id} disabled={b.id === otherBankId} className="text-slate-800">
                    {b.name} [최대 우대 {maxPrimePct}%] {b.id === otherBankId ? '(선택됨)' : ''}
                  </option>
                );
              })}
            </select>
            <div className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors 
              ${color === 'blue' ? 'text-blue-400 group-focus-within:text-blue-600' : 'text-purple-400 group-focus-within:text-purple-600'}`}
            >
              <ChevronDown size={18} />
            </div>
          </div>
        </div>

        <div className="mb-5">
          <p className="text-slate-400 text-[10px] font-medium mb-2 ml-1">월 납입 금액 입력</p>
          <div className="relative group">
            <input 
              type="number"
              value={boxState.amount || ''}
              onChange={(e) => handleAmountInputChange(boxNum, Number(e.target.value))}
              placeholder="0"
              className={`w-full bg-slate-50 border border-slate-100 rounded-xl p-3 pr-10 text-lg font-black text-slate-900 outline-none transition-all placeholder:text-slate-300 focus:bg-white focus:border-${color === 'blue' ? 'blue-500' : 'purple-500'} focus:shadow-md focus:ring-4 ${color === 'blue' ? 'focus:ring-blue-50' : 'focus:ring-purple-50'}`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 pointer-events-none group-focus-within:text-slate-900 transition-colors">원</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center mb-1 px-1">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-tight">우대금리 조건</p>
            {bank && version && (
              <span className="text-[10px] font-bold text-slate-400">
                최대 +{(version.maxPrimeRate * 100).toFixed(1)}%
              </span>
            )}
          </div>

          {!bank ? (
             <div className="p-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-center">
               <p className="text-[11px] font-bold text-slate-400">은행을 먼저 선택해주세요</p>
             </div>
          ) : (minRequiredMonths > 0 && months < minRequiredMonths) ? (
            <div className="p-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-center">
              <p className="text-[11px] font-bold text-slate-400">{minRequiredMonths}개월 미만은 해당사항 없음</p>
            </div>
          ) : (
            filteredPrimeRates.map(prime => {
              const isGroupDisabled = otherGroups.includes(prime.group);
              const isSelected = boxState.selectedPrimeIds.includes(prime.id);
              const isExpanded = expandedIds.includes(prime.id);
              
              return (
                <div key={prime.id} className="flex flex-col">
                  <label 
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer
                      ${isGroupDisabled ? 'bg-slate-50 border-transparent opacity-50 cursor-not-allowed' : 
                        isSelected ? 'bg-white border-slate-100 shadow-sm' : 'bg-slate-50/50 border-transparent'}`}
                  >
                    <div className="relative shrink-0 mt-0.5">
                      <input 
                        type="checkbox" 
                        disabled={isGroupDisabled} 
                        checked={isSelected} 
                        onChange={(e) => {
                          const next = e.target.checked 
                            ? [...boxState.selectedPrimeIds, prime.id] 
                            : boxState.selectedPrimeIds.filter(id => id !== prime.id);
                          setBox(prev => ({ ...prev, selectedPrimeIds: next }));
                        }}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all
                        ${isSelected ? `bg-[#1A5CFF] border-[#1A5CFF]` : 'bg-white border-slate-200'}`}
                      >
                        {isSelected && <Check size={14} color="white" strokeWidth={4} />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className={`text-[12px] font-bold ${isGroupDisabled ? 'text-slate-400' : 'text-slate-700'}`}>
                          {prime.label} ({(prime.rate * 100).toFixed(1)}%)
                        </span>
                        {prime.footnotes && !isGroupDisabled && (
                          <button 
                            onClick={(e) => toggleExpand(prime.id, e)}
                            className="p-1 text-slate-400 hover:text-slate-600"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        )}
                      </div>
                      {isGroupDisabled && (
                        <p className="text-[9px] text-red-400 font-medium">타행 중복 불가</p>
                      )}
                    </div>
                  </label>
                  
                  <AnimatePresence>
                    {isExpanded && prime.footnotes && !isGroupDisabled && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-11 pb-3 pt-1 space-y-1">
                          {prime.footnotes.map((note, idx) => (
                            <div key={idx} className="flex gap-1 text-[9px] text-slate-400 font-medium leading-normal">
                              <span className="shrink-0">•</span>
                              <span className="flex-1">{note}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const isAnyBankNotSelected = box1.bankId === '' || box2.bankId === '';

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen bg-[#F8FAFF] flex flex-col items-center"
    >
      <div className="w-full max-w-[480px] min-h-screen flex flex-col relative bg-[#F8FAFF] sm:shadow-[0_0_80px_rgba(0,0,0,0.03)]">
        
        {/* Header */}
        <header className="w-full h-16 px-4 flex items-center justify-between sticky top-0 bg-[#F8FAFF] z-30 border-b border-slate-200 shadow-sm">
          <button onClick={onBack} className="p-2 text-slate-900">
            <ChevronLeft size={28} strokeWidth={2.5} />
          </button>
          <h1 className="text-[17px] font-bold text-slate-900">군적금 계산기</h1>
          <button onClick={onReset} className="text-[14px] font-bold text-blue-600 px-2">
            초기화
          </button>
        </header>

        {/* Content (Scrollable) */}
        <div className="flex-1 px-4 py-4 pb-80">
          <div className="flex flex-col mb-2 ml-1">
            <p className="text-[12px] font-bold text-slate-500">
              입대일: {openingDate.toISOString().split('T')[0]}
            </p>
          </div>

          {/* User Selection Summary */}
          <div className="mb-4 flex items-center justify-between bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">

            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-0.5">선택한 복무 정보</span>
              <h2 className="text-[13px] font-black text-slate-900 leading-tight">
                {currentBranch.name} <span className="text-blue-600 ml-1">· {months}개월 납입</span>
              </h2>
            </div>
            <button 
              onClick={onBack}
              className="px-3 py-2 bg-slate-50 text-slate-500 rounded-lg text-[11px] font-bold hover:bg-slate-100 transition-colors"
            >
              정보 수정
            </button>
          </div>

          {/* Top Explanation Banner */}
          <div className="mb-5 bg-blue-50/70 border border-blue-100 rounded-xl p-3.5 flex gap-2.5 items-center">
            <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600 shrink-0">
              <Info size={16} />
            </div>
            <p className="text-[12px] font-bold text-blue-800 leading-tight">
              은행당 최대 {config.max_deposit_per_bank / 10000}만원, 합계 최대 {config.max_total_monthly_deposit / 10000}만원 가능
            </p>
          </div>

          {renderBankCard(box1, setBox1, box2Groups, box2.bankId, res1, "A", "blue", 1)}
          {renderBankCard(box2, setBox2, box1Groups, box1.bankId, res2, "B", "purple", 2)}
        </div>

        {/* Flush Result Panel at the Bottom */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-20">
          <div className="bg-white rounded-t-[2rem] p-5 pb-8 shadow-[0_-15px_40px_rgba(0,0,0,0.1)] border-t border-slate-50">
            <div className="flex flex-col mb-4 px-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold text-xs">총 예상 만기 수령액</span>
                <span className="text-2xl font-black text-[#1A5CFF]">
                  {formatKRW(res1.total + res2.total)}원
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={onRecommend}
                className="w-full h-14 bg-white border-2 border-blue-600 text-blue-600 rounded-xl font-black text-base shadow-sm hover:bg-blue-50 transition-all active:scale-[0.98]"
              >
                은행 추천받기
              </button>
              <button 
                onClick={() => {
                  if (import.meta.env.PROD) {
                    ReactGA.event({
                      category: 'User',
                      action: 'calculator_show_details_click',
                      label: '상세 분석 보기'
                    });
                  }
                  onShowDetails();
                }}
                disabled={isAnyBankNotSelected}
                className={`w-full h-14 rounded-xl font-bold text-base shadow-lg active:scale-[0.98] transition-all
                  ${isAnyBankNotSelected ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-[#0F172A] text-white'}`}
              >
                {isAnyBankNotSelected ? '은행을 선택해주세요' : '상세 분석 보기'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CalculatorPage;
