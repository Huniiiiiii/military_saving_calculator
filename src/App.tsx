import React, { useState, useEffect } from 'react';
import ReactGA from 'react-ga4';
import { AnimatePresence } from 'framer-motion';
import Onboarding from './pages/Onboarding';
import InputPage from './pages/InputPage';
import CalculatorPage from './pages/CalculatorPage';
import ResultPage from './pages/ResultPage';
import AdminPage from './pages/AdminPage';
import RecommendationPage from './pages/RecommendationPage';
import InquiryPage from './pages/InquiryPage';
import DischargeCelebrationPage from './pages/DischargeCelebrationPage';
import type { RecommendationResult } from './pages/RecommendationPage';
import { supabase } from './lib/supabase';
import { getEffectiveConfig, calculateDischargeDate } from './utils/savingsUtils';
import type { Bank, GlobalConfig } from './utils/savingsUtils';

export interface GlobalData {
  version: string;
  globalConfigs: GlobalConfig[];
  militaryBranches: {
    id_int: number;
    id: string;
    name: string;
    max_months: number;
    effective_day: string;
    display_order: number;
  }[];
  banks: Bank[];
}

if (import.meta.env.PROD) {
  ReactGA.initialize('G-3K28LXY5ZB');
}

const App: React.FC = () => {
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [globalData, setGlobalData] = useState<GlobalData | null>(null);

  const [step, setStep] = useState<'onboarding' | 'input' | 'calculator' | 'result' | 'recommendation' | 'admin' | 'inquiry' | 'discharge-celebration'>('onboarding');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [months, setMonths] = useState(18);
  const [enlistmentDate, setEnlistmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [isJoined, setIsJoined] = useState(false);
  const [joinDate, setJoinDate] = useState(new Date().toISOString().split('T')[0]);

  const [box1, setBox1] = useState({ bankId: '', amount: 300000, selectedPrimeIds: [] as string[] });
  const [box2, setBox2] = useState({ bankId: '', amount: 250000, selectedPrimeIds: [] as string[] });
  const [isRecommended, setIsRecommended] = useState(false);
  const [recommendationInfo, setRecommendationInfo] = useState({
    hanaSalary: false,
    isPoFirst: false,
    housingBankName: '',
    isSociallyVulnerable: false
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const isEnlisted = enlistmentDate < todayStr;
  const targetDate = (!isEnlisted || !isJoined) ? todayStr : joinDate;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          { data: configs },
          { data: branches },
          { data: banks },
          { data: versions }
        ] = await Promise.all([
          supabase.from('global_config').select('*').order('effective_day_config', { ascending: false }),
          supabase.from('military_branches').select('*').order('display_order').order('effective_day', { ascending: false }),
          supabase.from('banks').select('*').order('display_order'),
          supabase.from('rate_versions').select('*').order('effective_date', { ascending: false })
        ]);

        if (!configs || !branches || !banks) throw new Error('Failed to fetch required data');

        const processedBanks: Bank[] = banks.map(bank => ({
          ...bank,
          rateVersions: (versions || [])
            .filter(v => v.bank_id === bank.id)
            .map(v => ({
              id: v.id,
              effectiveDate: v.effective_date,
              maxPrimeRate: v.max_prime_rate,
              baseRates: v.base_rates,
              primeRates: v.prime_rates
            }))
        }));

        const finalData: GlobalData = {
          version: configs[0].version,
          globalConfigs: configs,
          militaryBranches: branches,
          banks: processedBanks
        };

        setGlobalData(finalData);
        setSelectedBranchId(branches[0].id);
        setMonths(branches[0].max_months);

        const config = getEffectiveConfig(configs, todayStr);
        setBox1(prev => ({ ...prev, amount: config.max_deposit_per_bank }));
        setBox2(prev => ({ ...prev, amount: config.max_total_monthly_deposit - config.max_deposit_per_bank }));

        setIsDataLoaded(true);
      } catch (error) {
        console.error('Error loading data:', error);
        alert('데이터를 불러오는 중 오류가 발생했습니다. 네트워크를 확인해주세요.');
      }
    };

    fetchData();
  }, [todayStr]);

  useEffect(() => {
    if (isDataLoaded && globalData) {
      const config = getEffectiveConfig(globalData.globalConfigs, targetDate);
      setBox1(prev => ({ ...prev, amount: config.max_deposit_per_bank }));
      setBox2(prev => ({ ...prev, amount: config.max_total_monthly_deposit - config.max_deposit_per_bank }));
    }
  }, [targetDate, isDataLoaded, globalData]);

  const handleRefreshData = async () => {
    window.location.reload();
  };

  const handleRecommendationComplete = (res: RecommendationResult) => {
    setBox1(res.box1);
    setBox2(res.box2);
    setIsRecommended(true);
    setRecommendationInfo({
      hanaSalary: res.hanaSalary,
      isPoFirst: res.isPoFirst,
      housingBankName: res.housingBankName,
      isSociallyVulnerable: res.isSociallyVulnerable
    });
    setStep('result');
  };

  return (
    <div className="font-sans antialiased text-slate-900 overflow-x-hidden">
      <AnimatePresence mode="wait">
        {step === 'onboarding' && (
          <Onboarding key="onboarding" onStart={() => setStep('input')} onAdmin={() => setStep('admin')} />
        )}
        
        {step !== 'onboarding' && (!isDataLoaded || !globalData ? (
          <div key="loading" className="min-h-screen bg-white flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-50 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-slate-400 font-bold text-sm">최신 금리 정보를 불러오는 중...</p>
            </div>
          </div>
        ) : (
          <>
            {step === 'input' && (
              <InputPage 
                key="input"
                data={globalData}
                selectedBranchId={selectedBranchId}
                onBranchChange={setSelectedBranchId}
                months={months}
                onMonthsChange={setMonths}
                enlistmentDate={enlistmentDate}
                onEnlistmentDateChange={setEnlistmentDate}
                isJoined={isJoined}
                onIsJoinedChange={setIsJoined}
                joinDate={joinDate}
                onJoinDateChange={setJoinDate}
                onNext={() => setStep('calculator')}
                onBack={() => setStep('onboarding')}
                onGoCelebration={() => setStep('discharge-celebration')}
              />
            )}

            {step === 'calculator' && (
              <CalculatorPage 
                key="calculator"
                data={globalData}
                selectedBranchId={selectedBranchId}
                months={months}
                enlistmentDate={enlistmentDate}
                isJoined={isJoined}
                joinDate={joinDate}
                targetDate={new Date(targetDate)}
                box1={box1}
                box2={box2}
                setBox1={setBox1}
                setBox2={setBox2}
                onBack={() => setStep('input')}
                onRecommend={() => setStep('recommendation')}
                onReset={() => {
                  const config = getEffectiveConfig(globalData.globalConfigs, targetDate);
                  setBox1({ bankId: '', amount: config.max_deposit_per_bank, selectedPrimeIds: [] });
                  setBox2({ bankId: '', amount: config.max_total_monthly_deposit - config.max_deposit_per_bank, selectedPrimeIds: [] });
                  setIsRecommended(false);
                }}
                onShowDetails={() => setStep('result')}
              />
            )}

            {step === 'recommendation' && (
              <RecommendationPage 
                key="recommendation"
                data={globalData}
                months={months}
                openingDate={new Date(targetDate)}
                onBack={() => setStep('calculator')}
                onComplete={handleRecommendationComplete}
              />
            )}

            {step === 'result' && (
              <ResultPage 
                key="result"
                data={globalData}
                selectedBranchId={selectedBranchId}
                months={months}
                enlistmentDate={enlistmentDate}
                isJoined={isJoined}
                joinDate={joinDate}
                targetDate={new Date(targetDate)}
                box1={box1}
                box2={box2}
                isRecommended={isRecommended}
                recommendationInfo={recommendationInfo}
                onBack={() => setStep('calculator')}
                onInquiry={() => setStep('inquiry')}
              />
            )}

            {step === 'inquiry' && (
              <InquiryPage 
                key="inquiry"
                onBack={() => setStep('result')}
              />
            )}

            {step === 'discharge-celebration' && (
              <DischargeCelebrationPage
                key="discharge-celebration"
                dischargeDate={calculateDischargeDate(enlistmentDate, globalData.militaryBranches.find(b => b.id === selectedBranchId)?.max_months || 18).toISOString().split('T')[0]}
                onBack={() => setStep('input')}
                onClose={() => setStep('input')}
              />
            )}

            {step === 'admin' && (
              <AdminPage 
                key="admin"
                initialData={globalData}
                onBack={() => setStep('onboarding')}
                onRefresh={handleRefreshData}
              />
            )}
          </>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default App;
