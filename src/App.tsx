import React, { useState, useEffect } from 'react';
import data from './data/data.json';
import { AnimatePresence } from 'framer-motion';
import ReactGA from 'react-ga4';
import Onboarding from './pages/Onboarding';
import InputPage from './pages/InputPage';
import CalculatorPage from './pages/CalculatorPage';
import ResultPage from './pages/ResultPage';

// Initialize GA4 with your Measurement ID (Replace with yours)
if (import.meta.env.PROD) {
  ReactGA.initialize('G-3K28LXY5ZB');
}

const App: React.FC = () => {
  const { militaryBranches } = data;

  // --- States ---
  const [step, setStep] = useState<'onboarding' | 'input' | 'calculator' | 'result'>('onboarding');

  // Track page views when step changes
  useEffect(() => {
    if (import.meta.env.PROD) {
      ReactGA.send({ hitType: 'pageview', page: `/${step}`, title: step });
    }
  }, [step]);

  const [selectedBranchId, setSelectedBranchId] = useState(militaryBranches[0].id);
  const [months, setMonths] = useState(militaryBranches[0].maxMonths);
  const [box1, setBox1] = useState({ bankId: '', amount: 300000, selectedPrimeIds: [] as string[] });
  const [box2, setBox2] = useState({ bankId: '', amount: 250000, selectedPrimeIds: [] as string[] });

  // --- Handlers ---
  const handleBranchChange = (id: string) => {
    const branch = militaryBranches.find(b => b.id === id);
    if (branch) {
      setSelectedBranchId(id);
      setMonths(branch.maxMonths);
    }
  };

  const handleMonthsChange = (val: number) => {
    const branch = militaryBranches.find(b => b.id === selectedBranchId);
    const maxMonths = branch ? branch.maxMonths : 24;
    const clampedMonths = Math.max(0, Math.min(val, maxMonths));
    setMonths(clampedMonths);
  };

  return (
    <AnimatePresence mode="wait">
      {step === 'onboarding' ? (
        <Onboarding onStart={() => setStep('input')} key="onboarding" />
      ) : step === 'input' ? (
        <InputPage
          key="input"
          selectedBranchId={selectedBranchId}
          onBranchChange={handleBranchChange}
          months={months}
          onMonthsChange={handleMonthsChange}
          onNext={() => setStep('calculator')}
          onBack={() => setStep('onboarding')}
        />
      ) : step === 'calculator' ? (
        <CalculatorPage
          key="calculator"
          selectedBranchId={selectedBranchId}
          months={months}
          box1={box1}
          box2={box2}
          setBox1={setBox1}
          setBox2={setBox2}
          onBack={() => setStep('input')}
          onReset={() => {
            setBox1({ bankId: '', amount: 300000, selectedPrimeIds: [] });
            setBox2({ bankId: '', amount: 250000, selectedPrimeIds: [] });
          }}
          onShowDetails={() => setStep('result')}
        />
      ) : (
        <ResultPage
          key="result"
          selectedBranchId={selectedBranchId}
          months={months}
          box1={box1}
          box2={box2}
          onBack={() => setStep('calculator')}
        />
      )}
    </AnimatePresence>
  );
};

export default App;
