import React, { useState, useEffect } from 'react';
import { data } from './data/data';
import { AnimatePresence } from 'framer-motion';
import ReactGA from 'react-ga4';
import Onboarding from './pages/Onboarding';
import AdminPage from './pages/AdminPage';
import InputPage from './pages/InputPage';
import CalculatorPage from './pages/CalculatorPage';
import ResultPage from './pages/ResultPage';
import RecommendationPage from './pages/RecommendationPage';
import type { RecommendationResult } from './pages/RecommendationPage';

// Initialize GA4 with your Measurement ID
if (import.meta.env.PROD) {
  ReactGA.initialize('G-3K28LXY5ZB');
}

const App: React.FC = () => {
  const { militaryBranches } = data;

  // --- States ---
  const [step, setStep] = useState<'onboarding' | 'input' | 'calculator' | 'result' | 'recommendation' | 'admin'>('onboarding');
  const [selectedBranchId, setSelectedBranchId] = useState(militaryBranches[0].id);
  const [months, setMonths] = useState(militaryBranches[0].maxMonths);
  const [openingDate, setOpeningDate] = useState(new Date().toISOString().split('T')[0]); // 기본값 오늘
  const [box1, setBox1] = useState({ bankId: '', amount: 300000, selectedPrimeIds: [] as string[] });
  const [box2, setBox2] = useState({ bankId: '', amount: 250000, selectedPrimeIds: [] as string[] });
  const [isRecommended, setIsRecommended] = useState(false);
  const [recommendationInfo, setRecommendationInfo] = useState({
    hanaSalary: false,
    housingBankName: '',
    isSociallyVulnerable: false
  });

  // Track page views when step changes
  useEffect(() => {
    if (import.meta.env.PROD) {
      ReactGA.send({ hitType: 'pageview', page: `/${step}`, title: step });
    }
    // 어드민 페이지 진입을 위한 숨겨진 콘솔 명령어 또는 특정 조합을 대신해 
    // 여기서는 간단히 window 객체에 등록해두겠습니다. (개발자 도구에서 window.goAdmin() 입력)
    window.goAdmin = () => setStep('admin');
  }, [step]);

  // --- Handlers ---
  const handleBranchChange = (id: string) => {
    const branch = data.militaryBranches.find(b => b.id === id);
    if (branch) {
      setSelectedBranchId(id);
      setMonths(branch.maxMonths);
    }
  };

  const handleMonthsChange = (val: number) => {
    const branch = data.militaryBranches.find(b => b.id === selectedBranchId);
    const maxMonths = branch ? branch.maxMonths : 24;
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
      ) : step === 'admin' ? (
        <AdminPage key="admin" onBack={() => setStep('input')} />
      ) : step === 'input' ? (
        <InputPage
          key="input"
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
          months={months}
          openingDate={new Date(openingDate)}
          onBack={() => setStep('input')}
          onComplete={handleRecommendationComplete}
        />
      ) : step === 'calculator' ? (
        <CalculatorPage
          key="calculator"
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
