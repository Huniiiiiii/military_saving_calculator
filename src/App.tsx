import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ReactGA from 'react-ga4';
import { Sparkles } from 'lucide-react';
import Onboarding from './pages/Onboarding';
import AdminPage from './pages/AdminPage';
import InputPage from './pages/InputPage';
import CalculatorPage from './pages/CalculatorPage';
import ResultPage from './pages/ResultPage';
import RecommendationPage from './pages/RecommendationPage';
import type { RecommendationResult } from './pages/RecommendationPage';
import { supabase } from './lib/supabase';
import type { Bank } from './utils/savingsUtils';

export interface GlobalData {
  version: string;
  globalConfig: {
    maxTotalMonthlyDeposit: number;
    maxDepositPerBank: number;
    matchingSupportRate: number;
    taxRate: number;
  };
  militaryBranches: {
    id: string;
    name: string;
    max_months: number;
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
          { data: config },
          { data: branches },
          { data: banks },
          { data: versions }
        ] = await Promise.all([
          supabase.from('global_config').select('*').single(),
          supabase.from('military_branches').select('*').order('display_order'),
          supabase.from('banks').select('*').order('display_order'),
          supabase.from('rate_versions').select('*').order('effective_date', { ascending: false })
        ]);

        if (!config || !branches || !banks) throw new Error('Failed to fetch required data');

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
          version: config.version,
          globalConfig: {
            maxTotalMonthlyDeposit: config.max_total_monthly_deposit,
            maxDepositPerBank: config.max_deposit_per_bank,
            matchingSupportRate: config.matching_support_rate,
            taxRate: config.tax_rate
          },
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

  // Track page views when step changes
  useEffect(() => {
    if (import.meta.env.PROD) {
      ReactGA.send({ hitType: 'pageview', page: `/${step}`, title: step });
    }
    window.goAdmin = () => setStep('admin');
  }, [step]);

  // --- Handlers ---
  const handleBranchChange = (id: string) => {
    if (!globalData) return;
    const branch = globalData.militaryBranches.find((b) => b.id === id);
    if (branch) {
      setSelectedBranchId(id);
      setMonths(branch.max_months);
    }
  };

  const handleMonthsChange = (val: number) => {
    if (!globalData) return;
    const branch = globalData.militaryBranches.find((b) => b.id === selectedBranchId);
    const maxMonths = branch ? branch.max_months : 24;
    const clampedMonths = Math.max(0, Math.min(val, maxMonths));
    setMonths(clampedMonths);
  };

  const handleRecommendationComplete = (result: RecommendationResult) => {
    setBox1(result.box1);
    setBox2(result.box2);
    setRecommendationInfo({
      hanaSalary: result.hanaSalary,
      housingBankName: result.housingBankName,
      isSociallyVulnerable: result.isSociallyVulnerable
    });
    setIsRecommended(true);
    setStep('result');
  };

  return (
    <AnimatePresence mode="wait">
      {step === 'onboarding' ? (
        <Onboarding 
          onStart={() => setStep('input')} 
          onAdmin={() => setStep('admin')}
          key="onboarding" 
        />
      ) : !isDataLoaded || !globalData ? (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center" key="global-loading">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <div className="relative mb-6">
              <div className="w-16 h-16 border-4 border-blue-50 border-t-blue-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center"><Sparkles className="text-blue-500" size={24} /></div>
            </div>
            <h2 className="text-lg font-black text-slate-900">최신 금리 정보를 가져오고 있어요</h2>
          </motion.div>
        </div>
      ) : step === 'admin' ? (
        <AdminPage key="admin" initialData={globalData} onBack={() => setStep('input')} onRefresh={() => window.location.reload()} />
      ) : step === 'input' ? (
        <InputPage
          key="input"
          data={globalData}
          selectedBranchId={selectedBranchId}
          onBranchChange={handleBranchChange}
          months={months}
          onMonthsChange={handleMonthsChange}
          openingDate={openingDate}
          onOpeningDateChange={setOpeningDate}
          onNext={() => setStep('calculator')}
          onBack={() => setStep('onboarding')}
        />
      ) : step === 'recommendation' ? (
        <RecommendationPage
          key="recommendation"
          data={globalData}
          months={months}
          openingDate={new Date(openingDate)}
          onBack={() => setStep('input')}
          onComplete={handleRecommendationComplete}
        />
      ) : step === 'calculator' ? (
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
            setBox1({ bankId: '', amount: 300000, selectedPrimeIds: [] });
            setBox2({ bankId: '', amount: 250000, selectedPrimeIds: [] });
            setIsRecommended(false);
          }}
          onShowDetails={() => {
            setIsRecommended(false);
            setStep('result');
          }}
        />
      ) : (
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
          onBack={() => {
            if (isRecommended) setStep('input');
            else setStep('calculator');
          }}
        />
      )}
    </AnimatePresence>
  );
};

declare global {
  interface Window {
    goAdmin: () => void;
  }
}

export default App;
