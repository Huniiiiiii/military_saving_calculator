import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Check, Calendar as CalendarIcon } from 'lucide-react';
import type { GlobalData } from '../App';
import { calculateDischargeDate, calculateCalendarMonths } from '../utils/savingsUtils';

interface InputPageProps {
  data: GlobalData;
  selectedBranchId: string;
  onBranchChange: (id: string) => void;
  months: number;
  onMonthsChange: (val: number) => void;
  enlistmentDate: string;
  onEnlistmentDateChange: (date: string) => void;
  isJoined: boolean;
  onIsJoinedChange: (val: boolean) => void;
  joinDate: string;
  onJoinDateChange: (date: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const InputPage: React.FC<InputPageProps> = ({
  data,
  selectedBranchId,
  onBranchChange,
  months,
  onMonthsChange,
  enlistmentDate,
  onEnlistmentDateChange,
  isJoined,
  onIsJoinedChange,
  joinDate,
  onJoinDateChange,
  onNext,
  onBack
}) => {
  const { militaryBranches } = data;

  const todayStr = new Date().toISOString().split('T')[0];
  const isEnlisted = enlistmentDate < todayStr;

  // Filter branches based on the selected enlistment date or today
  const effectiveBranches = React.useMemo(() => {
    const targetDate = (!isEnlisted || !isJoined) ? todayStr : joinDate;
    
    // Group by branch 'id' and find the latest version where effective_day <= targetDate
    const branchIds = Array.from(new Set(militaryBranches.map(b => b.id)));
    
    const effective = branchIds.map(id => {
      const versions = militaryBranches
        .filter(b => b.id === id && b.effective_day <= targetDate)
        .sort((a, b) => b.effective_day.localeCompare(a.effective_day));
      
      if (versions.length === 0) {
        return militaryBranches
          .filter(b => b.id === id)
          .sort((a, b) => a.effective_day.localeCompare(b.effective_day))[0];
      }
      return versions[0];
    }).filter(Boolean);

    return effective.sort((a, b) => a.display_order - b.display_order);
  }, [militaryBranches, isEnlisted, isJoined, todayStr, joinDate]);

  const currentBranch = effectiveBranches.find(b => b.id === selectedBranchId) || effectiveBranches[0];
  
  // Calculate Discharge Date and Max Months
  const dischargeDateObj = calculateDischargeDate(enlistmentDate, currentBranch?.max_months || 18);
  const dischargeDateStr = dischargeDateObj.toISOString().split('T')[0];
  
  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  
  // 30-day rule check
  const diffTime = dischargeDateObj.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isEligible = diffDays >= 30;

  // Max months calculation
  const maxPossibleMonths = React.useMemo(() => {
    // 가입 전이라면 입대일과 오늘 중 늦은 날짜를 시작일로 봄 (입대 전 가입 불가 원칙)
    const calculationStart = (!isEnlisted || !isJoined) 
      ? (new Date(enlistmentDate) > today ? new Date(enlistmentDate) : today)
      : new Date(joinDate);
    
    calculationStart.setHours(0, 0, 0, 0);
    
    const calendarMonths = calculateCalendarMonths(calculationStart, dischargeDateObj);
    
    // 달력상 개월 수가 복무 기간을 초과할 수 없도록 제한
    return Math.min(calendarMonths, currentBranch?.max_months || 18);
  }, [isEnlisted, isJoined, today, enlistmentDate, joinDate, dischargeDateObj, currentBranch]);

  // 군종이나 날짜가 변경되어 최대 가능 개월수가 바뀌면, 자동으로 해당 값을 기본값으로 설정합니다.
  // "최대 납입가능 개월이 항상 나오도록 기본으로" 요청 사항 반영
  React.useEffect(() => {
    onMonthsChange(maxPossibleMonths);
  }, [maxPossibleMonths, selectedBranchId, onMonthsChange]);

  // Update selected branch if needed
  React.useEffect(() => {
    if (!effectiveBranches.find(b => b.id === selectedBranchId) && effectiveBranches.length > 0) {
      onBranchChange(effectiveBranches[0].id);
    }
  }, [effectiveBranches, onBranchChange, selectedBranchId]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-[#F8FAFF] flex flex-col items-center overflow-hidden"
    >
      <div className="w-full max-w-[480px] min-h-screen flex flex-col relative bg-[#F8FAFF] sm:shadow-[0_0_80px_rgba(0,0,0,0.03)]">
        
        {/* Navigation Bar - Fixed */}
        <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] h-16 px-4 flex items-center justify-between bg-[#F8FAFF] z-40 border-b border-slate-200 shadow-sm">
          <button 
            onClick={onBack} 
            className="p-2 text-slate-900"
          >
            <ChevronLeft size={28} strokeWidth={2.5} />
          </button>
          <h1 className="text-[17px] font-bold text-slate-900">복무 정보 입력</h1>
          <div className="w-11" />
        </header>

        <div className="flex-1 w-full px-5 pt-20 pb-40 flex flex-col overflow-y-auto">
          {/* 1. 군종 선택 */}
          <section className="mb-8">
            <h2 className="text-[13px] font-bold text-slate-500 mb-3 ml-1">군종 선택</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {effectiveBranches.map((branch) => {
                const isSelected = selectedBranchId === branch.id;
                const displayName = branch.name.includes('상근예비역') 
                  ? '육군·해병대\n상근예비역' 
                  : branch.name.replace('·', '·\n');

                return (
                  <button
                    key={branch.id}
                    onClick={() => {
                      onBranchChange(branch.id);
                    }}
                    className={`h-16 rounded-2xl border transition-all flex items-center justify-center font-bold text-center px-2 leading-tight whitespace-pre-line
                      ${isSelected 
                        ? 'border-[#2272eb] bg-white text-[#2272eb] shadow-sm' 
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

          {/* 2. 입대일/가입일 선택 */}
          <section className="mb-6">
            <h2 className="text-[13px] font-bold text-slate-500 mb-3 ml-1">입대일</h2>
            <div className="relative group">
              {/* 날짜 표시용 가짜 인풋 (비주얼 일관성용) */}
              <div className="absolute inset-0 w-full h-14 bg-white border border-slate-100 rounded-2xl px-5 flex items-center justify-between font-bold text-slate-900 pointer-events-none group-focus-within:ring-2 group-focus-within:ring-[#2272eb] group-focus-within:border-transparent transition-all shadow-sm">
                <span>{enlistmentDate ? enlistmentDate.replace(/-/g, '. ') : '날짜를 선택하세요'}</span>
                <CalendarIcon size={20} className="text-slate-400" />
              </div>
              {/* 실제 입력을 받는 히든 인풋 */}
              <input
                type="date"
                value={enlistmentDate}
                min="2026-03-30"
                onChange={(e) => {
                  const val = e.target.value;
                  if (val && val < '2026-03-30') {
                    alert('2026년 3월 30일 이전 날짜는 선택할 수 없습니다.');
                    return;
                  }
                  onEnlistmentDateChange(val);
                  if (val >= todayStr) {
                    onIsJoinedChange(false);
                  }
                }}
                className="w-full h-14 opacity-0 cursor-pointer relative z-10"
              />
              <p className="mt-2 ml-1 text-[11px] text-slate-400 leading-relaxed">
                * 가입 시점의 금리를 기준으로 계산하기 위해 필요해요.<br/>
                (2026년 3월 30일 이후 입대자만 지원해요.)
              </p>
            </div>
          </section>

          {/* 2-1. 이미 가입 여부 (입대자만 노출) */}
          {isEnlisted && (
            <section className="mb-8">
              <label className="flex items-center gap-3 mb-4 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isJoined}
                    onChange={(e) => onIsJoinedChange(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center
                    ${isJoined ? 'bg-[#2272eb] border-[#2272eb]' : 'bg-white border-slate-200'}`}>
                    {isJoined && <Check size={16} color="white" strokeWidth={4} />}
                  </div>
                </div>
                <span className="text-[14px] font-bold text-slate-700">이미 적금에 가입하셨나요?</span>
              </label>

              {isJoined && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <h2 className="text-[13px] font-bold text-slate-500 mb-3 ml-1">적금 가입일</h2>
                  <div className="relative group">
                    <div className="absolute inset-0 w-full h-14 bg-white border border-slate-100 rounded-2xl px-5 flex items-center justify-between font-bold text-slate-900 pointer-events-none group-focus-within:ring-2 group-focus-within:ring-[#2272eb] group-focus-within:border-transparent transition-all shadow-sm">
                      <span>{joinDate ? joinDate.replace(/-/g, '. ') : '날짜를 선택하세요'}</span>
                      <CalendarIcon size={20} className="text-slate-400" />
                    </div>
                    <input
                      type="date"
                      value={joinDate}
                      max={todayStr}
                      min={enlistmentDate}
                      onChange={(e) => onJoinDateChange(e.target.value)}
                      className="w-full h-14 opacity-0 cursor-pointer relative z-10"
                    />
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 30일 규정 경고 */}
          {!isEligible && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col gap-1">
              <p className="text-red-600 font-bold text-[13px]">가입 불가 안내</p>
              <p className="text-red-500 text-[12px] leading-relaxed">
                전역까지 30일 미만으로 남아 신규 가입이 불가능합니다.<br/>
                (예상 전역일: {dischargeDateStr})
              </p>
            </div>
          )}

          {/* 3. Blue Card for Months Input */}
          <section className="relative px-1 mt-1">
            <div className="w-full bg-[#2272eb] rounded-[2rem] py-6 px-6 flex flex-col items-center shadow-[0_15px_35px_rgba(26,92,255,0.15)]">
              <p className="text-blue-100 text-[10px] font-medium mb-1">자신의 복무기간에 맞는</p>
              <h3 className="text-white text-[15px] font-bold mb-5 text-center">
                {isJoined ? '선택하신 납입 개월을 입력해주세요' : (
                  <>
                    장병내일준비적금<br/>희망 납입 개월을 입력해주세요
                  </>
                )}
              </h3>
              
              <div className="w-full max-w-[160px] bg-white rounded-2xl py-3 flex flex-col items-center justify-center relative shadow-inner">
                <input
                  type="number"
                  value={months || ''}
                  max={maxPossibleMonths}
                  min={1}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val > maxPossibleMonths) {
                      onMonthsChange(maxPossibleMonths);
                    } else {
                      onMonthsChange(val);
                    }
                  }}
                  placeholder="00"
                  className="w-full text-center bg-transparent border-none p-0 font-black text-3xl text-[#2272eb] focus:ring-0 placeholder:text-blue-100"
                />
                <span className="absolute right-4 bottom-3 text-[10px] font-black text-[#2272eb]">개월</span>
              </div>
              <p className="mt-3 text-blue-200 text-[11px] font-bold">
                최대 {maxPossibleMonths}개월 납입 가능
              </p>
            </div>
          </section>
        </div>

        {/* Bottom CTA Button - Fixed */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] p-5 pb-8 space-y-3 bg-[#F8FAFF]/95 backdrop-blur-sm z-30 border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
          <button
            onClick={onNext}
            disabled={months <= 0 || !isEligible}
            className="w-full h-14 bg-[#2272eb] text-white rounded-xl font-black text-base shadow-lg hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-30 disabled:grayscale"
          >
            적금 계산하기
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default InputPage;
