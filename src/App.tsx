import React, { useState, useMemo } from 'react';
import data from './data/data.json';
import { motion, AnimatePresence } from 'framer-motion';
import Onboarding from './pages/Onboarding';
import InputPage from './pages/InputPage';
import CalculatorPage from './pages/CalculatorPage';

const App: React.FC = () => {
  const { militaryBranches, banks } = data;

  // --- States ---
  const [step, setStep] = useState<'onboarding' | 'input' | 'calculator'>('onboarding');
  const [selectedBranchId, setSelectedBranchId] = useState(militaryBranches[0].id);
  const [months, setMonths] = useState(militaryBranches[0].maxMonths);
  const [box1, setBox1] = useState({ bankId: banks[0].id, amount: 300000, selectedPrimeIds: [] as string[] });
  const [box2, setBox2] = useState({ bankId: banks[1].id, amount: 250000, selectedPrimeIds: [] as string[] });

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
        <Onboarding onStart={() => setStep('input')} />
      ) : step === 'input' ? (
        <InputPage
          selectedBranchId={selectedBranchId}
          onBranchChange={handleBranchChange}
          months={months}
          onMonthsChange={handleMonthsChange}
          onNext={() => setStep('calculator')}
          onBack={() => setStep('onboarding')}
        />
      ) : (
        <CalculatorPage
          selectedBranchId={selectedBranchId}
          months={months}
          box1={box1}
          box2={box2}
          setBox1={setBox1}
          setBox2={setBox2}
          onBack={() => setStep('input')}
          onReset={() => {
            setBox1(prev => ({ ...prev, amount: 200000, selectedPrimeIds: [] }));
            setBox2(prev => ({ ...prev, amount: 200000, selectedPrimeIds: [] }));
          }}
          onShowDetails={() => alert('상세 분석 기능은 준비 중입니다.')}
        />
      )}
    </AnimatePresence>
  );
};

export default App;
