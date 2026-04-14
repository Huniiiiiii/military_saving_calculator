import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Check, Info, Sparkles, Building2, UserCheck, Zap, HelpCircle, Utensils, Smartphone, Film, Shield, Car } from 'lucide-react';
import ReactGA from 'react-ga4';
import type { GlobalData } from '../App';
import { calculateResult, getFilteredPrimeRates, getRateVersionForDate, getEffectiveConfig } from '../utils/savingsUtils';
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
  data: GlobalData;
  months: number;
  openingDate: Date;
  onBack: () => void;
  onComplete: (result: RecommendationResult) => void;
}

const RecommendationPage: React.FC<RecommendationPageProps> = ({
  data,
  months,
  openingDate,
  onBack,
  onComplete
}) => {
  // --- States ---
  const [step, setStep] = useState(1);
  const [hasHousing, setHasHousing] = useState<boolean | null>(null);
  const [wantsNewHousing, setWantsNewHousing] = useState(true);
  const [showHousingSheet, setShowHousingSheet] = useState(false);
  const [housingBankId, setHousingBankId] = useState<string>(''); 
  const [isSociallyVulnerable, setIsSociallyVulnerable] = useState(false);
  const [hanaSalary, setHanaSalary] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { banks, globalConfigs } = data;
  const config = getEffectiveConfig(globalConfigs, openingDate.toISOString().split('T')[0]);

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
      const housingBank = banks.find((b) => b.id === housingBankId);
      const housingBankName = hasHousing 
        ? (housingBank ? housingBank.name : '타행/기타') 
        : (wantsNewHousing ? '없음(신규가입 추천)' : '없음(우대금리 미포함)');

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
    const primaryAmount = config.max_deposit_per_bank;
    const secondaryAmount = config.max_total_monthly_deposit - config.max_deposit_per_bank;

    const getOptimalIds = (bank: Bank, canTakeSalary: boolean, canTakeHousing: boolean) => {
      const version = getRateVersionForDate(bank, openingDate);
      const filtered = getFilteredPrimeRates(bank, months, version);
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
      const bankHana = banks.find(b => b.id === 'hana') as Bank;
      
      let overallBest = {
        box1: null as BoxState | null,
        box2: null as BoxState | null,
        totalMaturity: 0
      };

      banks.forEach(otherBank => {
        if (otherBank.id === 'hana') return;

        const simulateHousing = (housingToHana: boolean) => {
          const actualHousingToHana = hasHousing ? (housingBankId === 'hana') : (housingToHana && wantsNewHousing);
          const actualHousingToOther = hasHousing ? (housingBankId === otherBank.id) : (!housingToHana && wantsNewHousing);

          const idsHana = getOptimalIds(bankHana, true, actualHousingToHana);
          const idsOther = getOptimalIds(otherBank, false, actualHousingToOther);

          const resHana = calculateResult({ bankId: 'hana', amount: 10000, selectedPrimeIds: idsHana }, months, openingDate, banks, config);
          const resOther = calculateResult({ bankId: otherBank.id, amount: 10000, selectedPrimeIds: idsOther }, months, openingDate, banks, config);

          const rateHana = resHana.baseRate + resHana.primeRate;
          const rateOther = resOther.baseRate + resOther.primeRate;

          const amtHana = rateHana >= rateOther ? primaryAmount : secondaryAmount;
          const amtOther = rateHana >= rateOther ? secondaryAmount : primaryAmount;

          const finalHana = calculateResult({ bankId: 'hana', amount: amtHana, selectedPrimeIds: idsHana }, months, openingDate, banks, config);
          const finalOther = calculateResult({ bankId: otherBank.id, amount: amtOther, selectedPrimeIds: idsOther }, months, openingDate, banks, config);

          return {
            total: finalHana.total + finalOther.total,
            box1: rateHana >= rateOther ? { bankId: 'hana', amount: amtHana, selectedPrimeIds: idsHana } : { bankId: otherBank.id, amount: amtOther, selectedPrimeIds: idsOther },
            box2: rateHana >= rateOther ? { bankId: otherBank.id, amount: amtOther, selectedPrimeIds: idsOther } : { bankId: 'hana', amount: amtHana, selectedPrimeIds: idsHana }
          };
        };

        let scenario;
        if (hasHousing) {
          scenario = simulateHousing(housingBankId === 'hana');
        } else if (wantsNewHousing) {
          const s1 = simulateHousing(true);
          const s2 = simulateHousing(false);
          scenario = s1.total > s2.total ? s1 : s2;
        } else {
          // Both false
          scenario = simulateHousing(false); 
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
      const bankList = banks;
      const bankPairs: [Bank, Bank][] = [];
      for (let i = 0; i < bankList.length; i++) {
        for (let j = i + 1; j < bankList.length; j++) {
          bankPairs.push([bankList[i], bankList[j]] as [Bank, Bank]);
        }
      }

      let overallBest = {
        box1: null as BoxState | null,
        box2: null as BoxState | null,
        totalMaturity: 0
      };

      bankPairs.forEach(([bankA, bankB]) => {
        const simulateScenario = (salaryAtA: boolean, housingAtA: boolean) => {
          const actualHousingAtA = hasHousing ? (housingBankId === bankA.id) : (housingAtA && wantsNewHousing);
          const actualHousingAtB = hasHousing ? (housingBankId === bankB.id) : (!housingAtA && wantsNewHousing);
          
          const finalIdsA = getOptimalIds(bankA, salaryAtA, actualHousingAtA);
          const finalIdsB = getOptimalIds(bankB, !salaryAtA, actualHousingAtB);

          const resA = calculateResult({ bankId: bankA.id, amount: 10000, selectedPrimeIds: finalIdsA }, months, openingDate, banks, config);
          const resB = calculateResult({ bankId: bankB.id, amount: 10000, selectedPrimeIds: finalIdsB }, months, openingDate, banks, config);

          const rateA = resA.baseRate + resA.primeRate;
          const rateB = resB.baseRate + resB.primeRate;

          const amtA = rateA >= rateB ? primaryAmount : secondaryAmount;
          const amtB = rateA >= rateB ? secondaryAmount : primaryAmount;

          const finalA = calculateResult({ bankId: bankA.id, amount: amtA, selectedPrimeIds: finalIdsA }, months, openingDate, banks, config);
          const finalB = calculateResult({ bankId: bankB.id, amount: amtB, selectedPrimeIds: finalIdsB }, months, openingDate, banks, config);

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
        } else if (wantsNewHousing) {
          scenarios.push(simulateScenario(true, true));
          scenarios.push(simulateScenario(true, false));
          scenarios.push(simulateScenario(false, true));
          scenarios.push(simulateScenario(false, false));
        } else {
          // wantsNewHousing is false -> both are false
          scenarios.push(simulateScenario(true, false));
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
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setHasHousing(true)} className={`py-5 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${hasHousing === true ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-white'}`}>
            <span className={`font-bold ${hasHousing === true ? 'text-blue-700' : 'text-slate-900'}`}>네</span>
          </button>
          <button onClick={() => { setHasHousing(false); setShowHousingSheet(true); }} className={`py-5 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${hasHousing === false ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-white'}`}>
            <span className={`font-bold ${hasHousing === false ? 'text-blue-700' : 'text-slate-900'}`}>아니오</span>
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
      title: "하나은행으로\n군급여를 받을건가요?",
      description: "하나 나라사랑카드 이용 시 혜택이 추가돼요.",
      icon: <Zap className="text-orange-500" size={24} />,
      content: (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setHanaSalary(true)} className={`py-5 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${hanaSalary === true ? 'border-orange-500 bg-orange-50' : 'border-slate-100 bg-white'}`}>
              <span className={`font-bold ${hanaSalary === true ? 'text-orange-700' : 'text-slate-900'}`}>네</span>
            </button>
            <button onClick={() => setHanaSalary(false)} className={`py-5 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${hanaSalary === false ? 'border-orange-500 bg-orange-50' : 'border-slate-100 bg-white'}`}>
              <span className={`font-bold ${hanaSalary === false ? 'text-orange-700' : 'text-slate-900'}`}>아니오</span>
            </button>
          </div>
          <div className="bg-orange-50/50 rounded-2xl p-4 border border-orange-100/50">
            <p className="text-[11px] text-orange-600 font-bold leading-relaxed flex gap-1.5">
              <span className="shrink-0">💡</span>
              <span>하나은행 급여 이체를 선택할 경우, 모든 은행 조합 중 절대적인 최고 금리가 아닐 수 있어요.</span>
            </p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-[13px] font-black text-slate-800 mb-5 flex items-center gap-2">
              <Sparkles size={16} className="text-orange-500" />
              추가  혜택
            </p>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center text-orange-500 shrink-0">
                  <Utensils size={16} />
                </div>
                <span className="text-[12px] font-bold text-slate-600">배달 앱(배민/요기요 등) 20% 캐시백</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500 shrink-0">
                  <Smartphone size={16} />
                </div>
                <span className="text-[12px] font-bold text-slate-600">구독·디지털(넷플릭스/유튜브 등) 10% 캐시백</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center text-purple-500 shrink-0">
                  <Film size={16} />
                </div>
                <span className="text-[12px] font-bold text-slate-600">CGV 팝콘(S) 세트 무료 제공</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center text-green-500 shrink-0">
                  <Shield size={16} />
                </div>
                <span className="text-[12px] font-bold text-slate-600">휴대폰 파손보험 무료 가입</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center text-yellow-600 shrink-0">
                  <Car size={16} />
                </div>
                <span className="text-[12px] font-bold text-slate-600">택시 이용금액 20% 캐시백</span>
              </div>
            </div>
          </div>
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
    <>
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="min-h-screen bg-[#F8FAFF] flex flex-col items-center">
        <div className="w-full max-w-[480px] min-h-screen flex flex-col relative bg-[#F8FAFF] sm:shadow-[0_0_80px_rgba(0,0,0,0.03)]">
          {/* Header - Fixed */}
          <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] h-16 px-4 flex items-center justify-between bg-[#F8FAFF] z-40 border-b border-slate-200 shadow-sm">
            <button onClick={handleBack} className="p-2 text-slate-900"><ChevronLeft size={28} strokeWidth={2.5} /></button>
            <div className="flex gap-1.5">{[1, 2, 3, 4].map(i => <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${step === i ? 'w-6 bg-blue-500' : 'bg-slate-200'}`} />)}</div>
            <div className="w-11" />
          </header>
          <div className="flex-1 px-6 pt-20 pb-48 flex flex-col overflow-y-auto">
            <div className="mb-10">
              <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6">{currentStepData.icon}</div>
              <h2 className="text-2xl font-black text-slate-900 leading-tight whitespace-pre-line mb-3">{currentStepData.title}</h2>
              <p className="text-slate-500 font-medium">{currentStepData.description}</p>
            </div>
            <AnimatePresence mode="wait"><motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="flex-1">{currentStepData.content}</motion.div></AnimatePresence>
            <div className="h-32" /> {/* Spacer for fixed bottom area */}
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] p-6 pb-8 bg-[#F8FAFF]/95 backdrop-blur-sm z-30 border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] flex flex-col items-center">
              <div className="w-full">
                <button
                  onClick={handleNext}
                  disabled={(step === 1 && hasHousing === null) || (step === 2 && housingBankId === '') || (step === 4 && hanaSalary === null)}
                  className="w-full h-16 bg-[#1A5CFF] text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-200 hover:bg-blue-600 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {step === 4 ? "추천받기" : "다음으로"}
                </button>
                <div className="mt-4 flex items-center justify-center gap-2 text-slate-400">
                  <Info size={14} /><span className="text-[11px] font-bold tracking-tight">입력하신 정보는 오직 추천에만 활용해요.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Housing Bottom Sheet */}
      <AnimatePresence>
        {showHousingSheet && (
          <div className="fixed inset-0 z-[60] flex justify-center items-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHousingSheet(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative w-full max-w-[480px] bg-white rounded-t-[32px] px-6  pb-5 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] flex flex-col z-[70]"
            >

              <div className="pt-10">
                <h3 className="text-[22px] font-bold text-[#191F28] mb-4 break-keep leading-tight tracking-tight whitespace-pre-line">
                  연 1.0%p 더 받을 수 있어요
                </h3>
                
                <p className="text-[#4E5968] font-medium mb-8 text-[16px] leading-relaxed break-keep tracking-tight whitespace-pre-line">
                  청약 통장을 새로 만들면 우대금리가 붙어요.{"\n"}
                  이 혜택을 포함해서 계산할까요?
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setHasHousing(false);
                      setWantsNewHousing(false);
                      setShowHousingSheet(false);
                      setStep(3);
                    }}
                    className="flex-1 h-16 bg-[#F2F4F6] text-[#4E5968] rounded-[18px] font-bold text-[20px] active:scale-[0.98] transition-all"
                  >
                    닫기
                  </button>
                  <button
                    onClick={() => {
                      setHasHousing(false);
                      setWantsNewHousing(true);
                      setShowHousingSheet(false);
                      setStep(3);
                    }}
                    className="flex-1 h-16 bg-[#3182F6] text-white rounded-[18px] font-bold text-[20px] active:scale-[0.98] transition-all"
                  >
                    포함하기
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default RecommendationPage;
