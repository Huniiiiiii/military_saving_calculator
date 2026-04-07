import data from '../data/data.json';

export interface PrimeRate {
  id: string;
  group: string;
  label: string;
  rate: number;
  footnotes?: string[];
}

export interface Bank {
  id: string;
  name: string;
  link: string;
  baseRates: { range: number[]; rate: number }[];
  primeRates: PrimeRate[];
  maxPrimeRate: number;
}

export interface BoxState {
  bankId: string;
  amount: number;
  selectedPrimeIds: string[];
}

export interface CalcResult {
  principal: number;
  bankInterest: number;
  matchingSupport: number;
  total: number;
  baseRate: number;
  primeRate: number;
  bankName: string;
  bankLink: string;
  selectedPrimes: PrimeRate[];
  isCapped: boolean;
  monthlyAmount: number;
}

const { globalConfig, banks } = data;

export const getFilteredPrimeRates = (bank: Bank, months: number) => {
  const today = new Date();
  const eventStartDate = new Date('2026-01-26');
  const eventEndDate = new Date('2026-07-25');

  return bank.primeRates.filter(prime => {
    // KB Event Period Check
    if (prime.id === 'kb_event') {
      const isPeriodValid = today >= eventStartDate && today <= eventEndDate;
      return isPeriodValid && months >= 3;
    }
    // KB Card Period Check
    if (prime.id === 'kb_card') {
      return months >= 6;
    }
    // KB 3-month Minimum Period Check
    if (bank.id === 'kb' && (prime.id === 'kb_housing' || prime.id === 'kb_social_vulnerable')) {
      return months >= 3;
    }
    // IBK 12-month Minimum Period Check
    if (prime.id === 'ib_salary') {
      return months >= 12;
    }
    // Hana 3-month Minimum Period Check
    if (prime.id === 'hana_salary' || prime.id === 'hana_housing') {
      return months >= 3;
    }
    // Woori 3-month Minimum Period Check
    if (bank.id === 'woori' && (prime.id === 'woori_bank' || prime.id === 'woori_card')) {
      return months >= 3;
    }
    return true;
  });
};

export const calculateResult = (boxState: BoxState, months: number): CalcResult => {
  const bank = banks.find(b => b.id === boxState.bankId) as Bank;
  
  if (!bank) {
    const principal = boxState.amount * months;
    const matchingSupport = Math.floor(principal * globalConfig.matchingSupportRate);
    return { 
      principal, 
      bankInterest: 0, 
      matchingSupport, 
      total: principal + matchingSupport, 
      baseRate: 0,
      primeRate: 0,
      bankName: '',
      bankLink: '',
      selectedPrimes: [],
      isCapped: false,
      monthlyAmount: boxState.amount
    };
  }

  const baseRateObj = bank.baseRates.find(r => months >= r.range[0] && months <= r.range[1]);
  const baseRate = baseRateObj ? baseRateObj.rate : 0.05;
  
  const filteredPrimes = getFilteredPrimeRates(bank, months);
  const selectedPrimes = filteredPrimes.filter(p => boxState.selectedPrimeIds.includes(p.id));
  const totalSelectedPrime = selectedPrimes.reduce((sum, p) => sum + p.rate, 0);
  const appliedPrimeRate = Math.min(totalSelectedPrime, bank.maxPrimeRate);
  
  let bankInterest = 0;
  for (let i = 1; i <= months; i++) {
    const remainingMonths = months - i + 1;
    bankInterest += boxState.amount * (remainingMonths / 12) * (baseRate + appliedPrimeRate);
  }
  bankInterest = Math.floor(bankInterest);
  const principal = boxState.amount * months;
  const matchingSupport = Math.floor(principal * globalConfig.matchingSupportRate);
  const totalMaturity = principal + bankInterest + matchingSupport;

  return { 
    principal, 
    bankInterest, 
    matchingSupport, 
    total: totalMaturity, 
    baseRate,
    primeRate: appliedPrimeRate,
    bankName: bank.name,
    bankLink: bank.link,
    selectedPrimes,
    isCapped: totalSelectedPrime > bank.maxPrimeRate,
    monthlyAmount: boxState.amount
  };
};
