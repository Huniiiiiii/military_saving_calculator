import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Check, Info, Sparkles, Building2, UserCheck, Zap, HelpCircle } from 'lucide-react';
import ReactGA from 'react-ga4';
import { data } from '../data/data';
import { calculateResult, getFilteredPrimeRates } from '../utils/savingsUtils';
import type { BoxState, Bank } from '../utils/savingsUtils';

export interface RecommendationResult {
  isRecommended: boolean;
  box1: BoxState;
  box2: BoxState;
  hanaSalary: boolean;
  housingBankName: string;
  isSociallyVulnerable: boolean;
}

interface RecommendationPageProps {
  months: number;
  onBack: () => void;
  onComplete: (result: RecommendationResult) => void;
}

const RecommendationPage: React.FC<RecommendationPageProps> = ({
  months,
  onBack,
  onComplete
}) => {
  // --- States ---
  const [step, setStep] = useState(1);
  const [hasHousing, setHasHousing] = useState<boolean | null>(null);
  const [housingBankId, setHousingBankId] = useState<string>(''); 
  const [isSociallyVulnerable, setIsSociallyVulnerable] = useState(false);
  const [hanaSalary, setHanaSalary] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { banks } = data;

  const handleStartAnalysis = () => {
    if (import.meta.env.PROD) {
      ReactGA.event({
        category: 'AI_Recommendation',
        action: 'start_analysis',
        label: `hanaSalary_${hanaSalary}_social_${isSociallyVulnerable}`
      });
    }
    
    setIsLoading(true);
    setTimeout(() => {
      const bestCombination = findBestCombination();
      const housingBank = banks.find(b => b.id === housingBankId);
      const housingBankName = hasHousing ? (housingBank ? housingBank.name : '타행/기타') : '없음(신규가입 추천)';

      onComplete({
        isRecommended: true,
        ...bestCombination,
        hanaSalary: !!hanaSalary,
        housingBankName,
        isSociallyVulnerable
      });
    }, 2000);
  };

  const findBestCombination = () => {
    // Helper to get optimal prime rate IDs for a bank
    const getOptimalIds = (bank: Bank, canTakeSalary: boolean, canTakeHousing: boolean) => {
      const filtered = getFilteredPrimeRates(bank, months);
      return filtered
        .filter(p => {
          if (p.group === 'salary') return canTakeSalary;
          if (p.group === 'housing') return canTakeHousing;
          if (p.group.includes('social_vulnerable')) return isSociallyVulnerable;
          return true;
        })
        .map(p => p.id);
    };

    if (hanaSalary) {
      // 1. Hana Bank is fixed as one bank
      const bankHana = banks.find(b => b.id === 'hana') as Bank;
      
      // Hana Bank MUST take salary prime
      
      // We'll evaluate the second bank first to see where housing fits best if hasHousing is false
      let overallBest = {
        box1: null as BoxState | null,
        box2: null as BoxState | null,
        totalMaturity: 0
      };

      banks.forEach(otherBank => {
        if (otherBank.id === 'hana') return;

        const simulateHousing = (housingToHana: boolean) => {
          const idsHana = getOptimalIds(bankHana, true, housingToHana);
          const idsOther = getOptimalIds(otherBank, false, !housingToHana && (hasHousing ? housingBankId === otherBank.id : true));

          const resHana = calculateResult({ bankId: 'hana', amount: 10000, selectedPrimeIds: idsHana }, months);
          const resOther = calculateResult({ bankId: otherBank.id, amount: 10000, selectedPrimeIds: idsOther }, months);

          const rateHana = resHana.baseRate + resHana.primeRate;
          const rateOther = resOther.baseRate + resOther.primeRate;

          const amtHana = rateHana >= rateOther ? 300000 : 250000;
          const amtOther = rateHana >= rateOther ? 250000 : 300000;

          const finalHana = calculateResult({ bankId: 'hana', amount: amtHana, selectedPrimeIds: idsHana }, months);
          const finalOther = calculateResult({ bankId: otherBank.id, amount: amtOther, selectedPrimeIds: idsOther }, months);

          return {
            total: finalHana.total + finalOther.total,
            box1: rateHana >= rateOther ? { bankId: 'hana', amount: amtHana, selectedPrimeIds: idsHana } : { bankId: otherBank.id, amount: amtOther, selectedPrimeIds: idsOther },
            box2: rateHana >= rateOther ? { bankId: otherBank.id, amount: amtOther, selectedPrimeIds: idsOther } : { bankId: 'hana', amount: amtHana, selectedPrimeIds: idsHana }
          };
        };

        let scenario;
        if (hasHousing) {
          scenario = simulateHousing(housingBankId === 'hana');
        } else {
          // If no housing, try putting housing in either bank and pick best
          const s1 = simulateHousing(true);
          const s2 = simulateHousing(false);
          scenario = s1.total > s2.total ? s1 : s2;
        }

        if (scenario.total > overallBest.totalMaturity) {
          overallBest = {
            box1: scenario.box1,
            box2: scenario.box2,
            totalMaturity: scenario.total
          };
        }
      });

      return { box1: overallBest.box1!, box2: overallBest.box2! };

    } else {
      // 2. No fixed Hana Bank salary. Find absolute best.
      const bankPairs: [Bank, Bank][] = [];
      for (let i = 0; i < banks.length; i++) {
        for (let j = i + 1; j < banks.length; j++) {
          bankPairs.push([banks[i], banks[j]] as [Bank, Bank]);
        }
      }

      let overallBest = {
        box1: null as BoxState | null,
        box2: null as BoxState | null,
        totalMaturity: 0
      };

      bankPairs.forEach(([bankA, bankB]) => {
        const simulateScenario = (salaryAtA: boolean, housingAtA: boolean) => {
          // Re-adjust housing if hasHousing is true to be strict
          const actualHousingAtA = hasHousing ? (housingBankId === bankA.id) : housingAtA;
          const actualHousingAtB = hasHousing ? (housingBankId === bankB.id) : !housingAtA;
          
          const finalIdsA = getOptimalIds(bankA, salaryAtA, actualHousingAtA);
          const finalIdsB = getOptimalIds(bankB, !salaryAtA, actualHousingAtB);

          const resA = calculateResult({ bankId: bankA.id, amount: 10000, selectedPrimeIds: finalIdsA }, months);
          const resB = calculateResult({ bankId: bankB.id, amount: 10000, selectedPrimeIds: finalIdsB }, months);

          const rateA = resA.baseRate + resA.primeRate;
          const rateB = resB.baseRate + resB.primeRate;

          const amtA = rateA >= rateB ? 300000 : 250000;
          const amtB = rateA >= rateB ? 250000 : 300000;

          const finalA = calculateResult({ bankId: bankA.id, amount: amtA, selectedPrimeIds: finalIdsA }, months);
          const finalB = calculateResult({ bankId: bankB.id, amount: amtB, selectedPrimeIds: finalIdsB }, months);

          return {
            total: finalA.total + finalB.total,
            box1: rateA >= rateB ? { bankId: bankA.id, amount: amtA, selectedPrimeIds: finalIdsA } : { bankId: bankB.id, amount: amtB, selectedPrimeIds: finalIdsB },
            box2: rateA >= rateB ? { bankId: bankB.id, amount: amtB, selectedPrimeIds: finalIdsB } : { bankId: bankA.id, amount: amtA, selectedPrimeIds: finalIdsA }
          };
        };

        const scenarios = [];
        if (hasHousing) {
          scenarios.push(simulateScenario(true, housingBankId === bankA.id));
          scenarios.push(simulateScenario(false, housingBankId === bankA.id));
        } else {
          // Try all 4 combinations of salary (A/B) and housing (A/B)
          scenarios.push(simulateScenario(true, true));
          scenarios.push(simulateScenario(true, false));
          scenarios.push(simulateScenario(false, true));
          scenarios.push(simulateScenario(false, false));
        }

        scenarios.forEach(s => {
          if (s.total > overallBest.totalMaturity) {
            overallBest = {
              box1: s.box1,
              box2: s.box2,
              totalMaturity: s.total
            };
          }
        });
      });

      return { box1: overallBest.box1!, box2: overallBest.box2! };
    }
  };

  const handleNext = () => {
    if (import.meta.env.PROD) {
      ReactGA.event({ category: 'AI_Recommendation', action: `step_${step}_complete`, label: `step_${step}` });
    }
    if (step === 1) {
      if (hasHousing) setStep(2);
      else setStep(3);
    } else if (step < 4) {
      setStep(step + 1);
    } else {
      handleStartAnalysis();
    }
  };

  const handleBack = () => {
    if (step === 1) onBack();
    else if (step === 3 && !hasHousing) setStep(1);
    else setStep(step - 1);
  };

  const stepContent = [
    {
      id: 1,
      title: "현재 주택청약\n통장이 있으신가요?",
      description: "청약 여부에 따라 우대 금리 전략이 달라져요.",
      icon: <HelpCircle className="text-blue-500" size={24} />,
      content: (
        <div className="grid grid-cols-1 gap-4">
          <button onClick={() => setHasHousing(true)} className={`py-6 rounded-2xl border-2 flex items-center justify-between px-6 transition-all ${hasHousing === true ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-white'}`}>
            <span className={`font-bold ${hasHousing === true ? 'text-blue-700' : 'text-slate-900'}`}>네, 있어요</span>
            {hasHousing === true && <Check size={20} className="text-blue-500" strokeWidth={3} />}
          </button>
          <button onClick={() => setHasHousing(false)} className={`py-6 rounded-2xl border-2 flex items-center justify-between px-6 transition-all ${hasHousing === false ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-white'}`}>
            <span className={`font-bold ${hasHousing === false ? 'text-blue-700' : 'text-slate-900'}`}>아니오, 없어요</span>
            {hasHousing === false && <Check size={20} className="text-blue-500" strokeWidth={3} />}
          </button>
        </div>
      )
    },
    {
      id: 2,
      title: "청약 통장이 있는\n은행을 선택해주세요.",
      description: "해당 은행 이용 시 우대 금리 혜택이 있어요.",
      icon: <Building2 className="text-blue-500" size={24} />,
      content: (
        <div className="grid grid-cols-1 gap-3">
          <select value={housingBankId} onChange={(e) => setHousingBankId(e.target.value)} className="w-full py-6 bg-white border-2 border-slate-100 rounded-2xl px-5 font-bold text-slate-400 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer">
            <option value="" disabled>은행 선택</option>
            {banks.map(bank => <option key={bank.id} value={bank.id} className="text-slate-800">{bank.name}</option>)}
            <option value="none" className="text-slate-800">타행이용</option>
          </select>
        </div>
      )
    },
    {
      id: 3,
      title: "기초생활수급자\n대상자이신가요?",
      description: "증빙이 가능한 경우 높은 우대 금리가 적용돼요.",
      icon: <UserCheck className="text-purple-500" size={24} />,
      content: (
        <div className="flex flex-col gap-4">
          <button onClick={() => setIsSociallyVulnerable(!isSociallyVulnerable)} className={`w-full py-6 rounded-2xl border-2 flex items-center justify-between px-6 transition-all ${isSociallyVulnerable ? 'border-purple-500 bg-purple-50' : 'border-slate-100 bg-white'}`}>
            <span className={`font-bold ${isSociallyVulnerable ? 'text-purple-700' : 'text-slate-400'}`}>기초생활수급자 증빙 가능</span>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSociallyVulnerable ? 'bg-purple-500 border-purple-500' : 'border-slate-200'}`}>{isSociallyVulnerable && <Check size={14} color="white" strokeWidth={4} />}</div>
          </button>
        </div>
      )
    },
    {
      id: 4,
      title: "하나은행으로\n군급여를 받으시나요?",
      description: "하나 나라사랑카드 이용 시 혜택이 강화돼요.",
      icon: <Zap className="text-orange-500" size={24} />,
      content: (
        <div className="grid grid-cols-1 gap-4">
          <button onClick={() => setHanaSalary(true)} className={`py-6 rounded-2xl border-2 flex items-center justify-between px-6 transition-all ${hanaSalary === true ? 'border-orange-500 bg-orange-50' : 'border-slate-100 bg-white'}`}>
            <span className={`font-bold ${hanaSalary === true ? 'text-orange-700' : 'text-slate-900'}`}>네, 하나은행으로 받아요</span>
            {hanaSalary === true && <Check size={20} className="text-orange-500" strokeWidth={3} />}
          </button>
          <button onClick={() => setHanaSalary(false)} className={`py-6 rounded-2xl border-2 flex items-center justify-between px-6 transition-all ${hanaSalary === false ? 'border-orange-500 bg-orange-50' : 'border-slate-100 bg-white'}`}>
            <span className={`font-bold ${hanaSalary === false ? 'text-orange-700' : 'text-slate-900'}`}>아니오, 다른 은행이에요</span>
            {hanaSalary === false && <Check size={20} className="text-orange-500" strokeWidth={3} />}
          </button>
        </div>
      )
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-10">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-blue-50 border-t-blue-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center"><Sparkles className="text-blue-500 animate-pulse" size={32} /></div>
          </div>
        </motion.div>
        <h2 className="text-2xl font-black text-slate-900 mb-4 break-keep">사용자의 조건으로<br/>주요 은행 데이터를 분석하고 있어요...</h2>
        <p className="text-slate-400 font-medium animate-pulse">최적의 이자 수익 조합을 계산하고 있어요</p>
      </div>
    );
  }

  const currentStepData = stepContent.find(s => s.id === step)!;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="min-h-screen bg-[#F8FAFF] flex flex-col items-center">
      <div className="w-full max-w-[480px] min-h-screen flex flex-col relative bg-[#F8FAFF] sm:shadow-[0_0_80px_rgba(0,0,0,0.03)]">
        <header className="w-full h-16 px-4 flex items-center justify-between sticky top-0 bg-[#F8FAFF] z-30 border-b border-slate-200 shadow-sm">
          <button onClick={handleBack} className="p-2 text-slate-900"><ChevronLeft size={28} strokeWidth={2.5} /></button>
          <div className="flex gap-1.5">{[1, 2, 3, 4].map(i => <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${step === i ? 'w-6 bg-blue-500' : 'bg-slate-200'}`} />)}</div>
          <div className="w-11" />
        </header>
        <div className="flex-1 px-6 py-6 flex flex-col">
          <div className="mb-10">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6">{currentStepData.icon}</div>
            <h2 className="text-2xl font-black text-slate-900 leading-tight whitespace-pre-line mb-3">{currentStepData.title}</h2>
            <p className="text-slate-500 font-medium">{currentStepData.description}</p>
          </div>
          <AnimatePresence mode="wait"><motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="flex-1">{currentStepData.content}</motion.div></AnimatePresence>
          <div className="mt-auto pt-10">
            <button
              onClick={handleNext}
              disabled={(step === 1 && hasHousing === null) || (step === 2 && housingBankId === '') || (step === 4 && hanaSalary === null)}
              className="w-full h-16 bg-[#1A5CFF] text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-200 hover:bg-blue-600 active:scale-[0.98] transition-all disabled:opacity-30"
            >
              {step === 4 ? "분석 시작하기" : "다음으로"}
            </button>
            <div className="mt-4 flex items-center justify-center gap-2 text-slate-400">
              <Info size={14} /><span className="text-[11px] font-bold tracking-tight">입력하신 정보는 오직 추천에만 활용돼요.</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default RecommendationPage;
