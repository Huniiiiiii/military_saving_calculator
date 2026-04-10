import React, { useState, useEffect } from 'react';
import ReactGA from 'react-ga4';
import { AnimatePresence } from 'framer-motion';
import Onboarding from './pages/Onboarding';
import InputPage from './pages/InputPage';
import CalculatorPage from './pages/CalculatorPage';
import ResultPage from './pages/ResultPage';
import AdminPage from './pages/AdminPage';
import RecommendationPage from './pages/RecommendationPage';
import type { RecommendationResult } from './pages/RecommendationPage';
import { supabase } from './lib/supabase';
import { getEffectiveConfig } from './utils/savingsUtils';
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

// Initialize GA4 with your Measurement ID
if (import.meta.env.PROD) {
  ReactGA.initialize('G-3K28LXY5ZB');
}

const App: React.FC = () => {
  // --- Global Data States ---
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [globalData, setGlobalData] = useState<GlobalData | null>(null);

  // --- App Flow States ---
  const [step, setStep] = useState<'onboarding' | 'input' | 'calculator' | 'result' | 'recommendation' | 'admin'>('onboarding');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [months, setMonths] = useState(18);
  const [openingDate, setOpeningDate] = useState(new Date().toISOString().split('T')[0]);
  const [box1, setBox1] = useState({ bankId: '', amount: 300000, selectedPrimeIds: [] as string[] });
  const [box2, setBox2] = useState({ bankId: '', amount: 250000, selectedPrimeIds: [] as string[] });
  const [isRecommended, setIsRecommended] = useState(false);
  const [recommendationInfo, setRecommendationInfo] = useState({
    hanaSalary: false,
    housingBankName: '',
    isSociallyVulnerable: false
  });

  // --- Data Fetching ---
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

        // Transform into nested data structure expected by the app
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
        setIsDataLoaded(true);
      } catch (error) {
        console.error('Error loading data:', error);
        alert('데이터를 불러오는 중 오류가 발생했습니다. 네트워크를 확인해주세요.');
      }
    };

    fetchData();
  }, []);

  // Set initial amounts when data or openingDate is ready/changed
  useEffect(() => {
    if (globalData) {
      const config = getEffectiveConfig(globalData.globalConfigs, openingDate);
      setBox1(prev => ({ ...prev, amount: config.max_deposit_per_bank }));
      setBox2(prev => ({ ...prev, amount: config.max_total_monthly_deposit - config.max_deposit_per_bank }));
    }
  }, [globalData, openingDate]);

  const handleRefreshData = async () => {
    // Simple way to refresh: reload page or re-run fetchData logic
    window.location.reload();
  };

  const handleRecommendationComplete = (res: RecommendationResult) => {
    setBox1(res.box1);
    setBox2(res.box2);
    setIsRecommended(true);
    setRecommendationInfo({
      hanaSalary: res.hanaSalary,
      housingBankName: res.housingBankName,
      isSociallyVulnerable: res.isSociallyVulnerable
    });
    setStep('calculator');
  };

  if (!isDataLoaded || !globalData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-50 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold text-sm">최신 금리 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans antialiased text-slate-900 overflow-x-hidden">
      <AnimatePresence mode="wait">
        {step === 'onboarding' && (
          <Onboarding key="onboarding" onStart={() => setStep('input')} onAdmin={() => setStep('admin')} />
        )}
        
        {step === 'input' && (
          <InputPage 
            key="input"
            data={globalData}
            selectedBranchId={selectedBranchId}
            onBranchChange={setSelectedBranchId}
            months={months}
            onMonthsChange={setMonths}
            openingDate={openingDate}
            onOpeningDateChange={setOpeningDate}
            onNext={() => setStep('calculator')}
            onBack={() => setStep('onboarding')}
          />
        )}

        {step === 'calculator' && (
          <CalculatorPage 
            key="calculator"
            data={globalData}
            selectedBranchId={selectedBranchId}
            months={months}
            openingDate={new Date(openingDate)}
            box1={box1}
            box2={box2}
            setBox1={setBox1}
            setBox2={setBox2}
            onBack={() => setStep('input')}
            onRecommend={() => setStep('recommendation')}
            onReset={() => {
              const config = getEffectiveConfig(globalData.globalConfigs, openingDate);
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
            openingDate={new Date(openingDate)}
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
            openingDate={new Date(openingDate)}
            box1={box1}
            box2={box2}
            isRecommended={isRecommended}
            recommendationInfo={recommendationInfo}
            onBack={() => setStep('calculator')}
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
      </AnimatePresence>
    </div>
  );
};

export default App;
